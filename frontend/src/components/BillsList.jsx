import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock, Plus, Search, Sparkles, Trash2, X } from 'lucide-react';
import { TaskContext } from '../context/BillContext';
import { UserContext } from '../context/UserContext';
import CaptureModal from './CaptureModal';
import { daysUntilDue, formatDuration, isDone, isForToday, sortTasks } from '../utils/taskUtils';
import TaskCard from './TaskCard';
import QuickAdd from './QuickAdd';
import EditTaskModal from './modals/EditBillModal';
import ViewTaskModal from './modals/ViewBillModal';
import DeleteConfirmModal from './modals/DeleteConfirmModal';
import BulkDeleteConfirmModal from './modals/BulkDeleteConfirmModal';

// The task views, in the order of the pills
const VIEWS = {
  Today: isForToday,
  Upcoming: (t) => !isDone(t) && (daysUntilDue(t) ?? 0) > 0,
  'All open': (t) => !isDone(t),
  Done: isDone,
};
const FILTERS = Object.keys(VIEWS);
const EMPTY_TEXT = {
  Today: 'Nothing for today. Enjoy it, or pull something in from "All open".',
  Upcoming: 'Nothing scheduled for later.',
  'All open': 'Everything is done. Nice work.',
  Done: 'No finished tasks yet.',
};

export default function TasksList() {
  const {
    tasks,
    selectedTasks,
    loading,
    error,
    updateTask,
    deleteTask,
    bulkDeleteTasks,
    toggleTaskSelection,
    clearSelection,
  } = useContext(TaskContext);
  const { isPremium } = useContext(UserContext);
  const [showCapture, setShowCapture] = useState(false);
  const [notice, setNotice] = useState('');

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [actionError, setActionError] = useState('');
  const [statusFilter, setStatusFilter] = useState('All open');
  const pickedView = useRef(false);
  const [query, setQuery] = useState('');

  const counts = useMemo(
    () => Object.fromEntries(FILTERS.map((f) => [f, tasks.filter(VIEWS[f]).length])),
    [tasks]
  );

  // Open on "Today" when there is something in it (decided once, when the tasks first arrive)
  useEffect(() => {
    if (pickedView.current || loading || tasks.length === 0) return;
    pickedView.current = true;
    if (tasks.some(isForToday)) setStatusFilter('Today');
  }, [tasks, loading]);

  const visibleTasks = useMemo(() => {
    const q = query.trim().toLowerCase();
    // Searching looks through every task, whatever view is open
    const pool = q ? tasks : tasks.filter(VIEWS[statusFilter]);
    return sortTasks(
      pool.filter((t) =>
        !q || [t.title, t.description, t.category, ...(t.subtasks || []).map((s) => s.title)]
          .some((v) => v && String(v).toLowerCase().includes(q))
      )
    );
  }, [tasks, statusFilter, query]);

  // Changing the filter clears the selection so a bulk delete never hits hidden tasks
  const changeFilter = (f) => {
    pickedView.current = true;
    setStatusFilter(f);
    clearSelection();
  };
  const changeQuery = (q) => {
    setQuery(q);
    clearSelection();
  };

  const allVisibleSelected =
    visibleTasks.length > 0 && visibleTasks.every((t) => selectedTasks.includes(t.id));

  const toggleSelectVisible = () => {
    visibleTasks.forEach((t) => {
      const isSelected = selectedTasks.includes(t.id);
      if (allVisibleSelected ? isSelected : !isSelected) toggleTaskSelection(t.id);
    });
  };

  const openWith = (setOpen) => (task) => {
    setSelectedTask(task);
    setOpen(true);
  };
  const handleViewClick = openWith(setIsViewModalOpen);
  const handleEditClick = openWith(setIsEditModalOpen);
  const handleDeleteClick = openWith(setIsDeleteModalOpen);

  // Throws on API error so the edit modal can show it; the modal closes itself on success
  const handleUpdateTask = (taskData) => updateTask(selectedTask.id, taskData);

  const handleConfirmDelete = async () => {
    if (!selectedTask) return;
    const id = selectedTask.id;
    setSelectedTask(null);
    setActionError('');
    try {
      await deleteTask(id);
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to delete task');
    }
  };

  const handleBulkDelete = () => {
    setIsDeleteModalOpen(false);
    setIsBulkDeleteModalOpen(true);
  };

  const handleConfirmBulkDelete = async () => {
    setActionError('');
    try {
      await bulkDeleteTasks(selectedTasks);
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to delete tasks');
    }
  };

  const totalHours = tasks
    .filter((task) => selectedTasks.includes(task.id))
    .reduce((sum, task) => sum + (Number(task.hoursLogged) || 0), 0);

  return (
    <div className="w-full space-y-5">
      <QuickAdd />

      {/* Toolbar: search + new task */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="search"
            value={query}
            onChange={(e) => changeQuery(e.target.value)}
            placeholder="Search tasks, steps, categories..."
            className="glass-input w-full pl-9 pr-4 py-2.5 rounded-xl text-sm"
          />
        </div>
        <div className="flex gap-2 self-start sm:self-auto">
          {isPremium ? (
            <button type="button" onClick={() => setShowCapture(true)} className="btn-primary px-4 py-2.5">
              <Sparkles size={16} /> AI capture
            </button>
          ) : (
            <Link to="/billing" title="Premium: turn a brain dump or a photo into tasks" className="btn-ghost px-4 py-2.5">
              <Lock size={14} /> AI capture
            </Link>
          )}
          <Link to="/tasks/add" className="btn-ghost px-4 py-2.5">
            <Plus size={16} /> Detailed task
          </Link>
        </div>
      </div>
      {notice && <p className="text-sm text-emerald-300">{notice}</p>}
      {showCapture && (
        <CaptureModal
          onClose={() => setShowCapture(false)}
          onAdded={(n) => {
            setNotice(`Added ${n} task${n === 1 ? '' : 's'}.`);
            setTimeout(() => setNotice(''), 4000);
          }}
        />
      )}

      {/* Status filter pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {FILTERS.map((f) => {
          const active = statusFilter === f;
          return (
            <button
              key={f}
              type="button"
              onClick={() => changeFilter(f)}
              className={`shrink-0 flex items-center gap-2 px-3.5 py-1.5 rounded-full text-sm border transition-colors ${
                active
                  ? 'bg-white text-[#0b0b0c] border-white font-semibold'
                  : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10 hover:text-white'
              }`}
            >
              {f}
              <span className={`text-xs rounded-full px-1.5 ${active ? 'bg-black/10' : 'bg-white/10'}`}>
                {counts[f] ?? 0}
              </span>
            </button>
          );
        })}
      </div>

      {/* Selection bar */}
      {visibleTasks.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 min-h-9">
          <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={allVisibleSelected}
              onChange={toggleSelectVisible}
              className="accent-emerald-500 cursor-pointer w-4 h-4"
            />
            Select all ({visibleTasks.length})
          </label>
          {selectedTasks.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-300">{selectedTasks.length} selected</span>
              <button
                onClick={handleBulkDelete}
                className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/50 rounded-lg text-sm transition-colors flex items-center gap-1.5"
              >
                <Trash2 size={14} /> Delete
              </button>
              <button
                onClick={clearSelection}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/15 text-gray-200 border border-white/10 rounded-lg text-sm transition-colors flex items-center gap-1.5"
              >
                <X size={14} /> Clear
              </button>
            </div>
          )}
        </div>
      )}

      {(error || actionError) && (
        <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
          {actionError || error}
        </p>
      )}

      {/* Cards */}
      {loading && tasks.length === 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="glass-card rounded-2xl h-56 animate-pulse" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="glass-card rounded-2xl py-14 px-6 flex flex-col items-center text-center gap-4">
          <p className="text-white text-lg font-semibold">No tasks yet</p>
          <p className="text-gray-400 text-sm max-w-sm">Type your first task in the box above and press Enter. That is all it takes.</p>
        </div>
      ) : visibleTasks.length === 0 ? (
        <div className="glass-card rounded-2xl py-12 px-6 text-center">
          <p className="text-gray-300">{query.trim() ? 'No tasks match your search.' : EMPTY_TEXT[statusFilter]}</p>
          {(query.trim() || statusFilter !== 'All open') && (
            <button
              type="button"
              onClick={() => { changeFilter('All open'); setQuery(''); }}
              className="mt-3 text-sm text-emerald-300 hover:text-emerald-200"
            >
              Show all open tasks
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visibleTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              selected={selectedTasks.includes(task.id)}
              onToggleSelect={() => toggleTaskSelection(task.id)}
              onView={() => handleViewClick(task)}
              onEdit={() => handleEditClick(task)}
              onDelete={() => handleDeleteClick(task)}
              onError={setActionError}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <EditTaskModal
        isOpen={isEditModalOpen}
        task={selectedTask}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedTask(null);
        }}
        onUpdate={handleUpdateTask}
      />

      <ViewTaskModal
        isOpen={isViewModalOpen}
        task={selectedTask}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedTask(null);
        }}
        onEdit={() => {
          setIsViewModalOpen(false);
          setIsEditModalOpen(true);
        }}
      />

      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        task={selectedTask}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedTask(null);
        }}
        onConfirm={handleConfirmDelete}
      />

      <BulkDeleteConfirmModal
        isOpen={isBulkDeleteModalOpen}
        count={selectedTasks.length}
        totalHours={formatDuration(totalHours)}
        onClose={() => setIsBulkDeleteModalOpen(false)}
        onConfirm={handleConfirmBulkDelete}
      />
    </div>
  );
}
