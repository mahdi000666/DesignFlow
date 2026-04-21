import json
import os
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from groq import Groq

from .models import Task
from .serializers import TaskReadSerializer, TaskWriteSerializer
from apps.users.permissions import IsManager, IsManagerOrDesigner

from apps.timelog.models import TimeLog


class TaskViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user       = self.request.user
        project_id = self.request.query_params.get('project')
        status_filter = self.request.query_params.get('status')

        if user.role == 'Manager':
            qs = Task.objects.select_related('project').prefetch_related('subtasks')
        elif user.role == 'Designer':
            qs = Task.objects.filter(
                project__assignments__designer__user=user
            ).select_related('project').prefetch_related('subtasks')
        else:
            qs = Task.objects.none()

        if project_id:
            qs = qs.filter(project_id=project_id)

        if status_filter:
            qs = qs.filter(status=status_filter)

        # Restrict to top-level tasks on list only — detail/update/delete actions
        # must be able to resolve subtask ids, so the filter must not apply there.
        if self.action == 'list':
            qs = qs.filter(parent_task__isnull=True)

        return qs

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return TaskWriteSerializer
        return TaskReadSerializer

    def get_permissions(self):
        if self.action in ('create', 'destroy'):
            return [IsManager()]
        if self.action in ('update', 'partial_update'):
            return [IsManagerOrDesigner()]
        return [IsAuthenticated()]


# ---------------------------------------------------------------------------
# AI Hour Estimator
# ---------------------------------------------------------------------------

_groq_client = Groq(api_key=os.getenv('GROQ_API_KEY', ''))

ESTIMATOR_SYSTEM_PROMPT = """
You are an experienced graphic design project manager.
Given a task name and description, estimate how many hours a professional designer
would need to complete it. Consider complexity, typical revision cycles, and
design industry norms.

Respond ONLY with valid JSON in this exact shape — no prose, no markdown fences:
{"estimated_hours": <float>, "reasoning": "<one sentence>"}

If the description is too vague to estimate, return:
{"estimated_hours": null, "reasoning": "Description too vague to estimate."}
""".strip()


@api_view(['POST'])
@permission_classes([IsManager])
def estimate_task_hours(request):
    task_name   = request.data.get('task_name', '').strip()
    description = request.data.get('description', '').strip()
    project_id  = request.data.get('project_id')

    if not task_name:
        return Response({'detail': 'task_name is required.'}, status=status.HTTP_400_BAD_REQUEST)

    historical = ''
    if project_id:
        logs = (
            TimeLog.objects
            .filter(task__project_id=project_id)
            .select_related('task')
            .values('task__task_name', 'task__estimated_hours', 'hours_spent')
            .order_by('-created_at')[:10]
        )
        if logs:
            lines = [
                f"- \"{l['task__task_name']}\": estimated {l['task__estimated_hours']}h, actual {l['hours_spent']}h"
                for l in logs
            ]
            historical = '\n'.join(lines)

    user_message = f"Task: {task_name}\nDescription: {description or 'No description provided.'}"
    if historical:
        user_message += f"\n\nRecent tasks on this project for context:\n{historical}"

    try:
        chat = _groq_client.chat.completions.create(
            model='llama-3.3-70b-versatile',
            messages=[
                {'role': 'system', 'content': ESTIMATOR_SYSTEM_PROMPT},
                {'role': 'user',   'content': user_message},
            ],
            temperature=0.2,
            max_tokens=100,
        )
        raw    = chat.choices[0].message.content.strip()
        result = json.loads(raw)

        if 'estimated_hours' not in result or 'reasoning' not in result:
            raise ValueError('Unexpected response shape')

    except (json.JSONDecodeError, ValueError):
        return Response({'estimated_hours': None, 'reasoning': 'AI returned an unexpected response.'})
    except Exception:
        return Response({'estimated_hours': None, 'reasoning': 'AI service unavailable.'})

    return Response(result)