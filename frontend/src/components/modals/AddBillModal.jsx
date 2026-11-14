import { useContext, useState } from 'react';
import { UserContext } from '../../context/UserContext';
import { X } from 'lucide-react';
import { TASK_CATEGORIES, DEFAULT_CATEGORY } from '../../constants/taskOptions';

export default function AddTaskModal({ isOpen, onClose, onAdd }) {
  const { user } = useContext(UserContext);
  // A personal task is yours by default; the field can still be changed
  const defaultAssignee = user?.name || '';
  const [formData, setFormData] = useState({
    title: '',
    assignee: defaultAssignee,
    status: 'Ready to Assign',
    priority: 'Medium',
    hoursLogged: 0,
    estimatedHours: '',
    dueDate: '',
    category: DEFAULT_CATEGORY,
    description: '',
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.title.trim()) newErrors.title = 'Task title is required';
    if (!formData.estimatedHours || formData.estimatedHours <= 0) newErrors.estimatedHours = 'Valid hours is required';
    if (!formData.dueDate) newErrors.dueDate = 'Due date is required';
    return newErrors;
  };

  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = validateForm();

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSubmitting(true);
    setSubmitError('');
    try {
      await onAdd({
        ...formData,
        estimatedHours: parseFloat(formData.estimatedHours),
        hoursLogged: parseFloat(formData.hoursLogged) || 0,
      });
    } catch (err) {
      setSubmitError(err.response?.data?.message || 'Failed to add task');
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    setFormData({
      title: '',
      assignee: defaultAssignee,
      status: 'Ready to Assign',
      priority: 'Medium',
      hoursLogged: 0,
      estimatedHours: '',
      dueDate: '',
      category: DEFAULT_CATEGORY,
      description: '',
    });
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50 p-4">
      <div className="glass-panel modal-pop rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-white/10 sticky top-0 z-10 glass-header">
          <h2 className="text-xl sm:text-2xl font-bold text-white">Add New Task</h2>
          <button
            onClick={onClose}
            type="button"
            className="text-gray-400 hover:text-white transition-colors p-1"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Task Title */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Task Title *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g., Prepare monthly report"
              className="w-full px-4 py-2 glass-input rounded-lg"
            />
            {errors.title && <p className="text-red-400 text-sm mt-1">{errors.title}</p>}
          </div>

          {/* Assigned to/}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Assignee *
            </label>
            <input
              type="text"
              name="assignee"
              value={formData.assignee}
              onChange={handleChange}
              placeholder="Who will do this task?"
              className="w-full px-4 py-2 glass-input rounded-lg"
            />
            {errors.assignee && <p className="text-red-400 text-sm mt-1">{errors.assignee}</p>}
          </div>

          {/* Priority and Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Priority
              </label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className="w-full px-4 py-2 glass-input rounded-lg"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-4 py-2 glass-input rounded-lg"
              >
                <option value="Ready to Assign">Ready to Assign</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Scheduled">Scheduled</option>
              </select>
            </div>
          </div>

          {/* Hours */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Hours Logged
              </label>
              <input
                type="number"
                name="hoursLogged"
                value={formData.hoursLogged}
                onChange={handleChange}
                placeholder="0"
                step="0.5"
                className="w-full px-4 py-2 glass-input rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Estimated Hours *
              </label>
              <input
                type="number"
                name="estimatedHours"
                value={formData.estimatedHours}
                onChange={handleChange}
                placeholder="0"
                step="0.5"
                className="w-full px-4 py-2 glass-input rounded-lg"
              />
              {errors.estimatedHours && <p className="text-red-400 text-sm mt-1">{errors.estimatedHours}</p>}
            </div>
          </div>

          {/* Category and Due Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Category
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-4 py-2 glass-input rounded-lg"
              >
                {TASK_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Due Date *
              </label>
              <input
                type="date"
                name="dueDate"
                value={formData.dueDate}
                onChange={handleChange}
                className="w-full px-4 py-2 glass-input rounded-lg"
              />
              {errors.dueDate && <p className="text-red-400 text-sm mt-1">{errors.dueDate}</p>}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Add task details..."
              rows="3"
              className="w-full px-4 py-2 glass-input rounded-lg resize-none"
            />
          </div>

          {submitError && <p className="text-red-400 text-sm">{submitError}</p>}

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 btn-ghost"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2  btn-primary"
            >
              {submitting ? 'Adding...' : 'Add Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
