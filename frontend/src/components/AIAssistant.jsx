import { useCallback, useContext, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Lock, Loader2, RefreshCw, Sparkles, Square, Volume2 } from 'lucide-react'
import { UserContext } from '../context/UserContext'
import { getDailyBriefing, getInsights, localToday } from '../services/aiService'
import { getErrorMessage } from '../utils/apiClient'

// Set by the login page; the dashboard reads the briefing aloud once, right after login
export const BRIEFING_FLAG = 'tasklytic:play-briefing'
const INSIGHTS_CACHE = 'tasklytic:insights'
const INSIGHTS_TTL = 60 * 60 * 1000 // refresh at most hourly unless asked

const storage = {
  get(key) {
    try { return sessionStorage.getItem(key) } catch { return null }
  },
  set(key, value) {
    try { sessionStorage.setItem(key, value) } catch { /* private mode */ }
  },
  remove(key) {
    try { sessionStorage.removeItem(key) } catch { /* private mode */ }
  },
}

const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window

// Prefer a natural-sounding English voice when the browser has one
const pickVoice = () => {
  const voices = window.speechSynthesis.getVoices()
  return (
    voices.find((v) => /en/i.test(v.lang) && /natural|google|samantha|aria|jenny/i.test(v.name)) ||
    voices.find((v) => /^en/i.test(v.lang)) ||
    null
  )
}

function UpgradeCard() {
  return (
    <div className='glass-card rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4 border-emerald-400/20'>
      <span className='w-11 h-11 shrink-0 rounded-xl bg-emerald-500/15 text-emerald-300 flex items-center justify-center'>
        <Lock size={20} />
      </span>
      <div className='flex-1'>
        <p className='text-white font-semibold'>Unlock your AI assistant</p>
        <p className='text-sm text-gray-400 mt-0.5'>
          Weekly insights, a spoken daily briefing, tasks from a sentence and more with Premium.
        </p>
      </div>
      <Link to='/billing' className='btn-primary px-4 py-2.5 shrink-0'>
        <Sparkles size={16} /> Upgrade, $20/mo
      </Link>
    </div>
  )
}

export default function AIAssistant() {
  const { isPremium } = useContext(UserContext)
  const [insights, setInsights] = useState(null)
  const [insightsLoading, setInsightsLoading] = useState(false)
  const [insightsError, setInsightsError] = useState('')

  const [briefing, setBriefing] = useState('')
  const [briefingLoading, setBriefingLoading] = useState(false)
  const [briefingError, setBriefingError] = useState('')
  const [speaking, setSpeaking] = useState(false)
  const autoPlayed = useRef(false)

  const loadInsights = useCallback(async (force = false) => {
    if (!force) {
      try {
        const cached = JSON.parse(storage.get(INSIGHTS_CACHE) || 'null')
        if (cached && cached.day === localToday() && Date.now() - cached.at < INSIGHTS_TTL) {
          setInsights(cached.data)
          return
        }
      } catch { /* ignore bad cache */ }
    }
    setInsightsLoading(true)
    setInsightsError('')
    try {
      const data = await getInsights()
      setInsights(data)
      storage.set(INSIGHTS_CACHE, JSON.stringify({ day: localToday(), at: Date.now(), data }))
    } catch (err) {
      setInsightsError(getErrorMessage(err, 'Could not load insights'))
    } finally {
      setInsightsLoading(false)
    }
  }, [])

  const speak = useCallback((text) => {
    if (!canSpeak || !text) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    const voice = pickVoice()
    if (voice) utterance.voice = voice
    utterance.rate = 1
    utterance.onstart = () => setSpeaking(true)
    utterance.onend = () => setSpeaking(false)
    utterance.onerror = () => setSpeaking(false)
    window.speechSynthesis.speak(utterance)
  }, [])

  const stop = () => {
    if (canSpeak) window.speechSynthesis.cancel()
    setSpeaking(false)
  }

  const playBriefing = useCallback(async () => {
    setBriefingError('')
    // reuse today's text if we already have it
    if (briefing) return speak(briefing)
    setBriefingLoading(true)
    try {
      const { text } = await getDailyBriefing()
      setBriefing(text)
      speak(text)
    } catch (err) {
      setBriefingError(getErrorMessage(err, 'Could not load your briefing'))
    } finally {
      setBriefingLoading(false)
    }
  }, [briefing, speak])

  useEffect(() => {
    if (!isPremium) return
    loadInsights()
    // Auto-play once after login (the login click lets the browser play audio)
    if (!autoPlayed.current && storage.get(BRIEFING_FLAG)) {
      autoPlayed.current = true
      storage.remove(BRIEFING_FLAG)
      playBriefing()
    }
  }, [isPremium, loadInsights, playBriefing])

  // stop talking when leaving the dashboard
  useEffect(() => () => { if (canSpeak) window.speechSynthesis.cancel() }, [])

  if (!isPremium) return <UpgradeCard />

  return (
    <div className='glass-card rounded-2xl p-5 sm:p-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]'>
      {/* Daily briefing */}
      <div className='flex flex-col gap-3'>
        <div className='flex items-center gap-2'>
          <span className='w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-300 flex items-center justify-center'>
            <Volume2 size={16} />
          </span>
          <h3 className='text-white font-semibold'>Daily briefing</h3>
        </div>
        <p className='text-sm text-gray-300 leading-relaxed min-h-[3rem]'>
          {briefing || 'Hear what is on your plate today. It plays automatically after you log in.'}
        </p>
        {briefingError && <p className='text-xs text-red-400'>{briefingError}</p>}
        <div className='flex gap-2'>
          {speaking ? (
            <button type='button' onClick={stop} className='btn-ghost px-4 py-2'>
              <Square size={14} /> Stop
            </button>
          ) : (
            <button type='button' onClick={playBriefing} disabled={briefingLoading || !canSpeak} className='btn-primary px-4 py-2'>
              {briefingLoading ? <Loader2 size={16} className='animate-spin' /> : <Volume2 size={16} />}
              {briefingLoading ? 'Preparing...' : 'Play briefing'}
            </button>
          )}
          {speaking && (
            <span className='flex items-end gap-0.5 h-5 self-center' aria-hidden='true'>
              {[0, 1, 2, 3].map((i) => (
                <span key={i} className='w-1 bg-emerald-400 rounded-full animate-pulse' style={{ height: `${8 + (i % 2) * 8}px`, animationDelay: `${i * 0.15}s` }} />
              ))}
            </span>
          )}
        </div>
        {!canSpeak && <p className='text-xs text-gray-500'>Your browser can't read text aloud.</p>}
      </div>

      {/* Weekly insights */}
      <div className='flex flex-col gap-3 lg:border-l lg:border-white/10 lg:pl-6'>
        <div className='flex items-center justify-between gap-2'>
          <div className='flex items-center gap-2'>
            <span className='w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-300 flex items-center justify-center'>
              <Sparkles size={16} />
            </span>
            <h3 className='text-white font-semibold'>AI insights</h3>
          </div>
          <button
            type='button'
            onClick={() => loadInsights(true)}
            disabled={insightsLoading}
            title='Refresh insights'
            className='p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50'
          >
            <RefreshCw size={16} className={insightsLoading ? 'animate-spin' : ''} />
          </button>
        </div>

        {insightsError && <p className='text-sm text-red-400'>{insightsError}</p>}
        {insightsLoading && !insights && (
          <div className='space-y-2'>
            <div className='h-4 rounded bg-white/10 animate-pulse' />
            <div className='h-4 w-2/3 rounded bg-white/10 animate-pulse' />
          </div>
        )}
        {insights && (
          <>
            <p className='text-sm text-gray-200 leading-relaxed'>{insights.summary}</p>
            <div className='grid gap-4 sm:grid-cols-2'>
              {insights.highlights?.length > 0 && (
                <div>
                  <p className='text-xs uppercase tracking-wider text-gray-500 mb-2'>Highlights</p>
                  <ul className='space-y-1.5'>
                    {insights.highlights.map((h) => (
                      <li key={h} className='text-sm text-gray-300 flex gap-2'><span className='text-emerald-400'>•</span>{h}</li>
                    ))}
                  </ul>
                </div>
              )}
              {insights.focus?.length > 0 && (
                <div>
                  <p className='text-xs uppercase tracking-wider text-gray-500 mb-2'>Focus next</p>
                  <ul className='space-y-1.5'>
                    {insights.focus.map((f) => (
                      <li key={f} className='text-sm text-gray-300 flex gap-2'><span className='text-amber-300'>→</span>{f}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
