# 7-Day Technical Defense Learning Schedule

## Day 1 - Big Picture And Story

Goal: understand what the project is, who it serves, and how to explain it in 2 minutes.

Study:

- `README.md`
- `docs/context/PROJECT_CONTEXT.md`
- `docs/diagrams/ThreeTierSysArch.drawio.png`
- `docs/diagrams/UseCaseGlobal.drawio.png`
- `frontend/src/App.tsx`
- `backend/core/urls.py`

Tasks:

- Write a 2-minute project pitch: problem, users, solution, stack, value.
- Draw the architecture: React UI -> Axios/JWT -> Django REST API -> PostgreSQL -> reports/AI.
- Open the app as Manager, Designer, and Client if credentials/data are available.
- List the top 5 features that prove the project value.

Verify:

- You can explain why scope creep and actual hours are the core business problem.
- You can name every main backend API domain from `backend/core/urls.py`.
- You can name the three roles and their main screens from `frontend/src/App.tsx`.

Output:

- A 2-minute spoken pitch.
- A one-page architecture sketch.
- A list of the 5 demo moments you will show during defense.

## Day 2 - Database And Backend Structure

Goal: understand the data model and the backend app pattern.

Study:

- `docs/context/DATA_MODEL.md`
- `backend/apps/users/models.py`
- `backend/apps/projects/models.py`
- `backend/apps/tasks/models.py`
- `backend/apps/timelog/models.py`
- `backend/apps/feedback/models.py`
- `backend/apps/messages/models.py`
- `backend/apps/files/models.py`
- `backend/apps/projects/views.py`
- `backend/apps/tasks/views.py`
- `backend/apps/timelog/views.py`

Tasks:

- Draw the model chain: User -> Designer/Client -> Project -> Task -> TimeLog.
- Mark which models are business data, audit data, temporary state, or communication data.
- Trace how a Manager creates a project.
- Trace how a Designer sees only assigned project tasks.
- Trace how a `TimeLog` becomes analytics input.

Verify:

- You can explain why `Designer` and `Client` are profile tables instead of roles only.
- You can explain why `ProjectAssignment` exists and what prevents duplicate assignment.
- You can explain the difference between model, serializer, view, and URL.

Output:

- Entity relationship sketch.
- One paragraph explaining the backend app structure.
- One end-to-end trace for project creation.

## Day 3 - Auth, Roles, And Security

Goal: explain authentication, authorization, invitation onboarding, and frontend role routing.

Study:

- `backend/apps/users/models.py`
- `backend/apps/users/views.py`
- `backend/apps/users/permissions.py`
- `backend/apps/users/signals.py`
- `frontend/src/api/clients.ts`
- `frontend/src/context/AuthProvider.tsx`
- `frontend/src/components/ProtectedRoute.tsx`
- `frontend/src/pages/auth/LoginPage.tsx`
- `frontend/src/pages/auth/ActivatePage.tsx`

Tasks:

- Trace login: login form -> token endpoint -> localStorage -> decoded user -> role redirect.
- Trace token refresh: failed API request -> Axios 401 handling -> refresh endpoint -> retry.
- Trace invitation: Manager creates user -> signal creates token -> email link -> activation endpoint -> password set.
- Write the difference between authentication and authorization in your own words.

Verify:

- You can answer: "How do you prevent a Client seeing another Client's project?"
- You can answer: "Why is frontend route protection not enough?"
- You can answer: "What happens when an access token expires?"

Output:

- Login sequence diagram on paper.
- 10-line explanation of RBAC backend plus frontend.
- Three security limitations or future improvements.

## Day 4 - Core Business Workflows

Goal: trace the real features that the jury will likely click through in the demo.

Study:

- `frontend/src/pages/manager/ProjectDetail.tsx`
- `frontend/src/pages/designer/DesignerProjectDetail.tsx`
- `frontend/src/pages/client/ClientProjectDetail.tsx`
- `frontend/src/components/KanbanBoard.tsx`
- `frontend/src/components/KanbanTaskCard.tsx`
- `frontend/src/components/TaskForm.tsx`
- `frontend/src/components/FileUploadPanel.tsx`
- `frontend/src/components/FeedbackForm.tsx`
- `frontend/src/components/MessageBoard.tsx`
- `backend/apps/timelog/views.py`
- `backend/apps/files/views.py`
- `backend/apps/feedback/views.py`
- `backend/apps/messages/views.py`

Tasks:

- Trace create project, assign designer, create task, update status, upload file, submit feedback, send message.
- Deep dive timer behavior: start, pause, resume, stop.
- Explain the difference between `TimerSession`, `TimeLog`, and `ActivityLog`.
- List timer failure cases: missing task, unassigned task, already running, paused, stop without session.

Verify:

- You can draw the timer state machine from memory.
- You can explain why the timer state is server-side.
- You can explain what data changes when a task is dragged to InProgress or Completed.

Output:

- One full workflow trace for each role.
- Timer state machine sketch.
- Short "what happens on stop timer" explanation.

## Day 5 - Analytics, Reports, And AI

Goal: understand the business intelligence layer and how metrics are computed.

Study:

- `backend/apps/analytics/views.py`
- `backend/apps/analytics/reports.py`
- `backend/apps/analytics/report_views.py`
- `frontend/src/api/analytics.ts`
- `frontend/src/hooks/useAnalytics.ts`
- `frontend/src/pages/manager/ManagerDashboard.tsx`
- `frontend/src/pages/manager/AnalyticsDashboard.tsx`
- `frontend/src/pages/manager/ProjectDetail.tsx`
- `backend/apps/tasks/views.py`

Tasks:

- Memorize each metric source table and formula.
- Trace `GET /api/analytics/scope-creep/` from backend to frontend display.
- Trace report export from frontend blob download to backend PDF/Excel generator.
- Trace AI task estimation and AI project health summary.

Verify:

- For each KPI, you can answer: source models, formula, endpoint, frontend display, zero-data behavior.
- You can explain why analytics is computed server-side.
- You can state AI limitations clearly: availability, prompt quality, historical data quality, not guaranteed correctness.

Output:

- Metrics table from memory.
- AI explanation in 60 seconds.
- One limitation per analytics/report/AI feature.

## Day 6 - Frontend Architecture And Data Flow

Goal: understand React routing, API functions, hooks, forms, and cache invalidation.

Study:

- `frontend/src/App.tsx`
- `frontend/src/api/clients.ts`
- `frontend/src/api/projects.ts`
- `frontend/src/api/tasks.ts`
- `frontend/src/api/timelogs.ts`
- `frontend/src/api/feedbacks.ts`
- `frontend/src/hooks/useProjects.ts`
- `frontend/src/hooks/useTasks.ts`
- `frontend/src/hooks/useTimeLogs.ts`
- `frontend/src/hooks/useFeedback.ts`
- `frontend/src/types/*.ts`

Tasks:

- Trace "Manager creates a task" from button click to DB save to UI refresh.
- Trace how React Query query keys are invalidated after mutations.
- Explain why TypeScript types mirror backend serializers.
- Identify one loading state and one error/failure path.

Verify:

- You can explain why React Query is better here than raw `useEffect`.
- You can explain how Axios automatically attaches JWT.
- You can explain what breaks if backend response fields and frontend types drift apart.

Output:

- Frontend data-flow sketch.
- One end-to-end mutation trace.
- A short explanation of API layer vs hook layer vs page component.

## Day 7 - Mock Defense And Rewrite Drill

Goal: simulate the defense and prove you can rebuild a feature.

Morning:

- Run a 12-minute demo: login, role separation, project/task, timer, feedback/files/messages, analytics, AI, export.
- Record yourself if possible.
- Fix weak explanations immediately.

Midday:

- Complete `SCOPE_CREEP_REWRITE_DRILL.md` without looking for the first attempt.
- Then compare against the real code.

Afternoon:

- Answer all questions in `MOCK_DEFENSE_QA.md`.
- For each answer, use: assumption, evidence, tradeoff, limitation.

Verify:

- You can answer "where in the code is that implemented?" for every demo claim.
- You can rewrite the Scope Creep Index feature from memory.
- You can explain at least three limitations without sounding defensive.

Output:

- Final 12-minute demo script.
- Completed rewrite drill.
- List of weak topics for final night review.

## Final Night Review

Do not try to learn new areas late. Review only:

- Project pitch.
- Architecture sketch.
- Model sketch.
- RBAC explanation.
- Timer state machine.
- Metrics table.
- AI limitations.
- Scope Creep rewrite drill.

