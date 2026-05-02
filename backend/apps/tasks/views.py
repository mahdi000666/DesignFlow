import json
import os
import re

from django.db.models import Q
from groq import Groq
from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.timelog.models import TimeLog
from apps.users.permissions import IsManager, IsManagerOrDesigner

from .models import Task
from .serializers import TaskReadSerializer, TaskStatusSerializer, TaskWriteSerializer


class TaskViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'patch', 'delete', 'head', 'options']

    def get_queryset(self):
        user = self.request.user
        project_id = self.request.query_params.get('project')
        status_filter = self.request.query_params.get('status')

        if user.role == 'Manager':
            qs = Task.objects.select_related('project').prefetch_related('subtasks')
        elif user.role == 'Designer':
            qs = Task.objects.filter(
                project__assignments__designer__user=user
            ).select_related('project').prefetch_related('subtasks')
        elif user.role == 'Client':
            qs = Task.objects.filter(
                project__client__user=user
            ).select_related('project').prefetch_related('subtasks')
        else:
            qs = Task.objects.none()

        if project_id:
            qs = qs.filter(project_id=project_id)

        if status_filter:
            qs = qs.filter(status=status_filter)

        if self.action == 'list':
            qs = qs.filter(parent_task__isnull=True)

        return qs

    def get_serializer_class(self):
        if self.action == 'partial_update' and self.request.user.role == 'Designer':
            return TaskStatusSerializer
        if self.action in ('create', 'update', 'partial_update'):
            return TaskWriteSerializer
        return TaskReadSerializer

    def get_permissions(self):
        if self.action in ('create', 'destroy'):
            return [IsManager()]
        if self.action in ('update', 'partial_update'):
            return [IsManagerOrDesigner()]
        return [IsAuthenticated()]


_groq_client = Groq(api_key=os.getenv('GROQ_API_KEY', ''))

ESTIMATOR_SYSTEM_PROMPT = """
You are an experienced graphic design project manager.
Given a task name and description, estimate how many hours a professional designer
would need to complete it. Consider complexity, typical revision cycles, and
design industry norms.

Respond ONLY with valid JSON in this exact shape:
{"suggested_hours": <float>, "reasoning": "<one sentence>"}

If the description is too vague to estimate, return:
{"suggested_hours": null, "reasoning": "Description too vague to estimate."}
""".strip()


@api_view(['POST'])
@permission_classes([IsManager])
def estimate_task_hours(request):
    task_name = request.data.get('task_name', '').strip()
    description = request.data.get('description', '').strip()
    project_id = request.data.get('project_id')

    if not task_name:
        return Response({'detail': 'task_name is required.'}, status=status.HTTP_400_BAD_REQUEST)

    historical = ''
    if project_id:
        keywords = {
            token for token in re.findall(r'[A-Za-z0-9]+', task_name.lower())
            if len(token) >= 3
        }
        logs = TimeLog.objects.filter(task__project_id=project_id).select_related('task')
        if keywords:
            keyword_filter = Q()
            for keyword in keywords:
                keyword_filter |= Q(task__task_name__icontains=keyword)
            matched_logs = logs.filter(keyword_filter)
            if matched_logs.exists():
                logs = matched_logs

        logs = (
            logs.values('task__task_name', 'task__estimated_hours', 'hours_spent')
            .order_by('-created_at')[:10]
        )
        if logs:
            lines = [
                f"- \"{log['task__task_name']}\": estimated {log['task__estimated_hours']}h, actual {log['hours_spent']}h"
                for log in logs
            ]
            historical = '\n'.join(lines)

    user_message = f"Task: {task_name}\nDescription: {description or 'No description provided.'}"
    if historical:
        user_message += f"\n\nRecent similar tasks on this project:\n{historical}"

    try:
        chat = _groq_client.chat.completions.create(
            model='llama-3.3-70b-versatile',
            messages=[
                {'role': 'system', 'content': ESTIMATOR_SYSTEM_PROMPT},
                {'role': 'user', 'content': user_message},
            ],
            temperature=0.2,
            max_tokens=100,
        )
        raw = chat.choices[0].message.content.strip()
        result = json.loads(raw)

        if 'suggested_hours' not in result or 'reasoning' not in result:
            raise ValueError('Unexpected response shape')
    except (json.JSONDecodeError, ValueError):
        return Response({
            'suggested_hours': None,
            'estimated_hours': None,
            'reasoning': 'AI returned an unexpected response.',
        })
    except Exception:
        return Response({
            'suggested_hours': None,
            'estimated_hours': None,
            'reasoning': 'AI service unavailable.',
        })

    result['estimated_hours'] = result['suggested_hours']
    return Response(result)
