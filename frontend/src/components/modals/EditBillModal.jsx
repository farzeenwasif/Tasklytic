import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { TASK_STATUSES } from '../../constants/taskOptions';
import TaskFields, { Pill, emptyTaskForm, taskFormPayload } from '../TaskFields';
import { formatDuration } from '../../utils/taskUtils';

export default function EditTaskModal({ isOpen, task, onClose, onUpdate }) {
  const [form, setForm] = useState(emptyTaskForm());
  const [status, setStatus] = useState('To do');
  const [hoursLogged, setHoursLogged] = useState('0');
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (task && isOpen) {
      setForm(emptyTaskForm(task));
      setStatus(task.status || 'To do');
      setHoursLogged(String(Math.round((task.hoursLogged || 0) * 100) / 100));
      setErrors({});
      setSubmitError('');
    }
  }, [task, isOpen]);

  if (!isOpen || !task) return null;

  const set = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return setErrors({ title: 'Give the task a title' });

    const changes = { ...taskFormPayload(form), status };
    // Only send the time spent when it was edited, so a running timer is not overwritten
    const hours = Math.max(0, parseFloat(hoursLogged) || 0);
    if (hours !== Math.round((task.hoursLogged || 0) * 100) / 100) changes.hoursLogged = hours;

    setSubmitting(true);
    setSubmitError('');
    try {
      await onUpdate(changes);
      onClose();
    } catch (err) {
      setSubmitError(err.response?.data?.message || 'Failed to update task');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50 p-4">
      <div className="glass-panel modal-pop rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center px-6 py-4 border-b border-white/10 sticky top-0 z-10 glass-header">
          <h2 className="text-xl sm:text-2xl font-bold text-white">Edit task</h2>
          <button onClick={onClose} type="button" aria-label="Close" className="text-gray-400 hover:text-white transition-colors p-1">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="p-6 space-y-5">
          <TaskFields form={form} set={set} errors={errors}>
            <div>
              <p className="block text-sm font-medium text-gray-300 mb-1.5">Status</p>
              <div className="grid grid-cols-3 gap-2 max-w-sm">
                {TASK_STATUSES.map((s) => (
                  <Pill key={s} active={status === s} onClick={() => setStatus(s)}>{s}</Pill>
                ))}
              </div>
            </div>
            <div>
              <label htmlFor="hoursLogged" className="block text-sm font-medium text-gray-300 mb-1.5">
                Time spent <span className="text-gray-500 font-normal">(hours; the Focus timer fills this in)</span>
              </label>
              <div className="flex items-center gap-3">
                <input
                  id="hoursLogged" type="number" min="0" step="0.25" value={hoursLogged}
                  onChange={(e) => setHoursLogged(e.target.value)}
                  className="glass-input w-28 px-3 py-2 rounded-xl text-sm"
                />
                <span className="text-sm text-gray-400">{formatDuration(parseFloat(hoursLogged) || 0)}</span>
              </div>
            </div>
          </TaskFields>

          {submitError && <p className="text-red-400 text-sm">{submitError}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 btn-ghost">Cancel</button>
            <button type="submit" disabled={submitting} className="flex-1 px-4 py-2 btn-primary">
              {submitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
