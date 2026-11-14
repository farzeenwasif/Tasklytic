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
  CheckCircle2,
  Clock,
  History,
  ListChecks,
  Menu,
  ShieldCheck,
  Smartphone,
  Sparkles,
  UserPlus,
  X,
} from 'lucide-react'
import BrandLogo, { BRAND_NAME } from '../components/BrandLogo'
import { UserContext } from '../context/UserContext'

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
  { label: 'Ready to Assign', value: '4', tint: 'from-violet-400/25', ring: 'text-violet-300', pct: 30 },
  { label: 'Completed', value: '9 / 14', tint: 'from-emerald-400/25', ring: 'text-emerald-300', pct: 64 },
  { label: 'Hours Logged', value: '62h', tint: 'from-violet-400/25', ring: 'text-violet-300', pct: 72 },
  { label: 'Meetings', value: '3', tint: 'from-emerald-400/25', ring: 'text-emerald-300', pct: 100 },
]

const previewBars = [
  { m: 'Aug', v: 38 },
  { m: 'Sep', v: 55 },
  { m: 'Oct', v: 47 },
  { m: 'Nov', v: 82 },
  { m: 'Dec', v: 64 },
  { m: 'Jan', v: 30 },
]

const previewTasks = [
  { t: 'Dashboard UI design', s: 'In Progress', c: 'bg-blue-500/20 text-blue-300', p: 'High', h: '6/10h' },
  { t: 'API integration', s: 'Completed', c: 'bg-green-500/20 text-green-300', p: 'Medium', h: '8/8h' },
  { t: 'Weekly standup', s: 'Scheduled', c: 'bg-cyan-500/20 text-cyan-300', p: 'Low', h: '1/1h' },
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
          <span className="ml-3 text-[11px] text-gray-500 truncate">{BRAND_NAME} · Dashboard</span>
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
                <p className="text-xs sm:text-sm font-semibold text-white">Hours per month</p>
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
              <p className="text-xs sm:text-sm font-semibold text-white mb-3">My tasks</p>
              <ul className="space-y-2.5">
                {previewTasks.map((t, i) => (
                  <motion.li
                    key={t.t}
                    className="flex items-center justify-between gap-2"
                    initial={{ opacity: 0, x: 16 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.5 + i * 0.12 }}
                  >
                    <div className="min-w-0">
                      <p className="text-xs text-white truncate">{t.t}</p>
                      <p className="text-[10px] text-gray-500">{t.p} · {t.h}</p>
                    </div>
                    <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded ${t.c}`}>{t.s}</span>
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

const features = [
  { icon: ListChecks, title: 'Task management', text: 'Create, edit and organise tasks with status, priority, category, assignee and due date.' },
  { icon: Clock, title: 'Hours tracking', text: 'Log hours against estimates and see what is done and what is left on every task.' },
  { icon: BarChart3, title: 'Visual analytics', text: 'Stat cards, a progress gauge and a monthly hours chart show your workload at a glance.' },
  { icon: History, title: 'Activity log', text: 'Every change is recorded: tasks created, hours logged, work completed, profile updates.' },
  { icon: ShieldCheck, title: 'Private by default', text: 'Every account has its own secure login. Your tasks are visible only to you.' },
  { icon: Smartphone, title: 'Works on any screen', text: 'A layout that adapts from phone to widescreen, with bottom navigation on mobile.' },
]

const steps = [
  { icon: UserPlus, title: 'Create your account', text: 'Sign up in seconds. Your workspace and profile are ready immediately.' },
  { icon: ListChecks, title: 'Add your tasks', text: 'Set priority, category, estimated hours and a due date for each task.' },
  { icon: BarChart3, title: 'Track your progress', text: 'Log hours as you go and watch your dashboard and activity log update.' },
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
    { href: '#how', label: 'How it works' },
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
                  <Sparkles size={14} /> Tasks, hours and analytics in one place
                </motion.span>
                <motion.h1
                  variants={heroItem}
                  className="mt-6 text-4xl sm:text-5xl xl:text-6xl font-extrabold tracking-tight text-white leading-[1.08]"
                >
                  Plan your work.{' '}
                  <span className="gradient-text">See your progress.</span>
                </motion.h1>
                <motion.p variants={heroItem} className="mt-5 text-base sm:text-lg text-gray-400 leading-relaxed max-w-xl mx-auto lg:mx-0">
                  {BRAND_NAME} is a personal dashboard for your tasks and time. Track status and priority,
                  log hours against estimates, and understand your workload with clear visual analytics.
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
                  {['Free to use', 'Private account', 'Mobile friendly'].map((t) => (
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
                <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-white">Everything you need to stay on track</h2>
                <p className="mt-4 text-gray-400">Simple enough for personal to-dos, structured enough for real projects.</p>
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

          {/* ---------- How it works ---------- */}
          <section id="how" className="scroll-mt-20 border-t border-white/5">
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

          {/* ---------- CTA ---------- */}
          <section className="border-t border-white/5 px-4 sm:px-6 py-16 sm:py-24">
            <Reveal className="max-w-5xl mx-auto relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#17171a] via-[#141416] to-[#141416] px-6 py-12 sm:p-14 text-center">
              <motion.div
                animate={{ scale: [1, 1.25, 1], opacity: [0.5, 0.9, 0.5] }}
                transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-emerald-400/10 blur-3xl pointer-events-none"
              />
              <h2 className="relative text-2xl sm:text-4xl font-bold text-white">Ready to take control of your time?</h2>
              <p className="relative mt-4 text-gray-400 max-w-xl mx-auto">
                Create your free {BRAND_NAME} account and start tracking tasks and hours today.
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
              <a href="#how" className="hover:text-white transition-colors">How it works</a>
              {!user && <Link to="/login" className="hover:text-white transition-colors">Log in</Link>}
            </nav>
            <p>© {new Date().getFullYear()} {BRAND_NAME}</p>
          </div>
        </footer>
      </div>
    </MotionConfig>
  )
}
