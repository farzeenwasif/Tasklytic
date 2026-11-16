import { useContext, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarClock, Coffee, Loader2, Lock, MoveRight, RefreshCw, Sparkles, Sun } from 'lucide-react'
import Layout from '../components/Layout'
import { DoneButton, FocusButton } from '../components/TaskCard'
import { TaskContext } from '../context/BillContext'
import { UserContext } from '../context/UserContext'
import * as ai from '../services/aiService'
import { getDayPlan } from '../services/taskService'
import { getErrorMessage } from '../utils/apiClient'
import { dateFromToday, daysUntilDue, dueInfo, formatTime, isDone, isForToday, localToday, sortTasks } from '../utils/taskUtils'

const pad = (n) => String(n).padStart(2, '0')
const END_KEY = 'tasklytic:day-end'

// The day starts now (rounded up to the next quarter hour), or at 9 before then
const defaultStart = () => {
  const d = new Date()
  const minutes = Math.ceil((d.getHours() * 60 + d.getMinutes()) / 15) * 15
  if (minutes < 9 * 60) return '09:00'
  if (minutes >= 23 * 60) return '23:00'
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`
}
const defaultEnd = () => {
  try {
    const saved = localStorage.getItem(END_KEY)
    if (/^\d{2}:\d{2}$/.test(saved || '')) return saved
  } catch { /* storage blocked */ }
  return new Date().getHours() >= 17 ? '22:00' : '18:00'
}
const nowHHMM = () => {
  const d = new Date()
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function Card({ children, className = '' }) {
  return <section className={`glass-card rounded-2xl p-5 sm:p-6 ${className}`}>{children}</section>
}

// One row: a task you can tick off and focus on
function TaskRow({ task, onError, extra }) {
  const due = dueInfo(task)
  return (
    <div className='flex items-center gap-3 min-w-0'>
      <DoneButton task={task} onError={onError} />
      <div className='min-w-0 flex-1'>
        <p className={`font-medium break-words ${isDone(task) ? 'line-through text-gray-500' : 'text-white'}`}>{task.title}</p>
        <p className={`text-xs ${due.tone}`}>{due.label}{task.priority === 'High' && !isDone(task) ? ' · High priority' : ''}</p>
      </div>
      {extra}
      <FocusButton task={task} onError={onError} />
    </div>
  )
}

export default function Plan() {
  const { tasks, loading, rescheduleTasks } = useContext(TaskContext)
  const { isPremium } = useContext(UserContext)
  const today = localToday()

  const [plan, setPlan] = useState(null)
  const [planLoading, setPlanLoading] = useState(isPremium)
  const [start, setStart] = useState(defaultStart)
  const [end, setEnd] = useState(defaultEnd)
  const [note, setNote] = useState('')
  const [planning, setPlanning] = useState(false)
  const [moving, setMoving] = useState('')
  const [error, setError] = useState('')
  const [clock, setClock] = useState(nowHHMM)

  // Keep "now" fresh so the current block stays highlighted
  useEffect(() => {
    const id = setInterval(() => setClock(nowHHMM()), 30000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (!isPremium) return
    let cancelled = false
    getDayPlan(today)
      .then((p) => !cancelled && setPlan(p))
      .catch(() => { /* no saved plan */ })
      .finally(() => !cancelled && setPlanLoading(false))
    return () => { cancelled = true }
  }, [isPremium, today])

  const byId = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks])
  // Overdue work that can be pulled into today (bill tasks keep the bill's date)
  const overdue = useMemo(
    () => tasks.filter((t) => !isDone(t) && !t.billId && (daysUntilDue(t) ?? 0) < 0),
    [tasks]
  )
  const todayList = useMemo(() => sortTasks(tasks.filter(isForToday)), [tasks])
  const laterTasks = (plan?.later || []).map((id) => byId.get(id)).filter((t) => t && !isDone(t))

  const move = async (kind, ids, date) => {
    setMoving(kind)
    setError('')
    try {
      await rescheduleTasks(ids, date)
    } catch (err) {
      setError(getErrorMessage(err, 'Could not move the tasks'))
    } finally {
      setMoving('')
    }
  }

  const makePlan = async () => {
    setPlanning(true)
    setError('')
    try {
      try { localStorage.setItem(END_KEY, end) } catch { /* storage blocked */ }
      setPlan(await ai.planDay({ start, end, note }))
    } catch (err) {
      setError(getErrorMessage(err, 'Could not plan your day. Try again.'))
    } finally {
      setPlanning(false)
    }
  }

  const blocks = plan?.blocks || []
  const plannedDone = blocks.filter((b) => b.taskId && byId.get(b.taskId) && isDone(byId.get(b.taskId))).length
  const plannedTotal = blocks.filter((b) => b.taskId && byId.get(b.taskId)).length

  return (
    <Layout>
      <div className='max-w-4xl mx-auto space-y-6'>
        <div>
          <h1 className='text-white text-2xl sm:text-3xl font-bold flex items-center gap-2'>
            <Sun size={26} className='text-amber-300' /> My day
          </h1>
          <p className='text-gray-400 text-sm mt-1'>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Free: roll overdue work over */}
        {overdue.length > 0 && (
          <Card className='border-red-400/25 flex flex-col sm:flex-row sm:items-center gap-3'>
            <div className='flex-1'>
              <p className='text-white font-semibold'>{overdue.length} overdue task{overdue.length === 1 ? '' : 's'}</p>
              <p className='text-sm text-gray-400'>{overdue.slice(0, 3).map((t) => t.title).join(', ')}{overdue.length > 3 ? '...' : ''}</p>
            </div>
            <button
              type='button'
              onClick={() => move('overdue', overdue.map((t) => t.id), today)}
              disabled={Boolean(moving)}
              className='btn-primary px-4 py-2.5 shrink-0'
            >
              {moving === 'overdue' ? <Loader2 size={16} className='animate-spin' /> : <MoveRight size={16} />}
              Move to today
            </button>
          </Card>
        )}

        {error && <p className='text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2'>{error}</p>}

        {/* Premium: AI time-blocking */}
        {isPremium ? (
          <Card className='border-emerald-400/25 bg-gradient-to-br from-emerald-500/[0.08] to-white/[0.02] space-y-4'>
            <div className='flex items-center justify-between gap-3'>
              <h2 className='flex items-center gap-2 text-white font-semibold text-lg'>
                <Sparkles size={18} className='text-emerald-300' /> Plan my day
              </h2>
              {plannedTotal > 0 && <span className='text-sm text-gray-300 tabular-nums'>{plannedDone}/{plannedTotal} done</span>}
            </div>
            <div className='flex flex-wrap items-end gap-3'>
              <label className='text-sm text-gray-300'>
                <span className='block mb-1'>From</span>
                <input type='time' value={start} onChange={(e) => setStart(e.target.value)} className='glass-input px-3 py-2 rounded-xl text-sm' />
              </label>
              <label className='text-sm text-gray-300'>
                <span className='block mb-1'>Until</span>
                <input type='time' value={end} onChange={(e) => setEnd(e.target.value)} className='glass-input px-3 py-2 rounded-xl text-sm' />
              </label>
              <label className='text-sm text-gray-300 flex-1 min-w-[200px]'>
                <span className='block mb-1'>Anything to keep in mind? <span className='text-gray-500'>(optional)</span></span>
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={300}
                  placeholder='e.g. "lunch 1-2pm, low energy after 4"'
                  className='glass-input w-full px-3 py-2 rounded-xl text-sm'
                />
              </label>
              <button type='button' onClick={makePlan} disabled={planning} className='btn-primary px-4 py-2.5'>
                {planning ? <Loader2 size={16} className='animate-spin' /> : plan ? <RefreshCw size={16} /> : <Sparkles size={16} />}
                {planning ? 'Planning...' : plan ? 'Re-plan' : 'Plan my day'}
              </button>
            </div>

            {planLoading ? (
              <div className='h-24 rounded-xl bg-white/5 animate-pulse' />
            ) : plan ? (
              <div className='space-y-4'>
                {plan.summary && <p className='text-sm text-gray-200 leading-relaxed'>{plan.summary}</p>}
                <ol className='relative space-y-2'>
                  {blocks.map((b, i) => {
                    const task = b.taskId ? byId.get(b.taskId) : null
                    if (b.taskId && !task) return null // deleted since
                    const current = clock >= b.start && clock < b.end
                    return (
                      <li
                        key={`${b.start}-${i}`}
                        className={`grid grid-cols-[74px_minmax(0,1fr)] gap-3 rounded-xl border p-3 transition-colors ${
                          current ? 'border-emerald-400/60 bg-emerald-500/10' : 'border-white/10 bg-white/[0.03]'
                        }`}
                      >
                        <div className='text-xs tabular-nums text-gray-400 pt-1'>
                          <p className={current ? 'text-emerald-300 font-semibold' : 'text-gray-200'}>{formatTime(b.start)}</p>
                          <p>{formatTime(b.end)}</p>
                        </div>
                        <div className='min-w-0 space-y-1'>
                          {task ? (
                            <TaskRow task={task} onError={setError} />
                          ) : (
                            <p className='flex items-center gap-2 text-gray-300'><Coffee size={15} /> {b.title}</p>
                          )}
                          {b.note && <p className='text-xs text-gray-400 sm:pl-9'>{b.note}</p>}
                        </div>
                      </li>
                    )
                  })}
                </ol>
                {laterTasks.length > 0 && (
                  <div className='rounded-xl border border-white/10 p-4 space-y-3'>
                    <div className='flex flex-wrap items-center justify-between gap-2'>
                      <p className='text-sm font-semibold text-white flex items-center gap-2'>
                        <CalendarClock size={15} className='text-gray-400' /> Does not fit today
                      </p>
                      <button
                        type='button'
                        onClick={() => move('later', laterTasks.map((t) => t.id), dateFromToday(1))}
                        disabled={Boolean(moving)}
                        className='btn-ghost px-3 py-1.5 text-sm'
                      >
                        {moving === 'later' ? <Loader2 size={14} className='animate-spin' /> : <MoveRight size={14} />}
                        Move all to tomorrow
                      </button>
                    </div>
                    {laterTasks.map((t) => <TaskRow key={t.id} task={t} onError={setError} />)}
                  </div>
                )}
              </div>
            ) : (
              <p className='text-sm text-gray-400'>
                Set your hours and press <strong className='text-gray-200'>Plan my day</strong>. The AI puts your most important
                tasks into time blocks, adds breaks, and tells you what to move to another day.
              </p>
            )}
          </Card>
        ) : (
          <Card className='flex flex-col sm:flex-row sm:items-center gap-4 border-emerald-400/20'>
            <span className='w-11 h-11 shrink-0 rounded-xl bg-emerald-500/15 text-emerald-300 flex items-center justify-center'>
              <Lock size={20} />
            </span>
            <div className='flex-1'>
              <p className='text-white font-semibold'>Let AI plan your day</p>
              <p className='text-sm text-gray-400 mt-0.5'>
                Your tasks placed into a realistic schedule with breaks, in seconds. Re-plan any time things change.
              </p>
            </div>
            <Link to='/billing' className='btn-primary px-4 py-2.5 shrink-0'><Sparkles size={16} /> Upgrade</Link>
          </Card>
        )}

        {/* Everyone: today's list */}
        <Card className='space-y-3'>
          <h2 className='text-white font-semibold text-lg'>Today</h2>
          {loading && !tasks.length ? (
            <div className='h-16 rounded-xl bg-white/5 animate-pulse' />
          ) : todayList.length ? (
            <div className='space-y-3 divide-y divide-white/5'>
              {todayList.map((t) => (
                <div key={t.id} className='pt-3 first:pt-0'><TaskRow task={t} onError={setError} /></div>
              ))}
            </div>
          ) : (
            <p className='text-sm text-gray-400'>
              Nothing due today. <Link to='/tasks' className='text-emerald-300 hover:text-emerald-200'>Add a task</Link> or enjoy the free time.
            </p>
          )}
        </Card>
      </div>
    </Layout>
  )
}
