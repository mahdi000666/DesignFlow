# Scope Creep Index Rewrite Drill

Purpose: prove you can rebuild one full feature from model to dashboard.

Do the first pass without looking at the real implementation. Then compare against the repo.

## Feature Definition

Scope Creep Index shows what percentage of project tasks are unplanned.

Formula:

```text
Scope Creep Index = unplanned task count / total task count * 100
```

Source field:

```text
Task.is_unplanned
```

Zero-data behavior:

```text
If a project has zero tasks, return 0%.
```

## Expected End-To-End Shape

Backend:

1. Add or confirm `Task.is_unplanned`.
2. Add or confirm an analytics endpoint like `GET /api/analytics/scope-creep/`.
3. Query tasks per project.
4. Count total tasks and unplanned tasks.
5. Return `project_id`, `project_name`, `total_tasks`, `unplanned_tasks`, `scope_creep_index`.

Frontend:

1. Add or confirm `ScopeCreepItem` TypeScript type.
2. Add or confirm `getScopeCreep()` in `api/analytics.ts`.
3. Add or confirm `useScopeCreep()` in `hooks/useAnalytics.ts`.
4. Display the metric on dashboard or project detail.
5. Invalidate analytics queries when tasks are created, updated, or deleted.

## First Pass From Memory

Write your own version on paper or in a scratch branch.

Backend pseudocode:

```python
class ScopeCreepView(APIView):
    permission_classes = [IsManager]

    def get(self, request):
        projects = Project.objects.all()
        data = []

        for project in projects:
            total = Task.objects.filter(project=project).count()
            unplanned = Task.objects.filter(project=project, is_unplanned=True).count()
            index = unplanned / total * 100 if total else 0

            data.append({
                "project_id": project.id,
                "project_name": project.project_name,
                "total_tasks": total,
                "unplanned_tasks": unplanned,
                "scope_creep_index": round(index, 1),
            })

        return Response(data)
```

Frontend pseudocode:

```ts
export interface ScopeCreepItem {
  readonly project_id: number;
  readonly project_name: string;
  readonly total_tasks: number;
  readonly unplanned_tasks: number;
  readonly scope_creep_index: number;
}

export const getScopeCreep = async (filters: AnalyticsFilters = {}) => {
  const { data } = await apiClient.get('/analytics/scope-creep/', { params: toParams(filters) });
  return data;
};

export const useScopeCreep = (filters: AnalyticsFilters = {}) =>
  useQuery({
    queryKey: ['analytics', 'scope-creep', filters],
    queryFn: () => getScopeCreep(filters),
  });
```

## Compare Against Real Code

Check these files:

- `backend/apps/tasks/models.py`
- `backend/apps/analytics/views.py`
- `backend/apps/analytics/urls.py`
- `frontend/src/types/analytic.ts`
- `frontend/src/api/analytics.ts`
- `frontend/src/hooks/useAnalytics.ts`
- `frontend/src/pages/manager/ManagerDashboard.tsx`
- `frontend/src/pages/manager/ProjectDetail.tsx`
- `frontend/src/hooks/useTasks.ts`

Confirm:

- `Task.is_unplanned` exists and defaults to `False`.
- The analytics endpoint is Manager-only.
- The endpoint supports filters if the current implementation includes filters.
- The frontend type matches the backend response shape.
- Task mutations invalidate analytics queries.
- UI handles missing or zero data without crashing.

## Explain It In Defense

Use this answer:

"Scope Creep Index is based on the `is_unplanned` field on `Task`. The backend analytics endpoint counts all tasks for a project and counts how many are unplanned, then returns the percentage. The frontend calls that endpoint through the analytics API layer and displays it on the manager dashboard or project detail. This works because scope creep is a project-level business metric, so it should be computed server-side from authoritative task data."

## Tradeoffs

- Simple boolean flag: easy to understand and query.
- Server-side aggregation: consistent formula and secure access.
- Manager-only endpoint: business analytics are not exposed to clients or designers.

## Limitations

- Accuracy depends on users marking tasks as unplanned correctly.
- A boolean cannot show severity or reason for scope creep.
- For a larger agency, task history or change audit data would make this metric stronger.

## Upgrade Ideas

If asked how to improve it:

- Add `unplanned_reason`.
- Add `created_after_project_start` automatic detection.
- Add audit history for task creation and scope changes.
- Weight scope creep by estimated hours, not only task count.
- Show trend over time, not only current percentage.

## Self-Test

Answer without looking:

1. Which model stores the source field?
2. Which endpoint exposes the metric?
3. Which role can call the endpoint?
4. What is the zero-task behavior?
5. Which frontend API function calls it?
6. Which hook wraps the API function?
7. Which UI pages display it?
8. Which mutations must invalidate the analytics cache?
9. What is the main limitation of the metric?
10. How would you make it more accurate?

