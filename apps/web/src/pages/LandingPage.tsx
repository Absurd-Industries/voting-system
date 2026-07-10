import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '../lib/api.js'
import { formatDuration } from '../lib/time.js'
import TalkDetailModal, { type TalkDetail } from '../components/TalkDetailModal.js'

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
  { img: '/images/partners/pcb-cupid.png', name: 'PCB Cupid', href: 'https://pcbcupid.com' },
  { img: '/images/partners/ampere-works.png', name: 'ampere.works', href: 'https://ampere.works' },
  { img: '/images/partners/vader.png', name: 'Vader', href: 'https://uservader.com' },
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
  { title: 'Call for Proposals', blurb: '33 proposals received from the community', status: 'done', icon: 'ph-paper-plane-tilt' },
  { title: 'Community Voting', blurb: 'Your votes pick the schedule', status: 'active', icon: 'ph-check-square' },
  { title: 'Schedule Reveal', blurb: 'The community-voted lineup, out 1 Sep', status: 'upcoming', icon: 'ph-calendar-heart' },
  { title: 'Hardware Showcase', blurb: 'Real builds, on real tables', status: 'upcoming', icon: 'ph-flask' },
  { title: 'The Devroom', blurb: 'Two days at IndiaFOSS, Bengaluru', status: 'upcoming', icon: 'ph-flag-banner-fold' },
]

/* -------------------------------------------------------------- helpers --- */

interface ConferencePublic {
  voting_status: 'open' | 'closed'
  voting_closes_at: number | null
  server_now: number
}

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
  const [now, setNow] = useState(Date.now())

  const { data: talks = [] } = useQuery({
    queryKey: ['talks-archive'],
    queryFn: () => apiFetch<TalkDetail[]>('/api/talks/archive'),
  })

  const { data: conference } = useQuery({
    queryKey: ['conference-public'],
    queryFn: () => apiFetch<ConferencePublic>('/api/conference'),
    retry: 1,
  })

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(t)
  }, [])

  const votingOpen = conference?.voting_status === 'open'
  const serverOffset = conference ? conference.server_now - Date.now() : 0
  const closesIn =
    votingOpen && conference?.voting_closes_at && conference.voting_closes_at > now + serverOffset
      ? formatDuration(conference.voting_closes_at - (now + serverOffset))
      : null

  const daysToGo = Math.max(0, Math.ceil((EVENT_START - now) / DAY_MS))
  const speakerCount = useMemo(() => new Set(talks.map((t) => t.presenter_name)).size, [talks])
  const talkTypes = useMemo(() => {
    const set = new Set<string>()
    talks.forEach((t) => t.talk_type && set.add(t.talk_type))
    return ['All', ...Array.from(set)]
  }, [talks])
  const visibleTalks = filter === 'All' ? talks : talks.filter((t) => t.talk_type === filter)

  const scrollCarousel = (dir: number) => carouselRef.current?.scrollBy({ left: dir * 300, behavior: 'smooth' })

  return (
    <div className="pb-20">
      {/* Event bar - the countdown to the two days */}
      <div className="bg-ink text-paper">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-5 gap-y-1 px-4 py-2 text-center text-xs font-semibold sm:text-sm">
          <span className="flex items-center gap-1.5">
            <i className="ph-bold ph-calendar-blank" aria-hidden="true" /> 26-27 September 2026
          </span>
          <span className="text-paper/30" aria-hidden="true">·</span>
          <span className="flex items-center gap-1.5">
            <i className="ph-bold ph-map-pin" aria-hidden="true" /> Bengaluru
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
            <a href="#talks" className="btn btn-ghost btn-sm hidden sm:inline-flex">
              <i className="ph-bold ph-archive" aria-hidden="true" /> The Talks
            </a>
            <Link to="/vote" className="btn btn-stamp btn-sm">
              <i className="ph-bold ph-check-square" aria-hidden="true" /> Vote
            </Link>
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
                {talks.length > 0 ? `${talks.length} talks` : 'Talks'} submitted by India's open hardware
                community. Two days of demos, war stories, and first builds.
                {votingOpen && <strong className="text-ink"> Right now - your votes pick the schedule.</strong>}
              </p>
              <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                {votingOpen && (
                  <Link to="/vote" className="btn btn-stamp">
                    <i className="ph-bold ph-check-square" aria-hidden="true" /> Vote on Talks
                  </Link>
                )}
                <a href="#talks" className="btn btn-outline">
                  <i className="ph-bold ph-archive" aria-hidden="true" /> Browse the Talks
                </a>
                <a href={TICKETS_URL} target="_blank" rel="noreferrer" className="btn btn-ghost">
                  <i className="ph-bold ph-ticket" aria-hidden="true" /> Get Tickets
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
                  <div className="mt-3">
                    {closesIn && (
                      <p className="text-xs font-semibold text-ink">
                        <i className="ph-bold ph-clock" aria-hidden="true" /> Closes in {closesIn}
                      </p>
                    )}
                    <Link to="/vote" className="btn btn-stamp btn-sm mt-2 w-full">
                      Vote now
                    </Link>
                  </div>
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

      {/* The Talks - the archive */}
      <Section id="talks" className="mt-20 scroll-mt-20">
        <h2 className="font-serif text-3xl font-bold text-ink sm:text-4xl">
          Talks Submitted
        </h2>
        <p className="mt-2 max-w-2xl text-lg text-ink-light">
          These are the proposals submitted to the devroom! Click any talk to read the full details.
        </p>

        {votingOpen && (
          <div className="mt-6 flex flex-col items-start justify-between gap-3 rounded-xl bg-ink px-5 py-4 text-paper sm:flex-row sm:items-center">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <i className="ph-fill ph-megaphone text-lg" aria-hidden="true" />
              These talks need your votes{closesIn ? ` - voting closes in ${closesIn}` : ''}.
            </p>
            <Link to="/vote" className="btn btn-stamp btn-sm shrink-0">
              <i className="ph-bold ph-check-square" aria-hidden="true" /> Vote on Talks
            </Link>
          </div>
        )}

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

        <div className="card-grid mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleTalks.map((talk, i) => (
            <button
              key={talk.id}
              onClick={() => setDetailTalk(talk)}
              className="kp-card card-hover animate-fade-in-up group flex flex-col p-5 text-left"
              style={{ animationDelay: `${Math.min(i, 12) * 0.03}s` }}
            >
              {talk.talk_type && <span className="tag tag-muted mb-3 self-start">{talk.talk_type}</span>}
              <h3 className="font-serif text-lg font-bold leading-snug text-ink transition-colors group-hover:text-stamp">
                {talk.title}
              </h3>
              <p className="mt-auto flex items-center justify-end gap-1.5 pt-4 text-right text-sm text-ink-faint">
                <i className="ph-bold ph-user" aria-hidden="true" /> {talk.presenter_name}
              </p>
            </button>
          ))}
        </div>
        {talks.length === 0 && (
          <div className="empty-state mt-6">
            <i className="ph-bold ph-cardboard-box text-3xl opacity-50" aria-hidden="true" />
            <p className="font-serif text-lg font-bold text-ink">The archive is warming up</p>
          </div>
        )}
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
        <div className="card-grid grid gap-4 sm:grid-cols-2">
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
        <div className="card-grid grid gap-5 sm:grid-cols-2 md:grid-cols-3">
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
            <a key={c.name} href={c.href} target="_blank" rel="noreferrer" className="group flex flex-col items-center gap-2">
              <img src={c.img} alt={c.name} className="h-12 object-contain opacity-80 transition-opacity group-hover:opacity-100 sm:h-14" loading="lazy" />
              <span className="font-mono text-[0.65rem] font-bold uppercase tracking-widest text-ink-faint transition-colors group-hover:text-stamp">{c.name}</span>
            </a>
          ))}
        </div>
      </Section>

      {/* Managers */}
      <Section className="mt-20">
        <Eyebrow>Devroom Managers</Eyebrow>
        <div className="card-grid grid gap-4 sm:grid-cols-2">
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
                  { icon: 'ph-check-square', label: 'Vote on Talks', href: '/vote', internal: true },
                  { icon: 'ph-ticket', label: 'Get Tickets', href: TICKETS_URL },
                  { icon: 'ph-discord-logo', label: 'Discord', href: DISCORD_URL },
                ].map((l) => (
                  <li key={l.label}>
                    {l.internal ? (
                      <Link to={l.href} className="flex items-center gap-2 text-ink-light transition-colors hover:text-stamp">
                        <i className={`ph-bold ${l.icon}`} aria-hidden="true" /> {l.label}
                      </Link>
                    ) : l.anchor ? (
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

      {detailTalk && <TalkDetailModal talk={detailTalk} onClose={() => setDetailTalk(null)} />}
    </div>
  )
}
