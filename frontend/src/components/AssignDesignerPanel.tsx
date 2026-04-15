import { useQuery } from '@tanstack/react-query';
import { useAssignDesigner, useRemoveDesigner } from '../hooks/useProjects';
import apiClient from '../api/client';
import type { Project } from '../types/project';

interface DesignerOption {
  id:   number;
  name: string;
}

interface Props {
  project: Project | undefined;
}

export default function AssignDesignerPanel({ project }: Props) {
  const assignDesigner = useAssignDesigner(project?.id ?? -1);
  const removeDesigner = useRemoveDesigner(project?.id ?? -1);

  const { data: designers } = useQuery({
    queryKey: ['designers'],
    queryFn:  async () => {
      const { data } = await apiClient.get<DesignerOption[]>('/users/designers/');
      return data;
    },
  });

  if (!project) return null;

  const assignedIds = new Set(project.assignments.map(a => a.designer_id));
  const available   = designers?.filter(d => !assignedIds.has(d.id)) ?? [];

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
        Assigned Designers
      </p>

      {project.assignments.length === 0 ? (
        <p className="text-sm text-slate-400 mb-3">No designers assigned yet.</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 mb-4">
            {project.assignments.map(a => (
              <button
                key={a.designer_id}
                onClick={() => removeDesigner.mutate(a.designer_id)}
                disabled={removeDesigner.isPending}
                title="Click to remove"
                className="inline-flex items-center px-3 py-1 rounded-full bg-teal-50 text-teal-700 ring-1 ring-inset ring-teal-200 text-xs font-medium hover:bg-rose-50 hover:text-rose-600 hover:ring-rose-200 disabled:opacity-40 transition-colors cursor-pointer"
              >
                {a.designer_name}
              </button>
            ))}
          </div>
        </>
      )}

      {available.length > 0 && (
        <>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
            Add Designer
          </p>
          <div className="flex flex-wrap gap-2">
            {available.map(d => (
              <button
                key={d.id}
                onClick={() => assignDesigner.mutate(d.id)}
                disabled={assignDesigner.isPending}
                className="border border-slate-200 text-slate-600 px-3.5 py-1.5 rounded-lg text-xs font-medium hover:bg-slate-50 disabled:opacity-50 transition-colors"
              >
                + {d.name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}