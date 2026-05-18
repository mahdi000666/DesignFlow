# Code Trace Maps

Use these maps to answer "where is that implemented?" during defense.

## System Entrypoints

Backend:

- Root URL router: `backend/core/urls.py`
- Settings: `backend/core/settings.py`
- Test settings: `backend/core/test_settings.py`
- Seed data: `backend/core/management/commands/seed.py`

Frontend:

- App routes: `frontend/src/App.tsx`
- Main render entrypoint: `frontend/src/main.tsx`
- Auth provider: `frontend/src/context/AuthProvider.tsx`
- Axios client: `frontend/src/api/clients.ts`
- Role route guard: `frontend/src/components/ProtectedRoute.tsx`

## Data Model Spine

Core chain:

1. `User` - authentication identity and role.
2. `Designer` or `Client` - role-specific profile data.
3. `Project` - business project owned by a client.
4. `ProjectAssignment` - many-to-many link between projects and designers.
5. `Task` - project work item, with estimated hours and scope-creep flag.
6. `TimeLog` - permanent actual hours.

Supporting data:

- `TimerSession` - temporary active or paused timer state.
- `ActivityLog` - audit history of timer actions.
- `Feedback` - client revision, approval, or question.
- `Message` - project communication.
- `FileUpload` - deliverables, references, and brand guidelines.

Defense explanation:

"The database is centered on projects. A user has a role, but Designer and Client store role-specific profile fields. Projects belong to clients, designers are attached through ProjectAssignment, tasks belong to projects, and actual effort is stored in TimeLog. Analytics uses TimeLog plus budget and feedback data."

## Auth And RBAC Trace

Login:

1. `frontend/src/pages/auth/LoginPage.tsx` submits credentials.
2. `backend/apps/users/urls.py` maps `/api/auth/token/`.
3. `backend/apps/users/views.py` custom token view returns JWT with user data.
4. `frontend/src/context/AuthProvider.tsx` stores access and refresh tokens.
5. `frontend/src/App.tsx` redirects by role.

Request authorization:

1. `frontend/src/api/clients.ts` attaches `Authorization: Bearer <access>`.
2. DRF authenticates JWT globally through settings.
3. Permission classes in `backend/apps/users/permissions.py` check role.
4. View querysets filter data by role, for example in project/task/timelog views.

Defense warning:

Frontend `ProtectedRoute` improves UX, but backend permissions and querysets are the actual security boundary.

## Project And Task Trace

Manager creates a project:

1. UI page: `frontend/src/pages/manager/ProjectList.tsx`
2. Form: `frontend/src/components/ProjectForm.tsx`
3. API call: `frontend/src/api/projects.ts`
4. Hook mutation: `frontend/src/hooks/useProjects.ts`
5. Backend route: `backend/apps/projects/urls.py`
6. ViewSet: `backend/apps/projects/views.py`
7. Serializer: `backend/apps/projects/serializers.py`
8. Model: `backend/apps/projects/models.py`

Manager creates a task:

1. UI page: `frontend/src/pages/manager/ProjectDetail.tsx`
2. Form: `frontend/src/components/TaskForm.tsx`
3. API call: `frontend/src/api/tasks.ts`
4. Hook mutation: `frontend/src/hooks/useTasks.ts`
5. Backend route: `backend/apps/tasks/urls.py`
6. ViewSet: `backend/apps/tasks/views.py`
7. Serializer: `backend/apps/tasks/serializers.py`
8. Model: `backend/apps/tasks/models.py`

Task status update:

1. `frontend/src/components/KanbanBoard.tsx` detects drag end.
2. Page calls `useUpdateTask`.
3. Backend `TaskViewSet.partial_update` accepts Manager or Designer.
4. Designer gets `TaskStatusSerializer`, limiting writable fields to `status`.

Defense explanation:

"The serializer choice is part of authorization. Managers can write full task payloads, but Designers only update status."

## Timer Trace

Frontend:

- API calls: `frontend/src/api/timelogs.ts`
- Hooks: `frontend/src/hooks/useTimeLogs.ts`
- Designer task UI: `frontend/src/pages/designer/DesignerProjectDetail.tsx`
- Kanban/task card UI: `frontend/src/components/KanbanTaskCard.tsx`

Backend:

- Routes: `backend/apps/timelog/urls.py`
- Timer endpoints: `backend/apps/timelog/views.py`
- Models: `TimeLog`, `TimerSession`, `ActivityLog` in `backend/apps/timelog/models.py`
- Serializers: `backend/apps/timelog/serializers.py`

Timer state:

- Start creates or resumes `TimerSession`.
- Start auto-pauses another running session for the same designer.
- Pause stores elapsed seconds in `accumulated_secs`.
- Resume resets `started_at` for the new run segment.
- Stop converts total seconds into decimal hours, creates `TimeLog`, creates `ActivityLog`, and deletes `TimerSession`.

Defense explanation:

"TimerSession is temporary operational state, TimeLog is the permanent business record used by analytics, and ActivityLog is the audit trail."

## Feedback, Messages, And Files Trace

Feedback:

- Frontend API: `frontend/src/api/feedbacks.ts`
- Hook: `frontend/src/hooks/useFeedback.ts`
- Components: `FeedbackForm`, `FeedbackList`
- Backend: `backend/apps/feedback/views.py`, `serializers.py`, `models.py`

Messages:

- Frontend API: `frontend/src/api/messages.ts`
- Hook: `frontend/src/hooks/useMessages.ts`
- Component: `MessageBoard`
- Backend: `backend/apps/messages/views.py`, `serializers.py`, `models.py`

Files:

- Frontend API: `frontend/src/api/files.ts`
- Hook: `frontend/src/hooks/useFiles.ts`
- Component: `FileUploadPanel`
- Backend: `backend/apps/files/views.py`, `serializers.py`, `models.py`

Defense explanation:

"Client collaboration is split into feedback for structured project review, messages for conversation, and files for deliverables or reference materials."

## Analytics Trace

Backend:

- URLs: `backend/apps/analytics/urls.py`
- Views: `backend/apps/analytics/views.py`
- Reports: `backend/apps/analytics/reports.py`
- Report endpoint: `backend/apps/analytics/report_views.py`

Frontend:

- API functions: `frontend/src/api/analytics.ts`
- Hooks: `frontend/src/hooks/useAnalytics.ts`
- Manager dashboard: `frontend/src/pages/manager/ManagerDashboard.tsx`
- Analytics dashboard: `frontend/src/pages/manager/AnalyticsDashboard.tsx`
- Project detail summary: `frontend/src/pages/manager/ProjectDetail.tsx`

Metric cheat sheet:

| Metric | Source | Formula |
| --- | --- | --- |
| Budget utilization | Project, TimeLog | actual hours / budget hours * 100 |
| EHR | Project, TimeLog | budget amount / actual hours |
| Budget variance | Task, TimeLog | (actual - estimated) / estimated * 100 |
| Scope Creep Index | Task | unplanned tasks / total tasks * 100 |
| Designer utilization | Designer, TimeLog | logged hours this week / available hours per week * 100 |
| Revision-to-approval ratio | Feedback | revision count / approval count |
| Client profitability | Client, Project, TimeLog, Feedback | revenue and EHR weighted down by revisions |

## AI Trace

Task hour estimator:

- Endpoint: `POST /api/tasks/estimate-hours/`
- Backend file: `backend/apps/tasks/views.py`
- Inputs: task name, description, optional project id.
- Context: recent similar project time logs.
- Output: suggested hours plus one-sentence reasoning.

Project health narrative:

- Endpoint: `GET /api/analytics/ai-summary/?project=<id>`
- Backend file: `backend/apps/analytics/views.py`
- Inputs: computed project metrics.
- Output: plain-English summary.
- UI: `frontend/src/pages/manager/ProjectDetail.tsx`

Defense limitation:

"AI is assistive. It depends on `GROQ_API_KEY`, external API availability, data quality, and prompt reliability. The authoritative metrics still come from the database."

