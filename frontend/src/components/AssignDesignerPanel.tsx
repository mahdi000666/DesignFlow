import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAssignDesigner, useRemoveDesigner } from '../hooks/useProjects';
import { useDesignerUtilization } from '../hooks/useAnalytics';
import apiClient from '../api/clients';
import type { Project } from '../types/project';
import type { DesignerUtilizationItem } from '../types/analytic';
import { formatEHR, Initials } from '../utils/format';

interface DesignerOption {
  id:                     number;
  name:                   string;
  specialization?:        string;
  hourly_rate?:           number | null;
  available_hours_per_week?: number | null;
}

interface Props {
  project:  Project | undefined;
  onClose:  () => void;
}

const AVATAR_COLORS = [
  'bg-purple-500', 'bg-teal-500', 'bg-rose-500',
  'bg-blue-500',   'bg-orange-500', 'bg-indigo-500', 'bg-pink-500',
];

const avatarColor = (name: string) => {
  const hash = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
};

export default function AssignDesignerPanel({ project, onClose }: Props) {
  const assignDesigner = useAssignDesigner(project?.id ?? -1);
  const removeDesigner = useRemoveDesigner(project?.id ?? -1);

  const { data: designers = [] } = useQuery({
    queryKey: ['designers'],
    queryFn:  async () => {
      const { data } = await apiClient.get<DesignerOption[]>('/users/designers/');
      return data;
    },
  });

  const { data: utilizationData = [] } = useDesignerUtilization();
  const utilizationMap = useMemo(() => {
    const map = new Map<number, number>();
    (utilizationData as DesignerUtilizationItem[]).forEach(u => {
      map.set(u.designer_id, Math.round(u.utilization_pct ?? 0));
    });
    return map;
  }, [utilizationData]);

  if (!project) return null;

  const assignedIds = new Set(project.assignments.map(a => a.designer_id));

  const allDesigners = designers.map(d => ({
    ...d,
    isAssigned:  assignedIds.has(d.id),
    utilization: utilizationMap.get(d.id) ?? null,
  }));

  const sorted = [
    ...allDesigners.filter(d => d.isAssigned),
    ...allDesigners.filter(d => !d.isAssigned),
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <p className="text-base font-semibold text-slate-900">Assign Designer</p>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 15 15" fill="none">
              <path d="M2 2l11 11M13 2L2 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <ul className="divide-y divide-slate-100 max-h-96 overflow-y-auto px-4 py-2">
          {sorted.length === 0 && (
            <li className="py-8 text-center text-sm text-slate-400">No designers found.</li>
          )}
          {sorted.map(d => {
            const subtitleParts: string[] = [];
            if (d.specialization) subtitleParts.push(d.specialization);
            if (d.hourly_rate != null) subtitleParts.push(formatEHR(d.hourly_rate));
            if (d.utilization != null) subtitleParts.push(`${d.utilization}% Utilised`);

            return (
              <li key={d.id} className={`flex items-center gap-4 px-2 py-4 rounded-xl ${d.isAssigned ? 'bg-slate-50' : ''}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-white text-sm font-bold ${avatarColor(d.name)}`}>
                  {Initials(d.name)}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{d.name}</p>
                  {subtitleParts.length > 0 && (
                    <p className="text-xs text-slate-400 mt-0.5">{subtitleParts.join(' · ')}</p>
                  )}
                </div>

                {d.isAssigned ? (
                  <button
                    onClick={() => removeDesigner.mutate(d.id)}
                    disabled={removeDesigner.isPending}
                    className="text-sm font-semibold text-primary hover:text-rose-600 disabled:opacity-40 transition-colors whitespace-nowrap"
                    title="Click to remove"
                  >
                    Assigned ✓
                  </button>
                ) : (
                  <button
                    onClick={() => assignDesigner.mutate(d.id)}
                    disabled={assignDesigner.isPending}
                    className="bg-primary text-white text-xs font-semibold px-4 py-1.5 rounded-lg hover:bg-primary-600 disabled:opacity-50 transition-colors"
                  >
                    Assign
                  </button>
                )}
              </li>
            );
          })}
        </ul>

        <div className="px-6 py-4 border-t border-slate-100">
          <button
            onClick={onClose}
            className="w-full py-2.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}