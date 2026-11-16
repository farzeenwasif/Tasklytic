import { useCallback, useContext, useEffect, useState } from 'react'
import {
  CheckCircle2,
  Clock,
  KeyRound,
  LogIn,
  Pencil,
  PlusCircle,
  Sparkles,
  Wallet,
  FileText,
  Sun,
  Trash2,
  UserCog,
  UserPlus,
} from 'lucide-react'
import { TaskContext } from '../context/BillContext'
import { getActivities, clearActivities } from '../services/activityService'

// Icon + colour per activity type
const ACTION_STYLE = {
  account_created: { icon: UserPlus, cls: 'bg-emerald-400/15 text-emerald-300' },
  login: { icon: LogIn, cls: 'bg-white/10 text-zinc-300' },
  profile_updated: { icon: UserCog, cls: 'bg-violet-400/15 text-violet-300' },
  password_changed: { icon: KeyRound, cls: 'bg-violet-400/15 text-violet-300' },
  task_created: { icon: PlusCircle, cls: 'bg-emerald-400/15 text-emerald-300' },
  task_updated: { icon: Pencil, cls: 'bg-violet-400/15 text-violet-300' },
  task_completed: { icon: CheckCircle2, cls: 'bg-emerald-400/15 text-emerald-300' },
  hours_logged: { icon: Clock, cls: 'bg-white/10 text-zinc-300' },
  task_deleted: { icon: Trash2, cls: 'bg-red-500/20 text-red-300' },
  tasks_bulk_deleted: { icon: Trash2, cls: 'bg-red-500/20 text-red-300' },
  plan_upgraded: { icon: Sparkles, cls: 'bg-emerald-400/15 text-emerald-300' },
  plan_downgraded: { icon: Sparkles, cls: 'bg-white/10 text-zinc-300' },
  subscription_cancelled: { icon: Sparkles, cls: 'bg-red-500/20 text-red-300' },
  subscription_resumed: { icon: Sparkles, cls: 'bg-emerald-400/15 text-emerald-300' },
  tasks_captured: { icon: Sparkles, cls: 'bg-emerald-400/15 text-emerald-300' },
  day_planned: { icon: Sun, cls: 'bg-amber-400/15 text-amber-300' },
  money_added: { icon: Wallet, cls: 'bg-white/10 text-zinc-300' },
  bill_paid: { icon: Wallet, cls: 'bg-emerald-400/15 text-emerald-300' },
  invoice_created: { icon: FileText, cls: 'bg-violet-400/15 text-violet-300' },
  invoice_paid: { icon: FileText, cls: 'bg-emerald-400/15 text-emerald-300' },
}

const timeAgo = (date) => {
  const s = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 1000))
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function ActivityLog() {
  const { tasks } = useContext(TaskContext)
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      setActivities(await getActivities(30))
      setError('')
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load activity')
    } finally {
      setLoading(false)
    }
  }, [])

  // Reload whenever tasks change (create / edit / delete all write activity)
  useEffect(() => {
    load()
  }, [load, tasks])

  const handleClear = async () => {
    if (!window.confirm('Clear your activity history?')) return
    try {
      await clearActivities()
      setActivities([])
    } catch (err) {
      setError(err.response?.data?.message || 'Could not clear activity')
    }
  }

  return (
    <div className="w-full h-[335px] glass-card rounded-2xl flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2">
          <h3 className="text-white font-bold">Activity Log</h3>
          {activities.length > 0 && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/10 text-gray-300">
              {activities.length}
            </span>
          )}
        </div>
        {activities.length > 0 && (
          <button onClick={handleClear} className="text-xs text-gray-400 hover:text-red-400 transition-colors">
            Clear
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2">
        {loading ? (
          <p className="text-gray-400 text-sm text-center py-10">Loading activity...</p>
        ) : error ? (
          <p className="text-red-400 text-sm text-center py-10">{error}</p>
        ) : activities.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <Clock size={28} className="text-gray-500 mb-2" />
            <p className="text-gray-300 text-sm font-medium">No activity yet</p>
            <p className="text-gray-500 text-xs mt-1">Create or update a task and it will show up here.</p>
          </div>
        ) : (
          <ul>
            {activities.map((a) => {
              const { icon: Icon, cls } = ACTION_STYLE[a.action] || ACTION_STYLE.task_updated
              return (
                <li key={a._id} className="flex items-start gap-3 px-2 py-2.5 rounded-lg hover:bg-white/5 transition-colors">
                  <span className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${cls}`}>
                    <Icon size={15} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-100 break-words leading-snug">{a.message}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5" title={new Date(a.createdAt).toLocaleString()}>
                      {timeAgo(a.createdAt)}
                    </p>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
