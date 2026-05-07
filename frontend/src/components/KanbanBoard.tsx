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
}

const COLUMNS: ColumnDef[] = [
  { id: 'Todo',       label: 'Todo',        dotColor: 'bg-slate-400',   hdrColor: 'text-slate-700',   colBg: 'bg-slate-200'      },
  { id: 'InProgress', label: 'In Progress', dotColor: 'bg-blue-500',    hdrColor: 'text-blue-800',    colBg: 'bg-blue-100'       },
  { id: 'Completed',  label: 'Completed',   dotColor: 'bg-emerald-500', hdrColor: 'text-emerald-800', colBg: 'bg-emerald-100'    },
];

// ─── Droppable column ─────────────────────────────────────────────────────────

function DroppableColumn({
  id, label, dotColor, hdrColor, colBg, count, children,
}: ColumnDef & { count: number; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col rounded-xl border min-h-[420px] transition-colors ${isOver ? 'border-primary/40 bg-primary/5' : `border-slate-200 ${colBg}`
        }`}
    >
      {/* Column header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200/80">
        <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
        <span className={`text-sm font-semibold ${hdrColor}`}>{label}</span>
        <span className="ml-auto text-xs font-mono font-bold text-slate-800">{count}</span>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2.5 p-3 flex-1">
        {children}
        {count === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-xs text-slate-300">Drop here</p>
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
      className="cursor-grab active:cursor-grabbing"
    >
      {children}
    </div>
  );
}

// ─── KanbanBoard ─────────────────────────────────────────────────────────────

interface Props {
  tasks:          Task[];
  onStatusChange: (taskId: number, newStatus: Task['status']) => void;
  renderCard:     (task: Task) => React.ReactNode;
  isLoading?:     boolean;
  onTaskMoved?:   (taskId: number, newStatus: Task['status']) => void; // designer only
}

export default function KanbanBoard({ tasks, onStatusChange, renderCard, isLoading, onTaskMoved }: Props) {
  // activationConstraint prevents drag from firing on button clicks inside cards.
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
    return <p className="text-sm text-slate-400">Loading tasks…</p>;
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-3 gap-4">
        {COLUMNS.map(col => (
          <DroppableColumn key={col.id} {...col} count={byStatus(col.id).length}>
            {byStatus(col.id).map(task => (
              <DraggableCard key={task.id} id={task.id}>
                {renderCard(task)}
              </DraggableCard>
            ))}
          </DroppableColumn>
        ))}
      </div>
      <DragOverlay>
        {activeTask && renderCard(activeTask)}
      </DragOverlay>
    </DndContext>
  );
}
