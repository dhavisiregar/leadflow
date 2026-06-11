import { Trash2 } from 'lucide-react'

export default function ConfirmModal({ message = 'This action cannot be undone.', onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="card w-full max-w-xs p-5 text-center">
        <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-3">
          <Trash2 size={18} className="text-red-500" />
        </div>
        <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Are you sure?</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">{message}</p>
        <div className="flex gap-2">
          <button className="btn-secondary flex-1 text-xs" onClick={onCancel}>Cancel</button>
          <button
            className="flex-1 text-xs bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            onClick={onConfirm}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}
