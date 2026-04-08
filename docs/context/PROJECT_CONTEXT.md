# Project Context — DesignOps: Design Project Profitability Analytics System

> This file is the fast-read primer. For full Django model code see DATA_MODEL.md. For Code conventions and sprint checklists see DEVELOPMENT.md.

---

## What This Is

A web-based **project management + BI system** for a graphic design agency. Tracks projects, designer time, client feedback, and generates profitability analytics for managers.

**Academic context:** Final year IT internship project · solo developer · 3 months · 5 sprints  
**Core problem solved:** Agencies lose money due to scope creep and no visibility into actual vs. budgeted hours.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Python 3.12, Django 5, Django REST Framework 3.15 |
| Auth | JWT via `djangorestframework-simplejwt` + custom invitation tokens |
| Database | PostgreSQL 16 |
| Frontend | React 18, TypeScript, Vite |
| Data fetching | TanStack React Query |
| HTTP client | Axios |
| Styling | Tailwind CSS |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| Email | Django SMTP (Gmail App Password) |
| PDF export | ReportLab |
| Excel export | openpyxl |
| AI inference | Groq API (`llama-3.3-70b-versatile`) |
| Deployment | Render (Web Service + Static Site + PostgreSQL) |

---

## Folder Structure

```
DesignOps/
├── backend/
│   ├── core/               # settings, urls, wsgi
│   └── apps/
│       ├── users/          # User, Designer, Client, InvitationToken
│       ├── projects/       # Project, ProjectAssignment
│       ├── tasks/          # Task
│       ├── timelog/        # TimeLog
│       ├── feedback/       # Feedback
│       ├── files/          # FileUpload
│       ├── messages/       # Message
│       └── analytics/      # No models — aggregate query views + AI endpoints
└── frontend/src/
    ├── api/                # Axios instance + per-resource typed functions
    ├── components/         # ui/ (Button, Card, Modal…) + feature components
    ├── pages/              # manager/ · designer/ · client/ · auth/
    ├── hooks/              # React Query hooks per resource
    ├── context/            # AuthContext
    ├── types/              # TypeScript interfaces mirroring DB tables
    └── utils/              # date formatting, currency helpers
```

---

## Roles & Permissions

`User.role` stores one of `'Manager' | 'Designer' | 'Client'`. Enforced on every API view and mirrored in the frontend with `<ProtectedRoute>`.

| Capability | Manager | Designer | Client |
|---|:---:|:---:|:---:|
| All BI dashboards & analytics | ✅ | ❌ | ❌ |
| Create / edit / delete projects | ✅ | ❌ | ❌ |
| Assign designers to projects | ✅ | ❌ | ❌ |
| View all projects | ✅ | ❌ | ❌ |
| View assigned projects | ✅ | ✅ | ❌ |
| Log time / update task status | ✅ | ✅ | ❌ |
| Upload deliverables | ✅ | ✅ | ❌ |
| View client feedback | ✅ | ✅ | ❌ |
| View own projects | ✅ | ❌ | ✅ |
| Submit feedback / revisions | ✅ | ❌ | ✅ |
| Upload reference materials | ✅ | ❌ | ✅ |
| Send messages | ✅ | ✅ | ✅ |
| Generate & export reports | ✅ | ❌ | ❌ |
| Create user accounts | ✅ | ❌ | ❌ |
| AI task hour estimation | ✅ | ❌ | ❌ |
| AI project health narrative | ✅ | ❌ | ❌ |

---

## Auth Flow

**Login:**
1. `POST /api/auth/token/` → `{ access, refresh }` JWT pair
2. JWT payload contains `user_id`, `email`, `role`
3. Axios interceptor attaches `Authorization: Bearer <access>` automatically
4. On 401, interceptor calls `/api/auth/token/refresh/` and retries
5. Frontend reads `role` from decoded token → redirects to `/manager`, `/designer`, or `/client`

**Invitation (new users):**
1. Manager creates user in Django Admin → `post_save` signal → UUID token generated → email sent
2. User clicks link → `/activate?token=xxx` → sets password
3. `POST /api/auth/activate/` validates: exists + `is_used=False` + `expires_at > now()`
4. `User.is_active = True`, `token.is_used = True` → redirect to login

---

## API Endpoints

```
# Auth
POST   /api/auth/token/                  Login
POST   /api/auth/token/refresh/
POST   /api/auth/activate/               First-time password setup

# Users
GET    /api/users/me/                    Own profile
PATCH  /api/users/me/

# Projects
GET    /api/projects/                    List (role-filtered automatically)
POST   /api/projects/                    Manager only
GET    /api/projects/{id}/
PATCH  /api/projects/{id}/
DELETE /api/projects/{id}/
GET    /api/projects/{id}/summary/       EHR + budget utilisation snapshot
POST   /api/projects/{id}/assign/        Assign designer (Manager only)

# Tasks
GET    /api/tasks/?project={id}
POST   /api/tasks/                       Manager only
PATCH  /api/tasks/{id}/
DELETE /api/tasks/{id}/

# Time Logs
GET    /api/timelogs/?task={id}
POST   /api/timelogs/                    Designer only
PATCH  /api/timelogs/{id}/              Own logs only
DELETE /api/timelogs/{id}/

# Feedback
GET    /api/feedback/?project={id}
POST   /api/feedback/                    Client only
PATCH  /api/feedback/{id}/              Update status (Manager/Designer)

# Messages
GET    /api/messages/?project={id}
POST   /api/messages/

# Files
GET    /api/files/?project={id}
POST   /api/files/                       multipart/form-data
DELETE /api/files/{id}/

# Analytics — Manager only
GET    /api/analytics/ehr/
GET    /api/analytics/budget-variance/   ?date_from=&date_to=&project=&client=
GET    /api/analytics/profitability/
GET    /api/analytics/designer-utilization/
GET    /api/analytics/scope-creep/
GET    /api/analytics/kpi-summary/       KPI cards data

# AI — see AI Features section below
POST   /api/tasks/estimate-hours/       Manager only — body: { task_name, description, project_id }
GET    /api/analytics/ai-summary/?project={id}   Manager only

# Reports — Manager only
GET    /api/reports/export/?format=pdf&project={id}
GET    /api/reports/export/?format=excel&project={id}
```

---

## Frontend Routes

```
/                       Redirect by role
/login                  Public
/activate               Public (requires valid token query param)

/manager/               KPI dashboard
/manager/projects/      All projects
/manager/projects/:id   Project detail (tasks, timelogs, feedback)
/manager/analytics/     BI dashboards + charts
/manager/reports/       Export PDF / Excel

/designer/              Assigned projects overview
/designer/projects/:id  Project detail (time logging, task management)

/client/                Own project status
/client/projects/:id    Project detail (feedback, file upload, messages)
```

---

## BI Metrics

All computed server-side via PostgreSQL aggregations. No stored calculated fields.

| Metric | Formula |
|--------|---------|
| Effective Hourly Rate (EHR) | `budget_amount / SUM(hours_spent)` |
| Budget Utilisation % | `SUM(hours_spent) / budget_hours * 100` |
| Estimation Variance % | `(SUM(actual) - SUM(estimated)) / SUM(estimated) * 100` |
| Scope Creep Index | `COUNT(is_unplanned=True) / COUNT(*) * 100` per project |
| Client Profitability | Ranked by EHR weighted down by revision count |
| Designer Utilisation | `SUM(hours_spent this week) / available_hours_per_week * 100` |
| Revision-to-Approval Ratio | `COUNT(category='Revision') / COUNT(category='Approval')` |

---

## AI Features

> AI inference is handled server-side via the **Groq API** (`llama-3.3-70b-versatile` model) using
> the `groq` Python library. The key is stored in `.env` as `GROQ_API_KEY` and loaded via `settings.py`.

---

### Option A — AI Task Hour Estimator

**Implemented:** Sprint 2  
**Endpoint:** `POST /api/tasks/estimate-hours/`  
**Access:** Manager only

**What it does:**  
When creating a task, the user can request an AI-suggested `estimated_hours` value. The backend queries the database for past time logs on similar tasks within the same project, then sends that historical context along with the new task's name and description to the LLM. The model returns a suggested hour estimate with a brief justification.

**Why AI is justified here:**  
A static lookup table (e.g. "logo = 6h") would produce generic estimates with no awareness of this agency's actual pace or project complexity. By passing real historical `TimeLog` records as context, the model performs retrieval-augmented reasoning over project-specific data — something a hardcoded rule cannot do. The estimate improves naturally as more time logs accumulate.

**Request body:**
```json
{
  "task_name": "Design homepage hero section",
  "description": "Full-width banner with animation, mobile responsive"
}
```

**Response:**
```json
{
  "suggested_hours": 6.5,
  "reasoning": "Based on 3 similar UI design tasks in this project averaging 6.2 hours, and accounting for the animation requirement, 6.5 hours is a reasonable estimate."
}
```

**Context passed to LLM:**  
Up to 10 most recent `TimeLog` records from the same project, filtered by keyword match on
`task__task_name`. Each record includes `task_name`, `estimated_hours`, and `hours_spent`.

---

### Option B — AI Project Health Narrative

**Implemented:** Sprint 5  
**Endpoint:** `GET /api/analytics/ai-summary/?project={id}`  
**Access:** Manager only

**What it does:**  
After the analytics engine computes all BI metrics for a project, those figures are passed to the
LLM which synthesises them into a 3–4 sentence plain-English health summary. The summary flags
risks and suggests one concrete action for the manager. It is displayed as a card on the manager's
project detail page, alongside the existing charts.

**Why AI is justified here:**  
Synthesising multiple metrics (budget utilisation, EHR vs target, scope creep index,
revision-to-approval ratio, days remaining) into a coherent narrative with contextual judgment
is genuinely non-trivial for a rule-based system. A rules engine would require exhaustive
branching logic and still produce rigid, template-like text. The LLM produces nuanced,
context-aware prose that adapts to the specific combination of metric values.

**Response:**
```json
{
  "summary": "This project is consuming budget faster than planned, with utilisation at 87% while only 65% of tasks are complete. The scope creep index of 34% suggests significant unplanned work has been added since kickoff, which is likely driving the overrun. The revision-to-approval ratio of 3:1 indicates ongoing client friction that may further extend timelines. Recommend a scope review meeting with the client before logging additional unplanned tasks."
}
```

**Metrics passed to LLM:**
- Budget utilisation %
- Effective Hourly Rate vs target rate
- Scope creep index %
- Revision-to-approval ratio
- Days until deadline

---

## Sprint Plan

5 × 2-week sprints. Estimation in person-days; total: 86.

| Sprint | Weeks | Goal | Days |
|--------|-------|------|------|
| **S1** | 1–2 | Foundation & Auth: scaffold Django + React, all models migrated, JWT login, invitation flow, user management | 16 |
| S2 | 3–4 | Project & Task Management: project/task CRUD, designer assignment, role-scoped views + AI Task Estimator | 19 |
| S3 | 5–6 | Time Tracking & Deliverables: time logging, task status, file uploads, view client feedback | 13 |
| S4 | 7–8 | Client Portal & Feedback: client portal, feedback submission & replies, resolution, messaging | 20 |
| S5 | 9–12 | BI Dashboards, Reports & Deployment: KPI cards, budget vs actual, EHR, client profitability, scope creep, AI Health Narrative, report generation, PDF/Excel export, tests, Render deploy, README | 18 |

**Per-sprint risks:**
- **S1:** Model mistakes cascade — validate every field against ERD before first migration; test Gmail SMTP on day 1
- **S2:** RBAC queryset filtering must be correct before building client-facing views; implement AI estimator only after task CRUD is solid
- **S3:** File upload storage — plan Cloudinary/S3 early; Render disk is ephemeral
- **S4:** Keep messaging UI simple for MVP; scope creep risk is high for this sprint
- **S5:** Add DB indexes before writing aggregate queries; AI health narrative depends on all analytics endpoints being complete first. ReportLab (PDF) is fiddly — prioritise it over Excel. Add GROQ_API_KEY to Render environment variables before deploying

---

## Key Design Decisions

- **No `Revision` model** — revisions are `Feedback` with `category='Revision'`
- **`is_unplanned` on Task** — `True` means scope creep; drives the Scope Creep Index metric
- **Designer and Client are profile tables** — separate from User, 1:1 via `user_id UNIQUE`; all auth goes through User
- **`analytics` app has no models** — only views running aggregate queries across other apps
- **No public signup** — all users created by Manager via Django Admin; invitation email is the only entry point
- **`budget_amount` stores the monetary amount** (e.g. `15000.00` for 15000 TND)
- **Files stored in `MEDIA_ROOT/projects/{project_id}/`** — on Render, use Cloudinary or S3 since Render's disk is ephemeral
