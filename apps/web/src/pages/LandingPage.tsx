import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '../lib/api.js'
import TalkDetailModal, { type TalkDetail } from '../components/TalkDetailModal.js'
import { TalkGridSkeleton } from '../components/TalkCardSkeleton.js'
import {
  BALU_POST_URL,
  LINEUP_TITLES,
  RANKED_TALKS,
  RESULTS_STATS,
  VOTES_BY_TITLE,
  isSelected,
} from '../data/results-2026.js'

/* ------------------------------------------------------------------ data --- */

const HERO_SHOWCASE = [
  { img: '/images/projects/corydora.png', name: 'CoryDora', caption: 'Open-source macropad with hot swappable keys' },
  { img: '/images/projects/makerville-badge.png', name: 'Makerville Badge', caption: 'Community devboard badge. ESP32-C3, KiCad, Zephyr, WebBluetooth' },
  { img: '/images/projects/lampy.png', name: 'Lampy', caption: 'Ambient desktop light with an ESP32 heart' },
  { img: '/images/projects/cube.png', name: 'Minirack', caption: 'DIY 10-inch homelab server rack' },
]

const HOPE_TO_DO = [
  'Showcase real-world open hardware projects being built in India and beyond.',
  'Give makers, students, and first-time builders a platform to present their work.',
  'Discuss the practical challenges of building and shipping hardware openly.',
  'Share knowledge around PCB design, embedded systems, fabrication, manufacturing, licensing, and documentation.',
  'Strengthen the Indian open hardware community through collaboration and networking.',
  'Help the next open hardware project find its first users, collaborators, or contributors.',
]

const PROJECTS = [
  { img: '/images/projects/corydora.png', name: 'CoryDora', caption: 'Open-source macropad, designed and shipped from India using KiCad, QMK, and FreeCAD.', href: 'https://github.com/balub/CoryDora' },
  { img: '/images/projects/makerville-badge.png', name: 'Makerville Badge', caption: 'Community devboard badge built with ESP32-C3, KiCad, Zephyr, and WebBluetooth.', href: 'https://github.com/makerville/makerville-badge' },
  { img: '/images/projects/jigita.png', name: 'JigIta', caption: 'Generate 3D-printable soldering jigs from any PCB design in minutes. One step, perfect results.', href: 'https://github.com/shreekumar3d/jigita' },
  { img: '/images/projects/cube.png', name: 'Minirack', caption: 'DIY 10-inch homelab server rack built from aluminium extrusions with a custom power supply.', href: 'https://github.com/jace/minirack' },
  { img: '/images/projects/lampy.png', name: 'Lampy', caption: 'Ambient desktop light with an ESP32 heart.', href: null },
  { img: '/images/projects/explorer.png', name: 'Explorer', caption: 'Open-source robot with omni-wheels and expressive LED eyes.', href: null },
  { img: '/images/projects/glyph.png', name: 'Glyph', caption: 'Compact ESP32 development board in a Feather-compatible form factor.', href: null },
]

const VIDEOS = [
  { id: 'UV_xVR0WD8U', name: 'Jigita', caption: 'Jump to soldering joy from pain' },
  { id: 'XYfKMBedYNg', name: 'VoltQuest', caption: 'Open source hardware gaming' },
  { id: '6xskrfU1z_c', name: 'Homelabbing with Bare Metal', caption: '' },
  { id: 'UiJbgOzwvzU', name: 'CoryDora', caption: 'A macropad, a supply chain, and a case for local manufacturing' },
  { id: 'rWlcbUHuHyg', name: 'Makerville Badge', caption: '' },
  { id: 'zmpSvz8G2x0', name: 'Engotta', caption: 'Because glancing at your phone while riding is dumb' },
  { id: 'jpTXz0AlL78', name: 'From Concept to Creation', caption: 'The journey of an open-source watch' },
]

// "Friends of Absurd" set, matching the Absurd homepage marquee.
const COLLABORATORS = [
  { img: '/images/partners/sillycuts.jpeg', name: 'SillyCuts', href: 'https://www.sillycuts.com/' },
  { img: '/images/partners/pcb-cupid.png', name: 'PCB Cupid', href: 'https://pcbcupid.com' },
  { img: '/images/partners/ampere-works.png', name: 'ampere.works', href: 'https://ampere.works' },
  { img: '/images/partners/vader.png', name: 'Vader', href: 'https://usevader.dev' },
  { img: '/images/partners/makerville.svg', name: 'Makerville', href: 'https://makerville.io' },
  { img: '/images/partners/foss-united.svg', name: 'FOSS United', href: 'https://fossunited.org' },
  { img: '/images/partners/mecha.svg', name: 'Mecha', href: 'https://mecha.so/' },
  { img: '/images/partners/isfixable.svg', name: 'isFixable', href: 'https://www.isfixable.com/' },
]

const MANAGERS = [
  { avatar: 'https://pbs.twimg.com/profile_images/1165633592430448640/OE1-I4b5_400x400.jpg', name: 'Balu Babu', email: 'balu@absurd.industries', phone: '+91 77605 79605', tel: '+917760579605' },
  { avatar: 'https://codeuncode.com/cdn-cgi/image/format=webp,width=200/https://cdn.codeuncode.com/media/amit.753a67f2.png', name: 'Amit', email: 'amit@absurd.industries', phone: '+91 98928 36471', tel: '+919892836471' },
]

const TICKETS_URL = 'https://fossunited.org/dashboard/buy-tickets?event=ek0supi1tu'
const DISCORD_URL = 'https://discord.gg/DUSUtguG2H'

// IndiaFOSS 2026: 26-27 September 2026, Bengaluru (times + venue TBA).
const EVENT_START = Date.UTC(2026, 8, 26)
const DAY_MS = 86_400_000

/* Road to the Devroom - flip a status here as the event nears, and each
   phase card can gain content (schedule link, showcase gallery) later. */
type PhaseStatus = 'done' | 'active' | 'upcoming'
const ROAD: { title: string; blurb: string; status: PhaseStatus; icon: string }[] = [
  { title: 'Call for Proposals', blurb: '35 proposals received from the community', status: 'done', icon: 'ph-paper-plane-tilt' },
  { title: 'Community Voting', blurb: '48 voters cast 262 selections', status: 'done', icon: 'ph-check-square' },
  { title: 'Schedule Reveal', blurb: 'The lineup is out - talk times coming soon', status: 'active', icon: 'ph-calendar-heart' },
  { title: 'Hardware Showcase', blurb: 'Booth showcases revealed by 10 Sep', status: 'upcoming', icon: 'ph-flask' },
  { title: 'The Devroom', blurb: 'Two days at IndiaFOSS, Bengaluru', status: 'upcoming', icon: 'ph-flag-banner-fold' },
]

/* -------------------------------------------------------------- helpers --- */

function Eyebrow({ children }: { children: ReactNode }) {
  return <span className="stamp-label mb-5">{children}</span>
}

function Section({ id, className = '', children }: { id?: string; className?: string; children: ReactNode }) {
  return (
    <section id={id} className={`mx-auto max-w-5xl px-4 sm:px-6 ${className}`}>
      {children}
    </section>
  )
}

/* Crossfading hero gallery - no controls, click to advance, scrim caption. */
function HeroGallery() {
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const t = window.setInterval(() => setIdx((i) => (i + 1) % HERO_SHOWCASE.length), 3500)
    return () => window.clearInterval(t)
  }, [])

  return (
    <button
      onClick={() => setIdx((i) => (i + 1) % HERO_SHOWCASE.length)}
      aria-label="Next project"
      className="block w-full cursor-pointer text-left"
    >
      <div className="relative h-80 w-full overflow-hidden rounded-[0.875rem] border border-ink/10 bg-kraft-light/50">
        {HERO_SHOWCASE.map((s, i) => (
          <img
            key={s.name}
            src={s.img}
            alt={s.name}
            loading={i === 0 ? 'eager' : 'lazy'}
            className={`absolute inset-0 h-full w-full object-contain p-6 pb-20 transition-opacity duration-700 ${i === idx ? 'opacity-100' : 'opacity-0'}`}
          />
        ))}
        {/* Alpha-transparent scrim with title + description */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/80 via-ink/55 to-transparent px-5 pb-4 pt-10">
          <p className="font-serif text-lg font-bold text-paper">{HERO_SHOWCASE[idx].name}</p>
          <p className="text-sm leading-snug text-paper/80">{HERO_SHOWCASE[idx].caption}</p>
        </div>
      </div>
    </button>
  )
}

/* --------------------------------------------------------------- screen --- */

export default function LandingPage() {
  const carouselRef = useRef<HTMLDivElement>(null)
  const [detailTalk, setDetailTalk] = useState<TalkDetail | null>(null)
  const [filter, setFilter] = useState('All')

  const { data: talks = [], isLoading: talksLoading } = useQuery({
    queryKey: ['talks-archive'],
    queryFn: () => apiFetch<TalkDetail[]>('/api/talks/archive'),
  })

  // Voting is closed for 2026 - the conference/votes queries, countdown timer
  // and vote CTAs were removed with it. See git history to restore next season.
  const daysToGo = Math.max(0, Math.ceil((EVENT_START - Date.now()) / DAY_MS))
  const speakerCount = useMemo(() => new Set(talks.flatMap((t) => t.presenter_name ? [t.presenter_name] : [])).size, [talks])
  const talkTypes = useMemo(() => {
    const set = new Set<string>()
    talks.forEach((t) => t.talk_type && set.add(t.talk_type))
    return ['All', ...Array.from(set)]
  }, [talks])
  const visibleTalks = filter === 'All' ? talks : talks.filter((t) => t.talk_type === filter)

  // The curated lineup, resolved against the archive so cards open the full
  // detail modal. Titles are matched loosely (case, whitespace, dash and
  // punctuation drift) so a small DB edit doesn't break the expanded view;
  // falls back to data-file title/speaker if a talk truly isn't in the DB.
  const lineupTalks = useMemo(() => {
    const normalize = (s: string) =>
      s.toLowerCase().replace(/[–—]/g, '-').replace(/[^a-z0-9]+/g, ' ').trim()
    const byNormTitle = new Map(talks.map((t) => [normalize(t.title), t]))
    return LINEUP_TITLES.map((title) => {
      const match = byNormTitle.get(normalize(title)) ?? null
      const ranked = RANKED_TALKS.find((t) => t.title === title)
      return { title, talk: match, presenter: match?.presenter_name ?? ranked?.presenter ?? '' }
    })
  }, [talks])

  // Deep links: opening a talk writes #talk-<id> so the URL is shareable;
  // loading the page with such a hash re-opens that talk's modal.
  const openTalk = (talk: TalkDetail) => {
    setDetailTalk(talk)
    history.replaceState(null, '', `#talk-${talk.id}`)
  }
  const closeTalk = () => {
    setDetailTalk(null)
    if (window.location.hash.startsWith('#talk-')) history.replaceState(null, '', window.location.pathname)
  }
  const deepLinkDone = useRef(false)
  useEffect(() => {
    if (deepLinkDone.current || talks.length === 0) return
    deepLinkDone.current = true
    const m = window.location.hash.match(/^#talk-(.+)$/)
    if (!m) return
    const target = talks.find((t) => t.id === decodeURIComponent(m[1]))
    if (target) setDetailTalk(target)
  }, [talks])

  const scrollCarousel = (dir: number) => carouselRef.current?.scrollBy({ left: dir * 300, behavior: 'smooth' })

  return (
    <div className="pb-20">
      {/* Event bar - the countdown to the two days */}
      <div className="bg-ink text-paper">
        <div className="mx-auto flex max-w-5xl flex-nowrap items-center justify-center gap-2.5 whitespace-nowrap px-4 py-2 text-xs font-semibold sm:gap-4 sm:text-sm">
          <span className="flex items-center gap-1.5">
            <i className="ph-bold ph-calendar-blank" aria-hidden="true" /> 26-27 Sep
          </span>
          <span className="text-paper/30" aria-hidden="true">·</span>
          <span className="flex items-center gap-1.5">
            <i className="ph-bold ph-hourglass-high" aria-hidden="true" /> {daysToGo} days to go
          </span>
        </div>
      </div>

      {/* Sticky header */}
      <header className="sticky top-0 z-40 border-b border-ink/10 bg-kraft/85 backdrop-blur-md backdrop-saturate-150">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
          <span className="flex items-center gap-2 font-serif text-base font-bold text-ink">
            <i className="ph-bold ph-cpu" aria-hidden="true" /> Hardware Devroom
          </span>
          <div className="flex items-center gap-2">
            {/* Voting closed for 2026 - restore the /vote CTA next season. */}
            <a href="#lineup" className="btn btn-ghost btn-sm">
              <i className="ph-bold ph-star" aria-hidden="true" /> Talks
            </a>
            <a href={TICKETS_URL} target="_blank" rel="noreferrer" className="btn btn-stamp btn-sm">
              <i className="ph-bold ph-ticket" aria-hidden="true" /> Get Tickets
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <Section className="pt-10 sm:pt-16">
        <div className="kp-card px-6 py-10 sm:px-14 sm:py-14">
          <div className="flex flex-col gap-10 md:flex-row md:items-start">
            <div className="flex-1">
              <Eyebrow>
                <i className="ph-bold ph-cpu" aria-hidden="true" /> IndiaFOSS 2026
              </Eyebrow>
              <h1 className="font-serif text-5xl font-black leading-[0.95] tracking-tight text-ink sm:text-7xl">
                Open<br />Hardware<br />Devroom
              </h1>
              <div className="mt-7 h-1 w-40 rounded-full bg-ink sm:w-64" />
              <p className="mt-7 max-w-xl text-base leading-relaxed text-ink-light sm:text-lg">
                {RESULTS_STATS.participatingVoters} community voters, {RESULTS_STATS.proposals} proposals,
                and {RESULTS_STATS.totalSelections} selections later:
                <strong className="text-ink"> the community has chosen. Six talks, two days, one devroom.</strong>
              </p>
              <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <a href={TICKETS_URL} target="_blank" rel="noreferrer" className="btn btn-stamp">
                  <i className="ph-bold ph-ticket" aria-hidden="true" /> Get Tickets
                </a>
                <a href="#lineup" className="btn btn-outline">
                  <i className="ph-bold ph-star" aria-hidden="true" /> See the Lineup
                </a>
                <a href="#talks" className="btn btn-ghost">
                  <i className="ph-bold ph-archive" aria-hidden="true" /> Browse the Archive
                </a>
              </div>
              {/* Stat chips */}

            </div>

            <div className="hidden w-72 shrink-0 md:block lg:w-80">
              <HeroGallery />
            </div>
          </div>
        </div>
      </Section>

      {/* The Lineup - the six community-chosen talks */}
      <Section id="lineup" className="mt-20 scroll-mt-20">
        <h2 className="font-serif text-3xl font-bold text-ink sm:text-4xl">Selected Talks</h2>
        <p className="mt-2 max-w-2xl text-lg text-ink-light">
          Community-voted selection for the devroom.
        </p>
        <div className="card-grid mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {lineupTalks.map((entry, i) => {
            const inner = (
              <>
                <div className="mb-3 flex items-center justify-between">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink font-serif text-lg font-bold text-paper">
                    {i + 1}
                  </span>
                  <span className="tag tag-funded">Selected</span>
                </div>
                <h3 className="font-serif text-lg font-bold leading-snug text-ink transition-colors group-hover:text-stamp">
                  {entry.title}
                </h3>
                {entry.presenter && (
                  <p className="mt-auto flex items-center justify-end gap-1.5 pt-4 text-right text-sm text-ink-faint">
                    <i className="ph-bold ph-user" aria-hidden="true" /> {entry.presenter}
                  </p>
                )}
              </>
            )
            return entry.talk ? (
              <button
                key={entry.title}
                onClick={() => openTalk(entry.talk!)}
                className="kp-card card-hover animate-fade-in-up group flex min-w-0 flex-col p-5 text-left"
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                {inner}
              </button>
            ) : (
              <div key={entry.title} className="kp-card flex min-w-0 flex-col p-5">
                {inner}
              </div>
            )
          })}
        </div>
      </Section>

      {/* Road to the Devroom */}
      <Section className="mt-20">
        <Eyebrow>Road to the Devroom</Eyebrow>
        <div className="grid gap-3 sm:grid-cols-5">
          {ROAD.map((phase, i) => {
            const isDone = phase.status === 'done'
            const isActive = phase.status === 'active'
            return (
              <div
                key={phase.title}
                className={`kp-card relative p-4 ${phase.status === 'upcoming' ? 'opacity-65' : ''}`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={[
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2',
                      isDone && 'border-funded bg-funded text-paper',
                      isActive && 'animate-pulse border-stamp bg-stamp text-paper',
                      phase.status === 'upcoming' && 'border-ink/30 text-ink-faint',
                    ].filter(Boolean).join(' ')}
                  >
                    <i className={`ph-bold ${isDone ? 'ph-check' : phase.icon} text-sm`} aria-hidden="true" />
                  </span>
                  <span className="font-mono text-[0.6rem] font-bold uppercase tracking-widest text-ink-faint">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </div>
                <h3 className="mt-3 font-serif text-base font-bold leading-tight text-ink">{phase.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-ink-light">{phase.blurb}</p>
                {isActive && (
                  <a href="#lineup" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-ink transition-colors hover:text-stamp">
                    <i className="ph-bold ph-star" aria-hidden="true" /> See the lineup
                  </a>
                )}
                {phase.title === 'The Devroom' && (
                  <a href={TICKETS_URL} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-ink transition-colors hover:text-stamp">
                    <i className="ph-bold ph-ticket" aria-hidden="true" /> Get tickets
                  </a>
                )}
              </div>
            )
          })}
        </div>
      </Section>

      {/* What the community chose - the published election data */}
      <Section id="results" className="mt-20 scroll-mt-20">
        <h2 className="font-serif text-3xl font-bold text-ink sm:text-4xl">The Results</h2>


        <div className="card-grid mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: 'ph-paper-plane-tilt', label: 'Proposals', value: String(RESULTS_STATS.proposals), note: `was ${RESULTS_STATS.proposalsLastYear} in 2025` },
            { icon: 'ph-users', label: 'Voters', value: `${RESULTS_STATS.participatingVoters}/${RESULTS_STATS.eligibleVoters}`, note: 'of signed-in voted' },
            { icon: 'ph-check-square', label: 'Selections cast', value: String(RESULTS_STATS.totalSelections), note: `${RESULTS_STATS.budgetUsedPercent}% of the available per person` },
            { icon: 'ph-chart-pie-slice', label: 'Top-six share', value: `${RESULTS_STATS.topSixSharePercent}%`, note: `` },
          ].map((s) => (
            <div key={s.label} className="kp-card p-5">
              <i className={`ph-bold ${s.icon} text-2xl text-ink`} aria-hidden="true" />
              <p className="supertitle mt-2">{s.label}</p>
              <p className="font-serif text-3xl font-bold text-ink">{s.value}</p>
              <p className="mt-1 text-xs text-ink-faint">{s.note}</p>
            </div>
          ))}
        </div>

        {/* Ranked top ten */}
        <div className="kp-card mt-6 p-5 sm:p-6">
          <p className="section-title mb-4">Top ten by votes</p>
          <div className="space-y-3">
            {RANKED_TALKS.slice(0, 10).map((t, i) => {
              const selected = isSelected(t.title)
              const max = RANKED_TALKS[0].votes
              return (
                <div key={t.title} className="flex min-w-0 items-center gap-3">
                  <span className="w-6 shrink-0 text-right font-serif text-sm font-bold text-ink-faint">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-baseline justify-between gap-3">
                      <p className="truncate text-sm font-medium text-ink">
                        {t.title}
                        {selected && <span className="tag tag-funded ml-2 align-middle">Selected</span>}
                      </p>
                      <span className="shrink-0 text-sm font-bold tabular-nums text-ink">{t.votes}</span>
                    </div>
                    <div className="progress mt-1.5">
                      <div
                        className={`progress-fill ${selected ? '' : 'opacity-35'}`}
                        style={{ width: `${(t.votes / max) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          <p className="mt-4 text-xs text-ink-faint">
            Votes guide the program; organizers apply a light curatorial pass (for example, one talk per
            speaker). Full ranked results for every proposal are in the analysis.
          </p>
          <div className="mt-5 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <a href={BALU_POST_URL} target="_blank" rel="noreferrer" className="btn btn-stamp">
              <i className="ph-bold ph-article" aria-hidden="true" /> Read Balu's full analysis
            </a>
            <a
              href="https://github.com/Absurd-Industries/voting-system/tree/main/analysis/indiafoss-2026"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink transition-colors hover:text-stamp"
            >
              <i className="ph-bold ph-github-logo" aria-hidden="true" /> Github Source
            </a>
          </div>
        </div>
      </Section>

      {/* The Talks - the archive */}
      <Section id="talks" className="mt-20 scroll-mt-20">
        <Eyebrow>The Archive</Eyebrow>
        <h2 className="font-serif text-3xl font-bold text-ink sm:text-4xl">
          Every proposal, in posterity
        </h2>
        <p className="mt-2 max-w-2xl text-lg text-ink-light">
          Every proposal submitted to the devroom, preserved. Click any talk for the full pitch -
          and share a talk directly with its link.
        </p>

        {talkTypes.length > 2 && (
          <div className="mt-6 flex flex-wrap items-center gap-2">
            {talkTypes.map((t) => {
              const active = filter === t
              return (
                <button
                  key={t}
                  onClick={() => setFilter(t)}
                  className={[
                    'rounded-full border px-3.5 py-1.5 font-sans text-xs font-semibold transition-colors',
                    active ? 'border-ink bg-ink text-paper' : 'border-ink/20 text-ink-faint hover:border-ink hover:text-ink',
                  ].join(' ')}
                >
                  {t}
                  {t !== 'All' && <span className="ml-1.5 opacity-60">{talks.filter((x) => x.talk_type === t).length}</span>}
                </button>
              )
            })}
          </div>
        )}

        <div className="card-grid mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleTalks.map((talk, i) => {
            const votes = VOTES_BY_TITLE.get(talk.title)
            const selected = isSelected(talk.title)
            return (
              <button
                key={talk.id}
                id={`talk-${talk.id}`}
                onClick={() => openTalk(talk)}
                className="kp-card card-hover animate-fade-in-up group flex min-w-0 flex-col p-5 text-left"
                style={{ animationDelay: `${Math.min(i, 12) * 0.03}s` }}
              >
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  {talk.talk_type && <span className="tag tag-muted">{talk.talk_type}</span>}
                  {selected && <span className="tag tag-funded">Selected</span>}
                </div>
                <h3 className="font-serif text-lg font-bold leading-snug text-ink transition-colors group-hover:text-stamp">
                  {talk.title}
                </h3>
                <div className="mt-auto flex items-center justify-between gap-2 pt-4 text-sm text-ink-faint">
                  <span className="shrink-0 tabular-nums">
                    {votes !== undefined && (
                      <>
                        <i className="ph-bold ph-check-square" aria-hidden="true" /> {votes} votes
                      </>
                    )}
                  </span>
                  {talk.presenter_name && (
                    <span className="flex min-w-0 items-center gap-1.5 text-right">
                      <i className="ph-bold ph-user shrink-0" aria-hidden="true" />
                      <span className="truncate">{talk.presenter_name}</span>
                    </span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
        {talksLoading && (
          <div className="mt-6">
            <TalkGridSkeleton count={6} />
          </div>
        )}

        {!talksLoading && talks.length === 0 && (
          <div className="empty-state mt-6">
            <i className="ph-bold ph-cardboard-box text-3xl opacity-50" aria-hidden="true" />
            <p className="font-serif text-lg font-bold text-ink">The archive is warming up</p>
          </div>
        )}
      </Section>

      {/* FAQ */}
      <Section id="faq" className="mt-20 scroll-mt-20">
        <h2 className="font-serif text-3xl font-bold text-ink sm:text-4xl">Frequently Asked Questions</h2>
        <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div>
            <p className="supertitle mb-3">For visitors</p>
            <div className="kp-card divide-y divide-ink/8 px-5">
              {[
                {
                  q: 'What is a devroom?',
                  a: 'A community-run room inside IndiaFOSS with its own program. Ours is dedicated to open hardware: talks, demos, and real builds you can poke at. If it blinks, solders, or spins, it lives here.',
                },
                {
                  q: 'When and where?',
                  a: '26-27 September 2026 at IndiaFOSS, Bengaluru. Talk times will be announced with the full schedule. You need an IndiaFOSS ticket - grab one via the Get Tickets button.',
                },
                {
                  q: 'Do I need hardware experience?',
                  a: 'None. The devroom is deliberately built for first-time builders - the goal is that you leave thinking "I can build something too."',
                },
                {
                  q: 'What is the booth showcase?',
                  a: 'Real open hardware projects on real tables, run by the people who built them. This year\'s booth showcases will be revealed by 10 September.',
                },
              ].map((f) => (
                <details key={f.q} className="faq-item">
                  <summary>{f.q}</summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </div>
          <div>
            <p className="supertitle mb-3">For speakers</p>
            <div className="kp-card divide-y divide-ink/8 px-5">
              {[
                {
                  q: 'How were the talks chosen?',
                  a: `Community approval voting: every registered voter could pick up to ${RESULTS_STATS.votesPerVoter} talks they wanted to see, ${RESULTS_STATS.votingWindow}. ${RESULTS_STATS.participatingVoters} of ${RESULTS_STATS.eligibleVoters} registered voters took part, casting ${RESULTS_STATS.totalSelections} selections across ${RESULTS_STATS.proposals} proposals.`,
                },
                {
                  q: 'Is the lineup exactly the top six by votes?',
                  a: 'Almost, not exactly - and we say so openly. Votes guide the program, then organizers apply a light curatorial pass: for example one talk per speaker, so "Holding It Together: A Talk About Screws" (tied 2nd!) stepped aside because Balu already presents Minnow. The full ranked data is published so you can check our work.',
                },
                {
                  q: "My talk wasn't selected - now what?",
                  a: 'It lives in the archive above, permanently linkable and browsable. There are also booth showcase slots (revealed by 10 Sep), lightning opportunities on the day, and next year\'s CFP. Several of this year\'s picks were second-time submissions.',
                },
                {
                  q: 'Is the voting data public?',
                  a: 'Yes - aggregate results only. No individual ballots or voter identities are published. The privacy-safe dataset and the reproducible analysis scripts ship in the open-source repo, and the full write-up is on Balu\'s blog.',
                },
              ].map((f) => (
                <details key={f.q} className="faq-item">
                  <summary>{f.q}</summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* About */}
      <Section className="mt-20">
        <div className="mx-auto max-w-3xl">
          <div className="kp-card p-8 sm:p-10">
            <span className="tape-piece" aria-hidden="true" />
            <span className="mb-6 inline-flex items-center border-2 border-ink px-3 py-1.5 font-mono text-xs font-bold uppercase tracking-widest text-ink">
              About
            </span>
            <div className="space-y-5 font-mono text-base leading-relaxed">
              <p className="text-ink-light">Open-source hardware is a vital but still underrepresented part of the FOSS ecosystem. While open-source software has gone mainstream, open hardware faces unique challenges around cost, manufacturing, sourcing, documentation, licensing, and distribution.</p>
              <p className="text-ink-light">But open hardware in India is at an exciting point. More students are designing their first PCBs, more indie makers are shipping kits, more collectives are forming around building things, and more ambitious open hardware products are reaching global audiences.</p>
              <p className="font-bold text-ink">This year, we want to shift the focus toward the next generation of builders. The goal is simple: make the devroom a place where people leave thinking, “I can build something too.”</p>
            </div>
          </div>
        </div>
      </Section>

      {/* What we hope to do */}
      <Section className="mt-20">
        <Eyebrow>What We Hope To Do</Eyebrow>
        <div className="card-grid grid grid-cols-1 gap-4 sm:grid-cols-2">
          {HOPE_TO_DO.map((item) => (
            <div key={item} className="kp-card flex items-start gap-3 p-5">
              <i className="ph-bold ph-check-circle mt-0.5 shrink-0 text-xl text-funded" aria-hidden="true" />
              <p className="text-sm leading-relaxed text-ink-light">{item}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* From the community */}
      <Section className="mt-20">
        <Eyebrow>From the Community</Eyebrow>
        <p className="mb-6 max-w-2xl text-lg text-ink-light">Projects from past devrooms and the broader open hardware community.</p>
        <div className="card-grid grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3">
          {PROJECTS.map((p) => {
            const inner = (
              <>
                <div className="flex h-44 items-center justify-center">
                  <img src={p.img} alt={p.name} className="max-h-40 object-contain" loading="lazy" />
                </div>
                <h4 className="mt-3 flex items-center gap-1.5 font-serif text-lg font-bold uppercase tracking-wide text-ink">
                  {p.name}
                  {p.href && <i className="ph-bold ph-arrow-up-right text-sm text-ink-faint transition-colors group-hover:text-stamp" aria-hidden="true" />}
                </h4>
                <p className="mt-1 text-sm leading-relaxed text-ink-light">{p.caption}</p>
              </>
            )
            return p.href ? (
              <a key={p.name} href={p.href} target="_blank" rel="noreferrer" className="kp-card card-hover group block p-5">
                {inner}
              </a>
            ) : (
              <div key={p.name} className="kp-card p-5">{inner}</div>
            )
          })}
        </div>
      </Section>

      {/* Talks & videos */}
      <Section className="mt-20">
        <Eyebrow>From Last Year</Eyebrow>
        <div className="kp-card p-3">
          <div className="relative w-full overflow-hidden rounded-lg" style={{ paddingBottom: '56.25%' }}>
            <iframe
              className="absolute inset-0 h-full w-full"
              src="https://www.youtube-nocookie.com/embed/Ph6-Aq1iDQc"
              title="IndiaFOSS 2025 Hardware Devroom Highlights"
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
        <p className="mt-3 text-center text-sm text-ink-faint">Highlight reel from the IndiaFOSS 2025 Open Hardware Devroom.</p>

        <div className="mt-6 flex items-center justify-end gap-2">
          <button onClick={() => scrollCarousel(-1)} aria-label="Previous" className="btn btn-outline btn-sm !px-2.5">
            <i className="ph-bold ph-caret-left" aria-hidden="true" />
          </button>
          <button onClick={() => scrollCarousel(1)} aria-label="Next" className="btn btn-outline btn-sm !px-2.5">
            <i className="ph-bold ph-caret-right" aria-hidden="true" />
          </button>
        </div>
        <div ref={carouselRef} className="mt-3 flex snap-x gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth: 'thin' }}>
          {VIDEOS.map((v) => (
            <a
              key={v.id}
              href={`https://www.youtube.com/watch?v=${v.id}`}
              target="_blank"
              rel="noreferrer"
              className="kp-card card-hover group w-64 shrink-0 snap-start p-3"
            >
              <div className="relative overflow-hidden rounded-lg">
                <img src={`https://img.youtube.com/vi/${v.id}/mqdefault.jpg`} alt={v.name} className="aspect-video w-full object-cover" loading="lazy" />
                <i className="ph-fill ph-play-circle absolute inset-0 m-auto h-fit w-fit text-5xl text-paper/90 drop-shadow transition-colors group-hover:text-stamp" aria-hidden="true" />
              </div>
              <h4 className="mt-2 font-serif font-bold text-ink">{v.name}</h4>
              {v.caption && <p className="text-xs text-ink-light">{v.caption}</p>}
            </a>
          ))}
          <a
            href="https://www.youtube.com/playlist?list=PLOGilj110olzIQ-Z_jM_2eboVqqBPWPhT"
            target="_blank"
            rel="noreferrer"
            className="kp-card card-hover group flex w-64 shrink-0 snap-start flex-col items-center justify-center gap-2 p-3 text-center"
          >
            <i className="ph-bold ph-playlist text-4xl text-ink transition-colors group-hover:text-stamp" aria-hidden="true" />
            <h4 className="font-serif font-bold text-ink">Watch All Talks</h4>
            <p className="text-xs text-ink-light">Full playlist on YouTube →</p>
          </a>
        </div>
      </Section>

      {/* Collaborators */}
      <Section className="mt-20">
        <Eyebrow>In Collaboration With</Eyebrow>
        <p className="mb-6 max-w-2xl text-lg text-ink-light">This devroom is organized with involvement from communities across the Indian open hardware and FOSS ecosystem.</p>
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-8">
          {COLLABORATORS.map((c) => (
            <a key={c.name} href={c.href} target="_blank" rel="noreferrer" className="group flex w-36 flex-col items-center gap-2">
              <img
                src={c.img}
                alt={c.name}
                className={`h-14 object-contain opacity-80 transition-opacity group-hover:opacity-100 sm:h-16 ${
                  c.name === 'SillyCuts' ? 'w-14 rounded-lg sm:w-16' : 'w-32'
                }`}
                loading="lazy"
              />
              <span className="font-mono text-[0.65rem] font-bold uppercase tracking-widest text-ink-faint transition-colors group-hover:text-stamp">{c.name}</span>
            </a>
          ))}
        </div>
      </Section>

      {/* Managers */}
      <Section className="mt-20">
        <Eyebrow>Devroom Managers</Eyebrow>
        <div className="card-grid grid grid-cols-1 gap-4 sm:grid-cols-2">
          {MANAGERS.map((m) => (
            <div key={m.name} className="kp-card flex items-center gap-4 p-5">
              <img src={m.avatar} alt={m.name} className="h-16 w-16 shrink-0 rounded-full object-cover" loading="lazy" />
              <div className="min-w-0">
                <h4 className="font-serif text-lg font-bold text-ink">{m.name}</h4>
                <a href={`mailto:${m.email}`} className="flex items-center gap-1.5 text-sm text-ink-light transition-colors hover:text-stamp">
                  <i className="ph-bold ph-envelope-simple" aria-hidden="true" /> {m.email}
                </a>
                <a href={`tel:${m.tel}`} className="flex items-center gap-1.5 text-sm text-ink-light transition-colors hover:text-stamp">
                  <i className="ph-bold ph-phone" aria-hidden="true" /> {m.phone}
                </a>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 text-center">
          <a href={DISCORD_URL} target="_blank" rel="noreferrer" className="btn btn-outline">
            <i className="ph-bold ph-discord-logo" aria-hidden="true" /> Join Our Discord
          </a>
        </div>
      </Section>

      {/* Footer */}
      <footer className="mt-24 border-t border-ink/10">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
          <div className="grid gap-10 sm:grid-cols-2">
            <div>
              <p className="supertitle mb-3">Links</p>
              <ul className="space-y-2 text-sm">
                {[
                  { icon: 'ph-archive', label: 'Browse the Talks', href: '#talks', anchor: true },
                  { icon: 'ph-star', label: 'Talks', href: '#lineup', anchor: true },
                  { icon: 'ph-ticket', label: 'Get Tickets', href: TICKETS_URL },
                  { icon: 'ph-discord-logo', label: 'Discord', href: DISCORD_URL },
                ].map((l) => (
                  <li key={l.label}>
                    {l.anchor ? (
                      <a href={l.href} className="flex items-center gap-2 text-ink-light transition-colors hover:text-stamp">
                        <i className={`ph-bold ${l.icon}`} aria-hidden="true" /> {l.label}
                      </a>
                    ) : (
                      <a href={l.href} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-ink-light transition-colors hover:text-stamp">
                        <i className={`ph-bold ${l.icon}`} aria-hidden="true" /> {l.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <a href="https://fossunited.org" target="_blank" rel="noreferrer" className="inline-block">
                <img src="/images/foss-united.svg" alt="FOSS United" className="h-10" />
              </a>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-ink-light">
                FOSS United is a non-profit foundation that aims to increase the FOSS footprint in India -
                evangelising, promoting, and educating communities about Free and Open Source Software.
              </p>
            </div>
          </div>
          <div className="mt-10 flex flex-col items-start justify-between gap-2 border-t border-ink/10 pt-6 text-xs text-ink-faint sm:flex-row sm:items-center">
            <span>Absurd Industries × FOSS United</span>
            <span>🏔 Made with curiosity in Bengaluru.</span>
          </div>
        </div>
      </footer>

      {detailTalk && <TalkDetailModal talk={detailTalk} onClose={closeTalk} />}
    </div>
  )
}
