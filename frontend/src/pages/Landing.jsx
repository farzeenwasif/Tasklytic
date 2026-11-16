import { Component, lazy, Suspense, useContext, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  MotionConfig,
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'motion/react'
import {
  ArrowRight,
  BarChart3,
  Camera,
  CheckCircle2,
  Clock,
  Coffee,
  FileText,
  ListChecks,
  Menu,
  Mic,
  Receipt,
  Repeat,
  ShieldCheck,
  Sparkles,
  Sun,
  UserPlus,
  Volume2,
  Wallet,
  X,
} from 'lucide-react'
import BrandLogo, { BRAND_NAME } from '../components/BrandLogo'
import { UserContext } from '../context/UserContext'
import PricingCards from '../components/PricingCards'
import ContactForm from '../components/ContactForm'

// three.js is heavy: load the 3D scene separately so the page text appears instantly
const HeroScene = lazy(() => import('../components/landing/HeroScene'))

const ACCENT = '#10B981'
const EASE = [0.22, 1, 0.36, 1]

/* If WebGL is unavailable, quietly show a glow instead of crashing the page */
class SceneBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? <SceneFallback /> : this.props.children
  }
}

function SceneFallback() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="w-56 h-56 rounded-full bg-[#10B981]/20 blur-3xl animate-pulse" />
    </div>
  )
}

/* Fade + rise when scrolled into view */
function Reveal({ children, delay = 0, className = '', as = 'div' }) {
  const Tag = motion[as]
  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-70px' }}
      transition={{ duration: 0.7, delay, ease: EASE }}
    >
      {children}
    </Tag>
  )
}

/* ---------- Dashboard preview (sample data) ---------- */

const previewStats = [
  { label: 'Left for today', value: '4', tint: 'from-violet-400/25', ring: 'text-violet-300', pct: 60 },
  { label: 'Completed', value: '9 / 14', tint: 'from-emerald-400/25', ring: 'text-emerald-300', pct: 64 },
  { label: 'Focus time', value: '62h', tint: 'from-violet-400/25', ring: 'text-violet-300', pct: 72 },
  { label: 'Budget used', value: '58%', tint: 'from-emerald-400/25', ring: 'text-emerald-300', pct: 58 },
]

const previewBars = [
  { m: 'Aug', v: 38 },
  { m: 'Sep', v: 55 },
  { m: 'Oct', v: 47 },
  { m: 'Nov', v: 82 },
  { m: 'Dec', v: 64 },
  { m: 'Jan', v: 30 },
]

// "Plan my day" blocks shown in the preview
const previewPlan = [
  { time: '9:00', t: 'Write client proposal', note: 'High priority · 2h', done: true },
  { time: '11:00', t: 'Break', brk: true },
  { time: '11:15', t: 'Pay electricity bill', note: 'Bill · records the payment' },
  { time: '3:00', t: 'Call the bank', note: 'Fixed time' },
]

function Ring({ pct, className }) {
  const c = 2 * Math.PI * 14
  return (
    <svg viewBox="0 0 36 36" className="w-9 h-9 -rotate-90 shrink-0">
      <circle cx="18" cy="18" r="14" stroke="currentColor" strokeWidth="3.5" fill="none" className="text-white/10" />
      <motion.circle
        cx="18" cy="18" r="14" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round"
        strokeDasharray={c}
        initial={{ strokeDashoffset: c }}
        whileInView={{ strokeDashoffset: c - (c * pct) / 100 }}
        viewport={{ once: true }}
        transition={{ duration: 1.2, delay: 0.3, ease: EASE }}
        className={className}
      />
    </svg>
  )
}

function DashboardPreview() {
  const ref = useRef(null)
  // Tilts up from the page as it scrolls into view
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'start 0.3'] })
  const rotateX = useTransform(scrollYProgress, [0, 1], [24, 0])
  const scale = useTransform(scrollYProgress, [0, 1], [0.9, 1])
  const opacity = useTransform(scrollYProgress, [0, 0.6], [0.35, 1])

  return (
    <div ref={ref} className="relative" style={{ perspective: 1400 }}>
      <div className="absolute -inset-6 sm:-inset-10 bg-[radial-gradient(ellipse_at_center,rgba(52,211,153,0.08),transparent_65%)] blur-2xl pointer-events-none" />
      <motion.div
        style={{ rotateX, scale, opacity, transformOrigin: 'center top' }}
        className="relative rounded-2xl border border-white/10 bg-[#141416]/90 shadow-2xl shadow-black/60 overflow-hidden"
      >
        {/* window bar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400/70" />
          <span className="w-2.5 h-2.5 rounded-full bg-green-400/70" />
          <span className="ml-3 text-[11px] text-gray-500 truncate">{BRAND_NAME} · My Day</span>
        </div>

        <div className="p-3 sm:p-5 space-y-3 sm:space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3">
            {previewStats.map((s) => (
              <div key={s.label} className={`rounded-xl p-3 bg-gradient-to-br ${s.tint} to-[#2a2a2e] border border-white/5`}>
                <div className="flex justify-between items-start gap-1">
                  <p className="text-[10px] sm:text-xs text-gray-300 leading-tight">{s.label}</p>
                  <Ring pct={s.pct} className={s.ring} />
                </div>
                <p className="text-base sm:text-xl font-bold text-white mt-1">{s.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="md:col-span-3 rounded-xl bg-[#1c1c1f] border border-white/5 p-3 sm:p-4">
              <div className="flex justify-between items-center mb-3">
                <p className="text-xs sm:text-sm font-semibold text-white">Focus time per month</p>
                <span className="text-[10px] text-gray-500">last 6 months</span>
              </div>
              <div className="flex items-end justify-between gap-2 h-28 sm:h-36">
                {previewBars.map((b, i) => (
                  <div key={b.m} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                    <motion.div
                      className="w-full max-w-[34px] rounded-md"
                      style={{ background: b.v === 82 ? ACCENT : 'rgba(16,185,129,0.45)' }}
                      initial={{ height: '4%' }}
                      whileInView={{ height: `${b.v}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.9, delay: 0.25 + i * 0.08, ease: EASE }}
                    />
                    <span className="text-[10px] text-gray-500">{b.m}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="md:col-span-2 rounded-xl bg-[#1c1c1f] border border-white/5 p-3 sm:p-4">
              <p className="text-xs sm:text-sm font-semibold text-white mb-3 flex items-center gap-1.5">
                <Sparkles size={13} className="text-[#34D399]" /> Planned by AI
              </p>
              <ul className="space-y-2">
                {previewPlan.map((t, i) => (
                  <motion.li
                    key={t.t}
                    className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 ${i === 2 ? 'bg-emerald-500/10 border border-emerald-400/30' : ''}`}
                    initial={{ opacity: 0, x: 16 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.5 + i * 0.12 }}
                  >
                    <span className="w-9 shrink-0 text-[10px] tabular-nums text-gray-400">{t.time}</span>
                    {t.brk ? (
                      <p className="text-xs text-gray-400 flex items-center gap-1.5"><Coffee size={12} /> {t.t}</p>
                    ) : (
                      <>
                        <span className={`w-3.5 h-3.5 shrink-0 rounded-full border ${t.done ? 'bg-emerald-400 border-emerald-400' : 'border-gray-500'}`} />
                        <div className="min-w-0">
                          <p className={`text-xs truncate ${t.done ? 'text-gray-500 line-through' : 'text-white'}`}>{t.t}</p>
                          <p className="text-[10px] text-gray-500 truncate">{t.note}</p>
                        </div>
                      </>
                    )}
                  </motion.li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

/* ---------- Content ---------- */

// Free plan
const features = [
  { icon: ListChecks, title: 'Add tasks in one line', text: 'Type "Pay rent Friday 5pm !high" and press Enter. Dates, times, priority and repeats, even "kal" and "parson", are understood as you type.' },
  { icon: Clock, title: 'Focus timer, no timesheets', text: 'Press Focus on a task and your time is counted for you. One timer at a time, so the numbers stay honest.' },
  { icon: Repeat, title: 'Steps and repeating tasks', text: 'Break work into a checklist. Daily, weekday, weekly or monthly tasks come back on their own when you tick them off.' },
  { icon: Sun, title: 'My Day', text: 'Everything due today in one list. Overdue work moves to today with one click instead of piling up.' },
  { icon: Volume2, title: 'Daily briefing', text: 'A short summary of your day after you log in, read aloud with one tap. Silent until you ask for it.' },
  { icon: BarChart3, title: 'Dashboard and analytics', text: 'What is left for today, what you finished and where your focus time went, plus a full activity log.' },
]

// Premium (AI) showcase
const proFeatures = [
  {
    icon: Mic,
    title: 'AI capture',
    text: 'Empty your head in one go. Speak or type a messy brain dump in English or Urdu, or snap a photo of a handwritten list, a whiteboard or a WhatsApp chat. The AI turns it into tasks with dates for you to check and add.',
    points: ['Voice, text or photo', 'Paste a screenshot', 'Review before adding'],
  },
  {
    icon: Sparkles,
    title: 'Plan my day',
    text: 'Tell it when your day starts and ends. The AI puts your most important tasks into realistic time blocks, keeps fixed appointments in place, adds breaks, and tells you what to move to tomorrow.',
    points: ['Time blocks with breaks', 'Re-plan in seconds', 'Focus timer from the plan'],
  },
  {
    icon: Wallet,
    title: 'Money, next to your tasks',
    text: 'Bills and subscriptions become reminders, and ticking one off records the payment. Snap a receipt and the AI fills in the expense. Monthly budgets warn you before you overspend, and an AI money coach explains your month.',
    points: ['Bills that remind you', 'Receipt scanning', 'Budgets and AI money coach'],
  },
  {
    icon: FileText,
    title: 'Freelance, handled',
    text: 'Add clients with an hourly rate and link tasks to them. Your focus time becomes earnings, and one click turns unbilled time into an invoice you can print or save as PDF. Mark it paid and it lands in your income.',
    points: ['Earnings from focus time', 'One-click invoices', 'Paid invoices become income'],
  },
]

const steps = [
  { icon: UserPlus, title: 'Create your account', text: 'Sign up in seconds. Free forever; upgrade only if you want the AI.' },
  { icon: Mic, title: 'Get it out of your head', text: 'Type tasks in one line, or with Premium speak a brain dump or snap a photo of your list.' },
  { icon: Sun, title: 'Let your day run itself', text: 'Follow your plan, run the focus timer, tick things off. Bills, budgets and invoices keep up on their own.' },
]

/* Card with a glow that follows the cursor */
function SpotlightCard({ children, className = '' }) {
  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    e.currentTarget.style.setProperty('--x', `${e.clientX - r.left}px`)
    e.currentTarget.style.setProperty('--y', `${e.clientY - r.top}px`)
  }
  return (
    <motion.div
      onMouseMove={onMove}
      whileHover={{ y: -6 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      className={`group relative h-full rounded-2xl p-6 bg-[#18181b] border border-white/5 hover:border-[#10B981]/30 transition-colors overflow-hidden ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-[radial-gradient(320px_circle_at_var(--x)_var(--y),rgba(255,255,255,0.06),transparent_65%)]" />
      <div className="relative">{children}</div>
    </motion.div>
  )
}

/* ---------- Page ---------- */

export default function Landing() {
  const { user } = useContext(UserContext)
  const [menuOpen, setMenuOpen] = useState(false)
  const reduceMotion = useReducedMotion()

  // thin progress bar at the very top
  const { scrollYProgress } = useScroll()
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 24, mass: 0.3 })

  const primaryCta = user
    ? { to: '/dashboard', label: 'Open dashboard' }
    : { to: '/signup', label: 'Get started free' }

  const navLinks = [
    { href: '#features', label: 'Features' },
    { href: '#ai', label: 'AI & Finance' },
    { href: '#how', label: 'How it works' },
    { href: '#pricing', label: 'Pricing' },
    { href: '#contact', label: 'Help' },
  ]

  const heroItem = {
    hidden: { opacity: 0, y: 24 },
    show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-dvh bg-[#0d0d0f] text-gray-200 overflow-x-hidden selection:bg-[#10B981]/30">
        <motion.div
          style={{ scaleX: progress }}
          className="fixed top-0 inset-x-0 h-[3px] origin-left z-[60] bg-white/70"
        />

        {/* background grid */}
        <div className="pointer-events-none fixed inset-0 opacity-[0.07] bg-[linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_at_top,black_20%,transparent_70%)]" />

        {/* ---------- Nav ---------- */}
        <motion.header
          initial={{ y: -70, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="sticky top-0 z-50 border-b border-white/5 bg-[#0d0d0f]/80 backdrop-blur-md"
        >
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <Link to="/" aria-label={`${BRAND_NAME} home`} onClick={() => setMenuOpen(false)}>
              <BrandLogo size={32} />
            </Link>

            <nav className="hidden md:flex items-center gap-8 text-sm">
              {navLinks.map((l) => (
                <a key={l.href} href={l.href} className="text-gray-400 hover:text-white transition-colors">{l.label}</a>
              ))}
            </nav>

            <div className="hidden md:flex items-center gap-3">
              {!user && (
                <Link to="/login" className="px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors">
                  Log in
                </Link>
              )}
              <Link
                to={primaryCta.to}
                className="px-4 py-2 text-sm font-semibold rounded-lg text-[#0B0B0C] bg-white hover:bg-zinc-200 transition-colors"
              >
                {primaryCta.label}
              </Link>
            </div>

            <button
              className="md:hidden p-2 -mr-2 text-gray-300 hover:text-white"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              transition={{ duration: 0.25 }}
              className="md:hidden overflow-hidden border-t border-white/5 bg-[#0d0d0f] px-4"
            >
              <div className="pb-5 pt-2">
                {navLinks.map((l) => (
                  <a
                    key={l.href}
                    href={l.href}
                    onClick={() => setMenuOpen(false)}
                    className="block py-3 text-gray-300 hover:text-white border-b border-white/5"
                  >
                    {l.label}
                  </a>
                ))}
                <div className="flex flex-col gap-3 mt-4">
                  {!user && (
                    <Link to="/login" className="w-full text-center py-2.5 rounded-lg border border-white/15 text-white">
                      Log in
                    </Link>
                  )}
                  <Link to={primaryCta.to} className="w-full text-center py-2.5 rounded-lg font-semibold text-[#0B0B0C] bg-white">
                    {primaryCta.label}
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </motion.header>

        <main className="relative z-10">
          {/* ---------- Hero ---------- */}
          <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 sm:pt-16 pb-16 sm:pb-24">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-4 items-center">
              <motion.div
                className="text-center lg:text-left"
                initial="hidden"
                animate="show"
                transition={{ staggerChildren: 0.12, delayChildren: 0.15 }}
              >
                <motion.span
                  variants={heroItem}
                  className="inline-flex items-center gap-2 text-xs sm:text-sm px-3 py-1 rounded-full border border-[#10B981]/30 bg-[#10B981]/10 text-[#A7F3D0]"
                >
                  <Sparkles size={14} /> Tasks, your day and your money, with AI
                </motion.span>
                <motion.h1
                  variants={heroItem}
                  className="mt-6 text-4xl sm:text-5xl xl:text-6xl font-extrabold tracking-tight text-white leading-[1.08]"
                >
                  Get it out of your head.{' '}
                  <span className="gradient-text">Get it done.</span>
                </motion.h1>
                <motion.p variants={heroItem} className="mt-5 text-base sm:text-lg text-gray-400 leading-relaxed max-w-xl mx-auto lg:mx-0">
                  {BRAND_NAME} turns a one-line note, a voice message or a photo into tasks, plans your day around them,
                  and keeps your bills, budget and freelance invoices in the same place.
                </motion.p>
                <motion.div variants={heroItem} className="mt-8 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                  <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                    <Link
                      to={primaryCta.to}
                      className="inline-flex w-full items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-[#0B0B0C] bg-white hover:bg-zinc-200 transition-colors shadow-lg shadow-black/40"
                    >
                      {primaryCta.label} <ArrowRight size={18} />
                    </Link>
                  </motion.div>
                  <a
                    href="#features"
                    className="inline-flex items-center justify-center px-6 py-3 rounded-xl font-semibold text-white border border-white/15 hover:bg-white/5 transition-colors"
                  >
                    Explore features
                  </a>
                </motion.div>
                <motion.ul variants={heroItem} className="mt-6 flex flex-wrap justify-center lg:justify-start gap-x-6 gap-y-2 text-sm text-gray-500">
                  {['Free plan forever', 'English & Roman Urdu', 'Works on your phone'].map((t) => (
                    <li key={t} className="flex items-center gap-1.5">
                      <CheckCircle2 size={15} className="text-[#34D399]" /> {t}
                    </li>
                  ))}
                </motion.ul>
              </motion.div>

              {/* 3D scene */}
              <motion.div
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1, delay: 0.3, ease: EASE }}
                className="relative h-[300px] sm:h-[400px] lg:h-[520px] -mx-4 sm:mx-0"
              >
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(52,211,153,0.07),transparent_62%)] pointer-events-none" />
                <SceneBoundary>
                  <Suspense fallback={<SceneFallback />}>
                    <HeroScene animate={!reduceMotion} />
                  </Suspense>
                </SceneBoundary>
              </motion.div>
            </div>

            <div className="mt-12 sm:mt-20 max-w-5xl mx-auto">
              <DashboardPreview />
            </div>
          </section>

          {/* ---------- Features ---------- */}
          <section id="features" className="scroll-mt-20 border-t border-white/5 bg-[#111113]/60">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
              <Reveal className="text-center max-w-2xl mx-auto">
                <p className="text-sm font-semibold text-[#34D399] uppercase tracking-wider">Features</p>
                <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-white">A to-do list without the busywork</h2>
                <p className="mt-4 text-gray-400">No forms, no timesheets. All of this is free.</p>
              </Reveal>
              <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {features.map(({ icon: Icon, title, text }, i) => (
                  <Reveal key={title} delay={(i % 3) * 0.1}>
                    <SpotlightCard>
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-[#10B981]/10 text-[#34D399] group-hover:bg-[#10B981]/20 group-hover:scale-110 transition-all">
                        <Icon size={22} />
                      </div>
                      <h3 className="mt-4 text-lg font-semibold text-white">{title}</h3>
                      <p className="mt-2 text-sm text-gray-400 leading-relaxed">{text}</p>
                    </SpotlightCard>
                  </Reveal>
                ))}
              </div>
            </div>
          </section>

          {/* ---------- Premium: AI & Finance ---------- */}
          <section id="ai" className="scroll-mt-20 border-t border-white/5">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
              <Reveal className="text-center max-w-2xl mx-auto">
                <p className="text-sm font-semibold text-[#34D399] uppercase tracking-wider">Premium</p>
                <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-white">An assistant for your tasks, your day and your money</h2>
                <p className="mt-4 text-gray-400">The AI does the typing, the planning and the bookkeeping. You do the work.</p>
              </Reveal>
              <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                {proFeatures.map(({ icon: Icon, title, text, points }, i) => (
                  <Reveal key={title} delay={(i % 2) * 0.12}>
                    <SpotlightCard className="sm:p-8">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 shrink-0 rounded-xl flex items-center justify-center bg-[#10B981]/10 text-[#34D399] group-hover:bg-[#10B981]/20 transition-colors">
                          <Icon size={22} />
                        </div>
                        <h3 className="text-xl font-semibold text-white">{title}</h3>
                      </div>
                      <p className="mt-4 text-sm text-gray-400 leading-relaxed">{text}</p>
                      <ul className="mt-5 flex flex-wrap gap-2">
                        {points.map((pt) => (
                          <li key={pt} className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-gray-300">
                            <CheckCircle2 size={12} className="text-[#34D399]" /> {pt}
                          </li>
                        ))}
                      </ul>
                    </SpotlightCard>
                  </Reveal>
                ))}
              </div>
              <Reveal className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-gray-500">
                {[
                  { icon: Camera, t: 'Reads photos and screenshots' },
                  { icon: Receipt, t: 'Scans receipts' },
                  { icon: ShieldCheck, t: 'Your data stays private to your account' },
                ].map(({ icon: Icon, t }) => (
                  <span key={t} className="flex items-center gap-1.5"><Icon size={15} className="text-[#34D399]" /> {t}</span>
                ))}
              </Reveal>
            </div>
          </section>

          {/* ---------- How it works ---------- */}
          <section id="how" className="scroll-mt-20 border-t border-white/5 bg-[#111113]/60">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
              <Reveal className="text-center max-w-2xl mx-auto">
                <p className="text-sm font-semibold text-[#34D399] uppercase tracking-wider">How it works</p>
                <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-white">Up and running in three steps</h2>
              </Reveal>
              <ol className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                {steps.map(({ icon: Icon, title, text }, i) => (
                  <Reveal as="li" key={title} delay={i * 0.15} className="relative rounded-2xl p-6 bg-[#18181b] border border-white/5">
                    <span className="absolute top-5 right-6 text-5xl font-extrabold text-white/5 select-none">{i + 1}</span>
                    <div className="w-11 h-11 rounded-full flex items-center justify-center bg-white/10 text-[#34D399] border border-white/10">
                      <Icon size={20} />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-white">{title}</h3>
                    <p className="mt-2 text-sm text-gray-400 leading-relaxed">{text}</p>
                  </Reveal>
                ))}
              </ol>
            </div>
          </section>

          {/* ---------- Pricing ---------- */}
          <section id="pricing" className="scroll-mt-20 border-t border-white/5">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
              <Reveal className="text-center max-w-2xl mx-auto mb-12">
                <p className="text-sm font-semibold text-[#34D399] uppercase tracking-wider">Pricing</p>
                <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-white">Start free. Add AI when you're ready.</h2>
                <p className="mt-4 text-gray-400">
                  The free plan is a complete task manager. Premium adds AI capture, day planning, finance and invoices.
                  Cancel anytime from your profile.
                </p>
              </Reveal>
              <Reveal>
                <PricingCards
                  renderAction={(plan) => (
                    <Link
                      to={plan.id === 'premium' ? '/signup?plan=premium' : '/signup'}
                      className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold transition-colors ${
                        plan.id === 'premium'
                          ? 'text-[#0B0B0C] bg-white hover:bg-zinc-200'
                          : 'text-white bg-white/10 border border-white/10 hover:bg-white/15'
                      }`}
                    >
                      {plan.id === 'premium' ? 'Get Premium' : 'Start for free'} <ArrowRight size={18} />
                    </Link>
                  )}
                />
              </Reveal>
            </div>
          </section>

          {/* ---------- Help / contact ---------- */}
          <section id="contact" className="scroll-mt-20 border-t border-white/5 bg-[#111113]/60">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] items-start">
              <Reveal>
                <p className="text-sm font-semibold text-[#34D399] uppercase tracking-wider">Help</p>
                <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-white">Questions? We are here.</h2>
                <p className="mt-4 text-gray-400 leading-relaxed">
                  Trouble with your account, a payment, or a feature you would love to see? Send a message and we reply by email,
                  usually within a day. English or Roman Urdu, both are fine.
                </p>
              </Reveal>
              <Reveal delay={0.1} className="rounded-2xl p-5 sm:p-7 bg-[#18181b] border border-white/5">
                <ContactForm />
              </Reveal>
            </div>
          </section>

          {/* ---------- CTA ---------- */}
          <section className="border-t border-white/5 px-4 sm:px-6 py-16 sm:py-24">
            <Reveal className="max-w-5xl mx-auto relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#17171a] via-[#141416] to-[#141416] px-6 py-12 sm:p-14 text-center">
              <motion.div
                animate={{ scale: [1, 1.25, 1], opacity: [0.5, 0.9, 0.5] }}
                transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-emerald-400/10 blur-3xl pointer-events-none"
              />
              <h2 className="relative text-2xl sm:text-4xl font-bold text-white">Stop carrying it all in your head</h2>
              <p className="relative mt-4 text-gray-400 max-w-xl mx-auto">
                Create your free {BRAND_NAME} account. Your first task takes one line.
              </p>
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} className="relative mt-8 inline-block w-full sm:w-auto">
                <Link
                  to={primaryCta.to}
                  className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-7 py-3 rounded-xl font-semibold text-[#0B0B0C] bg-white hover:bg-zinc-200 transition-colors"
                >
                  {primaryCta.label} <ArrowRight size={18} />
                </Link>
              </motion.div>
            </Reveal>
          </section>
        </main>

        {/* ---------- Footer ---------- */}
        <footer className="relative z-10 border-t border-white/5">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
            <BrandLogo size={26} />
            <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2">
              <a href="#features" className="hover:text-white transition-colors">Features</a>
              <a href="#ai" className="hover:text-white transition-colors">AI &amp; Finance</a>
              <a href="#how" className="hover:text-white transition-colors">How it works</a>
              <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
              <a href="#contact" className="hover:text-white transition-colors">Help</a>
              {!user && <Link to="/login" className="hover:text-white transition-colors">Log in</Link>}
            </nav>
            <p>© {new Date().getFullYear()} {BRAND_NAME}</p>
          </div>
        </footer>
      </div>
    </MotionConfig>
  )
}
