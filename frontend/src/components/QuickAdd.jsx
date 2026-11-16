import { useContext, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, Clock, Flag, Loader2, Plus, Repeat, SlidersHorizontal, Tag } from 'lucide-react'
import { TaskContext } from '../context/BillContext'
import { DEFAULT_CATEGORY, REPEAT_LABEL } from '../constants/taskOptions'
import { quickParse } from '../utils/quickParse'
import { dueInfo, formatDuration } from '../utils/taskUtils'
import { getErrorMessage } from '../utils/apiClient'

const EXAMPLES = [
  'Pay rent Friday 5pm !high',
  'Gym every day 7am 45m',
  'Kal shaam 5 baje doctor',
  'Submit report by 25 dec #work',
]

function Chip({ icon: Icon, children, className = 'text-gray-200' }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-white/10 border border-white/10 ${className}`}>
      <Icon size={12} /> {children}
    </span>
  )
}

// One line, Enter, done. Dates, times, priority (!high), category (#work), repeats and
// estimates (30m, 2h) are read from the text as you type.
export default function QuickAdd({ autoFocus = false }) {
  const { addTask } = useContext(TaskContext)
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [added, setAdded] = useState('')
  const inputRef = useRef(null)
  const [example] = useState(() => EXAMPLES[Math.floor(Math.random() * EXAMPLES.length)])

  const parsed = useMemo(() => quickParse(text), [text])
  const hasText = Boolean(text.trim())

  const submit = async (e) => {
    e.preventDefault()
    if (!hasText || saving) return
    setSaving(true)
    setError('')
    try {
      const task = await addTask({
        title: parsed.title || text.trim(),
        dueDate: parsed.dueDate,
        dueTime: parsed.dueTime,
        priority: parsed.priority || 'Medium',
        category: parsed.category || DEFAULT_CATEGORY,
        repeat: parsed.repeat || 'none',
        estimatedHours: parsed.estimatedHours || 0,
      })
      setText('')
      setAdded(task.title)
      setTimeout(() => setAdded(''), 2500)
      inputRef.current?.focus()
    } catch (err) {
      setError(getErrorMessage(err, 'Could not add the task'))
    } finally {
      setSaving(false)
    }
  }

  const due = parsed.dueDate ? dueInfo({ dueDate: parsed.dueDate, dueTime: parsed.dueTime, status: 'To do' }) : null

  return (
    <form onSubmit={submit} className='glass-card rounded-2xl p-3 sm:p-4'>
      <div className='flex items-center gap-2'>
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoFocus={autoFocus}
          maxLength={300}
          aria-label='Add a task'
          placeholder={`Add a task...  e.g. "${example}"`}
          className='glass-input flex-1 min-w-0 px-4 py-3 rounded-xl text-base'
        />
        <button type='submit' disabled={!hasText || saving} className='btn-primary px-4 py-3 shrink-0' aria-label='Add task'>
          {saving ? <Loader2 size={18} className='animate-spin' /> : <Plus size={18} />}
          <span className='hidden sm:inline'>Add</span>
        </button>
        <Link
          to='/tasks/add'
          state={hasText ? { draft: { ...parsed, title: parsed.title || text.trim() } } : undefined}
          title='More options'
          aria-label='More options'
          className='btn-ghost px-3 py-3 shrink-0'
        >
          <SlidersHorizontal size={18} />
        </Link>
      </div>

      {/* What was understood from the text */}
      <div className='flex flex-wrap items-center gap-1.5 mt-2 min-h-6 px-1'>
        {hasText ? (
          <>
            {due && <Chip icon={CalendarDays} className={due.tone}>{due.label}</Chip>}
            {parsed.repeat && <Chip icon={Repeat}>{REPEAT_LABEL[parsed.repeat]}</Chip>}
            {parsed.priority && (
              <Chip icon={Flag} className={parsed.priority === 'High' ? 'text-red-300' : parsed.priority === 'Low' ? 'text-emerald-300' : 'text-amber-300'}>
                {parsed.priority}
              </Chip>
            )}
            {parsed.category && <Chip icon={Tag}>{parsed.category}</Chip>}
            {parsed.estimatedHours > 0 && <Chip icon={Clock}>{formatDuration(parsed.estimatedHours)}</Chip>}
            {!due && !parsed.repeat && !parsed.priority && !parsed.category && !parsed.estimatedHours && (
              <span className='text-xs text-gray-500'>Press Enter to add. Try adding "tomorrow 5pm", "!high" or "#work".</span>
            )}
          </>
        ) : added ? (
          <span className='text-xs text-emerald-300'>Added "{added}"</span>
        ) : (
          <span className='text-xs text-gray-500'>
            Just type and press Enter. Dates, times, <code>!high</code>, <code>#category</code>, <code>every week</code> and <code>30m</code> are understood.
          </span>
        )}
      </div>
      {error && <p className='text-red-400 text-sm mt-1 px-1'>{error}</p>}
    </form>
  )
}
