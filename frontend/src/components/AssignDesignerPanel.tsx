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
  // Hooks must be called unconditionally; fall back to -1 (never fires a
  // real request) when project is briefly undefined during cache revalidation.
  const assignDesigner = useAssignDesigner(project?.id ?? -1);
  const removeDesigner = useRemoveDesigner(project?.id ?? -1);

  if (!project) return null;

  const { data: designers } = useQuery({
    queryKey: ['designers'],
    queryFn:  async () => {
      const { data } = await apiClient.get<DesignerOption[]>('/users/designers/');
      return data;
    },
  });

  const assignedIds = new Set(project.assignments.map(a => a.designer_id));
  const available   = designers?.filter(d => !assignedIds.has(d.id)) ?? [];

  return (
    <div className="bg-surface border border-border rounded-lg p-5">
      <div className="font-sans text-[11px] uppercase tracking-[0.6px] text-ink3 mb-3">
        Assigned Designers
      </div>

      {/* Assigned chips */}
      {project.assignments.length === 0 ? (
        <p className="font-sans text-[13px] text-ink3 mb-3">No designers assigned yet.</p>
      ) : (
        <div className="flex flex-wrap gap-2 mb-4">
          {project.assignments.map(a => (
            <span
              key={a.designer_id}
              className="inline-flex items-center gap-[6px] px-3 py-[5px] rounded-full bg-teal-light font-sans text-[12px] font-medium text-teal"
            >
              {a.designer_name}
              <button
                onClick={() => removeDesigner.mutate(a.designer_id)}
                disabled={removeDesigner.isPending}
                className="leading-none text-teal/60 hover:text-danger transition-colors disabled:opacity-40 text-[14px] font-normal"
                title="Remove"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Available designers */}
      {available.length > 0 && (
        <>
          <div className="font-sans text-[11px] uppercase tracking-[0.6px] text-ink3 mb-2">
            Add Designer
          </div>
          <div className="flex flex-wrap gap-2">
            {available.map(d => (
              <button
                key={d.id}
                onClick={() => assignDesigner.mutate(d.id)}
                disabled={assignDesigner.isPending}
                className="px-[14px] py-[6px] rounded bg-transparent font-sans text-[12px] text-ink2 border border-border-strong hover:bg-surface2 disabled:opacity-50 transition-colors"
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