from datetime import timedelta
from types import SimpleNamespace
from unittest.mock import patch

from django.test import override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.feedback.models import Feedback
from apps.analytics.reports import _weighted_designer_rate
from apps.projects.models import Project, ProjectAssignment
from apps.tasks.models import Task
from apps.timelog.models import TimeLog
from apps.users.models import Client, Designer, User


@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
class AnalyticsBehaviorTests(APITestCase):
    def setUp(self):
        email_patcher = patch('apps.users.signals.send_mail', return_value=1)
        self.addCleanup(email_patcher.stop)
        email_patcher.start()

        self.manager = User.objects.create_user(
            email='manager.analytics@example.com',
            full_name='Manager Analytics',
            role='Manager',
            password='Password123',
        )
        self.manager.is_active = True
        self.manager.save(update_fields=['is_active'])

        self.designer = User.objects.create_user(
            email='designer.analytics@example.com',
            full_name='Designer Analytics',
            role='Designer',
            password='Password123',
        )
        self.designer.is_active = True
        self.designer.save(update_fields=['is_active'])

        self.client_user = User.objects.create_user(
            email='client.analytics@example.com',
            full_name='Client Analytics',
            role='Client',
            password='Password123',
        )
        self.client_user.is_active = True
        self.client_user.save(update_fields=['is_active'])

        self.client_profile = Client.objects.get(user=self.client_user)
        self.designer_profile = Designer.objects.get(user=self.designer)
        self.designer_profile.hourly_rate = 50
        self.designer_profile.available_hours_per_week = 40
        self.designer_profile.save()

        self.project = Project.objects.create(
            client=self.client_profile,
            project_name='Analytics Project',
            budget_hours=40,
            budget_amount=4000,
            deadline=timezone.now().date() + timedelta(days=10),
            status='Active',
        )
        ProjectAssignment.objects.create(project=self.project, designer=self.designer_profile)
        self.task = Task.objects.create(
            project=self.project,
            task_name='Homepage Design',
            estimated_hours=10,
            status='InProgress',
        )

        self.client.force_authenticate(self.manager)

    def test_budget_variance_date_filter_does_not_duplicate_estimated_hours(self):
        log_one = TimeLog.objects.create(
            task=self.task,
            designer=self.designer_profile,
            hours_spent=2,
            description='Session 1',
        )
        log_two = TimeLog.objects.create(
            task=self.task,
            designer=self.designer_profile,
            hours_spent=3,
            description='Session 2',
        )
        now = timezone.now()
        TimeLog.objects.filter(id=log_one.id).update(created_at=now)
        TimeLog.objects.filter(id=log_two.id).update(created_at=now)

        response = self.client.get(
            '/api/analytics/budget-variance/',
            {'date_from': now.date().isoformat(), 'date_to': now.date().isoformat()},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data[0]['estimated_hours'], 10.0)
        self.assertEqual(response.data[0]['actual_hours'], 5.0)

    def test_designer_utilization_defaults_to_current_week(self):
        current_log = TimeLog.objects.create(
            task=self.task,
            designer=self.designer_profile,
            hours_spent=4,
            description='Current week',
        )
        old_log = TimeLog.objects.create(
            task=self.task,
            designer=self.designer_profile,
            hours_spent=9,
            description='Old work',
        )
        now = timezone.now()
        last_week = now - timedelta(days=10)
        TimeLog.objects.filter(id=current_log.id).update(created_at=now)
        TimeLog.objects.filter(id=old_log.id).update(created_at=last_week)

        response = self.client.get('/api/analytics/designer-utilization/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data[0]['logged_hours'], 4.0)
        self.assertEqual(response.data[0]['utilization_pct'], 10.0)

    def test_report_weighted_rate_uses_actual_logged_hours(self):
        senior = User.objects.create_user(
            email='senior.analytics@example.com',
            full_name='Senior Designer',
            role='Designer',
            password='Password123',
        )
        senior.is_active = True
        senior.save(update_fields=['is_active'])
        senior_profile = Designer.objects.get(user=senior)
        senior_profile.hourly_rate = 100
        senior_profile.save(update_fields=['hourly_rate'])

        TimeLog.objects.create(
            task=self.task,
            designer=self.designer_profile,
            hours_spent=1,
            description='Junior work',
        )
        TimeLog.objects.create(
            task=self.task,
            designer=senior_profile,
            hours_spent=3,
            description='Senior work',
        )

        rate = _weighted_designer_rate(TimeLog.objects.filter(task=self.task), 4.0)

        self.assertAlmostEqual(rate, 87.5)

    @patch('apps.analytics.views.Groq')
    @patch.dict('os.environ', {'GROQ_API_KEY': 'test-key'})
    def test_ai_summary_calls_groq_once(self, groq_cls):
        TimeLog.objects.create(
            task=self.task,
            designer=self.designer_profile,
            hours_spent=5,
            description='Work',
        )
        Feedback.objects.create(
            project=self.project,
            category='Revision',
            content_text='Please revise',
            status='Pending',
        )

        groq_instance = groq_cls.return_value
        groq_instance.chat.completions.create.return_value = SimpleNamespace(
            choices=[SimpleNamespace(message=SimpleNamespace(content='Short summary.'))]
        )

        response = self.client.get('/api/analytics/ai-summary/', {'project': self.project.id})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['summary'], 'Short summary.')
        groq_cls.assert_called_once()
        groq_instance.chat.completions.create.assert_called_once()
