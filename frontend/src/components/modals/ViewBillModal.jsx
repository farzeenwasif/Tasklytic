import { useContext, useState } from 'react';
import { Briefcase, CalendarDays, Clock, Edit2, Receipt, Repeat, Tag, X } from 'lucide-react';
import useClients from '../../hooks/useClients';
import { TaskContext } from '../../context/BillContext';
import { REPEAT_LABEL } from '../../constants/taskOptions';
import { dueInfo, formatDuration, isDone } from '../../utils/taskUtils';
import { DoneButton, FocusButton, PRIORITY_STYLES, STATUS_STYLES, useElapsed } from '../TaskCard';

function Chip({ className, children }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${className}`}>
      {children}
    </span>
  );
}

// Task details: tick steps off, run the focus timer, mark it done
export default function ViewTaskModal({ isOpen, task: selected, onClose, onEdit }) {
  const { tasks, toggleSubtask } = useContext(TaskContext);
  const [error, setError] = useState('');
  // Always show the live version of the task (it changes while this box is open)
  const task = (selected && tasks.find((t) => t.id === selected.id)) || selected;
  const elapsed = useElapsed(task?.timerStartedAt);
  const clients = useClients();
  const client = task?.clientId ? clients.find((c) => c._id === task.clientId) : null;

  if (!isOpen || !task) return null;

  const due = dueInfo(task);
  const spent = (Number(task.hoursLogged) || 0) + elapsed / 3600;
  const estimated = Number(task.estimatedHours) || 0;
  const steps = task.subtasks || [];
  const stepsDone = steps.filter((s) => s.done).length;

  const tick = async (index) => {
    setError('');
    try {
      await toggleSubtask(task, index);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update the step');
    }
  };

  return (
    <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="glass-panel modal-pop rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Task details"
      >
        <div className="flex justify-between items-start gap-3 px-6 py-5 border-b border-white/10">
          <div className="flex items-start gap-3 min-w-0">
            <div className="pt-1"><DoneButton task={task} onError={setError} size="w-7 h-7" /></div>
            <h2 className={`text-xl sm:text-2xl font-bold break-words ${isDone(task) ? 'line-through text-gray-400' : 'text-white'}`}>
              {task.title}
            </h2>
          </div>
          <div className="flex items-center shrink-0">
            {onEdit && (
              <button onClick={onEdit} type="button" aria-label="Edit" title="Edit" className="text-gray-400 hover:text-white transition-colors p-1.5">
                <Edit2 size={18} />
              </button>
            )}
            <button onClick={onClose} type="button" aria-label="Close" className="text-gray-400 hover:text-white transition-colors p-1">
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex flex-wrap gap-2">
            <Chip className={STATUS_STYLES[task.status] || STATUS_STYLES['To do']}>{task.status}</Chip>
            <Chip className={PRIORITY_STYLES[task.priority] || STATUS_STYLES['To do']}>{task.priority} priority</Chip>
            <Chip className="bg-white/5 text-gray-300 border-white/10"><Tag size={11} /> {task.category}</Chip>
            {client && (
              <Chip className="bg-white/5 text-gray-300 border-white/10"><Briefcase size={11} /> {client.name} · billable</Chip>
            )}
            {task.billId && (
              <Chip className="bg-white/5 text-gray-300 border-white/10"><Receipt size={11} /> Bill: ticking it off records the payment</Chip>
            )}
            {task.repeat && task.repeat !== 'none' && (
              <Chip className="bg-white/5 text-gray-300 border-white/10"><Repeat size={11} /> {REPEAT_LABEL[task.repeat]}</Chip>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-white/5 border border-white/10 p-3">
              <p className="text-xs text-gray-400 flex items-center gap-1.5"><CalendarDays size={13} /> Due</p>
              <p className={`mt-1 font-semibold ${due.tone}`}>{due.label}</p>
            </div>
            <div className="rounded-xl bg-white/5 border border-white/10 p-3">
              <p className="text-xs text-gray-400 flex items-center gap-1.5"><Clock size={13} /> Time spent</p>
              <div className="mt-1 flex items-center justify-between gap-2">
                <p className={`font-semibold tabular-nums ${estimated > 0 && spent > estimated ? 'text-red-400' : 'text-white'}`}>
                  {formatDuration(spent)}
                  {estimated > 0 && <span className="text-gray-400 font-normal"> / {formatDuration(estimated)}</span>}
                </p>
                <FocusButton task={task} onError={setError} />
              </div>
            </div>
          </div>

          {steps.length > 0 && (
            <div>
              <p className="text-sm text-gray-400 mb-2">Steps · {stepsDone}/{steps.length}</p>
              <ul className="space-y-1.5">
                {steps.map((s, i) => (
                  <li key={i}>
                    <label className="flex items-start gap-3 text-sm cursor-pointer rounded-lg px-2 py-1.5 hover:bg-white/5">
                      <input type="checkbox" checked={s.done} onChange={() => tick(i)} className="accent-emerald-500 w-4 h-4 mt-0.5 shrink-0" />
                      <span className={s.done ? 'line-through text-gray-500' : 'text-gray-200'}>{s.title}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {task.description && (
            <div>
              <p className="text-sm text-gray-400 mb-2">Notes</p>
              <p className="text-gray-300 bg-white/5 border border-white/10 p-3 rounded-lg text-sm whitespace-pre-wrap break-words">{task.description}</p>
            </div>
          )}

          {error && <p className="text-red-400 text-sm">{error}</p>}
        </div>
      </div>
    </div>
  );
}
