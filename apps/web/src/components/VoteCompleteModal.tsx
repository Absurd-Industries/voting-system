import { useEffect, useState } from 'react'

const REDIRECT_SECONDS = 6

/**
 * Shown the moment a voter spends their final vote: thanks them, confirms the
 * votes are recorded, and heads back to the devroom page. The countdown is
 * cancellable so nobody gets yanked away mid-thought.
 */
export default function VoteCompleteModal({
  votesTotal,
  deadline,
  onGoHome,
  onStay,
}: {
  votesTotal: number
  deadline: string | null
  onGoHome: () => void
  onStay: () => void
}) {
  const [secondsLeft, setSecondsLeft] = useState(REDIRECT_SECONDS)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onStay()
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onStay])

  useEffect(() => {
    if (secondsLeft <= 0) {
      onGoHome()
      return
    }
    const t = window.setTimeout(() => setSecondsLeft((s) => s - 1), 1000)
    return () => window.clearTimeout(t)
  }, [secondsLeft, onGoHome])

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Votes recorded" onClick={onStay}>
      <div className="modal-panel !max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="px-7 py-8 text-center">
          <i className="ph-fill ph-check-circle text-5xl text-funded" aria-hidden="true" />
          <h2 className="mt-3 font-serif text-2xl font-bold text-ink">Thank you for voting!</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-light">
            All {votesTotal} of your votes were recorded. You help decide what the devroom looks like.
          </p>
          <p className="mt-4 rounded-xl bg-kraft-light/60 px-4 py-3 text-sm font-semibold text-ink">
            You can change your votes {deadline ? `until ${deadline}` : 'until voting closes'}.
          </p>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button onClick={onGoHome} className="btn btn-stamp">
              <i className="ph-bold ph-house" aria-hidden="true" /> Back to the Devroom
            </button>
            <button onClick={onStay} className="btn btn-ghost">
              Review my votes
            </button>
          </div>

          <p className="mt-4 text-xs text-ink-faint" aria-live="polite">
            Heading back in {secondsLeft}s
          </p>
        </div>
      </div>
    </div>
  )
}
