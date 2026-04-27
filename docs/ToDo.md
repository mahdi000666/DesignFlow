Account icon placement



1. Add input validation in login page, (valid email format and password at least 8 characters).
2. The password reset page keeps repeating "Please satisfy all password requirements" despite me putting a valid password and matching confirmation password.
3. I don't think the password reset page is checking for valid token on page load (verify that). I tried deleting an account with all its tokens, tried to access the password reset page with the deleted token and it still opens (should display invalid token like activate page does).
4. Verify if any duplicated code exists between all the auth pages and AuthComponents.tsx. In case there is, add it to AuthComponents to avoid duplication.






mahdi.mlika2022@gmail.com 


"No active account found with the given credentials"

shell darker color

later check if can create 2 tokens in reset






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
            │   ├── KPICard.tsx
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
            │   │   └── LoginPage.tsx
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
                ├── format.ts
                └── project.ts
```

Its important that you don't accidentally contradict or overwrite already existing files from past sprints. You can always pause and ask me to provide any files you require.