"""
Management command: seed_data
Usage: python manage.py seed_data

Idempotent — safe to run multiple times. Uses get_or_create on User by email.
Designer and Client profile objects are NOT manually created here;
they are auto-created by the post_save signal on User.
"""

import random
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.feedback.models import Feedback
from apps.messages.models import Message
from apps.projects.models import Project, ProjectAssignment
from apps.tasks.models import Task
from apps.timelog.models import TimeLog
from apps.users.models import Client, Designer, User


# ---------------------------------------------------------------------------
# Seed data constants
# ---------------------------------------------------------------------------

MANAGER = {
    "email": "manager@designops.tn",
    "full_name": "Mehdi Trabelsi",
    "role": "Manager",
    "password": "Demo1234!",
}

DESIGNERS = [
    {
        "email": "yassine@designops.tn",
        "full_name": "Yassine Bouaziz",
        "role": "Designer",
        "password": "Demo1234!",
        "hourly_rate": 45.00,
        "specialization": "UI/UX Design",
        "available_hours_per_week": 40,
    },
    {
        "email": "nour@designops.tn",
        "full_name": "Nour Hamdi",
        "role": "Designer",
        "password": "Demo1234!",
        "hourly_rate": 38.00,
        "specialization": "Brand Identity",
        "available_hours_per_week": 35,
    },
    {
        "email": "adem@designops.tn",
        "full_name": "Adem Khelifi",
        "role": "Designer",
        "password": "Demo1234!",
        "hourly_rate": 32.00,
        "specialization": "Motion Graphics",
        "available_hours_per_week": 30,
    },
]

CLIENTS = [
    {
        "email": "jasmin@client.tn",
        "full_name": "Sana Jebali",
        "role": "Client",
        "password": "Demo1234!",
        "company": "Jasmin Cosmetics",
        "phone": "+216 71 234 567",
        "industry": "Cosmetics & Beauty",
    },
    {
        "email": "carthago@client.tn",
        "full_name": "Karim Mansouri",
        "role": "Client",
        "password": "Demo1234!",
        "company": "Carthago Immobilier",
        "phone": "+216 71 890 123",
        "industry": "Real Estate",
    },
    {
        "email": "darelkoutb@client.tn",
        "full_name": "Ines Chaabane",
        "role": "Client",
        "password": "Demo1234!",
        "company": "Dar El Koutb",
        "phone": "+216 71 456 789",
        "industry": "Publishing & Education",
    },
]

NOW = timezone.now()


PROJECTS_DATA = [
    # Jasmin Cosmetics — 2 projects
    {
        "client_email": "jasmin@client.tn",
        "project_name": "Jasmin Summer Collection 2024",
        "description": "Full brand refresh for summer product line: packaging, social media kit, and in-store POS materials.",
        "budget_hours": 120,
        "budget_amount": 5400.00,
        "deadline": (NOW + timedelta(days=45)).date(),
        "status": "Active",
        "category": "Brand Identity",
        "designer_emails": ["yassine@designops.tn", "nour@designops.tn"],
    },
    {
        "client_email": "jasmin@client.tn",
        "project_name": "Jasmin E-Commerce Website Redesign",
        "description": "Redesign of the Jasmin Cosmetics online store — new UI, improved checkout flow, mobile-first.",
        "budget_hours": 200,
        "budget_amount": 9000.00,
        "deadline": (NOW - timedelta(days=30)).date(),
        "status": "Completed",
        "category": "UI/UX Design",
        "designer_emails": ["yassine@designops.tn"],
    },
    # Carthago Immobilier — 2 projects
    {
        "client_email": "carthago@client.tn",
        "project_name": "Carthago Corporate Identity",
        "description": "New logo, business card, letterhead, and brand guidelines for rebranding initiative.",
        "budget_hours": 80,
        "budget_amount": 3040.00,
        "deadline": (NOW + timedelta(days=20)).date(),
        "status": "Active",
        "category": "Brand Identity",
        "designer_emails": ["nour@designops.tn"],
    },
    {
        "client_email": "carthago@client.tn",
        "project_name": "Carthago Résidence Brochure",
        "description": "Sales brochure for the new Résidence Les Pins project — print-ready, 16 pages.",
        "budget_hours": 60,
        "budget_amount": 1920.00,
        "deadline": (NOW - timedelta(days=60)).date(),
        "status": "OnHold",
        "category": "Print Design",
        "designer_emails": ["nour@designops.tn", "adem@designops.tn"],
    },
    # Dar El Koutb — 2 projects
    {
        "client_email": "darelkoutb@client.tn",
        "project_name": "Dar El Koutb 2025 Catalogue",
        "description": "Annual book catalogue — layout design, cover art, and editorial illustrations for 200+ titles.",
        "budget_hours": 150,
        "budget_amount": 4800.00,
        "deadline": (NOW + timedelta(days=90)).date(),
        "status": "Active",
        "category": "Editorial Design",
        "designer_emails": ["adem@designops.tn", "nour@designops.tn"],
    },
    {
        "client_email": "darelkoutb@client.tn",
        "project_name": "Back-to-School Campaign 2024",
        "description": "Social media graphics, email banners, and outdoor billboard designs for August campaign.",
        "budget_hours": 50,
        "budget_amount": 1600.00,
        "deadline": (NOW - timedelta(days=90)).date(),
        "status": "Completed",
        "category": "Marketing & Advertising",
        "designer_emails": ["adem@designops.tn"],
    },
]


# Tasks per project — (task_name, estimated_hours, is_unplanned, has_subtasks)
TASKS_TEMPLATE = [
    # Slot 0 — Brand Identity / general project opener
    [
        ("Discovery & Brief Analysis",          4,  False, False),
        ("Moodboard & Visual Research",         6,  False, False),
        ("Initial Logo Concepts (3 directions)", 10, False, True),
        ("Logo Refinement — Selected Direction", 8,  False, False),
        ("Brand Colour Palette & Typography",   6,  False, False),
        ("Business Card Design",                4,  False, False),
        ("Social Media Template Set",           8,  False, False),
        ("Brand Guidelines Document",           8,  False, False),
        ("Extra: Icon Set for Social Posts",    6,  True,  False),  # unplanned
        ("Extra: Animated Logo (GIF)",          5,  True,  False),  # unplanned
    ],
    # Slot 1 — UI/UX redesign
    [
        ("Stakeholder Interviews & Audit",      6,  False, False),
        ("Information Architecture",            5,  False, False),
        ("Wireframes — Key Pages",              12, False, True),
        ("High-Fidelity Mockups — Desktop",     16, False, False),
        ("High-Fidelity Mockups — Mobile",      14, False, False),
        ("Prototype & Clickthrough",            8,  False, False),
        ("Design System / Component Library",   12, False, False),
        ("Usability Review Revisions",          6,  False, False),
        ("Extra: Dark Mode Variant",            8,  True,  False),  # unplanned
        ("Extra: Admin Panel Mockups",          10, True,  False),  # unplanned
    ],
    # Slot 2 — Corporate Identity
    [
        ("Brief Review & Competitor Analysis",  3,  False, False),
        ("Logo Sketches — 5 Concepts",          8,  False, False),
        ("Logo Presentation & Client Review",   2,  False, False),
        ("Selected Logo Finalisation",          6,  False, False),
        ("Letterhead & Envelope Design",        4,  False, False),
        ("Business Card & ID Badge",            4,  False, False),
        ("Brand Guidelines PDF",                6,  False, False),
        ("Extra: PowerPoint Template",          5,  True,  False),  # unplanned
        ("Extra: Signage Mockup",               4,  True,  False),  # unplanned
    ],
    # Slot 3 — Print Brochure
    [
        ("Copy Review & Asset Collection",      3,  False, False),
        ("Grid & Layout System",                4,  False, False),
        ("Cover Page Design",                   6,  False, False),
        ("Interior Spreads — Draft",            10, False, True),
        ("Photography Retouching",              6,  False, False),
        ("Client Revision Round 1",             4,  False, False),
        ("Client Revision Round 2",             3,  True,  False),  # unplanned
        ("Print Pre-flight & Export",           2,  False, False),
    ],
    # Slot 4 — Editorial Catalogue
    [
        ("Master Template Design",              8,  False, False),
        ("Cover Art Concept",                   6,  False, False),
        ("Cover Art Final",                     5,  False, False),
        ("Chapter Divider Illustrations (×6)",  12, False, True),
        ("Section 1 Layout (50 pages)",         16, False, False),
        ("Section 2 Layout (50 pages)",         16, False, False),
        ("Section 3 Layout (50 pages)",         16, False, False),
        ("Index & Table of Contents",           4,  False, False),
        ("Extra: Digital Flip-Book Version",    10, True,  False),  # unplanned
        ("Extra: Promotional Poster Set",       8,  True,  False),  # unplanned
    ],
    # Slot 5 — Marketing Campaign
    [
        ("Creative Brief Alignment",            2,  False, False),
        ("Key Visual Design",                   8,  False, False),
        ("Social Media Graphic Set (×10)",      10, False, False),
        ("Email Banner Set (×4)",               5,  False, False),
        ("Billboard Design — 4×3m",             6,  False, False),
        ("Billboard Design — 8×3m",             4,  False, False),
        ("Revision Round 1",                    3,  False, False),
        ("Extra: Story Ads Set",                4,  True,  False),  # unplanned
        ("Extra: Animated Email Banner",        5,  True,  False),  # unplanned
    ],
]

SUBTASK_MAP = {
    "Initial Logo Concepts (3 directions)": [
        ("Logo Concept A — Calligraphic", 3),
        ("Logo Concept B — Geometric",   3),
        ("Logo Concept C — Minimalist",  4),
    ],
    "Wireframes — Key Pages": [
        ("Homepage Wireframe",      2),
        ("Product Page Wireframe",  2),
        ("Checkout Wireframe",      2),
        ("Mobile Wireframes",       3),
    ],
    "Interior Spreads — Draft": [
        ("Spreads 1–4",  3),
        ("Spreads 5–8",  3),
        ("Spreads 9–12", 3),
    ],
    "Chapter Divider Illustrations (×6)": [
        ("Illustrations 1–2", 4),
        ("Illustrations 3–4", 4),
        ("Illustrations 5–6", 4),
    ],
}

FEEDBACK_TEMPLATES = [
    ("Revision",  "The logo colours feel too cold for a cosmetics brand — can we try warmer tones?"),
    ("Revision",  "Please increase font size on the mobile version, it's hard to read on small screens."),
    ("Revision",  "The brochure cover image doesn't match our brand tone. Can you source a different photo?"),
    ("Approval",  "The moodboard looks excellent — green light to proceed with full mockups."),
    ("Approval",  "Logo direction B is perfect. Please finalise and prepare brand guidelines."),
    ("Approval",  "Social media templates approved. Go ahead with the full set."),
    ("Question",  "What file formats will we receive at final delivery?"),
    ("Question",  "Can we add an Arabic version of the brochure within the same budget?"),
    ("Question",  "Will the design system include dark mode guidelines?"),
    ("Revision",  "The business card layout feels too crowded — remove the secondary phone number."),
]

MESSAGE_TEXTS = [
    "Just uploaded the latest brand guidelines draft for your review.",
    "Wanted to flag that the photo assets from the client are lower resolution than expected — may affect print quality.",
    "Quick check-in: we're on track for the deadline. Mockups will be ready by Thursday.",
    "Client approved the direction! Moving to high-fidelity mockups now.",
    "Can you share the original Illustrator files for the logo? Need the vector source.",
    "The client requested an Arabic version — should I log this as an unplanned task?",
    "Pre-flight check done. PDF is print-ready and sent to the client for final sign-off.",
    "Time logged for today's session. Had to redo the cover layout — added ~2 hours.",
]


class Command(BaseCommand):
    help = "Seed realistic Tunisian fake data into the database (idempotent)."

    def handle(self, *args, **options):
        self.stdout.write(self.style.MIGRATE_HEADING("\n=== DesignOps Seed Data ===\n"))

        counts = {
            "users_created": 0,
            "projects_created": 0,
            "assignments_created": 0,
            "tasks_created": 0,
            "timelogs_created": 0,
            "feedback_created": 0,
            "messages_created": 0,
        }

        # ------------------------------------------------------------------
        # 1. Manager
        # ------------------------------------------------------------------
        manager_user = self._create_user(MANAGER, counts)

        # ------------------------------------------------------------------
        # 2. Designers
        # ------------------------------------------------------------------
        designer_users = {}
        for d in DESIGNERS:
            user = self._create_user(d, counts)
            designer_users[d["email"]] = user
            profile = Designer.objects.get(user=user)
            profile.hourly_rate = d["hourly_rate"]
            profile.specialization = d["specialization"]
            profile.available_hours_per_week = d["available_hours_per_week"]
            profile.save()

        # ------------------------------------------------------------------
        # 3. Clients
        # ------------------------------------------------------------------
        client_users = {}
        for c in CLIENTS:
            user = self._create_user(c, counts)
            client_users[c["email"]] = user
            profile = Client.objects.get(user=user)
            profile.phone = c["phone"]
            profile.industry = c["industry"]
            profile.save()

        # ------------------------------------------------------------------
        # 4. Projects, Assignments, Tasks, TimeLogs, Feedback, Messages
        # ------------------------------------------------------------------
        all_users = (
            [manager_user]
            + list(designer_users.values())
            + list(client_users.values())
        )

        for idx, proj_data in enumerate(PROJECTS_DATA):
            client_user = client_users[proj_data["client_email"]]
            client_profile = Client.objects.get(user=client_user)

            project, created = Project.objects.get_or_create(
                project_name=proj_data["project_name"],
                client=client_profile,
                defaults={
                    "description":   proj_data["description"],
                    "budget_hours":  proj_data["budget_hours"],
                    "budget_amount": proj_data["budget_amount"],
                    "deadline":      proj_data["deadline"],
                    "status":        proj_data["status"],
                    "category":      proj_data["category"],
                },
            )
            if created:
                counts["projects_created"] += 1
                self.stdout.write(f"  + Project: {project.project_name}")

            # -- Assignments -----------------------------------------------
            for designer_email in proj_data["designer_emails"]:
                d_user = designer_users[designer_email]
                d_profile = Designer.objects.get(user=d_user)
                _, a_created = ProjectAssignment.objects.get_or_create(
                    project=project, designer=d_profile
                )
                if a_created:
                    counts["assignments_created"] += 1

            assigned_designers = [
                Designer.objects.get(user=designer_users[e])
                for e in proj_data["designer_emails"]
            ]

            # -- Tasks ------------------------------------------------------
            task_template = TASKS_TEMPLATE[idx]
            task_objs = {}  # task_name -> Task instance (top-level only)

            for task_name, est_hours, is_unplanned, has_subtasks in task_template:
                # Status based on project status and position in list
                status = self._task_status(proj_data["status"], is_unplanned)

                task, t_created = Task.objects.get_or_create(
                    project=project,
                    task_name=task_name,
                    parent_task=None,
                    defaults={
                        "description":      f"Task: {task_name}",
                        "estimated_hours":  est_hours,
                        "status":           status,
                        "is_unplanned":     is_unplanned,
                    },
                )
                if t_created:
                    counts["tasks_created"] += 1

                task_objs[task_name] = task

                # Subtasks
                if has_subtasks and task_name in SUBTASK_MAP:
                    for sub_name, sub_est in SUBTASK_MAP[task_name]:
                        sub_status = self._task_status(proj_data["status"], False)
                        _, st_created = Task.objects.get_or_create(
                            project=project,
                            task_name=sub_name,
                            parent_task=task,
                            defaults={
                                "description":     f"Subtask: {sub_name}",
                                "estimated_hours": sub_est,
                                "status":          sub_status,
                                "is_unplanned":    False,
                            },
                        )
                        if st_created:
                            counts["tasks_created"] += 1

                # -- TimeLogs (only for non-Todo tasks) --------------------
                if task.status in ("InProgress", "Completed"):
                    designer = random.choice(assigned_designers)
                    # Slightly over/under estimated to produce meaningful variance
                    variance = random.uniform(-0.15, 0.25)
                    hours_spent = round(float(est_hours) * (1 + variance), 2)
                    hours_spent = max(0.5, hours_spent)

                    log_exists = TimeLog.objects.filter(
                        task=task, designer=designer
                    ).exists()
                    if not log_exists:
                        log = TimeLog.objects.create(
                            task=task,
                            designer=designer,
                            hours_spent=hours_spent,
                            description=f"Work session on: {task_name}",
                        )
                        # Backdate created_at (auto_now_add can't be set directly)
                        days_ago = random.randint(1, 90)
                        past_date = NOW - timedelta(days=days_ago)
                        TimeLog.objects.filter(id=log.id).update(created_at=past_date)
                        counts["timelogs_created"] += 1

            # -- Feedback --------------------------------------------------
            num_feedback = random.randint(4, 8)
            existing_feedback_count = Feedback.objects.filter(project=project).count()
            if existing_feedback_count == 0:
                client_user_obj = client_users[proj_data["client_email"]]
                samples = random.sample(FEEDBACK_TEMPLATES, min(num_feedback, len(FEEDBACK_TEMPLATES)))
                for category, content in samples:
                    is_resolved = random.random() < 0.5
                    status = "Resolved" if is_resolved else random.choice(["Pending", "InProgress"])
                    resolved_at = (NOW - timedelta(days=random.randint(1, 30))) if is_resolved else None

                    Feedback.objects.create(
                        project=project,
                        category=category,
                        content_text=content,
                        status=status,
                        resolved_at=resolved_at,
                    )
                    counts["feedback_created"] += 1

            # -- Messages --------------------------------------------------
            existing_msg_count = Message.objects.filter(project=project).count()
            if existing_msg_count == 0:
                num_messages = random.randint(3, 5)
                senders = random.sample(all_users, min(num_messages, len(all_users)))
                msg_texts = random.sample(MESSAGE_TEXTS, min(num_messages, len(MESSAGE_TEXTS)))
                for sender, text in zip(senders, msg_texts):
                    Message.objects.create(
                        project=project,
                        sender=sender,
                        content_text=text,
                        is_read=random.choice([True, False]),
                    )
                    counts["messages_created"] += 1

        # ------------------------------------------------------------------
        # Summary
        # ------------------------------------------------------------------
        self.stdout.write(self.style.SUCCESS("\n✓ Seed complete\n"))
        self.stdout.write(f"  Users created:       {counts['users_created']}")
        self.stdout.write(f"  Projects created:    {counts['projects_created']}")
        self.stdout.write(f"  Assignments created: {counts['assignments_created']}")
        self.stdout.write(f"  Tasks created:       {counts['tasks_created']}")
        self.stdout.write(f"  TimeLogs created:    {counts['timelogs_created']}")
        self.stdout.write(f"  Feedback created:    {counts['feedback_created']}")
        self.stdout.write(f"  Messages created:    {counts['messages_created']}")

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _create_user(self, data: dict, counts: dict) -> User:
        """get_or_create a User by email, set password and is_active=True."""
        user, created = User.objects.get_or_create(
            email=data["email"],
            defaults={
                "full_name": data["full_name"],
                "role":      data["role"],
                "is_active": True,
            },
        )
        if created:
            user.set_password(data["password"])
            user.is_active = True
            user.save()
            counts["users_created"] += 1
            self.stdout.write(f"  + User: {user.email} ({user.role})")
        return user

    @staticmethod
    def _task_status(project_status: str, is_unplanned: bool) -> str:
        """
        Assign a plausible task status based on project status.
        Completed projects: all tasks Completed or (a few) InProgress.
        Active projects: mix of Todo/InProgress/Completed.
        OnHold projects: mostly Todo with a few InProgress.
        """
        if project_status == "Completed":
            return random.choices(
                ["Completed", "InProgress"],
                weights=[85, 15],
            )[0]
        if project_status == "OnHold":
            return random.choices(
                ["Todo", "InProgress"],
                weights=[70, 30],
            )[0]
        # Active
        if is_unplanned:
            return random.choices(
                ["Todo", "InProgress"],
                weights=[60, 40],
            )[0]
        return random.choices(
            ["Todo", "InProgress", "Completed"],
            weights=[30, 40, 30],
        )[0]
