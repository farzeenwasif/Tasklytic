import { useContext, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Clock, FileText, Flag, ListChecks, Loader2, Lock, Plus, Sparkles, Wand2 } from 'lucide-react'
import * as ai from '../services/aiService'
import Layout from '../components/Layout'
import TaskCard from '../components/TaskCard'
import { TaskContext } from '../context/BillContext'
import { UserContext } from '../context/UserContext'
import { getErrorMessage } from '../utils/apiClient'
import {
  TASK_CATEGORIES,
  TASK_PRIORITIES,
  TASK_STATUSES,
  DEFAULT_CATEGORY,
} from '../constants/taskOptions'

const inputClass = 'glass-input w-full px-4 py-2.5 rounded-xl'
const labelClass = 'block text-sm font-medium text-gray-300 mb-1.5'

const PRIORITY_DOT = { Low: 'bg-emerald-400', Medium: 'bg-amber-400', High: 'bg-red-400' }
const HOUR_PRESETS = [1, 2, 4, 8]

// YYYY-MM-DD in local time, `days` from today
const dateFromToday = (days) => {
  const d = new Date()
  d.setDate(d.getDate() + days)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
const DATE_PRESETS = [
  { label: 'Today', days: 0 },
  { label: 'Tomorrow', days: 1 },
  { label: 'Next week', days: 7 },
]

function Section({ icon: Icon, title, children }) {
  return (
    <section className='glass-card rounded-2xl p-5 sm:p-6 space-y-4'>
      <h3 className='flex items-center gap-2 text-white font-semibold'>
        <span className='w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-300 flex items-center justify-center'>
          <Icon size={16} />
        </span>
        {title}
      </h3>
      {children}
    </section>
  )
}

function Pill({ active, onClick, children }) {
  return (
    <button
      type='button'
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm border transition-colors ${
        active
          ? 'bg-white text-[#0b0b0c] border-white font-semibold'
          : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10 hover:text-white'
      }`}
    >
      {children}
    </button>
  )
}

const FieldError = ({ children }) =>
  children ? <p className='text-red-400 text-xs mt-1.5'>{children}</p> : null

// Small AI action button; for Free users it links to the upgrade page instead
function AIButton({ isPremium, onClick, busy, children }) {
  if (!isPremium) {
    return (
      <Link to='/billing' title='Premium feature' className='inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-emerald-300 transition-colors'>
        <Lock size={12} /> {children}
      </Link>
    )
  }
  return (
    <button
      type='button'
      onClick={onClick}
      disabled={busy}
      className='inline-flex items-center gap-1.5 text-xs font-medium text-emerald-300 hover:text-emerald-200 transition-colors disabled:opacity-60'
    >
      {busy ? <Loader2 size={12} className='animate-spin' /> : <Sparkles size={12} />} {children}
    </button>
  )
}

export default function AddTask() {
  const { addTask } = useContext(TaskContext)
  const { user, isPremium } = useContext(UserContext)
  const navigate = useNavigate()

  // AI helpers (Premium)
  const [prompt, setPrompt] = useState('')
  const [aiBusy, setAiBusy] = useState('') // 'draft' | 'describe' | 'subtasks'
  const [aiError, setAiError] = useState('')
  const [subtasks, setSubtasks] = useState([])

  const [form, setForm] = useState({
    title: '',
    description: '',
    category: DEFAULT_CATEGORY,
    assignee: user?.name || '',
    priority: 'Medium',
    status: 'Ready to Assign',
    estimatedHours: '',
    hoursLogged: 0,
    dueDate: '',
  })
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const set = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }))
  }
  const onInput = (e) => set(e.target.name, e.target.value)

  const runAI = async (kind, request) => {
    setAiBusy(kind)
    setAiError('')
    try {
      await request()
    } catch (err) {
      setAiError(getErrorMessage(err, 'The AI could not help with that. Try again.'))
    } finally {
      setAiBusy('')
    }
  }

  const draftFromPrompt = () =>
    runAI('draft', async () => {
      const draft = await ai.draftTaskFromText(prompt)
      setForm((prev) => ({ ...prev, ...draft, estimatedHours: String(draft.estimatedHours) }))
      setErrors({})
      setSubtasks([])
    })

  const describe = () => {
    if (!form.title.trim()) return setErrors((p) => ({ ...p, title: 'Add a title first so the AI knows what to write' }))
    runAI('describe', async () => {
      const { description } = await ai.writeDescription(form)
      set('description', description)
    })
  }

  const breakDown = () => {
    if (!form.title.trim()) return setErrors((p) => ({ ...p, title: 'Add a title first so the AI can break it down' }))
    runAI('subtasks', async () => {
      const { subtasks: list } = await ai.suggestSubtasks(form)
      setSubtasks(list.map((s) => ({ ...s, keep: true })))
    })
  }

  const keptSubtasks = subtasks.filter((s) => s.keep)
  const subtaskHours = keptSubtasks.reduce((sum, s) => sum + s.hours, 0)

  const applySubtasks = () => {
    const checklist = keptSubtasks.map((s) => `- [ ] ${s.title} (${s.hours}h)`).join('\n')
    setForm((prev) => ({
      ...prev,
      description: [prev.description.trim(), 'Steps:', checklist].filter(Boolean).join('\n'),
      estimatedHours: String(subtaskHours),
    }))
    setErrors((p) => ({ ...p, estimatedHours: '' }))
    setSubtasks([])
  }

  const validate = () => {
    const e = {}
    if (!form.title.trim()) e.title = 'Give the task a title'
    if (!(Number(form.estimatedHours) > 0)) e.estimatedHours = 'Enter how many hours it should take'
    if (Number(form.hoursLogged) < 0) e.hoursLogged = 'Hours logged cannot be negative'
    if (!form.dueDate) e.dueDate = 'Pick a due date'
    return e
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const found = validate()
    if (Object.keys(found).length) {
      setErrors(found)
      return
    }
    setSubmitting(true)
    setSubmitError('')
    try {
      await addTask({
        ...form,
        title: form.title.trim(),
        estimatedHours: parseFloat(form.estimatedHours),
        hoursLogged: parseFloat(form.hoursLogged) || 0,
      })
      navigate('/tasks')
    } catch (err) {
      setSubmitError(getErrorMessage(err, 'Failed to add task'))
      setSubmitting(false)
    }
  }

  return (
    <Layout>
      <form onSubmit={handleSubmit} noValidate className='max-w-6xl mx-auto'>
        <div className='flex flex-wrap items-end justify-between gap-3 mb-6'>
          <div>
            <Link to='/tasks' className='inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors mb-2'>
              <ArrowLeft size={15} /> Back to tasks
            </Link>
            <h1 className='text-white text-2xl sm:text-3xl font-bold'>Add New Task</h1>
            <p className='text-gray-400 text-sm mt-1'>Fill in the details. The preview updates as you type.</p>
          </div>
        </div>

        <div className='grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] items-start'>
          {/* Form */}
          <div className='space-y-6'>
            {/* Create with AI */}
            <section className='rounded-2xl p-5 sm:p-6 border border-emerald-400/25 bg-gradient-to-br from-emerald-500/[0.10] to-white/[0.03]'>
              <div className='flex items-center justify-between gap-3 mb-3'>
                <h3 className='flex items-center gap-2 text-white font-semibold'>
                  <span className='w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center'>
                    <Wand2 size={16} />
                  </span>
                  Create with AI
                </h3>
                {!isPremium && (
                  <span className='text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-400/15 text-emerald-300 border border-emerald-400/40'>PREMIUM</span>
                )}
              </div>
              {isPremium ? (
                <div className='flex flex-col sm:flex-row gap-2'>
                  <input
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        if (prompt.trim() && !aiBusy) draftFromPrompt()
                      }
                    }}
                    maxLength={1000}
                    placeholder='e.g. "Finish the client report by Friday, about 3 hours, high priority"'
                    className={inputClass}
                  />
                  <button
                    type='button'
                    onClick={draftFromPrompt}
                    disabled={!prompt.trim() || Boolean(aiBusy)}
                    className='btn-primary px-4 py-2.5 shrink-0'
                  >
                    {aiBusy === 'draft' ? <Loader2 size={16} className='animate-spin' /> : <Sparkles size={16} />}
                    Fill the form
                  </button>
                </div>
              ) : (
                <div className='flex flex-col sm:flex-row sm:items-center gap-3'>
                  <p className='text-sm text-gray-300 flex-1'>
                    Describe a task in one sentence and let AI fill in the title, date, hours and priority for you.
                  </p>
                  <Link to='/billing' className='btn-primary px-4 py-2.5 shrink-0'>
                    <Sparkles size={16} /> Upgrade
                  </Link>
                </div>
              )}
              {aiError && <p className='text-red-400 text-sm mt-3'>{aiError}</p>}
            </section>

            <Section icon={FileText} title='Details'>
              <div>
                <label htmlFor='title' className={labelClass}>Title *</label>
                <input
                  id='title' name='title' value={form.title} onChange={onInput} autoFocus
                  placeholder='e.g. Prepare monthly report'
                  className={`${inputClass} text-base`}
                />
                <FieldError>{errors.title}</FieldError>
              </div>
              <div>
                <div className='flex items-center justify-between gap-3 mb-1.5'>
                  <label htmlFor='description' className='text-sm font-medium text-gray-300'>Description</label>
                  <div className='flex items-center gap-4'>
                    <AIButton isPremium={isPremium} onClick={describe} busy={aiBusy === 'describe'}>
                      {form.description.trim() ? 'Improve with AI' : 'Write with AI'}
                    </AIButton>
                    <AIButton isPremium={isPremium} onClick={breakDown} busy={aiBusy === 'subtasks'}>
                      Break into subtasks
                    </AIButton>
                  </div>
                </div>
                <textarea
                  id='description' name='description' value={form.description} onChange={onInput}
                  rows={5} placeholder='Add notes, links or steps...'
                  className={`${inputClass} resize-y`}
                />
              </div>

              {/* AI subtask suggestions */}
              {subtasks.length > 0 && (
                <div className='rounded-xl border border-emerald-400/25 bg-emerald-500/[0.06] p-4 space-y-3'>
                  <p className='flex items-center gap-2 text-sm font-semibold text-white'>
                    <ListChecks size={16} className='text-emerald-300' /> Suggested steps
                  </p>
                  <ul className='space-y-2'>
                    {subtasks.map((s, i) => (
                      <li key={i}>
                        <label className='flex items-center gap-3 text-sm text-gray-200 cursor-pointer'>
                          <input
                            type='checkbox'
                            checked={s.keep}
                            onChange={() => setSubtasks((list) => list.map((x, j) => (j === i ? { ...x, keep: !x.keep } : x)))}
                            className='accent-emerald-500 w-4 h-4'
                          />
                          <span className='flex-1'>{s.title}</span>
                          <span className='text-xs text-gray-400'>{s.hours}h</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                  <div className='flex flex-wrap gap-2 pt-1'>
                    <button type='button' onClick={applySubtasks} disabled={!keptSubtasks.length} className='btn-primary px-3 py-2 text-sm'>
                      Add to description · estimate {subtaskHours}h
                    </button>
                    <button type='button' onClick={() => setSubtasks([])} className='btn-ghost px-3 py-2 text-sm'>
                      Dismiss
                    </button>
                  </div>
                </div>
              )}
              <div className='grid gap-4 sm:grid-cols-2'>
                <div>
                  <label htmlFor='category' className={labelClass}>Category</label>
                  <select id='category' name='category' value={form.category} onChange={onInput} className={inputClass}>
                    {TASK_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor='assignee' className={labelClass}>Assigned to</label>
                  <input
                    id='assignee' name='assignee' value={form.assignee} onChange={onInput}
                    placeholder='Who will do this?' className={inputClass}
                  />
                </div>
              </div>
            </Section>

            <Section icon={Flag} title='Priority & status'>
              <div>
                <p className={labelClass}>Priority</p>
                <div className='grid grid-cols-3 gap-2'>
                  {TASK_PRIORITIES.map((p) => (
                    <Pill key={p} active={form.priority === p} onClick={() => set('priority', p)}>
                      <span className={`w-2 h-2 rounded-full ${PRIORITY_DOT[p]}`} /> {p}
                    </Pill>
                  ))}
                </div>
              </div>
              <div>
                <p className={labelClass}>Status</p>
                <div className='grid grid-cols-2 sm:grid-cols-4 gap-2'>
                  {TASK_STATUSES.map((s) => (
                    <Pill key={s} active={form.status === s} onClick={() => set('status', s)}>{s}</Pill>
                  ))}
                </div>
              </div>
            </Section>

            <Section icon={Clock} title='Time & schedule'>
              <div className='grid gap-4 sm:grid-cols-2'>
                <div>
                  <label htmlFor='estimatedHours' className={labelClass}>Estimated hours *</label>
                  <input
                    id='estimatedHours' name='estimatedHours' type='number' min='0' step='0.5'
                    value={form.estimatedHours} onChange={onInput} placeholder='0' className={inputClass}
                  />
                  <div className='flex gap-2 mt-2'>
                    {HOUR_PRESETS.map((h) => (
                      <button
                        key={h} type='button' onClick={() => set('estimatedHours', String(h))}
                        className={`px-2.5 py-1 rounded-lg text-xs border transition-colors ${
                          Number(form.estimatedHours) === h
                            ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200'
                            : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                        }`}
                      >
                        {h}h
                      </button>
                    ))}
                  </div>
                  <FieldError>{errors.estimatedHours}</FieldError>
                </div>
                <div>
                  <label htmlFor='hoursLogged' className={labelClass}>Hours already logged</label>
                  <input
                    id='hoursLogged' name='hoursLogged' type='number' min='0' step='0.5'
                    value={form.hoursLogged} onChange={onInput} placeholder='0' className={inputClass}
                  />
                  <FieldError>{errors.hoursLogged}</FieldError>
                </div>
              </div>
              <div>
                <label htmlFor='dueDate' className={labelClass}>Due date *</label>
                <div className='flex flex-col sm:flex-row gap-2'>
                  <input
                    id='dueDate' name='dueDate' type='date'
                    value={form.dueDate} onChange={onInput} className={`${inputClass} sm:max-w-[220px]`}
                  />
                  <div className='flex gap-2'>
                    {DATE_PRESETS.map((d) => {
                      const value = dateFromToday(d.days)
                      return (
                        <Pill key={d.label} active={form.dueDate === value} onClick={() => set('dueDate', value)}>
                          {d.label}
                        </Pill>
                      )
                    })}
                  </div>
                </div>
                <FieldError>{errors.dueDate}</FieldError>
              </div>
            </Section>
          </div>

          {/* Live preview + actions */}
          <aside className='space-y-4 lg:sticky lg:top-0'>
            <p className='text-xs uppercase tracking-wider text-gray-400'>Preview</p>
            <TaskCard
              task={{
                ...form,
                estimatedHours: Number(form.estimatedHours) || 0,
                hoursLogged: Number(form.hoursLogged) || 0,
              }}
            />
            {submitError && (
              <p className='text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2'>{submitError}</p>
            )}
            <div className='flex gap-3'>
              <button type='button' onClick={() => navigate('/tasks')} className='btn-ghost flex-1 py-2.5'>
                Cancel
              </button>
              <button type='submit' disabled={submitting} className='btn-primary flex-1 py-2.5'>
                {submitting ? <Loader2 size={16} className='animate-spin' /> : <Plus size={16} />}
                {submitting ? 'Creating...' : 'Create task'}
              </button>
            </div>
          </aside>
        </div>
      </form>
    </Layout>
  )
}
