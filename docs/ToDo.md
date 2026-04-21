1. In AnalyticsDashboard.tsx im getting these errors:
```
label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
'percent' is possibly 'undefined'.

formatter={(v: number) => v.toLocaleString()}
Type '(v: number) => string' is not assignable to type 'Formatter<number, NameType> & ((value: number, name: NameType, item: Payload<number, NameType>, index: number, payload: Payload<number, NameType>[]) => ReactNode | [...])'.
  Type '(v: number) => string' is not assignable to type 'Formatter<number, NameType>'.
    Types of parameters 'v' and 'value' are incompatible.
      Type 'number | undefined' is not assignable to type 'number'.
        Type 'undefined' is not assignable to type 'number'.
```

1. Here are the files you have requested.
2. Add the missing feature.
3. Given the context of this project, should I have the LLM generate fake data? (clients, designers, projects, tasks, time logs, feedbacks, scope creeps etc). What should I tell them LLM? And how to fill this data?

Ask third question again to double check.

Tomorrow ask 5 tunisian fake data from each LLM.

In order to save tokens, you may only generate the document for S3 chapter.

1. Use this exact style:
```
A4 portrait, Times New Roman body text at 12 pt, justified, 1.5 line spacing, with about 6 pt paragraph spacing before and after.
Main chapter titles must be centered, bold, 16 pt, dark navy blue (#1F3864).
Section headings are left-aligned, bold, 14 pt, medium blue (#2E5496).
Subsections are left-aligned, bold, 12 pt, same blue as sections. Sub-subsections are the same except 11 pt.
Captions for figures and tables are centered, italic, 9 pt, dark navy (#0E2841), written as “Figure X: …” (Figure captions are under) or “Table X: …” (Table captions are above).
Tables must have full grid borders, dark blue header rows (#1F3864) with white bold centered text, 10 pt for column, row and body text.
Table rows must follow the following pattern: first row (#000000), second row (#F2F7FB) then repeat.
```
2. Preserve the textual use case table structure.
3. Keep spacing clean, avoid cramped layouts, and preserve the report’s formal academic look.
4. Keep it concise, avoid bloat, filler and repetitions.
5. Avoid AI-ish language, em dashes, semicolons and technical identifiers in prose.

```
Directory structure:
    ├── backend/
    │   ├── apps/
    │   │   ├── analytics/
    │   │   ├── feedback/
    │   │   ├── files/
    │   │   ├── messages/
    │   │   ├── projects/
    │   │   ├── tasks/
    │   │   ├── timelog/
    │   │   └── users/
    │   │       ├── admin.py
    │   │       ├── apps.py
    │   │       ├── models.py
    │   │       ├── permissions.py
    │   │       ├── serializers.py
    │   │       ├── signals.py
    │   │       ├── urls.py
    │   │       ├── urls_users.py
    │   │       ├── views.py
    │   └── core/
    │       ├── __init__.py
    │       ├── asgi.py
    │       ├── settings.py
    │       ├── urls.py
    │       └── wsgi.py
    └── frontend/
        └── src/
            ├── App.tsx
            ├── index.css
            ├── main.tsx
            ├── api/
            │   ├── analytics.ts
            │   ├── clients.ts
            │   ├── feedbacks.ts
            │   ├── files.ts
            │   ├── messages.ts
            │   ├── projects.ts
            │   ├── tasks.ts
            │   └── timelogs.ts
            ├── components/
            │   ├── AppShell.tsx
            │   ├── AssignDesignerPanel.tsx
            │   ├── FeedbackForm.tsx
            │   ├── FeedbackList.tsx
            │   ├── FileUploadPanel.tsx
            │   ├── MessageBoard.tsx
            │   ├── ProjectForm.tsx
            │   ├── ProtectedRoute.tsx
            │   ├── TaskForm.tsx
            │   ├── TaskRow.tsx
            │   ├── TimeLogForm.tsx
            │   └── TimeLogList.tsx
            ├── context/
            │   ├── authContext.ts
            │   └── AuthProvider.tsx
            ├── hooks/
            │   ├── useAnalytics.ts
            │   ├── useAuth.ts
            │   ├── useFeedback.ts
            │   ├── useFiles.ts
            │   ├── useMessages.ts
            │   ├── useProjects.ts
            │   ├── useTasks.ts
            │   ├── useTimeLogs.ts
            │   └── useUnreadCount.ts
            ├── pages/
            │   ├── auth/
            │   │   ├── ActivatePage.tsx
            │   │   └── LoginPage.tsx
            │   ├── client/
            │   │   ├── ClientDashboard.tsx
            │   │   ├── ClientProjectDetail.tsx
            │   │   └── ClientProjects.tsx
            │   ├── designer/
            │   │   ├── DesignerDashboard.tsx
            │   │   ├── DesignerProjectDetail.tsx
            │   │   └── DesignerProjects.tsx
            │   └── manager/
            │       ├── AnalyticsDashboard.tsx
            │       ├── ManagerDashboard.tsx
            │       ├── ProjectDetail.tsx
            │       ├── ProjectList.tsx
            │       └── ReportsPage.tsx
            └── types/
                ├── analytic.ts
                ├── feedback.ts
                ├── file.ts
                ├── message.ts
                ├── project.ts
                ├── task.ts
                └── timelog.ts
```

Its important that you don't accidentally contradict or overwrite already existing files from past sprints. You can always pause and ask me to provide any files you require.