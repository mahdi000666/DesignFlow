# Development Guide

> Code conventions and sprint checklists. Open alongside your code editor during active development.

---

## Backend Conventions

### App structure
Every app follows the same layout:
```
apps/tasks/
├── models.py
├── serializers.py
├── views.py
├── urls.py
├── permissions.py   # App-specific overrides (if any)
├── filters.py       # django-filter FilterSets
└── admin.py
```

### `core/urls.py` wiring
```python
urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/',      include('apps.users.urls')),
    path('api/users/',     include('apps.users.urls_users')),
    path('api/projects/',  include('apps.projects.urls')),
    path('api/tasks/',     include('apps.tasks.urls')),
    path('api/timelogs/',  include('apps.timelog.urls')),
    path('api/feedback/',  include('apps.feedback.urls')),
    path('api/files/',     include('apps.files.urls')),
    path('api/messages/',  include('apps.messages.urls')),
    path('api/analytics/', include('apps.analytics.urls')),
    path('api/reports/',   include('apps.analytics.report_urls')),
]
```

### Permission classes
```python
# apps/users/permissions.py
from rest_framework.permissions import BasePermission

class IsManager(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'Manager'

class IsDesigner(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'Designer'

class IsClient(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'Client'

class IsManagerOrDesigner(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ('Manager', 'Designer')
```

### Read/Write serializer pattern
```python
# Read serializer — computed/nested data for list and detail views
class ProjectReadSerializer(serializers.ModelSerializer):
    client_name  = serializers.CharField(source='client.user.full_name', read_only=True)
    actual_hours = serializers.SerializerMethodField()

    def get_actual_hours(self, obj):
        from django.db.models import Sum
        return obj.tasks.aggregate(total=Sum('time_logs__hours_spent'))['total'] or 0

    class Meta:
        model = Project
        fields = '__all__'

# Write serializer — only writable fields on create/update
class ProjectWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = ['client', 'project_name', 'description', 'budget_hours',
                  'budget_amount', 'deadline', 'status', 'category']
```

### ViewSet pattern
```python
class ProjectViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return ProjectWriteSerializer
        return ProjectReadSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role == 'Manager':
            return Project.objects.select_related('client__user').all()
        elif user.role == 'Designer':
            return Project.objects.filter(assignments__designer__user=user)
        elif user.role == 'Client':
            return Project.objects.filter(client__user=user)
        return Project.objects.none()

    def get_permissions(self):
        if self.action in ('create', 'destroy'):
            return [IsManager()]
        if self.action in ('update', 'partial_update'):
            return [IsManagerOrDesigner()]
        return [IsAuthenticated()]
```

---

## Frontend Conventions

### Axios client
```typescript
// src/api/client.ts
import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refresh = localStorage.getItem('refresh_token');
      const { data } = await apiClient.post('/auth/token/refresh/', { refresh });
      localStorage.setItem('access_token', data.access);
      original.headers.Authorization = `Bearer ${data.access}`;
      return apiClient(original);
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

### TypeScript types
```typescript
// src/types/project.ts
export interface Project {
  readonly id: number;
  readonly client_name: string;
  readonly actual_hours: number;       // Computed by backend
  readonly created_at: string;
  project_name: string;
  description: string;
  budget_hours: number | null;
  budget_amount: number | null;
  deadline: string | null;             // ISO date string
  status: 'Active' | 'Completed' | 'OnHold';
  category: string;
}

export interface CreateProjectPayload {
  client: number;
  project_name: string;
  description?: string;
  budget_hours?: number;
  budget_amount?: number;
  deadline?: string;
  status?: Project['status'];
  category?: string;
}
```

### TanStack React Query pattern
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getProjects, createProject } from '../api/projects';

// Read
const { data, isLoading, error } = useQuery({
  queryKey: ['projects'],
  queryFn: getProjects,
});

// Write — invalidates the cache on success so the list auto-refreshes
const queryClient = useQueryClient();
const mutation = useMutation({
  mutationFn: createProject,
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
});
```

### Route protection
```tsx
// src/components/ProtectedRoute.tsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/authContext';

interface Props {
  allowedRoles: string[];
  children: React.ReactNode;
}

const ProtectedRoute = ({ allowedRoles, children }: Props) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!allowedRoles.includes(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
};
```

---

## Sprint Checklists

Tick items off as you complete them. Each item maps to a user story in the sprint plan.

### Sprint 1 — Foundation & Auth (Weeks 1–2)
**Goal:** Authentication, password creation, and user management are fully operational. (US-01 – US-05, 16 days)

**Infrastructure (no US — prerequisite work)**
- [ ] Django project scaffolded with PostgreSQL connection verified
- [ ] React/TypeScript SPA scaffolded (Vite), routing configured, app loads at :5173
- [ ] All models created and migrated:
  - [ ] Custom `User` model with `role` enum and custom `UserManager` (email login)
  - [ ] `Designer` profile model (OneToOne → User)
  - [ ] `Client` profile model (OneToOne → User)
  - [ ] `InvitationToken` model
  - [ ] `Project`, `ProjectAssignment`, `Task`, `TimeLog`, `Feedback`, `Message`, `FileUpload` models
  - [ ] All migrations run clean — `python manage.py migrate` with no errors
- [ ] `IsManager`, `IsDesigner`, `IsClient`, `IsManagerOrDesigner` permission classes created
- [ ] 403 responses verified: access a Manager-only endpoint as Designer/Client → HTTP 403

- [ ] **US-01** JWT login endpoint (`POST /api/auth/token/`) returns access + refresh tokens
- [ ] **US-01** Token refresh endpoint (`POST /api/auth/token/refresh/`) works
- [ ] **US-01** React login page (`/login`) — posts to `/api/auth/token/`, stores tokens in localStorage
- [ ] **US-01** `AuthContext` stores current user object (decoded from JWT) and exposes `role`
- [ ] **US-01** `ProtectedRoute` component redirects unauthenticated users to `/login`
- [ ] **US-01** Role-based redirect after login: Manager → `/manager`, Designer → `/designer`, Client → `/client`
- [ ] **US-01** Stub dashboard pages for all three roles (routes exist, content placeholder)
- [ ] **US-02** `post_save` signal on `User` auto-generates `InvitationToken` (UUID, 48 h expiry)
- [ ] **US-02** React activation page (`/activate?token=xxx`) — password setup form
- [ ] **US-02** Activation endpoint (`POST /api/auth/activate/`) validates token: exists + `is_used=False` + not expired
- [ ] **US-02** Activation sets password, `User.is_active = True`, `token.is_used = True`
- [ ] **US-03** Manager can create Designer/Client users via Django Admin panel
- [ ] **US-04** Manager can view, edit, and deactivate users via Django Admin (or API endpoint)
- [ ] **US-05** Email sent to new user with activation link on account creation
- [ ] **US-05** Full flow tested: create user in Django Admin → receive email → click link → set password → can log in

⚠️ **Risk:** Model mistakes cascade — validate every field against the ERD in DATA_MODEL.md before running the first migration. Test Gmail SMTP on day 1: use `EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'` as fallback if SMTP fails.

---

### Sprint 2 — Project & Task Management (Weeks 3–4)
**Goal:** Managers can create and manage projects and tasks; Designers can view their assigned projects. (US-06 – US-09, 19 days)

- [ ] **US-06** Project create endpoint (`POST /api/projects/`) — Manager only
- [ ] **US-06** React create project form (Manager) — client, budget hours, budget amount, deadline, description, category
- [ ] **US-07** Project list, detail, edit, delete endpoints — role-filtered queryset (Manager sees all, Designer sees assigned, Client sees own)
- [ ] **US-07** React project list page (Manager view)
- [ ] **US-07** Designer assignment endpoint (`POST /api/projects/{id}/assign/`)
- [ ] **US-07** React: assign designer UI on project detail page
- [ ] **US-07** Edit and delete for projects (Manager only)
- [ ] **US-08** Task CRUD endpoints — supports `parent_task` for subtasks, `estimated_hours`, `is_unplanned` flag
- [ ] **US-08** React task list within project detail page (Manager view)
- [ ] **US-08** React create/edit task form — includes estimated hours and `is_unplanned` toggle
- [ ] **US-08** `is_unplanned=True` tasks visually flagged in the UI (badge or colour indicator)
- [ ] **US-09** React project list page (Designer view — assigned only)
- [ ] Budget progress bar (hours used / budget hours) visible on project detail

⚠️ **Risk:** RBAC queryset filtering must be correct before building client-facing views. Test that a Designer cannot see a project they are not assigned to, and a Client cannot see another client's project, before moving to UI work.

---

### Sprint 3 — Time Tracking & Deliverables (Weeks 5–6)
**Goal:** Designers can log time, update task status, upload deliverables, and view client feedback. (US-10 – US-13, 13 days)

- [ ] **US-10** TimeLog CRUD endpoints — Designer logs against a specific task with description
- [ ] **US-10** React time log form (Designer) — select task, enter hours and description
- [ ] **US-10** Manager can see all time logs across projects and designers
- [ ] **US-10** React time log list on project detail (Manager view) — shows designer, task, hours, date
- [ ] **US-11** Task status update endpoint (`PATCH /api/tasks/{id}/`) — Designer/Manager
- [ ] **US-11** React task status toggle (Todo → InProgress → Completed) on task list
- [ ] **US-12** File upload endpoint (`POST /api/files/`) — multipart/form-data, stored in `MEDIA_ROOT`
- [ ] **US-12** React file upload component (Designer uploads deliverables)
- [ ] **US-12** React file list with download links
- [ ] **US-13** Feedback list endpoint for a project — visible to Manager and Designer
- [ ] **US-13** React feedback list (Manager/Designer) — shows category, content, status

⚠️ **Risk:** Files stored in `MEDIA_ROOT` will be lost on Render redeploy (ephemeral disk). Decide on Cloudinary or S3 early — wiring it in later is painful. Keep the `is_unplanned` UI simple (a checkbox on the task form is enough for MVP).

---

### Sprint 4 — Client Portal & Feedback (Weeks 7–8)
**Goal:** Clients can view project status, upload reference materials, and submit feedback; Designers and Managers can reply to and resolve feedback; all roles can send messages. (US-14 – US-18, 19 days)

- [ ] **US-14** React feedback reply UI (Designer) — reply field on a feedback item, stored as a Message or Feedback sub-entry
- [ ] **US-15** Message list + create endpoints (`GET/POST /api/messages/?project={id}`)
- [ ] **US-15** React project message board — all roles on a project can send and view messages
- [ ] **US-16** Project list endpoint filters to own projects only for Client role
- [ ] **US-16** React project list page (Client view — own only, shows status)
- [ ] **US-16** React project detail page (Client view — status, budget progress, deadline)
- [ ] **US-17** React file upload component (Client uploads reference materials)
- [ ] **US-17** File type scoped: Client uploads `reference` or `brand_guideline`; Designer uploads `deliverable`
- [ ] **US-18** Feedback submission endpoint (`POST /api/feedback/`) — Client only
- [ ] **US-18** React feedback form (Client) — category (Revision/Approval/Question), content
- [ ] **US-18** Feedback status update endpoint (Manager/Designer) — Pending → InProgress → Resolved
- [ ] **US-18** `resolved_at` automatically set in serializer when status transitions to `'Resolved'`

⚠️ **Risk:** This sprint has the broadest feature surface. Prioritise US-16 (Client portal) and US-18 (feedback) first — US-14 (reply) and US-15 (messaging) can slip to minimum viable if time runs short.

---

### Sprint 5 — BI Dashboards & Reports (Weeks 9–12)
**Goal:** Manager BI dashboards operational, report export working, and system deployed. (US-19, US-20, US-21, 18 days)

- [ ] **DB indexes added first** — add all indexes from DATA_MODEL.md before writing any analytics queries
- [ ] **US-19** Analytics endpoint: KPI summary (total revenue, avg EHR, active project count, pending feedback count)
- [ ] **US-19** React: KPI cards on manager dashboard
- [ ] **US-19** Analytics endpoint: budget vs actual hours per project
- [ ] **US-19** React: Budget vs Actual bar chart (Recharts `BarChart`)
- [ ] **US-19** Analytics endpoint: EHR per project (`budget_amount / SUM(hours_spent)`)
- [ ] **US-19** EHR displayed per project on the manager dashboard
- [ ] **US-19** Analytics endpoint: client profitability ranking (revenue, total hours, revision count)
- [ ] **US-19** React: client profitability ranking table
- [ ] **US-19** Analytics endpoint: scope creep index per project
- [ ] **US-19** Scope creep index displayed per project
- [ ] **US-19** Analytics endpoint: designer utilisation (`SUM(hours this week) / available_hours_per_week * 100`)
- [ ] **US-19** React: designer utilisation display
- [ ] **US-20** React: line chart — cumulative hours over time (Recharts `LineChart`)
- [ ] **US-20** React: pie chart — revenue by client (Recharts `PieChart`)
- [ ] **US-20** React: budget vs actual bar chart from S5 — verify it is polished
- [ ] **US-20** Dashboard filter controls: date range, client selector, project selector
- [ ] **US-20** Analytics endpoints accept `?date_from=&date_to=&client=&project=` query params
- [ ] **US-21** PDF export endpoint (ReportLab) — project profitability summary
- [ ] **US-21** React: Export PDF button triggers file download
- [ ] **US-21** Excel export endpoint (openpyxl) — client profitability + budget data
- [ ] **US-21** React: Export Excel button
- [ ] API tests: auth flow, project CRUD, time log, feedback (Django `TestCase`)
- [ ] Backend deployed to Render Web Service
- [ ] Frontend deployed to Render Static Site
- [ ] Both connected to Render PostgreSQL — end-to-end flow verified on live URLs
- [ ] README updated with screenshots and setup instructions

⚠️ **Risk:** PostgreSQL aggregate queries across multiple joined tables can be slow without indexes — add them before testing, not after.
⚠️ **Risk:** ReportLab (PDF generation) has a steeper learning curve than openpyxl. Prioritise PDF first — if time runs short, Excel export is lower priority.