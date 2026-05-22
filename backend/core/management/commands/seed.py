"""
Management command: seed
Creates realistic fake data for a Tunisian graphic design agency (DesignFlow).

Placement: backend/core/management/commands/seed.py

Usage:
    python manage.py seed           # idempotent — skips already-present emails
    python manage.py seed --flush   # wipes all seeded data first, then re-seeds

All seeded accounts use the password:  password
Superuser / manager login:             manager@gmail.com
"""

import random
import datetime
from datetime import date, timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

# ---------------------------------------------------------------------------
# Seeded RNG — change the seed value if you want a different but still
# reproducible dataset.
# ---------------------------------------------------------------------------
RNG = random.Random(42)
PASSWORD = "password"
NOW = timezone.now()
TODAY = date.today()


# ---------------------------------------------------------------------------
# Static fixtures
# ---------------------------------------------------------------------------

MANAGER_DATA = {
    "email": "manager@gmail.com",
    "full_name": "Karim Mansour",
}

DESIGNERS_DATA = [
    {
        "email": "sarra.belhadj@designflow.tn",
        "full_name": "Sarra Belhadj",
        "specialization": "Brand Identity",
        "hourly_rate": Decimal("55.00"),
        "available_hours_per_week": 40,
    },
    {
        "email": "youssef.trabelsi@designflow.tn",
        "full_name": "Youssef Trabelsi",
        "specialization": "UI/UX Design",
        "hourly_rate": Decimal("65.00"),
        "available_hours_per_week": 35,
    },
    {
        "email": "nour.bouzid@designflow.tn",
        "full_name": "Nour Bouzid",
        "specialization": "Motion Graphics",
        "hourly_rate": Decimal("70.00"),
        "available_hours_per_week": 30,
    },
    {
        "email": "amine.karray@designflow.tn",
        "full_name": "Amine Karray",
        "specialization": "Packaging Design",
        "hourly_rate": Decimal("50.00"),
        "available_hours_per_week": 40,
    },
    {
        "email": "rania.hammami@designflow.tn",
        "full_name": "Rania Hammami",
        "specialization": "Illustration",
        "hourly_rate": Decimal("45.00"),
        "available_hours_per_week": 38,
    },
]

CLIENTS_DATA = [
    {
        "email": "aziz.chaabane@chaabaneimmo.tn",
        "full_name": "Aziz Chaabane",
        "phone": "+216 71 234 567",
        "industry": "Real Estate",
    },
    {
        "email": "leila.oueslati@djerba-horizons.tn",
        "full_name": "Leila Oueslati",
        "phone": "+216 75 456 789",
        "industry": "Tourism",
    },
    {
        "email": "fares.bensalem@cafemedina.tn",
        "full_name": "Farès Ben Salem",
        "phone": "+216 71 789 012",
        "industry": "Food & Beverage",
    },
    {
        "email": "imen.gharbi@gharbi-couture.tn",
        "full_name": "Imen Gharbi",
        "phone": "+216 73 321 654",
        "industry": "Fashion & Textile",
    },
    {
        "email": "hedi.mzoughi@tuntech.tn",
        "full_name": "Hédi Mzoughi",
        "phone": "+216 71 654 321",
        "industry": "Technology",
    },
    {
        "email": "mouna.ferchichi@financia.tn",
        "full_name": "Mouna Ferchichi",
        "phone": "+216 71 111 222",
        "industry": "Financial Services",
    },
]

# Each project entry:
#   client_email        — maps to a Client user above
#   designers           — list of designer emails assigned to this project
#   started_days_ago    — how far back the project was created (sets created_at)
#   deadline_offset     — days from TODAY (negative = already past)
#   budget_hours        — Decimal
#   budget_amount       — Decimal (TND)
#   status              — 'Active' | 'Completed' | 'OnHold'
#   category            — must match a key in TASK_TEMPLATES below
PROJECTS_DATA = [
    {
        "client_email": "aziz.chaabane@chaabaneimmo.tn",
        "project_name": "Chaabane Immobilier — Rebranding",
        "description": (
            "Full visual identity refresh for a leading Tunis real-estate firm: "
            "new logo, colour palette, business collateral, and signage system."
        ),
        "budget_hours": Decimal("120.00"),
        "budget_amount": Decimal("7200.00"),
        "deadline_offset": 30,
        "status": "Active",
        "category": "Brand Identity",
        "designers": ["sarra.belhadj@designflow.tn", "amine.karray@designflow.tn"],
        "started_days_ago": 45,
    },
    {
        "client_email": "leila.oueslati@djerba-horizons.tn",
        "project_name": "Djerba Horizons — Brochure & Social Kit",
        "description": (
            "Tri-fold brochure, rack card, and a 12-template social media kit "
            "for the summer season campaign."
        ),
        "budget_hours": Decimal("60.00"),
        "budget_amount": Decimal("3600.00"),
        "deadline_offset": -5,
        "status": "Completed",
        "category": "Print & Social Media",
        "designers": ["sarra.belhadj@designflow.tn"],
        "started_days_ago": 90,
    },
    {
        "client_email": "fares.bensalem@cafemedina.tn",
        "project_name": "Café Medina — Menu & Packaging Redesign",
        "description": (
            "Redesign of the dine-in menu, takeaway packaging (cups, bags, boxes), "
            "and loyalty card."
        ),
        "budget_hours": Decimal("80.00"),
        "budget_amount": Decimal("4800.00"),
        "deadline_offset": 20,
        "status": "Active",
        "category": "Packaging & Print",
        "designers": ["amine.karray@designflow.tn", "rania.hammami@designflow.tn"],
        "started_days_ago": 30,
    },
    {
        "client_email": "imen.gharbi@gharbi-couture.tn",
        "project_name": "Gharbi Couture — Lookbook SS2025",
        "description": (
            "Editorial lookbook layout (28 pages) for the Spring/Summer 2025 "
            "collection, plus digital flipbook export."
        ),
        "budget_hours": Decimal("100.00"),
        "budget_amount": Decimal("8500.00"),
        "deadline_offset": -15,
        "status": "Completed",
        "category": "Editorial Design",
        "designers": ["rania.hammami@designflow.tn", "nour.bouzid@designflow.tn"],
        "started_days_ago": 120,
    },
    {
        "client_email": "hedi.mzoughi@tuntech.tn",
        "project_name": "TunTech Solutions — Website UI Design",
        "description": (
            "UI design for a 12-page SaaS marketing website: wireframes, "
            "hi-fi mockups, responsive specs, and handoff assets."
        ),
        "budget_hours": Decimal("150.00"),
        "budget_amount": Decimal("12000.00"),
        "deadline_offset": 45,
        "status": "Active",
        "category": "UI/UX Design",
        "designers": ["youssef.trabelsi@designflow.tn"],
        "started_days_ago": 20,
    },
    {
        "client_email": "mouna.ferchichi@financia.tn",
        "project_name": "Financia Partners — Annual Report 2024",
        "description": (
            "Design and layout of the 48-page annual report: data visualisations, "
            "infographics, and print-ready PDF."
        ),
        "budget_hours": Decimal("90.00"),
        "budget_amount": Decimal("6500.00"),
        "deadline_offset": 60,
        "status": "OnHold",
        "category": "Report Design",
        "designers": ["youssef.trabelsi@designflow.tn", "nour.bouzid@designflow.tn"],
        "started_days_ago": 15,
    },
    {
        "client_email": "aziz.chaabane@chaabaneimmo.tn",
        "project_name": "Chaabane Immobilier — Billboard Campaign",
        "description": (
            "Five billboard designs (4×3 m and 8×3 m) for a new residential "
            "complex launch in La Marsa."
        ),
        "budget_hours": Decimal("40.00"),
        "budget_amount": Decimal("2800.00"),
        "deadline_offset": -10,
        "status": "Completed",
        "category": "Outdoor Advertising",
        "designers": ["sarra.belhadj@designflow.tn"],
        "started_days_ago": 75,
    },
    {
        "client_email": "fares.bensalem@cafemedina.tn",
        "project_name": "Café Medina — Ramadan Campaign Assets",
        "description": (
            "Promotional visuals for Ramadan: 8 social posts, 2 story templates, "
            "a printed table card, and a window display sticker."
        ),
        "budget_hours": Decimal("35.00"),
        "budget_amount": Decimal("1800.00"),
        "deadline_offset": 5,
        "status": "OnHold",
        "category": "Campaign Design",
        "designers": ["rania.hammami@designflow.tn"],
        "started_days_ago": 10,
    },
]

# Task template: (task_name, estimated_hours, is_unplanned)
# Scope-creep tasks (is_unplanned=True) appear at the end of each list.
TASK_TEMPLATES = {
    "Brand Identity": [
        ("Discovery & Brand Audit",        Decimal("8.00"),  False),
        ("Logo Concept Exploration",       Decimal("12.00"), False),
        ("Logo Refinement & Variants",     Decimal("8.00"),  False),
        ("Colour Palette & Typography",    Decimal("6.00"),  False),
        ("Business Card Design",           Decimal("4.00"),  False),
        ("Letterhead & Envelope",          Decimal("4.00"),  False),
        ("Brand Guidelines Document",      Decimal("10.00"), False),
        ("Final File Package",             Decimal("3.00"),  False),
        ("Extra — Social Media Templates", Decimal("6.00"),  True),
    ],
    "Print & Social Media": [
        ("Content Strategy Brief",         Decimal("4.00"),  False),
        ("Brochure Layout Draft",          Decimal("10.00"), False),
        ("Brochure Final Artwork",         Decimal("6.00"),  False),
        ("Social Template Design (×12)",   Decimal("14.00"), False),
        ("Client Revision Round 1",        Decimal("4.00"),  False),
        ("Print-Ready Export",             Decimal("2.00"),  False),
        ("Extra — Instagram Highlights",   Decimal("3.00"),  True),
    ],
    "Packaging & Print": [
        ("Brief & Moodboard",              Decimal("3.00"),  False),
        ("Menu Typography & Layout",       Decimal("8.00"),  False),
        ("Cup & Bag Dieline Design",       Decimal("10.00"), False),
        ("Box Dieline Design",             Decimal("8.00"),  False),
        ("Loyalty Card Design",            Decimal("3.00"),  False),
        ("Revision Round",                 Decimal("4.00"),  False),
        ("Print File Handoff",             Decimal("2.00"),  False),
        ("Extra — Staff Uniform Graphics", Decimal("5.00"),  True),
    ],
    "Editorial Design": [
        ("Editorial Grid Setup",           Decimal("4.00"),  False),
        ("Cover & Intro Spread",           Decimal("6.00"),  False),
        ("Lookbook Spreads pp. 4–16",      Decimal("14.00"), False),
        ("Lookbook Spreads pp. 17–28",     Decimal("14.00"), False),
        ("Photo Retouching",               Decimal("8.00"),  False),
        ("Digital Flipbook Export",        Decimal("5.00"),  False),
        ("Client Revision Round 1",        Decimal("4.00"),  False),
        ("Final Preflight",                Decimal("3.00"),  False),
        ("Extra — BTS Instagram Content",  Decimal("4.00"),  True),
    ],
    "UI/UX Design": [
        ("Kickoff & Site Map",             Decimal("4.00"),  False),
        ("Wireframes (12 pages)",          Decimal("16.00"), False),
        ("Design System Setup",            Decimal("10.00"), False),
        ("Hi-Fi Mockups — Desktop",        Decimal("20.00"), False),
        ("Hi-Fi Mockups — Mobile",         Decimal("16.00"), False),
        ("Micro-interactions Spec",        Decimal("6.00"),  False),
        ("Prototype & Handoff",            Decimal("8.00"),  False),
        ("Revision Round",                 Decimal("6.00"),  False),
        ("Extra — Onboarding Flow",        Decimal("8.00"),  True),
        ("Extra — 404 & Empty States",     Decimal("4.00"),  True),
    ],
    "Report Design": [
        ("Data Collection & Structure",    Decimal("6.00"),  False),
        ("Cover & Section Openers",        Decimal("8.00"),  False),
        ("Infographic Design (×6)",        Decimal("12.00"), False),
        ("Body Layouts pp. 1–24",          Decimal("12.00"), False),
        ("Body Layouts pp. 25–48",         Decimal("12.00"), False),
        ("Charts & Data Visualisation",    Decimal("10.00"), False),
        ("Proofreading Pass",              Decimal("4.00"),  False),
        ("Print & Digital Export",         Decimal("3.00"),  False),
    ],
    "Outdoor Advertising": [
        ("Brief & Concept",                Decimal("3.00"),  False),
        ("Billboard Draft v1 (×3)",        Decimal("8.00"),  False),
        ("Billboard Draft v2 (×2)",        Decimal("6.00"),  False),
        ("Client Revisions",               Decimal("4.00"),  False),
        ("Final Artwork (×5)",             Decimal("5.00"),  False),
        ("Printer-Ready Files",            Decimal("2.00"),  False),
    ],
    "Campaign Design": [
        ("Campaign Brief & Moodboard",     Decimal("2.00"),  False),
        ("Social Post Designs (×8)",       Decimal("10.00"), False),
        ("Story Templates (×2)",           Decimal("4.00"),  False),
        ("Table Card Design",              Decimal("2.00"),  False),
        ("Window Display Sticker",         Decimal("3.00"),  False),
        ("Revision Round",                 Decimal("2.00"),  False),
        ("Final Export",                   Decimal("1.00"),  False),
    ],
}

# (category, content, status, resolved)
FEEDBACK_FIXTURES = [
    # Revisions
    ("Revision", "The logo mark feels too heavy for small print sizes — could we try a thinner stroke weight?", "Resolved", True),
    ("Revision", "The colour palette doesn't feel premium enough. We'd prefer something closer to gold and deep navy.", "InProgress", False),
    ("Revision", "The typography on the brochure cover should be increased by about 20% — it gets lost at a distance.", "Resolved", True),
    ("Revision", "The packaging illustration style doesn't match our brand tone. Please revisit with a cleaner, more minimal approach.", "Pending", False),
    ("Revision", "The grid on pages 12–14 feels unbalanced — the images need more breathing room.", "Resolved", True),
    # Approvals
    ("Approval", "The logo variants look great — approved to proceed to brand guidelines.", "Resolved", True),
    ("Approval", "Final brochure approved. Please send the print-ready files at your earliest convenience.", "Resolved", True),
    ("Approval", "We love the lookbook layout. Approved for digital flipbook export.", "Resolved", True),
    ("Approval", "Mockups are exactly what we envisioned. Approved for handoff to development.", "Resolved", True),
    # Questions
    ("Question", "What file formats will be included in the final brand package?", "Resolved", True),
    ("Question", "Can we get a version of the logo on a transparent background?", "InProgress", False),
    ("Question", "Is it possible to add a dark-mode variant of the UI mockups?", "Pending", False),
    ("Question", "What is the turnaround time if we request another revision round?", "Resolved", True),
]

MESSAGE_TEXTS = [
    "Sharing the latest version for your review — files have been uploaded.",
    "Quick note: we'll be starting on the next milestone tomorrow morning.",
    "Could you confirm the final brand colours before we proceed to artwork?",
    "The revision round is now complete. Looking forward to your feedback.",
    "Heads-up — we may need one additional day for the typography refinements.",
    "All files have been uploaded. Let us know if anything needs adjustment.",
    "Great progress this week. The team is on track for the deadline.",
    "We've incorporated your notes and updated the designs accordingly.",
    "Can you share the latest version of the logo in vector format (AI/EPS)?",
    "Confirming the kickoff meeting is set for next Monday at 10:00 AM.",
    "The print files are ready for the vendor — awaiting your sign-off.",
    "We've completed the first sprint. Summary sent to your email.",
]

# (file_name, file_type, size_bytes)
FILE_FIXTURES = [
    ("logo_primary_v1.pdf",         "deliverable",    245_000),
    ("brand_guidelines_v2.pdf",     "deliverable",  1_850_000),
    ("social_templates_pack.zip",   "deliverable",  3_200_000),
    ("mockups_desktop_v2.fig",      "deliverable",  4_500_000),
    ("lookbook_final_print.pdf",    "deliverable",  9_800_000),
    ("billboard_artwork_final.pdf", "deliverable",  2_100_000),
    ("menu_print_ready.pdf",        "deliverable",  3_400_000),
    ("annual_report_draft_v1.pdf",  "deliverable",  5_600_000),
    ("brand_reference_images.zip",  "reference",   12_000_000),
    ("competitor_logos.pdf",        "reference",      850_000),
    ("inspiration_moodboard.pdf",   "reference",    2_300_000),
    ("photo_assets_raw.zip",        "reference",   28_000_000),
    ("existing_brand_guide.pdf",    "brand_guideline", 3_100_000),
    ("logo_archive.zip",            "brand_guideline", 1_400_000),
    ("colour_swatches.ase",         "brand_guideline",    45_000),
]

ACTIVITY_ACTIONS = ["start", "pause", "resume", "stop"]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _backdate(model_cls, pk: int, **fields) -> None:
    """Override auto_now_add / auto_now fields by going directly to the DB."""
    model_cls.objects.filter(pk=pk).update(**fields)


def _random_dt_in_range(start_dt, end_dt):
    """Return a random timezone-aware datetime between start_dt and end_dt."""
    delta = int((end_dt - start_dt).total_seconds())
    if delta <= 0:
        return start_dt
    offset = RNG.randint(0, delta)
    return start_dt + timedelta(seconds=offset)


def _hours_factor(status: str) -> float:
    """
    Return a multiplier applied to estimated_hours when generating actual
    logged hours.  Completed tasks run slightly over estimate (realistic scope
    creep); active tasks are partially done; on-hold tasks barely touched.
    """
    return {
        "Completed": RNG.uniform(0.90, 1.30),
        "InProgress": RNG.uniform(0.40, 0.75),
        "Todo":       RNG.uniform(0.00, 0.15),
        "OnHold":     RNG.uniform(0.10, 0.35),
    }[status]


# ---------------------------------------------------------------------------
# Command
# ---------------------------------------------------------------------------

class Command(BaseCommand):
    help = "Seed the database with realistic DesignFlow demo data (Tunisian agency)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--flush",
            action="store_true",
            help="Delete all previously seeded data before re-seeding.",
        )

    # ------------------------------------------------------------------ #
    # Entry point                                                          #
    # ------------------------------------------------------------------ #

    @transaction.atomic
    def handle(self, *args, **options):
        from django.db.models.signals import post_save
        from apps.users.models import User
        from apps.users.signals import on_user_created

        if options["flush"]:
            self._flush()

        # Demo accounts are activated immediately, so invitation emails would be misleading.
        signal_was_connected = post_save.disconnect(on_user_created, sender=User)
        try:
            manager_user = self._seed_manager()
            designer_map = self._seed_designers()   # email -> Designer instance
            client_map   = self._seed_clients()     # email -> Client instance
            self._seed_projects(manager_user, designer_map, client_map)
            self._seed_current_week_logs()
        finally:
            if signal_was_connected:
                post_save.connect(on_user_created, sender=User)

        self.stdout.write(self.style.SUCCESS("\n✅  Seed complete."))
        self.stdout.write(f"    Password for all accounts: {PASSWORD}")
        self.stdout.write(f"    Manager login: {MANAGER_DATA['email']}\n")

    # ------------------------------------------------------------------ #
    # Flush                                                                #
    # ------------------------------------------------------------------ #

    def _flush(self):
        from apps.projects.models import Project
        from apps.users.models import User

        self.stdout.write("  Flushing existing seeded data …")

        # Delete projects first — cascades to Task, TimeLog, Feedback,
        # Message, FileUpload, ProjectAssignment.
        all_emails = (
            [MANAGER_DATA["email"]]
            + [d["email"] for d in DESIGNERS_DATA]
            + [c["email"] for c in CLIENTS_DATA]
        )
        Project.objects.filter(
            client__user__email__in=all_emails
        ).delete()

        # Now safe to delete users (Client/Designer profiles cascade via
        # OneToOne with on_delete=CASCADE).
        User.objects.filter(email__in=all_emails).delete()

        self.stdout.write(self.style.WARNING("  Flush done.\n"))

    # ------------------------------------------------------------------ #
    # Users                                                                #
    # ------------------------------------------------------------------ #

    def _create_user(self, email: str, full_name: str, role: str, *, days_ago: int = 0):
        """
        Create (or retrieve) a User, set is_active=True, and backdate
        created_at.  Returns the User instance.
        """
        from apps.users.models import User

        user, created = User.objects.get_or_create(
            email=email,
            defaults={"full_name": full_name, "role": role, "is_active": True},
        )
        if created:
            user.set_password(PASSWORD)
            user.is_active = True
            user.save(update_fields=["password", "is_active"])
            created_at = NOW - timedelta(days=days_ago)
            _backdate(User, user.pk, created_at=created_at)
            label = "created"
        else:
            label = "exists"

        self.stdout.write(f"    [{label}] {role:8s}  {full_name} <{email}>")
        return User.objects.get(pk=user.pk)

    def _seed_manager(self):
        self.stdout.write("\n── Manager ──────────────────────────────────────")
        return self._create_user(
            email=MANAGER_DATA["email"],
            full_name=MANAGER_DATA["full_name"],
            role="Manager",
            days_ago=180,
        )

    def _seed_designers(self) -> dict:
        """Returns {email: Designer} mapping."""
        from apps.users.models import Designer

        self.stdout.write("\n── Designers ────────────────────────────────────")
        result = {}
        for i, d in enumerate(DESIGNERS_DATA):
            user = self._create_user(
                email=d["email"],
                full_name=d["full_name"],
                role="Designer",
                days_ago=150 - i * 10,
            )
            designer, _ = Designer.objects.get_or_create(user=user)
            designer.hourly_rate = d["hourly_rate"]
            designer.specialization = d["specialization"]
            designer.available_hours_per_week = d["available_hours_per_week"]
            designer.save(update_fields=["hourly_rate", "specialization", "available_hours_per_week"])
            result[d["email"]] = designer
        return result

    def _seed_clients(self) -> dict:
        """Returns {email: Client} mapping."""
        from apps.users.models import Client

        self.stdout.write("\n── Clients ──────────────────────────────────────")
        result = {}
        for i, c in enumerate(CLIENTS_DATA):
            user = self._create_user(
                email=c["email"],
                full_name=c["full_name"],
                role="Client",
                days_ago=120 - i * 5,
            )
            client, _ = Client.objects.get_or_create(user=user)
            client.phone = c["phone"]
            client.industry = c["industry"]
            client.save(update_fields=["phone", "industry"])
            result[c["email"]] = client
        return result

    # ------------------------------------------------------------------ #
    # Projects                                                             #
    # ------------------------------------------------------------------ #

    def _seed_projects(self, manager_user, designer_map: dict, client_map: dict):
        self.stdout.write("\n── Projects ─────────────────────────────────────")
        for pd in PROJECTS_DATA:
            self._seed_one_project(pd, manager_user, designer_map, client_map)

    def _seed_one_project(self, pd: dict, manager_user, designer_map, client_map):
        from apps.projects.models import Project, ProjectAssignment

        client  = client_map[pd["client_email"]]
        project, created = Project.objects.get_or_create(
            project_name=pd["project_name"],
            client=client,
            defaults={
                "description":   pd["description"],
                "budget_hours":  pd["budget_hours"],
                "budget_amount": pd["budget_amount"],
                "deadline":      TODAY + timedelta(days=pd["deadline_offset"]),
                "status":        pd["status"],
                "category":      pd["category"],
            },
        )

        label = "created" if created else "exists "
        self.stdout.write(f"\n  [{label}] {project.project_name}")

        if not created:
            return  # idempotent — skip downstream objects for this project

        # Backdate project timestamps
        project_start = NOW - timedelta(days=pd["started_days_ago"])
        _backdate(Project, project.pk, created_at=project_start, updated_at=project_start)

        # Assignments ──────────────────────────────────────────────────
        designers_on_project = []
        for email in pd["designers"]:
            designer = designer_map[email]
            assignment = ProjectAssignment.objects.create(
                project=project, designer=designer
            )
            assign_dt = project_start + timedelta(days=RNG.randint(0, 2))
            _backdate(ProjectAssignment, assignment.pk, assigned_at=assign_dt)
            designers_on_project.append(designer)
            self.stdout.write(
                f"    ↳ assigned  {designer.user.full_name}"
            )

        # Tasks ────────────────────────────────────────────────────────
        tasks = self._seed_tasks(project, pd, designers_on_project, project_start)

        # Messages ─────────────────────────────────────────────────────
        participants = [manager_user, client.user] + [
            d.user for d in designers_on_project
        ]
        self._seed_messages(project, participants, project_start)

        # Feedback ─────────────────────────────────────────────────────
        self._seed_feedback(project, project_start)

        # File uploads ─────────────────────────────────────────────────
        self._seed_files(project, designers_on_project, client, project_start)

    # ------------------------------------------------------------------ #
    # Tasks & time logs                                                    #
    # ------------------------------------------------------------------ #

    def _seed_tasks(self, project, pd: dict, designers: list, project_start) -> list:
        from apps.tasks.models import Task
        from apps.timelog.models import TimeLog, ActivityLog

        templates   = TASK_TEMPLATES[pd["category"]]
        project_end = NOW if pd["status"] != "Completed" else NOW - timedelta(
            days=RNG.randint(3, 20)
        )
        total_span_secs = max(int((project_end - project_start).total_seconds()), 1)
        task_slot_secs  = total_span_secs // max(len(templates), 1)

        all_tasks = []
        for idx, (task_name, estimated_hours, is_unplanned) in enumerate(templates):
            # Determine status per task based on project status + position
            task_status = self._decide_task_status(pd["status"], idx, len(templates))

            # Place task creation in chronological order within the project
            task_start_dt = project_start + timedelta(seconds=idx * task_slot_secs)
            task_start_dt = min(task_start_dt, NOW - timedelta(hours=1))

            completed_at = None
            if task_status == "Completed":
                completed_at = task_start_dt + timedelta(
                    seconds=int(task_slot_secs * RNG.uniform(0.5, 0.95))
                )
                completed_at = min(completed_at, NOW)

            task = Task.objects.create(
                project=project,
                task_name=task_name,
                description=f"Deliverable: {task_name} for {project.project_name}.",
                estimated_hours=estimated_hours,
                status=task_status,
                is_unplanned=is_unplanned,
                completed_at=completed_at,
            )
            _backdate(Task, task.pk, created_at=task_start_dt)
            all_tasks.append(task)

            # Time logs ────────────────────────────────────────────────
            if task_status == "Todo":
                continue  # no work logged yet

            factor = _hours_factor(
                task_status if pd["status"] != "OnHold" else "OnHold"
            )
            actual_hours = float(estimated_hours) * factor
            if actual_hours < 0.25:
                continue

            self._seed_time_logs(
                task=task,
                designers=designers,
                actual_hours=actual_hours,
                task_start_dt=task_start_dt,
                completed_at=completed_at or NOW,
            )

            # Activity log (start + stop pair) ─────────────────────────
            designer = RNG.choice(designers)
            start_dt = _random_dt_in_range(task_start_dt, completed_at or NOW)
            stop_dt  = start_dt + timedelta(hours=actual_hours)
            stop_dt  = min(stop_dt, NOW)

            ActivityLog.objects.create(
                designer=designer,
                task=task,
                action="start",
            )
            _backdate(
                ActivityLog,
                ActivityLog.objects.filter(
                    designer=designer, task=task, action="start"
                ).latest("timestamp").pk,
                timestamp=start_dt,
            )
            stop_entry = ActivityLog.objects.create(
                designer=designer,
                task=task,
                action="stop",
                hours_logged=round(Decimal(str(actual_hours)), 2),
            )
            _backdate(ActivityLog, stop_entry.pk, timestamp=stop_dt)

        self.stdout.write(
            f"    ↳ tasks     {len(all_tasks)} created "
            f"({sum(1 for t in all_tasks if t.is_unplanned)} unplanned)"
        )
        return all_tasks

    def _decide_task_status(self, project_status: str, task_idx: int, total: int) -> str:
        """
        Assign a realistic task status based on project-level status and the
        task's position in the ordered list.
        """
        if project_status == "Completed":
            return "Completed"

        # What fraction of the task list has elapsed?
        progress = task_idx / max(total - 1, 1)

        if project_status == "OnHold":
            # Only the first quarter of tasks got started
            if progress < 0.20:
                return "Completed"
            if progress < 0.30:
                return "InProgress"
            return "Todo"

        # Active project: roughly 50-65 % of tasks done
        completion_threshold = RNG.uniform(0.50, 0.65)
        if progress < completion_threshold * 0.8:
            return "Completed"
        if progress < completion_threshold:
            return "InProgress"
        return "Todo"

    def _seed_time_logs(
        self, task, designers: list, actual_hours: float, task_start_dt, completed_at
    ):
        from apps.timelog.models import TimeLog

        # Split actual hours into 1–3 log entries spread across the task window
        n_logs = RNG.randint(1, min(3, max(1, int(actual_hours // 2))))
        hours_remaining = actual_hours

        for i in range(n_logs):
            if i == n_logs - 1:
                chunk = hours_remaining
            else:
                chunk = RNG.uniform(0.5, hours_remaining * 0.6)
            hours_remaining -= chunk
            if chunk < 0.25:
                continue

            designer  = RNG.choice(designers)
            log_dt    = _random_dt_in_range(task_start_dt, completed_at)
            time_log  = TimeLog.objects.create(
                task=task,
                designer=designer,
                hours_spent=round(Decimal(str(chunk)), 2),
                description=f"Work session on '{task.task_name}'.",
            )
            _backdate(TimeLog, time_log.pk, created_at=log_dt)

    # ------------------------------------------------------------------ #
    # Messages                                                             #
    # ------------------------------------------------------------------ #

    def _seed_messages(self, project, participants: list, project_start):
        from apps.messages.models import Message

        n = RNG.randint(4, 8)
        chosen_texts = RNG.sample(MESSAGE_TEXTS, min(n, len(MESSAGE_TEXTS)))

        for i, text in enumerate(chosen_texts):
            sender = RNG.choice(participants)
            msg_dt = _random_dt_in_range(
                project_start + timedelta(days=i),
                NOW,
            )
            msg = Message.objects.create(
                project=project,
                sender=sender,
                content_text=text,
            )
            _backdate(Message, msg.pk, created_at=msg_dt)

        self.stdout.write(f"    ↳ messages  {len(chosen_texts)} created")

    # ------------------------------------------------------------------ #
    # Feedback                                                             #
    # ------------------------------------------------------------------ #

    def _seed_feedback(self, project, project_start):
        from apps.feedback.models import Feedback

        # Pick 3–5 feedback items, weighted toward Revision and Approval
        sample = RNG.sample(FEEDBACK_FIXTURES, RNG.randint(3, 5))
        count  = 0
        for category, content, status, resolved in sample:
            submit_dt = _random_dt_in_range(
                project_start + timedelta(days=5), NOW
            )
            resolved_at = None
            if resolved:
                resolved_at = submit_dt + timedelta(days=RNG.randint(1, 7))
                resolved_at = min(resolved_at, NOW)

            fb = Feedback.objects.create(
                project=project,
                category=category,
                content_text=content,
                status=status,
                resolved_at=resolved_at,
            )
            _backdate(Feedback, fb.pk, submitted_at=submit_dt)
            count += 1

        self.stdout.write(f"    ↳ feedback  {count} created")

    # ------------------------------------------------------------------ #
    # File uploads                                                         #
    # ------------------------------------------------------------------ #

    def _seed_files(self, project, designers: list, client, project_start):
        from apps.files.models import FileUpload

        # 2–4 files per project: deliverables from designers, references from client
        n_deliverables = RNG.randint(1, 2)
        n_references   = RNG.randint(1, 2)

        deliverable_pool = [f for f in FILE_FIXTURES if f[1] == "deliverable"]
        reference_pool   = [f for f in FILE_FIXTURES if f[1] in ("reference", "brand_guideline")]

        chosen = (
            RNG.sample(deliverable_pool, min(n_deliverables, len(deliverable_pool)))
            + RNG.sample(reference_pool, min(n_references, len(reference_pool)))
        )

        count = 0
        for file_name, file_type, file_size in chosen:
            uploader = (
                RNG.choice(designers).user
                if file_type == "deliverable"
                else client.user
            )
            upload_dt = _random_dt_in_range(
                project_start + timedelta(days=3), NOW
            )
            fu = FileUpload.objects.create(
                project=project,
                uploaded_by=uploader,
                file_type=file_type,
                file_name=file_name,
                file_path=f"projects/{project.pk}/{file_name}",
                file_size=file_size,
            )
            _backdate(FileUpload, fu.pk, uploaded_at=upload_dt)
            count += 1

        self.stdout.write(f"    ↳ files     {count} created")

    def _seed_current_week_logs(self):
        """
        Create a small number of time logs dated within the current calendar
        week so the Designer Utilisation widget on the Manager Dashboard
        shows meaningful data instead of 0% for all designers.

        The DesignerUtilizationView defaults to the current Mon–Sun window
        when no date filter is supplied, so historical logs don't count.
        """
        from apps.projects.models import Project, ProjectAssignment
        from apps.tasks.models import Task
        from apps.timelog.models import TimeLog

        today      = date.today()
        week_start = today - timedelta(days=today.weekday())  # Monday
        count      = 0

        for project in Project.objects.filter(status='Active'):
            assignments = list(
                ProjectAssignment.objects.filter(project=project).select_related('designer')
            )
            if not assignments:
                continue

            # Prefer tasks already in progress; fall back to Todo tasks.
            tasks = list(Task.objects.filter(project=project, status='InProgress'))
            if not tasks:
                tasks = list(Task.objects.filter(project=project, status='Todo'))
            if not tasks:
                continue

            for assignment in assignments:
                designer = assignment.designer
                n_logs   = RNG.randint(1, 2)
                for _ in range(n_logs):
                    task  = RNG.choice(tasks)
                    hours = round(Decimal(str(RNG.uniform(2.0, 7.0))), 2)

                    # Random day between Monday and today
                    days_offset = RNG.randint(0, today.weekday())
                    log_dt = timezone.make_aware(
                        datetime.datetime.combine(
                            week_start + timedelta(days=days_offset),
                            datetime.time(RNG.randint(8, 17), RNG.randint(0, 59)),
                        )
                    )

                    tl = TimeLog.objects.create(
                        task=task,
                        designer=designer,
                        hours_spent=hours,
                        description=f"Current-week session on '{task.task_name}'.",
                    )
                    _backdate(TimeLog, tl.pk, created_at=log_dt)
                    count += 1

        self.stdout.write(f'\n  ↳ current-week logs  {count} created (designer utilisation)')
