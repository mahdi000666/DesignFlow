Suggest if Client Profitability Ranking && Scope Creep Index could be turned to charts.
Replace designer utilisation KPI with pending feedback. add the utilisation bar under hours this week.
Add unread messages KPI in client dashboard. Add Recent updates card.
Update avatar in client project detail.


1. Client dashboard error:
Compilation Skipped: Existing memoization could not be preserved

React Compiler has skipped optimizing this component because the existing manual memoization could not be preserved. This dependency may be mutated later, which could cause the value to change unexpectedly.

C:\Users\Mahdi\Proj\PFE\DesignFlow\frontend\src\pages\client\ClientDashboard.tsx:137:51
  135 |       .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  136 |       .slice(0, 8);
> 137 |   }, [allMessages, allFiles, allFeedback, userId, projects]);
      |                                                   ^^^^^^^^ This dependency may be modified later
  138 |
  139 |   return (
  140 |     <AppShell title="Dashboard">

2. Client Profitability Ranking: The progress bar is way too wide, slim it down.
Scope Creep Index: The chart looks shrinked as you can see in the screenshot. I also want the project names to be under each bar in a straight line, unlike shown in the screenshot.
3. The unread messages KPI is only showing total messages, not "unread" ones. I have went to the messages tab of the 2 projects and the KPI should be 0 (correct me if im wrong). Also when I type a messages as a client, the number in the KPI card increments. Doesnt seem like the right behavior.
4. I will provide ProjectAssignment files and update it accordingly. 


kanban
designer time counter when begin task
log time pauses
designer activity history
remove time log edit
remove log time
ask if task should be to specific designer.


OCR
REFERENCEES RAPPORT














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

Directory structure:
```
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
    │   │       ├── tests.py
    │   │       ├── urls.py
    │   │       ├── urls_users.py
    │   │       ├── views.py
    │   └── core/
    │       ├── asgi.py
    │       ├── settings.py
    │       ├── test_settings.py
    │       ├── urls.py
    │       └── wsgi.py
    └── frontend/
        ├── README.md
        ├── eslint.config.js
        ├── index.html
        ├── package.json
        ├── postcss.config.js
        ├── tailwind.config.js
        ├── tsconfig.app.json
        ├── tsconfig.json
        ├── tsconfig.node.json
        ├── vite.config.ts
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
            │   ├── pagination.ts
            │   ├── projects.ts
            │   ├── tasks.ts
            │   ├── timelogs.ts
            │   └── users.ts
            ├── components/
            │   ├── AppShell.tsx
            │   ├── AssignDesignerPanel.tsx
            │   ├── AuthComponents.tsx
            │   ├── FeedbackForm.tsx
            │   ├── FeedbackList.tsx
            │   ├── FileUploadPanel.tsx
            │   ├── Icons.tsx
            │   ├── MessageBoard.tsx
            │   ├── ProjectForm.tsx
            │   ├── ProtectedRoute.tsx
            │   ├── TaskForm.tsx
            │   ├── TaskRow.tsx
            │   ├── TimeLogForm.tsx
            │   ├── TimeLogList.tsx
            │   ├── Ui.tsx
            │   └── UnreadBadge.tsx
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
            │   ├── useUnreadCount.ts
            │   └── useUsers.ts
            ├── pages/
            │   ├── SettingsPage.tsx
            │   ├── auth/
            │   │   ├── ActivatePage.tsx
            │   │   ├── ForgotPasswordPage.tsx
            │   │   ├── LoginPage.tsx
            │   │   └── ResetPasswordPage.tsx
            │   ├── client/
            │   │   ├── ClientDashboard.tsx
            │   │   └── ClientProjectDetail.tsx
            │   ├── designer/
            │   │   ├── DesignerDashboard.tsx
            │   │   ├── DesignerProjectDetail.tsx
            │   │   └── DesignerProjects.tsx
            │   └── manager/
            │       ├── AnalyticsDashboard.tsx
            │       ├── ManagerDashboard.tsx
            │       ├── ProjectDetail.tsx
            │       ├── ProjectList.tsx
            │       └── TeamPage.tsx
            ├── types/
            │   ├── analytic.ts
            │   ├── feedback.ts
            │   ├── file.ts
            │   ├── message.ts
            │   ├── project.ts
            │   ├── task.ts
            │   ├── timelog.ts
            │   └── user.ts
            └── utils/
                ├── auth.ts
                ├── format.ts
                ├── project.ts
                └── svg.d.ts
```

Its important that you don't accidentally contradict or overwrite already existing files from past sprints. You can always pause and ask me to provide any files you require.