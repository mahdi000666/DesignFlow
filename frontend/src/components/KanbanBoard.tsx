import {
  DndContext, type DragEndEvent, type DragStartEvent, DragOverlay,
  useDroppable, useDraggable,
  PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import type { Task } from '../types/task';
import { useState } from 'react';

// ─── Column config ────────────────────────────────────────────────────────────

interface ColumnDef {
  id:       Task['status'];
  label:    string;
  dotColor: string;
  hdrColor: string;
  colBg:    string;
  badgeBg:  string;
}

const COLUMNS: ColumnDef[] = [
  {
    id: 'Todo',
    label: 'To Do',
    dotColor: 'bg-slate-400',
    hdrColor: 'text-slate-600',
    colBg: 'bg-slate-100/90',      // ← was 'bg-slate-100'
    badgeBg: 'bg-slate-200/80',
  },
  {
    id: 'InProgress',
    label: 'In Progress',
    dotColor: 'bg-blue-400',
    hdrColor: 'text-blue-600',
    colBg: 'bg-blue-50/60',       // ← was 'bg-blue-100'
    badgeBg: 'bg-blue-100/80',
  },
  {
    id: 'Completed',
    label: 'Completed',
    dotColor: 'bg-emerald-400',
    hdrColor: 'text-emerald-600',
    colBg: 'bg-emerald-50/40',    // ← was 'bg-emerald-100'
    badgeBg: 'bg-emerald-100/60',
  },
];

// ─── Droppable column ─────────────────────────────────────────────────────────

function DroppableColumn({
  id, label, dotColor, hdrColor, colBg, badgeBg, count, children,
}: ColumnDef & { count: number; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col rounded-2xl border min-h-[420px] transition-all duration-200 ${
        isOver
          ? 'border-primary/25 bg-primary/[0.02] shadow-xl shadow-primary/5 scale-[1.01]'
          : `border-slate-200/60 ${colBg}`
      }`}
    >
      {/* Column header */}
      <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-slate-200/50">
        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${dotColor} ring-2 ring-white shadow-sm`} />
        <span className={`text-sm font-bold ${hdrColor}`}>{label}</span>
        <span className={`ml-auto text-xs font-mono font-bold px-2 py-0.5 rounded-md ${badgeBg} ${hdrColor}`}>
          {count}
        </span>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-3 p-3.5 flex-1">
        {children}
        {count === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className={`w-10 h-10 rounded-xl ${badgeBg} flex items-center justify-center mx-auto mb-2`}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`${hdrColor} opacity-40`}>
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </div>
              <p className="text-[11px] text-slate-300 font-medium">Drop tasks here</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Draggable card wrapper ───────────────────────────────────────────────────

function DraggableCard({ id, children }: { id: number; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: String(id) });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{ opacity: isDragging ? 0.4 : 1 }}
      className="cursor-grab active:cursor-grabbing transition-transform"
    >
      {children}
    </div>
  );
}

// ─── KanbanBoard ─────────────────────────────────────────────────────────────

interface Props {
  tasks:          Task[];
  onStatusChange: (taskId: number, newStatus: Task['status']) => void;
  renderCard:     (task: Task, columnColor: string) => React.ReactNode;
  isLoading?:     boolean;
  onTaskMoved?:   (taskId: number, newStatus: Task['status']) => void;
}

export default function KanbanBoard({ tasks, onStatusChange, renderCard, isLoading, onTaskMoved }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const handleDragStart = ({ active }: DragStartEvent) => {
    setActiveTask(tasks.find(t => t.id === Number(active.id)) ?? null);
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveTask(null);
    if (!over) return;
    const taskId    = Number(active.id);
    const newStatus = over.id as Task['status'];
    const task      = tasks.find(t => t.id === taskId);
    if (task && task.status !== newStatus) {
      onStatusChange(taskId, newStatus);
      onTaskMoved?.(taskId, newStatus);
    }
  };

  const byStatus = (s: Task['status']) => tasks.filter(t => t.status === s);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <div className="w-4 h-4 border-2 border-slate-300 border-t-primary rounded-full animate-spin" />
          Loading tasks…
        </div>
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-3 gap-5">
        {COLUMNS.map(col => (
          <DroppableColumn key={col.id} {...col} count={byStatus(col.id).length}>
            {byStatus(col.id).map(task => (
              <DraggableCard key={task.id} id={task.id}>
                {renderCard(task, col.dotColor)}
              </DraggableCard>
            ))}
          </DroppableColumn>
        ))}
      </div>
      <DragOverlay>
        {activeTask && (
          <div className="rotate-2 scale-[1.03] shadow-2xl opacity-95">
            {renderCard(activeTask, COLUMNS.find(c => c.id === activeTask.status)?.dotColor ?? 'bg-slate-400')}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}