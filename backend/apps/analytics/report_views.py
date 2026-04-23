from django.http import HttpResponse
from rest_framework.views import APIView
from rest_framework.response import Response

from apps.users.permissions import IsManager
from .reports import generate_project_pdf, generate_excel


class ExportView(APIView):
    permission_classes = [IsManager]
    def get(self, request):
        fmt = request.query_params.get('export_format', 'pdf')
        project_id = request.query_params.get('project')

        if fmt == 'pdf':
            if not project_id:
                return Response({'error': 'project param is required for PDF export'}, status=400)
            try:
                buf = generate_project_pdf(int(project_id))
            except Exception as e:
                return Response({'error': str(e)}, status=400)
            return HttpResponse(
                buf.read(),
                content_type='application/pdf',
                headers={
                    'Content-Disposition': f'attachment; filename="project_{project_id}_report.pdf"',
                },
            )

        if fmt == 'excel':
            try:
                buf = generate_excel(int(project_id) if project_id else None)
            except Exception as e:
                return Response({'error': str(e)}, status=400)
            return HttpResponse(
                buf.read(),
                content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                headers={
                    'Content-Disposition': 'attachment; filename="profitability_report.xlsx"',
                },
            )

        return Response({'error': 'format must be pdf or excel'}, status=400)