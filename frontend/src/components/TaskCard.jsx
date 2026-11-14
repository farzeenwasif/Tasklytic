import { CalendarDays, Edit2, Eye, Trash2 } from 'lucide-react';

export const STATUS_STYLES = {
  Completed: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
  'In Progress': 'bg-blue-500/15 text-blue-300 border-blue-500/40',
  'Ready to Assign': 'bg-purple-500/15 text-purple-300 border-purple-500/40',
  Scheduled: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40',
};

export const PRIORITY_STYLES = {
  High: 'bg-red-500/15 text-red-300 border-red-500/40',
  Medium: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
  Low: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
};

// colored strip on the card's left edge
const PRIORITY_ACCENT = {
  High: 'bg-red-400',
  Medium: 'bg-amber-400',
  Low: 'bg-emerald-400',
};

const FALLBACK_STYLE = 'bg-gray-500/15 text-gray-300 border-gray-500/40';

// Due dates are stored as YYYY-MM-DD; read them as local dates so they don't shift a day
export const parseDueDate = (value) => {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const d = m ? new Date(+m[1], m[2] - 1, +m[3]) : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

function dueInfo(task) {
  const due = parseDueDate(task.dueDate);
  if (!due) return { label: 'No due date', tone: 'text-gray-400' };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((due - today) / 86400000);
  const date = due.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  if (task.status === 'Completed') return { label: date, tone: 'text-gray-400' };
  if (days < 0) return { label: `${date} · overdue`, tone: 'text-red-400' };
  if (days === 0) return { label: 'Due today', tone: 'text-amber-300' };
  if (days === 1) return { label: 'Due tomorrow', tone: 'text-amber-300' };
  return { label: date, tone: 'text-gray-300' };
}

const initials = (name = '') =>
  name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || '?';

function Chip({ className, children }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${className}`}>
      {children}
    </span>
  );
}

function IconButton({ onClick, title, danger, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`p-1.5 rounded-lg transition-colors ${
        danger ? 'text-red-400 hover:bg-red-500/20' : 'text-gray-400 hover:text-white hover:bg-white/10'
      }`}
    >
      {children}
    </button>
  );
}

// One task as a card. Without the action handlers (e.g. the Add Task preview) it renders read-only.
export default function TaskCard({ task, selected = false, onToggleSelect, onView, onEdit, onDelete }) {
  const logged = Number(task.hoursLogged) || 0;
  const estimated = Number(task.estimatedHours) || 0;
  const progress = estimated > 0 ? Math.min(100, (logged / estimated) * 100) : 0;
  const overBudget = estimated > 0 && logged > estimated;
  const due = dueInfo(task);
  const interactive = Boolean(onView || onEdit || onDelete);

  return (
    <article
      className={`glass-card relative overflow-hidden rounded-2xl p-5 flex flex-col gap-4 transition-all duration-200 ${
        interactive ? 'hover:-translate-y-0.5 hover:border-white/20' : ''
      } ${selected ? 'ring-2 ring-emerald-400/70' : ''}`}
    >
      <span className={`absolute left-0 top-0 bottom-0 w-1 ${PRIORITY_ACCENT[task.priority] || 'bg-gray-500'}`} />

      {/* top row: select, category, actions */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {onToggleSelect && (
            <input
              type="checkbox"
              checked={selected}
              onChange={onToggleSelect}
              aria-label={`Select ${task.title}`}
              className="accent-emerald-500 cursor-pointer w-4 h-4"
            />
          )}
          <span className="text-[11px] uppercase tracking-wider text-gray-400 truncate">
            {task.category || 'Uncategorized'}
          </span>
        </div>
        {interactive && (
          <div className="flex items-center -mr-1.5">
            {onView && <IconButton onClick={onView} title="View"><Eye size={16} /></IconButton>}
            {onEdit && <IconButton onClick={onEdit} title="Edit"><Edit2 size={16} /></IconButton>}
            {onDelete && <IconButton onClick={onDelete} title="Delete" danger><Trash2 size={16} /></IconButton>}
          </div>
        )}
      </div>

      {/* title and description */}
      <div className="min-w-0">
        <h4
          className={`text-white font-semibold text-lg leading-snug break-words ${onView ? 'cursor-pointer hover:underline underline-offset-4' : ''}`}
          onClick={onView}
        >
          {task.title || 'Untitled task'}
        </h4>
        {task.description && (
          <p className="text-sm text-gray-400 mt-1 line-clamp-2 break-words">{task.description}</p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Chip className={STATUS_STYLES[task.status] || FALLBACK_STYLE}>{task.status}</Chip>
        <Chip className={PRIORITY_STYLES[task.priority] || FALLBACK_STYLE}>{task.priority} priority</Chip>
      </div>

      {/* hours progress */}
      <div className="mt-auto">
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-gray-400">Progress</span>
          <span className={overBudget ? 'text-red-400 font-semibold' : 'text-gray-200 font-semibold'}>
            {logged}/{estimated}h
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${overBudget ? 'bg-red-400' : 'bg-emerald-400'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* footer: due date and assignee */}
      <div className="flex items-center justify-between gap-3 pt-3 border-t border-white/10">
        <span className={`flex items-center gap-1.5 text-xs ${due.tone}`}>
          <CalendarDays size={14} />
          {due.label}
        </span>
        {task.assignee && (
          <span className="flex items-center gap-2 min-w-0" title={task.assignee}>
            <span className="text-xs text-gray-400 truncate max-w-[110px]">{task.assignee}</span>
            <span className="w-7 h-7 shrink-0 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-[11px] font-bold flex items-center justify-center">
              {initials(task.assignee)}
            </span>
          </span>
        )}
      </div>
    </article>
  );
}
