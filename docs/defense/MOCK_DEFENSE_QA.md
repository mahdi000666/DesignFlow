# Mock Defense Q&A

Answer questions using this structure:

1. Assumption: what the question is asking.
2. Evidence: file or code behavior that proves the answer.
3. Tradeoff: why this design is reasonable.
4. Limitation: what could be improved.

## Project And Architecture

### What problem does DesignFlow solve?

Assumption: the question is about business value, not code.

Evidence: `PROJECT_CONTEXT.md` describes the system as project management plus BI for a graphic design agency, and identifies scope creep and lack of actual-hours visibility as the core problem.

Answer: DesignFlow helps an agency track projects, tasks, designer time, client feedback, and profitability. The key value is comparing budgeted work against actual effort so managers can see scope creep and profitability risks early.

Tradeoff: the app focuses on agency operations instead of generic project management, so the metrics are tailored to design workflows.

Limitation: it is still an MVP; deeper forecasting, notifications, and advanced scheduling could be added later.

### Why a three-tier architecture?

Assumption: the examiner asks why React, Django REST, and PostgreSQL are separated.

Evidence: frontend routes live in `frontend/src/App.tsx`, API routes in `backend/core/urls.py`, and data models in `backend/apps/*/models.py`.

Answer: React handles interactive role-based UI, Django REST exposes business logic and permissions through APIs, and PostgreSQL stores relational business data. Separating them keeps UI, backend logic, and persistence independently maintainable.

Tradeoff: it adds API integration complexity, but it fits a modern web app and allows a frontend SPA.

Limitation: the project needs careful CORS, token, and environment configuration.

## Backend And Data Model

### Why use Django REST Framework instead of only Django templates?

Assumption: the question is about architectural choice.

Evidence: the frontend is a React SPA and the backend exposes JSON endpoints through DRF ViewSets and APIViews.

Answer: DRF is better here because the frontend is React, so the backend needs to provide structured JSON APIs. DRF gives serializers, permissions, ViewSets, pagination, authentication integration, and a consistent API style.

Tradeoff: templates would be simpler for server-rendered pages, but less suitable for a rich SPA with role dashboards.

Limitation: API design and frontend/backend type consistency require extra care.

### Why are Designer and Client separate profile tables?

Assumption: the question is about database normalization.

Evidence: `backend/apps/users/models.py` has `User.role`, plus one-to-one `Designer` and `Client` models with role-specific fields.

Answer: `User` stores authentication identity and role. `Designer` stores fields like hourly rate and weekly availability. `Client` stores fields like phone and industry. This avoids putting irrelevant nullable fields directly on every user.

Tradeoff: it adds joins, but keeps the model cleaner and role-specific.

Limitation: profile creation must stay synchronized with user creation, which is handled by signals.

### What prevents duplicate designer assignment?

Assumption: the examiner means duplicate assignment of the same designer to the same project.

Evidence: `ProjectAssignment` has `unique_together = ('project', 'designer')`, and the assign endpoint uses `get_or_create`.

Answer: the database enforces uniqueness, and the API also returns an error if the designer is already assigned.

Tradeoff: combining API-level handling with database-level constraint gives better user feedback and data integrity.

Limitation: bulk assignment would need extra validation and transaction handling.

## Auth And Security

### What is the difference between authentication and authorization in your app?

Assumption: the examiner wants security concepts mapped to implementation.

Evidence: JWT authentication is configured in Django REST settings; role checks are implemented through permissions and filtered querysets.

Answer: Authentication proves who the user is using JWT. Authorization decides what that user can access based on role and relationships, such as Manager, assigned Designer, or owning Client.

Tradeoff: JWT works well for a decoupled React frontend and API backend.

Limitation: token storage in localStorage is simple for the project, but production apps may prefer stricter XSS protections and secure cookie strategies.

### How do you prevent a Client from seeing another Client's project?

Assumption: the examiner asks about backend security, not just UI.

Evidence: `ProjectViewSet.get_queryset()` filters Client users with `Project.objects.filter(client__user=user)`.

Answer: The backend filters the queryset by the authenticated user. Even if a Client manually changes the URL or calls the API directly, the backend only returns projects where `project.client.user` matches that user.

Tradeoff: object visibility is centralized inside the ViewSet.

Limitation: every new endpoint must follow the same rule, so tests are important.

### What happens when the access token expires?

Assumption: the examiner asks about session continuity.

Evidence: `frontend/src/api/clients.ts` catches 401 responses, calls `/auth/token/refresh/`, stores the new access token, and retries the original request.

Answer: The frontend attempts one silent refresh using the refresh token. If refresh succeeds, the original request is retried. If refresh fails, tokens are cleared so the user must log in again.

Tradeoff: this improves UX without making access tokens long-lived.

Limitation: refresh token rotation and invalidation need careful production handling.

## Business Workflows

### What is the source of truth for logged time?

Assumption: the question is about analytics and timer state.

Evidence: `TimeLog` stores `hours_spent`, and analytics views aggregate `TimeLog` records.

Answer: `TimeLog` is the permanent source of truth for actual hours. `TimerSession` only tracks an active or paused timer before it becomes a log. `ActivityLog` records timer actions for audit history.

Tradeoff: this separates temporary state from permanent reporting data.

Limitation: if a timer is never stopped, it remains a session and is not counted as logged time until stop.

### Why store timer state server-side?

Assumption: the examiner asks why not only use browser state.

Evidence: `TimerSession` is a backend model with accumulated seconds, state, and started time.

Answer: Server-side timer state survives page refreshes and gives the backend control over valid timer transitions. It also prevents losing timing state when the frontend reloads.

Tradeoff: it requires more backend endpoints.

Limitation: concurrent requests could need stricter transaction locking in a high-traffic production system.

## Analytics, Reports, And AI

### Why compute analytics server-side?

Assumption: the question is about correctness and security.

Evidence: analytics endpoints aggregate `Project`, `Task`, `TimeLog`, `Feedback`, `Designer`, and `Client` data in `backend/apps/analytics/views.py`.

Answer: Server-side analytics keeps formulas consistent, avoids exposing unnecessary raw data, and uses database aggregation close to the data.

Tradeoff: backend views become more complex.

Limitation: large datasets may need query optimization, caching, background jobs, or materialized summaries.

### Explain Effective Hourly Rate.

Assumption: the examiner asks for formula and purpose.

Evidence: project summary and analytics compute EHR as budget amount divided by actual hours.

Answer: Effective Hourly Rate measures how much money the agency effectively earns per actual hour worked on a project. If actual hours increase while budget stays fixed, EHR drops.

Tradeoff: it is simple and understandable for managers.

Limitation: it assumes budget amount is the revenue baseline and does not include every possible cost.

### Explain Scope Creep Index.

Assumption: the examiner asks about the feature chosen for the rewrite drill.

Evidence: `Task.is_unplanned` marks scope creep tasks, and analytics counts unplanned tasks divided by total tasks.

Answer: Scope Creep Index is the percentage of tasks marked unplanned in a project. It helps managers see when extra work is being added beyond the original plan.

Tradeoff: a boolean flag is simple and easy to report.

Limitation: it depends on users correctly marking tasks as unplanned.

### How do the AI features work?

Assumption: the examiner asks for implementation, not AI theory.

Evidence: task estimation is in `backend/apps/tasks/views.py`; project health summary is in `backend/apps/analytics/views.py`.

Answer: The task estimator sends task name, description, and recent similar time logs to Groq and expects JSON with suggested hours and reasoning. The project health summary computes metrics first, then sends those metrics to Groq to generate a short management narrative.

Tradeoff: AI adds explanation and estimation help without replacing database metrics.

Limitation: it depends on `GROQ_API_KEY`, external service availability, and prompt/data quality.

### How do PDF and Excel exports differ technically?

Assumption: the examiner asks about implementation tools.

Evidence: report generation lives in `backend/apps/analytics/reports.py`, and export routing in `report_views.py`.

Answer: PDF export uses ReportLab to build a formatted document for presentation. Excel export uses openpyxl to create spreadsheet data for further analysis.

Tradeoff: PDF is better for sharing a fixed report, while Excel is better for data manipulation.

Limitation: report styling and large exports can become complex.

## Frontend

### Why React Query instead of manual useEffect?

Assumption: the examiner asks about frontend data management.

Evidence: hooks like `useProjects`, `useTasks`, and `useTimeLogs` use TanStack React Query.

Answer: React Query centralizes loading state, caching, mutation handling, and cache invalidation. After a project or task mutation, the relevant query keys are invalidated so the UI refreshes consistently.

Tradeoff: it adds a library and query-key discipline.

Limitation: incorrect query keys can cause stale data or unnecessary refetches.

### What happens when Manager creates a task?

Assumption: the examiner asks for an end-to-end trace.

Evidence: `ProjectDetail` uses `TaskForm`, `useCreateTask`, `api/tasks.ts`, `TaskViewSet`, and `TaskWriteSerializer`.

Answer: The Manager opens the task form, submits a payload, the React Query mutation calls the API, DRF validates the payload with the write serializer, saves a `Task`, then React Query invalidates the task list so the Kanban board refreshes.

Tradeoff: this keeps the page component focused on workflow while API and cache logic live in separate modules.

Limitation: frontend and backend validation must stay aligned.

## Improvements With More Time

Use these if asked "what would you improve?":

- Add stronger automated tests for every role-specific endpoint.
- Add database query optimization and caching for analytics.
- Add notifications for feedback, messages, and approaching deadlines.
- Add audit logs for project/task edits, not only timer actions.
- Use more robust production auth storage and token revocation.
- Add background jobs for report generation if reports become large.
- Add monitoring around AI failures and export errors.

