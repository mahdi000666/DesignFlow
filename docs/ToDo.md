Redesign ManagerDashboard.tsx to match the mockup dashboard. Refer to tailwind and index.css.
What to do:
1. Remove Budget v Actual hours & Designer utilisation from analytics dashboard and put it in manager dashboard.
2. Keep only 4 KPI cards in manager dashboard (Total revenue, AVG. EHR, Active projects, Pending Feedback)
3. Keep Active projects below.
4. Merge Recent Activity and Recent Feedback.
5. Add Tasks by Status and Upcoming Deadlines.
6. Do not include the notification logo or the avatar beside it (on top right) from the mockup.
7. Place the avatar/Identity anchor at the bottom left. just like mockup.
8. Keep the original navbar and navlinks (don't implement the navlinks from the mockup).
9. Remove the welcome back message and "Here's an overview of your agency today."

Redesign AnalyticsDashboard.tsx to match the mockup Reports Dashboard.
1. Budget v Actual hours & Designer utilisation already removed and put in ManagerDashboard.
2. Add 4 KPI Cards. Im debating whether I should go with (Total revenue, AVG. EHR, Hours logged this week, At risk projects) or (Total revenue, AVG. EHR, Total Hours, Profit Margin). Choose whatever is more logical and implement it then explain your reasoning.
3. Keep Profit Margin per Project. 

Make sure to use Ui.tsx for shared components to avoid code duplication. Use the Kpicard from UI.tsx.
Make sure the charts, design, colors, style and svgs are true to the mockup, tailwind and index configs.

If you require additional files. Pause and let me know so you don't have to rewrite already existing logic.


Good job here is my feedback:
Manager dashboard:
1. The budget v actual hours chart still does not lookup like the mockup, rework it from scratch.
2. Get rid of the welcome back and Here's an overview messages.
3. The desginer utilisation budget bar color does not match the mockup.
4. Not sure if its my eyes but in active projects, the budget lines are not the same length for each project, also ensure each column title is well aligned with it's rows.
5. `(new Date(p.deadline!).getTime() - Date.now()) / 86400000,`  "Error: Cannot call impure function during render\n\n`Date.now` is an impure function. Calling an impure function can produce unstable results that update unpredictably when the component happens to re-render.

Analytics dasbhoard:
1. I noticed that in the mockup, the Cumulative hours chart is active without selecting a specific project, but in our case we need to select a project for it to display the time trend. Which is the correct behavior?
2. Scope Creep Index does not use the new style and coloring.
3. Rework Profit Margin per Project to use the new style and coloring.
4. Compilation Skipped: Existing memoization could not be preserved

React Compiler has skipped optimizing this component because the existing manual memoization could not be preserved. This dependency may be mutated later, which could cause the value to change unexpectedly.

C:\Users\Mahdi\Proj\PFE\DesignFlow\frontend\src\pages\manager\AnalyticsDashboard.tsx:184:7
  182 |     if (!valid.length) return null;
  183 |     return valid.reduce((s, r) => s + r.profit_margin_pct!, 0) / valid.length;
> 184 |   }, [profitMargin]);
      |       ^^^^^^^^^^^^ This dependency may be modified later

In order to save tokens, if the fix is few lines of code, just tell me where to paste (before vs after), otherwise rewrite it yourself.


Good job, my feedback:
1. `const nowMs = useMemo(() => Date.now(), []);` 
Error: Cannot call impure function during render

`Date.now` is an impure function. Calling an impure function can produce unstable results that update unpredictably when the component happens to re-render.

2. The Budget v Actual hours chart still does not match, look at the screenshots to see the current chart being displayed vs mockup.
3. Do you recommend I use formatEHR for active projects EHR tab and in analytics as well?
4. Scope Creep Index and Profit Margin per Project are still using the green line instead of the new design color.
5. Revert back to the old Profit Margin per Project, i think its easier to read, except make it prettier with the new design colors and make the bar lines slimmer.

Again you don't have to rewrite everything just tell me where to paste.


KPI CARDS



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