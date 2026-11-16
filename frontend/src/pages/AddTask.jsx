import { useContext, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, ListChecks, Loader2, Lock, Plus, Sparkles, Wand2 } from 'lucide-react'
import * as ai from '../services/aiService'
import Layout from '../components/Layout'
import TaskFields, { emptyTaskForm, taskFormPayload } from '../components/TaskFields'
import { TaskContext } from '../context/BillContext'
import { UserContext } from '../context/UserContext'
import { getErrorMessage } from '../utils/apiClient'
import { formatDuration } from '../utils/taskUtils'

const inputClass = 'glass-input w-full px-4 py-2.5 rounded-xl'

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

// The detailed way to add a task. (The quick way is the one-line box on the dashboard and task list.)
export default function AddTask() {
  const { addTask } = useContext(TaskContext)
  const { isPremium } = useContext(UserContext)
  const navigate = useNavigate()
  const location = useLocation()

  // AI helpers (Premium)
  const [prompt, setPrompt] = useState('')
  const [aiBusy, setAiBusy] = useState('') // 'draft' | 'describe' | 'subtasks'
  const [aiError, setAiError] = useState('')
  const [suggested, setSuggested] = useState([])

  // "More options" on the quick-add box brings its text here as a draft
  const [form, setForm] = useState(() => emptyTaskForm(location.state?.draft))
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const set = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }))
  }

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
      setForm((prev) => ({ ...prev, ...emptyTaskForm({ ...draft, subtasks: prev.subtasks, repeat: prev.repeat }) }))
      setErrors({})
      setSuggested([])
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
      setSuggested(list.map((s) => ({ ...s, keep: true })))
    })
  }

  const kept = suggested.filter((s) => s.keep)
  const keptHours = kept.reduce((sum, s) => sum + s.hours, 0)

  // Suggested steps become the task's real checklist, and their hours its estimate
  const applySuggested = () => {
    setForm((prev) => ({
      ...prev,
      subtasks: [...prev.subtasks, ...kept.map((s) => ({ title: s.title, done: false }))],
      estimatedHours: String(keptHours),
    }))
    setSuggested([])
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) return setErrors({ title: 'Give the task a title' })
    setSubmitting(true)
    setSubmitError('')
    try {
      await addTask(taskFormPayload(form))
      navigate('/tasks')
    } catch (err) {
      setSubmitError(getErrorMessage(err, 'Failed to add task'))
      setSubmitting(false)
    }
  }

  return (
    <Layout>
      <form onSubmit={handleSubmit} noValidate className='max-w-3xl mx-auto space-y-6'>
        <div>
          <Link to='/tasks' className='inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors mb-2'>
            <ArrowLeft size={15} /> Back to tasks
          </Link>
          <h1 className='text-white text-2xl sm:text-3xl font-bold'>New task</h1>
          <p className='text-gray-400 text-sm mt-1'>Only the title is needed. Add the rest if it helps.</p>
        </div>

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
              <button type='button' onClick={draftFromPrompt} disabled={!prompt.trim() || Boolean(aiBusy)} className='btn-primary px-4 py-2.5 shrink-0'>
                {aiBusy === 'draft' ? <Loader2 size={16} className='animate-spin' /> : <Sparkles size={16} />}
                Fill the form
              </button>
            </div>
          ) : (
            <div className='flex flex-col sm:flex-row sm:items-center gap-3'>
              <p className='text-sm text-gray-300 flex-1'>
                Describe a task in your own words and let AI write the details and break it into steps.
              </p>
              <Link to='/billing' className='btn-primary px-4 py-2.5 shrink-0'>
                <Sparkles size={16} /> Upgrade
              </Link>
            </div>
          )}
          {aiError && <p className='text-red-400 text-sm mt-3'>{aiError}</p>}
        </section>

        <section className='glass-card rounded-2xl p-5 sm:p-6'>
          <TaskFields
            form={form}
            set={set}
            errors={errors}
            autoFocus
            descriptionActions={
              <div className='flex items-center gap-4'>
                <AIButton isPremium={isPremium} onClick={describe} busy={aiBusy === 'describe'}>
                  {form.description.trim() ? 'Improve with AI' : 'Write with AI'}
                </AIButton>
                <AIButton isPremium={isPremium} onClick={breakDown} busy={aiBusy === 'subtasks'}>
                  Break into steps
                </AIButton>
              </div>
            }
          >
            {/* AI step suggestions */}
            {suggested.length > 0 && (
              <div className='rounded-xl border border-emerald-400/25 bg-emerald-500/[0.06] p-4 space-y-3'>
                <p className='flex items-center gap-2 text-sm font-semibold text-white'>
                  <ListChecks size={16} className='text-emerald-300' /> Suggested steps
                </p>
                <ul className='space-y-2'>
                  {suggested.map((s, i) => (
                    <li key={i}>
                      <label className='flex items-center gap-3 text-sm text-gray-200 cursor-pointer'>
                        <input
                          type='checkbox'
                          checked={s.keep}
                          onChange={() => setSuggested((list) => list.map((x, j) => (j === i ? { ...x, keep: !x.keep } : x)))}
                          className='accent-emerald-500 w-4 h-4'
                        />
                        <span className='flex-1'>{s.title}</span>
                        <span className='text-xs text-gray-400'>{formatDuration(s.hours)}</span>
                      </label>
                    </li>
                  ))}
                </ul>
                <div className='flex flex-wrap gap-2 pt-1'>
                  <button type='button' onClick={applySuggested} disabled={!kept.length} className='btn-primary px-3 py-2 text-sm'>
                    Add {kept.length} step{kept.length === 1 ? '' : 's'} · estimate {formatDuration(keptHours)}
                  </button>
                  <button type='button' onClick={() => setSuggested([])} className='btn-ghost px-3 py-2 text-sm'>
                    Dismiss
                  </button>
                </div>
              </div>
            )}
          </TaskFields>
        </section>

        {submitError && (
          <p className='text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2'>{submitError}</p>
        )}
        <div className='flex gap-3 justify-end'>
          <button type='button' onClick={() => navigate('/tasks')} className='btn-ghost px-5 py-2.5'>
            Cancel
          </button>
          <button type='submit' disabled={submitting} className='btn-primary px-5 py-2.5'>
            {submitting ? <Loader2 size={16} className='animate-spin' /> : <Plus size={16} />}
            {submitting ? 'Creating...' : 'Create task'}
          </button>
        </div>
      </form>
    </Layout>
  )
}
