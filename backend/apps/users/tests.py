from datetime import timedelta
from unittest.mock import patch

from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.feedback.models import Feedback
from apps.timelog.models import TimeLog
from apps.projects.models import Project, ProjectAssignment
from apps.tasks.models import Task
from apps.users.models import Client, Designer, InvitationToken, User


@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
class UserAndProjectContractTests(APITestCase):
    def setUp(self):
        email_patcher = patch('apps.users.signals.send_mail', return_value=1)
        self.addCleanup(email_patcher.stop)
        email_patcher.start()

        self.manager = User.objects.create_user(
            email='manager@example.com',
            full_name='Manager User',
            role='Manager',
            password='Password123',
        )
        self.manager.is_active = True
        self.manager.save(update_fields=['is_active'])

        self.designer = User.objects.create_user(
            email='designer@example.com',
            full_name='Designer User',
            role='Designer',
            password='Password123',
        )
        self.designer.is_active = True
        self.designer.save(update_fields=['is_active'])

        self.client_user = User.objects.create_user(
            email='client@example.com',
            full_name='Client User',
            role='Client',
            password='Password123',
        )
        self.client_user.is_active = True
        self.client_user.save(update_fields=['is_active'])

        self.client_profile = Client.objects.get(user=self.client_user)
        self.designer_profile = Designer.objects.get(user=self.designer)
        self.designer_profile.hourly_rate = 60
        self.designer_profile.specialization = 'Brand'
        self.designer_profile.available_hours_per_week = 40
        self.designer_profile.save()

        self.project = Project.objects.create(
            client=self.client_profile,
            project_name='Alpha',
            budget_hours=20,
            budget_amount=2000,
            status='Active',
        )
        ProjectAssignment.objects.create(project=self.project, designer=self.designer_profile)
        self.task = Task.objects.create(
            project=self.project,
            task_name='Initial Concept',
            estimated_hours=8,
            status='Todo',
        )

    def test_designer_cannot_patch_project(self):
        self.client.force_authenticate(self.designer)

        response = self.client.patch(
            reverse('project-detail', args=[self.project.id]),
            {'project_name': 'Changed Name'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.project.refresh_from_db()
        self.assertEqual(self.project.project_name, 'Alpha')

    def test_designer_can_update_task_status_but_not_other_fields(self):
        self.client.force_authenticate(self.designer)

        bad_response = self.client.patch(
            reverse('task-detail', args=[self.task.id]),
            {'task_name': 'Renamed Task'},
            format='json',
        )
        self.assertEqual(bad_response.status_code, status.HTTP_400_BAD_REQUEST)

        good_response = self.client.patch(
            reverse('task-detail', args=[self.task.id]),
            {'status': 'Completed'},
            format='json',
        )
        self.assertEqual(good_response.status_code, status.HTTP_200_OK)

        self.task.refresh_from_db()
        self.assertEqual(self.task.status, 'Completed')
        self.assertIsNotNone(self.task.completed_at)

    def test_users_me_get_and_patch(self):
        self.client.force_authenticate(self.client_user)

        get_response = self.client.get('/api/users/me/')
        self.assertEqual(get_response.status_code, status.HTTP_200_OK)
        self.assertEqual(get_response.data['email'], 'client@example.com')
        self.assertEqual(get_response.data['phone'], '')

        patch_response = self.client.patch(
            '/api/users/me/',
            {'full_name': 'Client Updated', 'phone': '+21600000000'},
            format='json',
        )
        self.assertEqual(patch_response.status_code, status.HTTP_200_OK)

        self.client_user.refresh_from_db()
        self.client_profile.refresh_from_db()
        self.assertEqual(self.client_user.full_name, 'Client Updated')
        self.assertEqual(self.client_profile.phone, '+21600000000')

    def test_project_summary_endpoint(self):
        TimeLog.objects.create(
            task=self.task,
            designer=self.designer_profile,
            hours_spent=5,
            description='Work',
        )
        self.client.force_authenticate(self.manager)

        response = self.client.get(f'/api/projects/{self.project.id}/summary/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['project_id'], self.project.id)
        self.assertEqual(response.data['actual_hours'], 5.0)
        self.assertEqual(response.data['budget_utilization_pct'], 25.0)
        self.assertEqual(response.data['ehr'], 400.0)

    def test_invitation_token_defaults_expiry_when_missing(self):
        token = InvitationToken.objects.create(
            user=self.manager,
            token='manual-token',
            expires_at=None,
        )

        self.assertIsNotNone(token.expires_at)
        self.assertGreater(token.expires_at, timezone.now())
        self.assertLessEqual(token.expires_at, timezone.now() + timedelta(hours=48, minutes=1))

    def test_designer_cannot_patch_or_delete_time_logs(self):
        log = TimeLog.objects.create(
            task=self.task,
            designer=self.designer_profile,
            hours_spent=5,
            description='Work',
        )
        self.client.force_authenticate(self.designer)

        patch_response = self.client.patch(
            f'/api/timelogs/{log.id}/',
            {'hours_spent': 2},
            format='json',
        )
        delete_response = self.client.delete(f'/api/timelogs/{log.id}/')

        self.assertEqual(patch_response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(delete_response.status_code, status.HTTP_403_FORBIDDEN)
        log.refresh_from_db()
        self.assertEqual(float(log.hours_spent), 5.0)

    def test_message_reply_must_match_feedback_project(self):
        other_project = Project.objects.create(
            client=self.client_profile,
            project_name='Beta',
            budget_hours=10,
            budget_amount=1000,
            status='Active',
        )
        feedback = Feedback.objects.create(
            project=other_project,
            category='Question',
            content_text='Question for beta',
        )
        self.client.force_authenticate(self.manager)

        response = self.client.post(
            '/api/messages/',
            {
                'project': self.project.id,
                'content_text': 'Reply on the wrong project',
                'feedback': feedback.id,
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('feedback', response.data)

    def test_superuser_creation_does_not_send_invitation(self):
        with patch('apps.users.signals.send_mail') as send_mail_mock:
            superuser = User.objects.create_superuser(
                email='admin@example.com',
                full_name='Admin User',
                password='Password123',
            )

        self.assertTrue(superuser.is_active)
        self.assertTrue(superuser.is_staff)
        self.assertTrue(superuser.is_superuser)
        self.assertFalse(InvitationToken.objects.filter(user=superuser).exists())
        send_mail_mock.assert_not_called()

    def test_activation_password_uses_django_validators(self):
        token = InvitationToken.objects.filter(user=self.designer, is_used=False).first()

        response = self.client.post(
            '/api/auth/activate/',
            {'token': token.token, 'password': '12345678'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('password', response.data)

    def test_change_password_uses_django_validators(self):
        self.client.force_authenticate(self.manager)

        response = self.client.post(
            '/api/users/change-password/',
            {'current_password': 'Password123', 'new_password': '12345678'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('This password is entirely numeric.', response.data['detail'])
