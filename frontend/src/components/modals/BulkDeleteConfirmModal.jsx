import { Trash2 } from 'lucide-react';

export default function BulkDeleteConfirmModal({ isOpen, count, totalHours, onClose, onConfirm }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50 p-4">
      <div className="glass-panel modal-pop rounded-2xl w-full max-w-md overflow-hidden">
        {/* Icon and Title */}
        <div className="p-6 text-center border-b border-white/10">
          <div className="flex justify-center mb-4">
            <div className="bg-red-500/20 p-4 rounded-full border border-red-500/50">
              <Trash2 size={32} className="text-red-400" />
            </div>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white">Delete Multiple Tasks?</h2>
        </div>

        {/* Message */}
        <div className="px-6 py-4 text-center space-y-3">
          <p className="text-gray-300">
            Are you sure you want to delete <span className="font-semibold text-red-400">{count} task{count !== 1 ? 's' : ''}</span>?
          </p>
          <div className="bg-white/5 border border-white/10 p-3 rounded-lg">
            <p className="text-gray-400 text-sm">Time spent on them</p>
            <p className="text-red-400 font-bold text-lg">{totalHours}</p>
          </div>
          <p className="text-gray-400 text-sm">This action cannot be undone.</p>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 px-6 py-4 bg-white/5 border-t border-white/10">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 btn-ghost"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
          >
            Delete All
          </button>
        </div>
      </div>
    </div>
  );
}
