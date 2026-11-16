import { useState } from 'react'
import { ChevronDown, Plus, X } from 'lucide-react'
import { TASK_CATEGORIES, TASK_PRIORITIES, TASK_REPEATS, DEFAULT_CATEGORY } from '../constants/taskOptions'
import { dateFromToday } from '../utils/taskUtils'
import useClients from '../hooks/useClients'

const inputClass = 'glass-input w-full px-4 py-2.5 rounded-xl'
const labelClass = 'block text-sm font-medium text-gray-300 mb-1.5'
const PRIORITY_DOT = { Low: 'bg-emerald-400', Medium: 'bg-amber-400', High: 'bg-red-400' }
const DATE_PRESETS = [
  { label: 'Today', days: 0 },
  { label: 'Tomorrow', days: 1 },
  { label: 'Next week', days: 7 },
]
const ESTIMATE_PRESETS = [0.25, 0.5, 1, 2, 4]

// A blank task form; pass a task (or a draft) to fill it
export const emptyTaskForm = (task = {}) => ({
  title: task.title || '',
  description: task.description || '',
  dueDate: task.dueDate ? String(task.dueDate).slice(0, 10) : '',
  dueTime: task.dueTime || '',
  priority: task.priority || 'Medium',
  category: task.category || DEFAULT_CATEGORY,
  repeat: task.repeat || 'none',
  estimatedHours: task.estimatedHours ? String(task.estimatedHours) : '',
  subtasks: (task.subtasks || []).map((s) => ({ title: s.title, done: Boolean(s.done) })),
  clientId: task.clientId || '',
})

// What the API expects from the form
export const taskFormPayload = (form) => ({
  ...form,
  title: form.title.trim(),
  dueTime: form.dueDate ? form.dueTime : '',
  estimatedHours: parseFloat(form.estimatedHours) || 0,
  subtasks: form.subtasks.filter((s) => s.title.trim()),
  clientId: form.clientId || null,
})

export function Pill({ active, onClick, children, className = '' }) {
  return (
    <button
      type='button'
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm border transition-colors ${
        active
          ? 'bg-white text-[#0b0b0c] border-white font-semibold'
          : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10 hover:text-white'
      } ${className}`}
    >
      {children}
    </button>
  )
}

// Checklist editor: tick, rename, remove, add with Enter
export function SubtaskEditor({ subtasks, onChange }) {
  const [draft, setDraft] = useState('')
  const add = () => {
    if (!draft.trim()) return
    onChange([...subtasks, { title: draft.trim(), done: false }])
    setDraft('')
  }
  return (
    <div className='space-y-2'>
      {subtasks.map((s, i) => (
        <div key={i} className='flex items-center gap-2'>
          <input
            type='checkbox'
            checked={s.done}
            onChange={() => onChange(subtasks.map((x, j) => (j === i ? { ...x, done: !x.done } : x)))}
            aria-label={`Step done: ${s.title}`}
            className='accent-emerald-500 w-4 h-4 shrink-0'
          />
          <input
            value={s.title}
            onChange={(e) => onChange(subtasks.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))}
            maxLength={200}
            aria-label={`Step ${i + 1}`}
            className={`glass-input flex-1 min-w-0 px-3 py-1.5 rounded-lg text-sm ${s.done ? 'line-through text-gray-400' : ''}`}
          />
          <button
            type='button'
            onClick={() => onChange(subtasks.filter((_, j) => j !== i))}
            aria-label={`Remove step ${i + 1}`}
            className='p-1.5 text-gray-400 hover:text-red-400'
          >
            <X size={15} />
          </button>
        </div>
      ))}
      <div className='flex items-center gap-2'>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
          maxLength={200}
          placeholder='Add a step and press Enter'
          className='glass-input flex-1 min-w-0 px-3 py-1.5 rounded-lg text-sm'
        />
        <button type='button' onClick={add} disabled={!draft.trim()} className='btn-ghost px-3 py-1.5 text-sm'>
          <Plus size={14} /> Add
        </button>
      </div>
    </div>
  )
}

// The shared fields of the "new task" page and the edit box.
// Only the title is required; the rest sits behind "More options" until needed.
export default function TaskFields({ form, set, errors = {}, autoFocus = false, descriptionActions = null, children }) {
  const clients = useClients()
  const hasExtras =
    form.category !== DEFAULT_CATEGORY || form.repeat !== 'none' || Boolean(form.estimatedHours) || form.subtasks.length > 0 || Boolean(form.clientId)
  const [showMore, setShowMore] = useState(hasExtras)
  const open = showMore || hasExtras
  const onInput = (e) => set(e.target.name, e.target.value)

  return (
    <div className='space-y-5'>
      <div>
        <label htmlFor='title' className={labelClass}>What needs doing?</label>
        <input
          id='title' name='title' value={form.title} onChange={onInput} autoFocus={autoFocus}
          maxLength={300} placeholder='e.g. Pay the electricity bill'
          className={`${inputClass} text-base`}
        />
        {errors.title && <p className='text-red-400 text-xs mt-1.5'>{errors.title}</p>}
      </div>

      <div>
        <p className={labelClass}>When? <span className='text-gray-500 font-normal'>(optional)</span></p>
        <div className='flex flex-wrap gap-2'>
          {DATE_PRESETS.map((d) => {
            const value = dateFromToday(d.days)
            return (
              <Pill key={d.label} active={form.dueDate === value} onClick={() => set('dueDate', form.dueDate === value ? '' : value)}>
                {d.label}
              </Pill>
            )
          })}
          <input
            name='dueDate' type='date' value={form.dueDate} onChange={onInput} aria-label='Due date'
            className='glass-input px-3 py-2 rounded-xl text-sm'
          />
          {form.dueDate && (
            <input
              name='dueTime' type='time' value={form.dueTime} onChange={onInput} aria-label='Due time (optional)'
              className='glass-input px-3 py-2 rounded-xl text-sm'
            />
          )}
        </div>
      </div>

      <div>
        <p className={labelClass}>Priority</p>
        <div className='grid grid-cols-3 gap-2 max-w-sm'>
          {TASK_PRIORITIES.map((p) => (
            <Pill key={p} active={form.priority === p} onClick={() => set('priority', p)}>
              <span className={`w-2 h-2 rounded-full ${PRIORITY_DOT[p]}`} /> {p}
            </Pill>
          ))}
        </div>
      </div>

      <div>
        <div className='flex items-center justify-between gap-3 mb-1.5'>
          <label htmlFor='description' className='text-sm font-medium text-gray-300'>
            Notes <span className='text-gray-500 font-normal'>(optional)</span>
          </label>
          {descriptionActions}
        </div>
        <textarea
          id='description' name='description' value={form.description} onChange={onInput}
          rows={3} placeholder='Links, details, anything you want to remember...'
          className={`${inputClass} resize-y`}
        />
      </div>

      {children}

      {!open ? (
        <button type='button' onClick={() => setShowMore(true)} className='inline-flex items-center gap-1.5 text-sm text-emerald-300 hover:text-emerald-200'>
          <ChevronDown size={16} /> More options: steps, repeat, category, estimate
        </button>
      ) : (
        <div className='space-y-5 pt-1'>
          <div>
            <p className={labelClass}>Steps</p>
            <SubtaskEditor subtasks={form.subtasks} onChange={(list) => set('subtasks', list)} />
          </div>
          <div className='grid gap-4 sm:grid-cols-2'>
            <div>
              <label htmlFor='repeat' className={labelClass}>Repeat</label>
              <select id='repeat' name='repeat' value={form.repeat} onChange={onInput} className={inputClass}>
                {TASK_REPEATS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
              {form.repeat !== 'none' && (
                <p className='text-xs text-gray-500 mt-1.5'>When you tick it off, the next one is created for you.</p>
              )}
            </div>
            <div>
              <label htmlFor='category' className={labelClass}>Category</label>
              <select id='category' name='category' value={form.category} onChange={onInput} className={inputClass}>
                {TASK_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          {clients.length > 0 && (
            <div>
              <label htmlFor='clientId' className={labelClass}>Client <span className='text-gray-500 font-normal'>(makes focus time billable)</span></label>
              <select id='clientId' name='clientId' value={form.clientId} onChange={onInput} className={inputClass}>
                <option value=''>No client</option>
                {clients.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label htmlFor='estimatedHours' className={labelClass}>
              How long will it take? <span className='text-gray-500 font-normal'>(hours, optional)</span>
            </label>
            <div className='flex flex-wrap items-center gap-2'>
              <input
                id='estimatedHours' name='estimatedHours' type='number' min='0' step='0.25'
                value={form.estimatedHours} onChange={onInput} placeholder='0'
                className='glass-input w-24 px-3 py-2 rounded-xl text-sm'
              />
              {ESTIMATE_PRESETS.map((h) => (
                <Pill
                  key={h}
                  active={Number(form.estimatedHours) === h}
                  onClick={() => set('estimatedHours', Number(form.estimatedHours) === h ? '' : String(h))}
                  className='px-2.5 py-1.5 text-xs'
                >
                  {h < 1 ? `${h * 60}m` : `${h}h`}
                </Pill>
              ))}
            </div>
            {errors.estimatedHours && <p className='text-red-400 text-xs mt-1.5'>{errors.estimatedHours}</p>}
          </div>
        </div>
      )}
    </div>
  )
}
