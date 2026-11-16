import { useContext, useEffect, useState } from 'react';
import { CalendarDays, Check, Edit2, ListChecks, Pause, Play, Repeat, Trash2 } from 'lucide-react';
import { TaskContext } from '../context/BillContext';
import { REPEAT_LABEL } from '../constants/taskOptions';
import { dueInfo, formatClock, formatDuration, isDone } from '../utils/taskUtils';

export const STATUS_STYLES = {
  Done: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
  Doing: 'bg-blue-500/15 text-blue-300 border-blue-500/40',
  'To do': 'bg-white/10 text-gray-300 border-white/15',
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

// Seconds since the focus timer started, ticking every second while it runs
export function useElapsed(startedAt) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!startedAt) return undefined;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [startedAt]);
  return startedAt ? Math.max(0, (now - new Date(startedAt).getTime()) / 1000) : 0;
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

// The round "tick it off" button
export function DoneButton({ task, onError, size = 'w-6 h-6' }) {
  const { toggleDone } = useContext(TaskContext);
  const [busy, setBusy] = useState(false);
  const done = isDone(task);
  const click = async (e) => {
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    try {
      await toggleDone(task);
    } catch (err) {
      onError?.(err.response?.data?.message || 'Could not update the task');
    } finally {
      setBusy(false);
    }
  };
  return (
    <button
      type="button"
      onClick={click}
      disabled={busy}
      aria-pressed={done}
      aria-label={done ? `Mark "${task.title}" as not done` : `Mark "${task.title}" as done`}
      title={done ? 'Mark as not done' : 'Mark as done'}
      className={`${size} shrink-0 rounded-full border-2 flex items-center justify-center transition-colors ${
        done
          ? 'bg-emerald-400 border-emerald-400 text-[#0b0b0c]'
          : 'border-gray-500 text-transparent hover:border-emerald-400 hover:text-emerald-400'
      } ${busy ? 'opacity-60' : ''}`}
    >
      <Check size={14} strokeWidth={3} />
    </button>
  );
}

// Start / pause the focus timer; shows the running clock
export function FocusButton({ task, onError }) {
  const { startTimer, stopTimer } = useContext(TaskContext);
  const [busy, setBusy] = useState(false);
  const running = Boolean(task.timerStartedAt);
  const elapsed = useElapsed(task.timerStartedAt);
  if (isDone(task)) return null;

  const click = async (e) => {
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    try {
      await (running ? stopTimer(task.id) : startTimer(task.id));
    } catch (err) {
      onError?.(err.response?.data?.message || 'Could not update the timer');
    } finally {
      setBusy(false);
    }
  };
  return (
    <button
      type="button"
      onClick={click}
      disabled={busy}
      title={running ? 'Pause the focus timer' : 'Start a focus timer on this task'}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${
        running
          ? 'bg-emerald-400 text-[#0b0b0c] border-emerald-400'
          : 'bg-white/5 text-gray-200 border-white/15 hover:bg-white/10'
      } ${busy ? 'opacity-60' : ''}`}
    >
      {running ? <Pause size={12} /> : <Play size={12} />}
      {running ? <span className="tabular-nums">{formatClock(elapsed)}</span> : 'Focus'}
    </button>
  );
}

// One task as a card
export default function TaskCard({ task, selected = false, onToggleSelect, onView, onEdit, onDelete, onError }) {
  const done = isDone(task);
  const due = dueInfo(task);
  const elapsed = useElapsed(task.timerStartedAt);
  const spent = (Number(task.hoursLogged) || 0) + elapsed / 3600;
  const estimated = Number(task.estimatedHours) || 0;
  const steps = task.subtasks || [];
  const stepsDone = steps.filter((s) => s.done).length;

  return (
    <article
      className={`glass-card relative overflow-hidden rounded-2xl p-5 flex flex-col gap-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/20 ${
        selected ? 'ring-2 ring-emerald-400/70' : ''
      } ${done ? 'opacity-70' : ''}`}
    >
      <span className={`absolute left-0 top-0 bottom-0 w-1 ${done ? 'bg-gray-600' : PRIORITY_ACCENT[task.priority] || 'bg-gray-500'}`} />

      {/* top row: select, category, actions */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {onToggleSelect && (
            <input
              type="checkbox"
              checked={selected}
              onChange={onToggleSelect}
              aria-label={`Select ${task.title}`}
              className="accent-emerald-500 cursor-pointer w-3.5 h-3.5"
            />
          )}
          <span className="text-[11px] uppercase tracking-wider text-gray-400 truncate">{task.category}</span>
          {!done && task.priority === 'High' && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500/15 text-red-300">HIGH</span>
          )}
          {task.repeat && task.repeat !== 'none' && (
            <span className="text-gray-400" title={REPEAT_LABEL[task.repeat]}><Repeat size={12} /></span>
          )}
        </div>
        <div className="flex items-center -mr-1.5">
          {onEdit && <IconButton onClick={onEdit} title="Edit"><Edit2 size={15} /></IconButton>}
          {onDelete && <IconButton onClick={onDelete} title="Delete" danger><Trash2 size={15} /></IconButton>}
        </div>
      </div>

      {/* tick + title */}
      <div className="flex items-start gap-3 min-w-0">
        <div className="pt-0.5"><DoneButton task={task} onError={onError} /></div>
        <div className="min-w-0 flex-1">
          <h4
            className={`font-semibold text-lg leading-snug break-words ${done ? 'line-through text-gray-400' : 'text-white'} ${
              onView ? 'cursor-pointer hover:underline underline-offset-4' : ''
            }`}
            onClick={onView}
          >
            {task.title || 'Untitled task'}
          </h4>
          {task.description && (
            <p className="text-sm text-gray-400 mt-1 line-clamp-2 break-words">{task.description}</p>
          )}
        </div>
      </div>

      {/* steps */}
      {steps.length > 0 && (
        <button type="button" onClick={onView} className="flex items-center gap-2 text-xs text-gray-300 text-left">
          <ListChecks size={14} className="text-gray-400 shrink-0" />
          <span className="h-1.5 flex-1 rounded-full bg-white/10 overflow-hidden">
            <span
              className="block h-full rounded-full bg-emerald-400 transition-all duration-500"
              style={{ width: `${(stepsDone / steps.length) * 100}%` }}
            />
          </span>
          <span className="tabular-nums">{stepsDone}/{steps.length}</span>
        </button>
      )}

      {/* footer: due date, time spent, focus timer */}
      <div className="mt-auto flex items-center justify-between gap-3 pt-3 border-t border-white/10">
        <span className={`flex items-center gap-1.5 text-xs min-w-0 ${due.tone}`}>
          <CalendarDays size={14} className="shrink-0" />
          <span className="truncate">{due.label}</span>
        </span>
        <span className="flex items-center gap-2 shrink-0">
          {(spent > 0 || estimated > 0) && (
            <span
              className={`text-xs tabular-nums ${estimated > 0 && spent > estimated ? 'text-red-400' : 'text-gray-400'}`}
              title={estimated > 0 ? 'Time spent / estimate' : 'Time spent'}
            >
              {formatDuration(spent)}{estimated > 0 ? ` / ${formatDuration(estimated)}` : ''}
            </span>
          )}
          <FocusButton task={task} onError={onError} />
        </span>
      </div>
    </article>
  );
}
