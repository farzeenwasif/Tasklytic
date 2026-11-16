import { useContext, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Camera, ImagePlus, ListChecks, Loader2, Mic, MicOff, Sparkles, Trash2, X } from 'lucide-react'
import * as ai from '../services/aiService'
import { TaskContext } from '../context/BillContext'
import { TASK_PRIORITIES } from '../constants/taskOptions'
import { imageForm } from '../utils/image'
import { getErrorMessage } from '../utils/apiClient'
import { formatDuration, formatTime } from '../utils/taskUtils'

const SpeechRecognition = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)
const PRIORITY_DOT = { Low: 'bg-emerald-400', Medium: 'bg-amber-400', High: 'bg-red-400' }
const LANGS = [
  { code: 'en-US', label: 'English' },
  { code: 'ur-PK', label: 'اردو' },
]

// Dictation with the browser's own speech recognition (no AI credits used)
function useDictation(onText) {
  const [listening, setListening] = useState(false)
  const [lang, setLang] = useState('en-US')
  const [error, setError] = useState('')
  const recRef = useRef(null)
  const onTextRef = useRef(onText)
  onTextRef.current = onText

  const stop = () => {
    recRef.current?.stop()
    setListening(false)
  }

  const start = () => {
    if (!SpeechRecognition) return
    setError('')
    const rec = new SpeechRecognition()
    rec.lang = lang
    rec.continuous = true
    rec.interimResults = false
    rec.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) onTextRef.current(e.results[i][0].transcript.trim())
      }
    }
    rec.onerror = (e) => {
      if (e.error === 'not-allowed') setError('Microphone access was blocked. Allow it in the browser to dictate.')
      else if (e.error !== 'aborted' && e.error !== 'no-speech') setError('Dictation stopped. Try again.')
      setListening(false)
    }
    rec.onend = () => setListening(false)
    recRef.current = rec
    rec.start()
    setListening(true)
  }

  useEffect(() => () => recRef.current?.abort(), [])
  return { supported: Boolean(SpeechRecognition), listening, start, stop, lang, setLang, error }
}

// The tasks the AI found, to check and tweak before adding
function Review({ drafts, setDrafts, onAdd, adding, onBack }) {
  const kept = drafts.filter((d) => d.keep)
  const update = (i, changes) => setDrafts((list) => list.map((d, j) => (j === i ? { ...d, ...changes } : d)))
  const cyclePriority = (p) => TASK_PRIORITIES[(TASK_PRIORITIES.indexOf(p) + 1) % TASK_PRIORITIES.length]

  if (!drafts.length) {
    return (
      <div className='text-center py-8 space-y-3'>
        <p className='text-gray-300'>No tasks found in that. Try adding a bit more detail.</p>
        <button type='button' onClick={onBack} className='btn-ghost px-4 py-2'>Back</button>
      </div>
    )
  }
  return (
    <div className='space-y-4'>
      <p className='text-sm text-gray-400'>Found {drafts.length} task{drafts.length === 1 ? '' : 's'}. Untick anything you do not want, fix titles or dates, then add them.</p>
      <ul className='space-y-2'>
        {drafts.map((d, i) => (
          <li key={i} className={`rounded-xl border p-3 transition-colors ${d.keep ? 'border-white/15 bg-white/[0.04]' : 'border-white/5 opacity-50'}`}>
            <div className='flex items-start gap-3'>
              <input type='checkbox' checked={d.keep} onChange={() => update(i, { keep: !d.keep })} aria-label={`Keep ${d.title}`} className='accent-emerald-500 w-4 h-4 mt-2.5 shrink-0' />
              <div className='flex-1 min-w-0 space-y-2'>
                <input
                  value={d.title}
                  onChange={(e) => update(i, { title: e.target.value })}
                  maxLength={300}
                  aria-label='Task title'
                  className='glass-input w-full px-3 py-1.5 rounded-lg text-sm'
                />
                <div className='flex flex-wrap items-center gap-2 text-xs'>
                  <input
                    type='date'
                    value={d.dueDate}
                    onChange={(e) => update(i, { dueDate: e.target.value, dueTime: e.target.value ? d.dueTime : '' })}
                    aria-label='Due date'
                    className='glass-input px-2 py-1 rounded-lg text-xs'
                  />
                  {d.dueTime && <span className='text-gray-300'>{formatTime(d.dueTime)}</span>}
                  <button
                    type='button'
                    onClick={() => update(i, { priority: cyclePriority(d.priority) })}
                    title='Change priority'
                    className='inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-gray-200'
                  >
                    <span className={`w-2 h-2 rounded-full ${PRIORITY_DOT[d.priority]}`} /> {d.priority}
                  </button>
                  <span className='text-gray-400'>{d.category}</span>
                  {d.estimatedHours > 0 && <span className='text-gray-400'>{formatDuration(d.estimatedHours)}</span>}
                  {d.subtasks.length > 0 && (
                    <span className='inline-flex items-center gap-1 text-gray-400' title={d.subtasks.map((s) => s.title).join('\n')}>
                      <ListChecks size={12} /> {d.subtasks.length} steps
                    </span>
                  )}
                </div>
              </div>
              <button type='button' onClick={() => setDrafts((list) => list.filter((_, j) => j !== i))} aria-label='Remove' className='p-1.5 text-gray-500 hover:text-red-400'>
                <Trash2 size={15} />
              </button>
            </div>
          </li>
        ))}
      </ul>
      <div className='flex flex-wrap gap-2 justify-end'>
        <button type='button' onClick={onBack} className='btn-ghost px-4 py-2'>Back</button>
        <button type='button' onClick={onAdd} disabled={!kept.length || adding || kept.some((d) => !d.title.trim())} className='btn-primary px-4 py-2'>
          {adding ? <Loader2 size={16} className='animate-spin' /> : <Sparkles size={16} />}
          Add {kept.length} task{kept.length === 1 ? '' : 's'}
        </button>
      </div>
    </div>
  )
}

// AI capture (Premium): turn a brain dump or a photo into several tasks at once
export default function CaptureModal({ onClose, onAdded }) {
  const { addTasks } = useContext(TaskContext)
  const [mode, setMode] = useState('dump') // 'dump' | 'photo'
  const [text, setText] = useState('')
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState('')
  const [hint, setHint] = useState('')
  const [busy, setBusy] = useState(false)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')
  const [drafts, setDrafts] = useState(null)
  const fileRef = useRef(null)
  const dictation = useDictation((spoken) => setText((t) => (t.trim() ? `${t.trim()}\n${spoken}` : spoken)))

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview])

  const pickFile = (f) => {
    if (!f) return
    if (!f.type.startsWith('image/')) return setError('Choose an image (a photo or a screenshot)')
    setError('')
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  // Paste a screenshot straight in (Ctrl+V)
  useEffect(() => {
    const onPaste = (e) => {
      const item = [...(e.clipboardData?.items || [])].find((i) => i.type.startsWith('image/'))
      if (item) {
        setMode('photo')
        pickFile(item.getAsFile())
      }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [])

  const find = async () => {
    dictation.stop()
    setBusy(true)
    setError('')
    try {
      const { tasks } =
        mode === 'dump' ? await ai.brainDump(text) : await ai.imageToTasks(await imageForm(file, { hint }))
      setDrafts(tasks.map((t) => ({ ...t, keep: true })))
    } catch (err) {
      setError(getErrorMessage(err, err.message || 'The AI could not read that. Try again.'))
    } finally {
      setBusy(false)
    }
  }

  const add = async () => {
    setAdding(true)
    setError('')
    try {
      const kept = drafts.filter((d) => d.keep).map(({ keep: _keep, ...t }) => ({ ...t, title: t.title.trim() }))
      const created = await addTasks(kept)
      onAdded?.(created.length)
      onClose()
    } catch (err) {
      setError(getErrorMessage(err, 'Could not add the tasks'))
      setAdding(false)
    }
  }

  const canFind = mode === 'dump' ? text.trim().length > 0 : Boolean(file)

  return createPortal(
    <div className='fixed inset-0 modal-overlay flex items-center justify-center z-50 p-4' onClick={busy || adding ? undefined : onClose}>
      <div
        className='glass-panel modal-pop rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto'
        onClick={(e) => e.stopPropagation()}
        role='dialog'
        aria-modal='true'
        aria-label='AI capture'
      >
        <div className='flex justify-between items-start gap-3 px-6 py-5 border-b border-white/10'>
          <div>
            <h2 className='text-xl sm:text-2xl font-bold text-white flex items-center gap-2'>
              <Sparkles size={20} className='text-emerald-300' /> AI capture
            </h2>
            <p className='text-sm text-gray-400 mt-1'>Get everything out of your head. The AI turns it into tasks.</p>
          </div>
          <button type='button' onClick={onClose} aria-label='Close' className='text-gray-400 hover:text-white p-1'><X size={24} /></button>
        </div>

        <div className='p-6 space-y-5'>
          {drafts ? (
            <Review drafts={drafts} setDrafts={setDrafts} onAdd={add} adding={adding} onBack={() => setDrafts(null)} />
          ) : (
            <>
              <div className='grid grid-cols-2 gap-2 max-w-sm'>
                {[
                  { id: 'dump', label: 'Speak or type', icon: Mic },
                  { id: 'photo', label: 'Photo / screenshot', icon: Camera },
                ].map((m) => (
                  <button
                    key={m.id}
                    type='button'
                    onClick={() => setMode(m.id)}
                    aria-pressed={mode === m.id}
                    className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm border transition-colors ${
                      mode === m.id ? 'bg-white text-[#0b0b0c] border-white font-semibold' : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <m.icon size={15} /> {m.label}
                  </button>
                ))}
              </div>

              {mode === 'dump' ? (
                <div className='space-y-2'>
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    rows={7}
                    maxLength={4000}
                    autoFocus
                    placeholder={'e.g. "kal ammi ko doctor le jana hai shaam 5 baje, report friday tak bhejni hai, bijli ka bill dena hai, aur gym dobara start karna hai"'}
                    className='glass-input w-full px-4 py-3 rounded-xl resize-y'
                  />
                  <div className='flex flex-wrap items-center gap-2'>
                    {dictation.supported ? (
                      <>
                        <button
                          type='button'
                          onClick={dictation.listening ? dictation.stop : dictation.start}
                          className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                            dictation.listening ? 'bg-red-500 text-white border-red-500 animate-pulse' : 'bg-white/5 text-gray-200 border-white/15 hover:bg-white/10'
                          }`}
                        >
                          {dictation.listening ? <MicOff size={15} /> : <Mic size={15} />}
                          {dictation.listening ? 'Stop listening' : 'Speak'}
                        </button>
                        <select
                          value={dictation.lang}
                          onChange={(e) => dictation.setLang(e.target.value)}
                          disabled={dictation.listening}
                          aria-label='Dictation language'
                          className='glass-input px-2 py-2 rounded-xl text-sm'
                        >
                          {LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
                        </select>
                      </>
                    ) : (
                      <span className='text-xs text-gray-500'>Your browser does not support dictation; type instead (Chrome and Edge support it).</span>
                    )}
                    <span className='text-xs text-gray-500 ml-auto'>{text.length}/4000</span>
                  </div>
                  {dictation.error && <p className='text-xs text-red-400'>{dictation.error}</p>}
                </div>
              ) : (
                <div className='space-y-3'>
                  <button
                    type='button'
                    onClick={() => fileRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault()
                      pickFile(e.dataTransfer.files?.[0])
                    }}
                    className='w-full rounded-xl border-2 border-dashed border-white/15 hover:border-emerald-400/50 bg-white/[0.03] p-6 flex flex-col items-center gap-2 text-gray-300 transition-colors'
                  >
                    {preview ? (
                      <img src={preview} alt='Selected' className='max-h-56 rounded-lg object-contain' />
                    ) : (
                      <>
                        <ImagePlus size={28} className='text-gray-400' />
                        <span className='font-medium'>Choose, drop or paste (Ctrl+V) an image</span>
                        <span className='text-xs text-gray-500'>A handwritten list, a whiteboard, a WhatsApp chat, an email, a timetable...</span>
                      </>
                    )}
                  </button>
                  <input
                    ref={fileRef}
                    type='file'
                    accept='image/*'
                    capture='environment'
                    onChange={(e) => {
                      pickFile(e.target.files?.[0])
                      e.target.value = ''
                    }}
                    className='hidden'
                  />
                  <input
                    value={hint}
                    onChange={(e) => setHint(e.target.value)}
                    maxLength={300}
                    placeholder='Optional: anything the AI should know ("only my tasks", "deadlines are this month")'
                    className='glass-input w-full px-4 py-2.5 rounded-xl text-sm'
                  />
                </div>
              )}

              <div className='flex justify-end'>
                <button type='button' onClick={find} disabled={!canFind || busy} className='btn-primary px-5 py-2.5'>
                  {busy ? <Loader2 size={16} className='animate-spin' /> : <Sparkles size={16} />}
                  {busy ? 'Reading...' : 'Find my tasks'}
                </button>
              </div>
            </>
          )}
          {error && <p className='text-red-400 text-sm'>{error}</p>}
        </div>
      </div>
    </div>,
    document.body
  )
}
