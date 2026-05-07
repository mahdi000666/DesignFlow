After finishing all the sprints, I decided to showcase my project to my professional supervisor. He said its good overall. But he had a few remarks on designer time logging. Currently designer manually logs time after finishing a task. He also has the ability to edit the timelog of each logged task of his.
So my supervisor suggested that a time counter starts running when a designer begins a task, he can also pause it (in case there are breaks). And when hes done he can simply stop the timer and his time on task will be logged automatically. These actions should be logged so the manager can see the designer's activity history (The manager has a designer utilisation chart in manager dashboard, my idea was to click on each designer name on that chart and it would display their activity history, but if u got a better idea let me know).
I guess time log and edit buttons should no longerr be needed and can be removed now.

For tasks, he suggested that I make it trello style and drag each task from todo to in progress to completed. he mentioned something about kanban.
Im also wondering whether we should let the manager assign tasks specific to designers or should be free for all.
Begin planning, ask me for the required files.




Analtics page zoom out/compact.



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
            │   └── Ui.tsx
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