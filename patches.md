diff --git a/backend/apps/analytics/report_views.py b/backend/apps/analytics/report_views.py
index 350b800..b0b2f32 100644
--- a/backend/apps/analytics/report_views.py
+++ b/backend/apps/analytics/report_views.py
@@ -9,7 +9,7 @@ from .reports import generate_project_pdf, generate_excel
 class ExportView(APIView):
     permission_classes = [IsManager]
     def get(self, request):
-        fmt = request.query_params.get('export_format', 'pdf')
+        fmt = request.query_params.get('format') or request.query_params.get('export_format', 'pdf')
         project_id = request.query_params.get('project')
 
         if fmt == 'pdf':
@@ -40,4 +40,4 @@ class ExportView(APIView):
                 },
             )
 
-        return Response({'error': 'format must be pdf or excel'}, status=400)
\ No newline at end of file
+        return Response({'error': 'format must be pdf or excel'}, status=400)
diff --git a/backend/apps/analytics/reports.py b/backend/apps/analytics/reports.py
index 6624e04..94a0ff3 100644
--- a/backend/apps/analytics/reports.py
+++ b/backend/apps/analytics/reports.py
@@ -25,7 +25,7 @@ def generate_project_pdf(project_id: int) -> io.BytesIO:
     from reportlab.platypus import (
         BaseDocTemplate, PageTemplate, Frame,
         Table, TableStyle, Paragraph, Spacer,
-        HRFlowable, KeepTogether,
+        HRFlowable,
     )
     from reportlab.lib.styles import ParagraphStyle
     from reportlab.lib.enums import TA_LEFT, TA_RIGHT
@@ -167,8 +167,6 @@ def generate_project_pdf(project_id: int) -> io.BytesIO:
     S_H2      = ps('h2',     size=10, bold=True, color=C_SLATE_700, space_before=4, space_after=6)
     S_TBL_LBL = ps('tlbl',  size=9,  color=C_SLATE_600)
     S_TBL_VAL = ps('tval',  size=9,  bold=True, color=C_SLATE_900)
-    S_KPI_LBL = ps('klbl',  size=7,  color=C_SLATE_400, space_after=3)
-
     elements: list = []
     elements.append(Spacer(1, 8))
 
@@ -273,8 +271,7 @@ def generate_project_pdf(project_id: int) -> io.BytesIO:
 
 def generate_excel(project_id: int | None = None) -> io.BytesIO:
     import openpyxl
-    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side, GradientFill
-    from openpyxl.utils import get_column_letter
+    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
 
     wb = openpyxl.Workbook()
 
@@ -418,4 +415,4 @@ def generate_excel(project_id: int | None = None) -> io.BytesIO:
     buf = io.BytesIO()
     wb.save(buf)
     buf.seek(0)
-    return buf
\ No newline at end of file
+    return buf
diff --git a/backend/apps/analytics/views.py b/backend/apps/analytics/views.py
index fcca2ae..bb60205 100644
--- a/backend/apps/analytics/views.py
+++ b/backend/apps/analytics/views.py
@@ -376,15 +376,22 @@ class ProfitMarginView(APIView):
             ehr = float(project.budget_amount) / actual_hours
 
             weighted_total = 0.0
+            rated_hours = 0.0
             for row in log_qs.values('designer__hourly_rate').annotate(
                 logged_hours=Sum('hours_spent')
             ):
                 hourly_rate = row['designer__hourly_rate']
+                logged_hours = float(row['logged_hours'] or 0)
                 if hourly_rate is None:
                     continue
-                weighted_total += float(hourly_rate) * float(row['logged_hours'])
+                weighted_total += float(hourly_rate) * logged_hours
+                rated_hours += logged_hours
 
-            weighted_rate = weighted_total / actual_hours if actual_hours > 0 else None
+            weighted_rate = (
+                weighted_total / actual_hours
+                if actual_hours > 0 and rated_hours >= actual_hours
+                else None
+            )
             margin = (
                 (ehr - weighted_rate) / ehr * 100
                 if weighted_rate is not None else None
diff --git a/backend/apps/feedback/serializers.py b/backend/apps/feedback/serializers.py
index 0c23b2e..1361efe 100644
--- a/backend/apps/feedback/serializers.py
+++ b/backend/apps/feedback/serializers.py
@@ -37,4 +37,6 @@ class FeedbackStatusSerializer(serializers.ModelSerializer):
         if new_status == 'Resolved' and instance.status != 'Resolved':
             # Set resolved_at on first transition to Resolved only.
             validated_data['resolved_at'] = timezone.now()
-        return super().update(instance, validated_data)
\ No newline at end of file
+        elif new_status != 'Resolved':
+            validated_data['resolved_at'] = None
+        return super().update(instance, validated_data)
diff --git a/backend/apps/files/serializers.py b/backend/apps/files/serializers.py
index 50b6598..15660ea 100644
--- a/backend/apps/files/serializers.py
+++ b/backend/apps/files/serializers.py
@@ -1,6 +1,7 @@
 import os
 from rest_framework import serializers
 from django.conf import settings
+from django.utils.text import get_valid_filename
 from .models import FileUpload
 
 
@@ -54,7 +55,7 @@ class FileUploadWriteSerializer(serializers.ModelSerializer):
         absolute_dir.mkdir(parents=True, exist_ok=True)
 
         # Avoid silent overwrite ΓÇö append a counter suffix on collision.
-        base_name = file.name
+        base_name = get_valid_filename(os.path.basename(file.name)) or 'upload'
         dest_path = absolute_dir / base_name
         stem, ext = os.path.splitext(base_name)
         counter   = 1
@@ -73,4 +74,4 @@ class FileUploadWriteSerializer(serializers.ModelSerializer):
             file_name=base_name,
             file_path=f'{relative_dir}/{base_name}',
             file_size=file.size,
-        )
\ No newline at end of file
+        )
diff --git a/backend/apps/files/views.py b/backend/apps/files/views.py
index e660018..49578ff 100644
--- a/backend/apps/files/views.py
+++ b/backend/apps/files/views.py
@@ -57,9 +57,12 @@ class FileUploadViewSet(viewsets.ModelViewSet):
         if user.role != 'Manager' and instance.uploaded_by != user:
             raise PermissionDenied('You can only delete files you uploaded.')
 
-        # Remove the physical file from disk.
-        full_path = settings.MEDIA_ROOT / instance.file_path
+        # Remove only files that resolve inside MEDIA_ROOT.
+        media_root = settings.MEDIA_ROOT.resolve()
+        full_path = (settings.MEDIA_ROOT / instance.file_path).resolve()
+        if media_root not in full_path.parents:
+            raise PermissionDenied('Invalid file path.')
         if full_path.exists():
             full_path.unlink()
 
-        instance.delete()
\ No newline at end of file
+        instance.delete()
diff --git a/backend/apps/messages/serializers.py b/backend/apps/messages/serializers.py
index 08b9c71..bd08a7f 100644
--- a/backend/apps/messages/serializers.py
+++ b/backend/apps/messages/serializers.py
@@ -12,9 +12,18 @@ class MessageSerializer(serializers.ModelSerializer):
         fields = ['id', 'project', 'sender', 'sender_name', 'sender_avatar_url', 'content_text', 'is_read', 'created_at', 'feedback']
         read_only_fields = ['sender', 'is_read', 'created_at']
 
+    def validate(self, attrs):
+        feedback = attrs.get('feedback')
+        project = attrs.get('project')
+        if feedback is not None and project is not None and feedback.project_id != project.id:
+            raise serializers.ValidationError({
+                'feedback': 'Feedback replies must belong to the selected project.'
+            })
+        return attrs
+
     def get_sender_avatar_url(self, obj):
         request = self.context.get('request')
         pic = getattr(obj.sender, 'profile_picture', None)
         if not pic:
             return None
-        return request.build_absolute_uri(pic.url) if request else pic.url
\ No newline at end of file
+        return request.build_absolute_uri(pic.url) if request else pic.url
diff --git a/backend/apps/tasks/serializers.py b/backend/apps/tasks/serializers.py
index 3491bd5..bf22e44 100644
--- a/backend/apps/tasks/serializers.py
+++ b/backend/apps/tasks/serializers.py
@@ -35,6 +35,18 @@ class TaskWriteSerializer(serializers.ModelSerializer):
             raise serializers.ValidationError(
                 {'parent_task': 'Parent task must belong to the same project.'}
             )
+        if parent and self.instance:
+            if parent.pk == self.instance.pk:
+                raise serializers.ValidationError(
+                    {'parent_task': 'A task cannot be its own parent.'}
+                )
+            ancestor = parent.parent_task
+            while ancestor is not None:
+                if ancestor.pk == self.instance.pk:
+                    raise serializers.ValidationError(
+                        {'parent_task': 'Parent task cannot be one of this task\'s subtasks.'}
+                    )
+                ancestor = ancestor.parent_task
         return attrs
 
     def update(self, instance, validated_data):
diff --git a/backend/apps/timelog/views.py b/backend/apps/timelog/views.py
index 597f2ba..a0cb714 100644
--- a/backend/apps/timelog/views.py
+++ b/backend/apps/timelog/views.py
@@ -5,7 +5,7 @@ from rest_framework.decorators import api_view, permission_classes
 from rest_framework.exceptions import PermissionDenied
 from rest_framework.response import Response
 from apps.tasks.models import Task
-from apps.users.permissions import IsDesigner, IsManagerOrDesigner
+from apps.users.permissions import IsDesigner, IsManager
 from .models import TimeLog, TimerSession, ActivityLog
 from .serializers import (
     TimeLogReadSerializer, TimeLogWriteSerializer,
@@ -55,7 +55,7 @@ class TimeLogViewSet(viewsets.ModelViewSet):
             # Only designers log time; managers track via reports.
             return [IsDesigner()]
         if self.action in ('partial_update', 'destroy'):
-            return [IsManagerOrDesigner()]
+            return [IsManager()]
         return [permissions.IsAuthenticated()]
 
     def perform_create(self, serializer):
@@ -66,16 +66,9 @@ class TimeLogViewSet(viewsets.ModelViewSet):
         serializer.save(designer=designer)
 
     def perform_update(self, serializer):
-        # serializer.instance is the already-fetched object ΓÇö no second DB hit.
-        if (self.request.user.role != 'Manager'
-                and serializer.instance.designer.user != self.request.user):
-            raise PermissionDenied('You may only edit your own time logs.')
         serializer.save()
 
     def perform_destroy(self, instance):
-        if (self.request.user.role != 'Manager'
-                and instance.designer.user != self.request.user):
-            raise PermissionDenied('You may only delete your own time logs.')
         instance.delete()
 
 # ΓöÇΓöÇΓöÇ Timer endpoints ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
@@ -249,4 +242,4 @@ def activity_logs(request):
     else:
         return Response(status=status.HTTP_403_FORBIDDEN)
 
-    return Response(ActivityLogSerializer(logs, many=True).data)
\ No newline at end of file
+    return Response(ActivityLogSerializer(logs, many=True).data)
diff --git a/backend/apps/users/models.py b/backend/apps/users/models.py
index a97f81d..e3a1a56 100644
--- a/backend/apps/users/models.py
+++ b/backend/apps/users/models.py
@@ -17,11 +17,19 @@ class UserManager(BaseUserManager):
         return user
 
     def create_superuser(self, email, full_name, password, role='Manager'):
-        user = self.create_user(email, full_name, role, password)
-        user.is_active = True
-        user.is_staff = True
-        user.is_superuser = True
-        # Save to default database.
+        if not email:
+            raise ValueError('Email is required')
+        if role != 'Manager':
+            raise ValueError('Superusers must use the Manager role')
+        user = self.model(
+            email=self.normalize_email(email),
+            full_name=full_name,
+            role=role,
+            is_active=True,
+            is_staff=True,
+            is_superuser=True,
+        )
+        user.set_password(password)
         user.save(using=self._db)
         return user
 
diff --git a/backend/apps/users/serializers.py b/backend/apps/users/serializers.py
index 58bdc11..ad0ae24 100644
--- a/backend/apps/users/serializers.py
+++ b/backend/apps/users/serializers.py
@@ -26,6 +26,10 @@ class ActivateAccountSerializer(serializers.Serializer):
     phone    = serializers.CharField(required=False, allow_blank=True, default='')
     industry = serializers.CharField(required=False, allow_blank=True, default='')
 
+    def validate_password(self, value):
+        validate_password(value)
+        return value
+
     def validate_token(self, value):
         try:
             self._invitation = InvitationToken.objects.select_related('user').get(token=value)
@@ -225,4 +229,4 @@ class UserMeSerializer(serializers.ModelSerializer):
                 profile.industry = validated_data['industry']
             profile.save()
 
-        return instance
\ No newline at end of file
+        return instance
diff --git a/backend/apps/users/signals.py b/backend/apps/users/signals.py
index 480e094..193b509 100644
--- a/backend/apps/users/signals.py
+++ b/backend/apps/users/signals.py
@@ -21,6 +21,8 @@ def on_user_created(sender, instance, created, **kwargs):
     # created is false so we exit, we need true (new user created).
     if not created:
         return
+    if instance.is_staff or instance.is_superuser:
+        return
     
     # Create profile
     if instance.role == 'Designer':
@@ -56,4 +58,4 @@ If you did not expect this email, you can ignore it.
         from_email=settings.DEFAULT_FROM_EMAIL,
         recipient_list=[instance.email],
         fail_silently=False,
-    )
\ No newline at end of file
+    )
diff --git a/backend/apps/users/tests.py b/backend/apps/users/tests.py
index 3a9f020..7e4fdf7 100644
--- a/backend/apps/users/tests.py
+++ b/backend/apps/users/tests.py
@@ -7,6 +7,8 @@ from django.utils import timezone
 from rest_framework import status
 from rest_framework.test import APITestCase
 
+from apps.feedback.models import Feedback
+from apps.timelog.models import TimeLog
 from apps.projects.models import Project, ProjectAssignment
 from apps.tasks.models import Task
 from apps.users.models import Client, Designer, InvitationToken, User
@@ -123,8 +125,6 @@ class UserAndProjectContractTests(APITestCase):
         self.assertEqual(self.client_profile.phone, '+21600000000')
 
     def test_project_summary_endpoint(self):
-        from apps.timelog.models import TimeLog
-
         TimeLog.objects.create(
             task=self.task,
             designer=self.designer_profile,
@@ -151,3 +151,90 @@ class UserAndProjectContractTests(APITestCase):
         self.assertIsNotNone(token.expires_at)
         self.assertGreater(token.expires_at, timezone.now())
         self.assertLessEqual(token.expires_at, timezone.now() + timedelta(hours=48, minutes=1))
+
+    def test_designer_cannot_patch_or_delete_time_logs(self):
+        log = TimeLog.objects.create(
+            task=self.task,
+            designer=self.designer_profile,
+            hours_spent=5,
+            description='Work',
+        )
+        self.client.force_authenticate(self.designer)
+
+        patch_response = self.client.patch(
+            f'/api/timelogs/{log.id}/',
+            {'hours_spent': 2},
+            format='json',
+        )
+        delete_response = self.client.delete(f'/api/timelogs/{log.id}/')
+
+        self.assertEqual(patch_response.status_code, status.HTTP_403_FORBIDDEN)
+        self.assertEqual(delete_response.status_code, status.HTTP_403_FORBIDDEN)
+        log.refresh_from_db()
+        self.assertEqual(float(log.hours_spent), 5.0)
+
+    def test_message_reply_must_match_feedback_project(self):
+        other_project = Project.objects.create(
+            client=self.client_profile,
+            project_name='Beta',
+            budget_hours=10,
+            budget_amount=1000,
+            status='Active',
+        )
+        feedback = Feedback.objects.create(
+            project=other_project,
+            category='Question',
+            content_text='Question for beta',
+        )
+        self.client.force_authenticate(self.manager)
+
+        response = self.client.post(
+            '/api/messages/',
+            {
+                'project': self.project.id,
+                'content_text': 'Reply on the wrong project',
+                'feedback': feedback.id,
+            },
+            format='json',
+        )
+
+        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
+        self.assertIn('feedback', response.data)
+
+    def test_superuser_creation_does_not_send_invitation(self):
+        with patch('apps.users.signals.send_mail') as send_mail_mock:
+            superuser = User.objects.create_superuser(
+                email='admin@example.com',
+                full_name='Admin User',
+                password='Password123',
+            )
+
+        self.assertTrue(superuser.is_active)
+        self.assertTrue(superuser.is_staff)
+        self.assertTrue(superuser.is_superuser)
+        self.assertFalse(InvitationToken.objects.filter(user=superuser).exists())
+        send_mail_mock.assert_not_called()
+
+    def test_activation_password_uses_django_validators(self):
+        token = InvitationToken.objects.filter(user=self.designer, is_used=False).first()
+
+        response = self.client.post(
+            '/api/auth/activate/',
+            {'token': token.token, 'password': '12345678'},
+            format='json',
+        )
+
+        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
+        self.assertIn('password', response.data)
+
+    def test_change_password_uses_django_validators(self):
+        self.client.force_authenticate(self.manager)
+
+        response = self.client.post(
+            '/api/users/change-password/',
+            {'current_password': 'Password123', 'new_password': '12345678'},
+            format='json',
+        )
+
+        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
+        self.assertIn('This password is entirely numeric.', response.data['detail'])
diff --git a/backend/apps/users/views.py b/backend/apps/users/views.py
index 4eb0bc3..8f4fd1f 100644
--- a/backend/apps/users/views.py
+++ b/backend/apps/users/views.py
@@ -5,6 +5,8 @@ from rest_framework.permissions import AllowAny, IsAuthenticated
 from rest_framework.response import Response
 from rest_framework import status
 from rest_framework_simplejwt.views import TokenObtainPairView
+from django.contrib.auth.password_validation import validate_password
+from django.core.exceptions import ValidationError as DjangoValidationError
 from django.utils import timezone
 from datetime import timedelta
 from django.db.models import Sum
@@ -131,9 +133,11 @@ def change_password(request):
             {'detail': 'Current password is incorrect.'},
             status=status.HTTP_400_BAD_REQUEST,
         )
-    if len(new_pwd) < 8:
+    try:
+        validate_password(new_pwd, user=request.user)
+    except DjangoValidationError as exc:
         return Response(
-            {'detail': 'New password must be at least 8 characters.'},
+            {'detail': ' '.join(exc.messages)},
             status=status.HTTP_400_BAD_REQUEST,
         )
 
@@ -309,4 +313,4 @@ class PasswordResetConfirmView(APIView):
         token_obj.is_used = True
         token_obj.save(update_fields=['is_used'])
 
-        return Response({'detail': 'Password updated successfully.'})
\ No newline at end of file
+        return Response({'detail': 'Password updated successfully.'})
diff --git a/docs/context/DATA_MODEL.md b/docs/context/DATA_MODEL.md
index a668f07..188c6c8 100644
--- a/docs/context/DATA_MODEL.md
+++ b/docs/context/DATA_MODEL.md
@@ -43,10 +43,19 @@ class UserManager(BaseUserManager):
         return user
 
     def create_superuser(self, email, full_name, password, role='Manager'):
-        user = self.create_user(email, full_name, role, password)
-        user.is_active = True
-        user.is_staff = True
-        user.is_superuser = True
+        if not email:
+            raise ValueError('Email is required')
+        if role != 'Manager':
+            raise ValueError('Superusers must use the Manager role')
+        user = self.model(
+            email=self.normalize_email(email),
+            full_name=full_name,
+            role=role,
+            is_active=True,
+            is_staff=True,
+            is_superuser=True,
+        )
+        user.set_password(password)
         user.save(using=self._db)
         return user
diff --git a/frontend/src/api/analytics.ts b/frontend/src/api/analytics.ts
index f773f7f..c18c320 100644
--- a/frontend/src/api/analytics.ts
+++ b/frontend/src/api/analytics.ts
@@ -1,4 +1,4 @@
-import apiClient from './clients';
+import apiClient, { API_BASE_URL } from './clients';
 import type {
   KPISummary,
   BudgetVarianceItem,
@@ -82,7 +82,7 @@ export const getAISummary = async (projectId: number): Promise<AISummaryResponse
 
 async function downloadBlob(url: string, filename: string) {
   const token = localStorage.getItem('access_token');
-  const resp  = await fetch(`${import.meta.env.VITE_API_BASE_URL}${url}`, {
+  const resp  = await fetch(`${API_BASE_URL}${url}`, {
     headers: { Authorization: `Bearer ${token}` },
   });
   if (!resp.ok) throw new Error('Export failed');
@@ -96,9 +96,9 @@ async function downloadBlob(url: string, filename: string) {
 }
 
 export const exportPDF = (projectId: number) =>
-  downloadBlob(`/reports/export/?export_format=pdf&project=${projectId}`, `project_${projectId}_report.pdf`);
+  downloadBlob(`/reports/export/?format=pdf&project=${projectId}`, `project_${projectId}_report.pdf`);
 
 export const exportExcel = (projectId?: number) => {
-  const qs = projectId ? `?export_format=excel&project=${projectId}` : '?export_format=excel';
+  const qs = projectId ? `?format=excel&project=${projectId}` : '?format=excel';
   return downloadBlob(`/reports/export/${qs}`, 'profitability_report.xlsx');
 };
diff --git a/frontend/src/api/clients.ts b/frontend/src/api/clients.ts
index 7439fee..54626ac 100644
--- a/frontend/src/api/clients.ts
+++ b/frontend/src/api/clients.ts
@@ -1,9 +1,11 @@
 import axios from 'axios';
 
+export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
+
 // All API requests go through this instance.
 // baseURL comes from .env so it works in both dev (:8000) and production.
 const apiClient = axios.create({
-  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
+  baseURL: API_BASE_URL,
   headers: { 'Content-Type': 'application/json' },
 });
 
@@ -20,13 +22,14 @@ apiClient.interceptors.response.use(
   (response) => response,
   async (error) => {
     const original = error.config;
+    const refresh = localStorage.getItem('refresh_token');
+    const isRefreshRequest = original?.url?.includes('/auth/token/refresh/');
 
     // _retry flag prevents an infinite loop if the refresh call itself returns 401
-    if (error.response?.status === 401 && !original._retry) {
+    if (error.response?.status === 401 && original && !original._retry && !isRefreshRequest && refresh) {
       original._retry = true;
 
       try {
-        const refresh = localStorage.getItem('refresh_token');
         const { data } = await apiClient.post('/auth/token/refresh/', { refresh });
         localStorage.setItem('access_token', data.access);
         original.headers.Authorization = `Bearer ${data.access}`;
@@ -37,9 +40,13 @@ apiClient.interceptors.response.use(
         localStorage.removeItem('refresh_token');
       }
     }
+    if (error.response?.status === 401 && (!refresh || isRefreshRequest)) {
+      localStorage.removeItem('access_token');
+      localStorage.removeItem('refresh_token');
+    }
 
     return Promise.reject(error);
   }
 );
 
-export default apiClient;
\ No newline at end of file
+export default apiClient;
diff --git a/frontend/src/api/timelogs.ts b/frontend/src/api/timelogs.ts
index 3110402..b763930 100644
--- a/frontend/src/api/timelogs.ts
+++ b/frontend/src/api/timelogs.ts
@@ -11,11 +11,6 @@ export const getAllTimeLogs = async (): Promise<TimeLog[]> => {
   return getPaginatedResults<TimeLog>('/timelogs/', { page_size: 100 });
 };
 
-export const createTimeLog = async (payload: TimeLogPayload): Promise<TimeLog> => {
-  const { data } = await apiClient.post<TimeLog>('/timelogs/', payload);
-  return data;
-};
-
 export const updateTimeLog = async (
   id: number,
   payload: Partial<TimeLogPayload>,
diff --git a/frontend/src/components/TimeLogList.tsx b/frontend/src/components/TimeLogList.tsx
index bae9b67..86d4e6d 100644
--- a/frontend/src/components/TimeLogList.tsx
+++ b/frontend/src/components/TimeLogList.tsx
@@ -5,7 +5,6 @@ import { formatHours } from '../utils/format';
 interface Props {
   logs:       TimeLog[];
   isManager:  boolean;
-  currentUserId?: number;
   onDelete?:  (id: number) => void;
   onUpdate?:  (id: number, payload: Partial<TimeLogPayload>) => void;
 }
@@ -161,4 +160,4 @@ export default function TimeLogList({ logs, isManager, onDelete, onUpdate }: Pro
       </table>
     </div>
   );
-}
\ No newline at end of file
+}
diff --git a/frontend/src/hooks/useTimeLogs.ts b/frontend/src/hooks/useTimeLogs.ts
index 22b1351..4bc918f 100644
--- a/frontend/src/hooks/useTimeLogs.ts
+++ b/frontend/src/hooks/useTimeLogs.ts
@@ -17,14 +17,6 @@ function invalidateTimelogs(qc: ReturnType<typeof useQueryClient>, projectId: nu
   qc.invalidateQueries({ queryKey: ['projects'], exact: true });
 }
 
-export const useCreateTimeLog = (projectId: number) => {
-  const qc = useQueryClient();
-  return useMutation({
-    mutationFn: api.createTimeLog,
-    onSuccess: () => invalidateTimelogs(qc, projectId),
-  });
-};
-
 export const useDeleteTimeLog = (projectId: number) => {
   const qc = useQueryClient();
   return useMutation({
diff --git a/frontend/src/pages/designer/DesignerProjectDetail.tsx b/frontend/src/pages/designer/DesignerProjectDetail.tsx
index be5fdc6..5c61eb0 100644
--- a/frontend/src/pages/designer/DesignerProjectDetail.tsx
+++ b/frontend/src/pages/designer/DesignerProjectDetail.tsx
@@ -3,7 +3,7 @@ import { useState, useMemo, useEffect } from 'react';
 import type { ReactNode } from 'react';
 import { useProject } from '../../hooks/useProjects';
 import { useTasks, useUpdateTask } from '../../hooks/useTasks';
-import { useTimeLogs, useUpdateTimeLog, useActiveTimers, useTimerMutations } from '../../hooks/useTimeLogs';
+import { useTimeLogs, useActiveTimers, useTimerMutations } from '../../hooks/useTimeLogs';
 import { useFiles } from '../../hooks/useFiles';
 import { useMessages, useMarkMessagesRead } from '../../hooks/useMessages';
 import { useFeedback } from '../../hooks/useFeedback';
@@ -58,8 +58,6 @@ export default function DesignerProjectDetail() {
   const { count: unreadFiles, markRead: markFilesRead } =
     useUnreadCount(files, projectId, 'files', userId);
 
-  const updateTimeLog = useUpdateTimeLog(projectId);
-
   const [activeTab,    setActiveTab]    = useState<Tab>('tasks');
 
   const taskLogMap = useMemo<Record<number, number>>(() => {
@@ -311,8 +309,6 @@ export default function DesignerProjectDetail() {
         <TimeLogList
           logs={logs}
           isManager={false}
-          currentUserId={Number(user?.user_id)}
-          onUpdate={(id, payload) => updateTimeLog.mutate({ id, payload })}
         />
       )}
 
@@ -338,4 +334,4 @@ export default function DesignerProjectDetail() {
       )}
     </AppShell>
   );
-}
\ No newline at end of file
+}
diff --git a/frontend/vite.config.ts b/frontend/vite.config.ts
index c72a012..98b6416 100644
--- a/frontend/vite.config.ts
+++ b/frontend/vite.config.ts
@@ -5,4 +5,16 @@ import tailwindcss from '@tailwindcss/vite';
 
 export default defineConfig({
   plugins: [react(), svgr(), tailwindcss()],
-});
\ No newline at end of file
+  build: {
+    rollupOptions: {
+      output: {
+        manualChunks: {
+          react: ['react', 'react-dom', 'react-router-dom'],
+          charts: ['recharts'],
+          query: ['@tanstack/react-query', 'axios'],
+          dnd: ['@dnd-kit/core'],
+        },
+      },
+    },
+  },
+});
