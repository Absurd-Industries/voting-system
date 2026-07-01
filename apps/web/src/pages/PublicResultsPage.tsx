import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '../lib/api.js'

interface TalkResult {
  id: string
  title: string
  presenter_name: string
  vote_count: number
}

interface PublicResultsResponse {
  conference: {
    name: string
    description: string | null
  }
  talks: TalkResult[]
  stats: {
    eligible_voters: number
    participating_voters: number
    total_votes: number
  }
  method: {
    type: 'approval'
    votes_per_voter: number
    notes: string
  }
}

export default function PublicResultsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['public-results'],
    queryFn: () => apiFetch<PublicResultsResponse>('/api/results'),
    retry: false,
  })

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-sm text-slate-500">
        Loading results...
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-slate-950">Results are not public yet</h1>
          <p className="mt-2 text-sm text-slate-600">
            Check back after the organizers publish the final results.
          </p>
        </div>
      </div>
    )
  }

  const talks = data?.talks ?? []

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <div className="mb-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Public results</p>
          <h1 className="text-2xl font-bold">{data?.conference.name}</h1>
          {data?.conference.description && (
            <p className="mt-2 text-sm leading-6 text-slate-600">{data.conference.description}</p>
          )}
        </div>

        {data && (
          <div className="mb-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-slate-500">Participating voters</p>
              <p className="mt-1 text-2xl font-semibold">{data.stats.participating_voters}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-slate-500">Total votes</p>
              <p className="mt-1 text-2xl font-semibold">{data.stats.total_votes}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-slate-500">Votes per voter</p>
              <p className="mt-1 text-2xl font-semibold">{data.method.votes_per_voter}</p>
            </div>
          </div>
        )}

        {data && (
          <div className="mb-6 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
            <p className="font-semibold text-slate-950">How voting worked</p>
            <p className="mt-1">
              Approval voting: voters could support up to {data.method.votes_per_voter} talks, and unused votes were allowed.
            </p>
            <p className="mt-1">{data.method.notes}</p>
          </div>
        )}

        {talks.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            No results available yet.
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-2 text-left font-medium text-slate-600">#</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">Talk</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">Presenter</th>
                  <th className="px-4 py-2 text-right font-medium text-slate-600">Votes</th>
                </tr>
              </thead>
              <tbody>
                {talks.map((talk, i) => (
                  <tr key={talk.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 text-slate-400">{i + 1}</td>
                    <td className="px-4 py-3 font-medium">{talk.title}</td>
                    <td className="px-4 py-3 text-slate-600">{talk.presenter_name}</td>
                    <td className="px-4 py-3 text-right font-semibold">{talk.vote_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}
