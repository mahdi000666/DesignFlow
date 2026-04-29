Manager dashboard:
Rework the current manager dashboard to match the mockup dashboard.
What to do:
Ignore the navlinks they are just mockup
Limit recent activity to 4 activties with either view all or expand/shrink (depending on your judgement and best design choice).
Give the activites nicer icons.
Add how many total activites inside the pie chart just like the mockup.
Keep the upcoming deadlines the way it is (dont copy the mockup)
Rework the kpi cards to match the icnos, remove the side colors but keep the existing icons.
Do not add the date filter, notification or avatar icons found on top right of the mockup.
Make sure designer utilisation is sorted by highest in descending order, designers with no utilisation ("-") should not be listed.
Ensure the budget v actual hours chart matches the mockup (move it a little to the left so it fills the card and does not leave space)
Keep active projects the way it is. 

Analytics dashboard:
1. this line of code is found in 3 places, and for each place there is the error below, fix it.
`formatter={(value: number | string | Array<number | string>) => {`
Type '(value: number | string | Array<number | string>) => [string, "Cumulative"]' is not assignable to type 'Formatter<string | number | (string | number)[], "Cumulative"> & ((value: string | number | (string | number)[], name: "Cumulative", item: Payload<string | number | (string | number)[], "Cumulative">, index: number, payload: Payload<...>[]) => ReactNode | [...])'.
  Type '(value: number | string | Array<number | string>) => [string, "Cumulative"]' is not assignable to type 'Formatter<string | number | (string | number)[], "Cumulative">'.
    Types of parameters 'value' and 'value' are incompatible.
      Type 'string | number | (string | number)[] | undefined' is not assignable to type 'string | number | (string | number)[]'.
        Type 'undefined' is not assignable to type 'string | number | (string | number)[]'.
The expected type comes from property 'formatter' which is declared here on type 'IntrinsicAttributes & Omit<Props<string | number | (string | number)[], \"Cumulative\">, PropertiesReadFromContext> & { ...; }'

2. Rework the KPI cards to match the new ones.
3. In Profit Margin per Project, the negative margin bar collides with the project name if its negative, ensure they are well aligned.
4. Client Profitability Ranking, ensure the column titles are well aligned with the content row. Scope Creep Index, give unplanned and total some coloring.

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