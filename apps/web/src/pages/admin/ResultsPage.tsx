import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '../../lib/api.js'

interface TalkResult {
  id: string
  title: string
  presenter_name: string
  duration_minutes: number
  vote_count: number
}

interface ResultsResponse {
  by_duration: Array<{
    duration_minutes: number
    talks: TalkResult[]
  }>
}

export default function ResultsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-results'],
    queryFn: () => apiFetch<ResultsResponse>('/api/admin/results'),
    refetchInterval: 30_000,
  })

  const handleExport = async () => {
    const blob = await apiFetch<Blob>('/api/admin/results/export')
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'results.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading) return <div className="text-gray-500">Loading...</div>

  const groups = data?.by_duration ?? []
  const totalVotes = groups.flatMap(g => g.talks).reduce((sum, t) => sum + t.vote_count, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Results</h1>
          <p className="text-sm text-gray-500">{totalVotes} total votes cast</p>
        </div>
        <button onClick={handleExport}
          className="px-4 py-2 bg-black text-white rounded text-sm font-medium">
          Export CSV
        </button>
      </div>

      {groups.length === 0 && (
        <p className="text-gray-500 text-sm">No talks or votes yet.</p>
      )}

      {groups.map(group => (
        <section key={group.duration_minutes}>
          <h2 className="font-semibold text-lg mb-3">{group.duration_minutes}-minute talks</h2>
          <div className="bg-white border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left px-4 py-2 font-medium text-gray-600">#</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Talk</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Presenter</th>
                  <th className="text-right px-4 py-2 font-medium text-gray-600">Votes</th>
                </tr>
              </thead>
              <tbody>
                {group.talks.map((talk, i) => (
                  <tr key={talk.id} className="border-b last:border-0">
                    <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                    <td className="px-4 py-3 font-medium">{talk.title}</td>
                    <td className="px-4 py-3 text-gray-600">{talk.presenter_name}</td>
                    <td className="px-4 py-3 text-right font-semibold">{talk.vote_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  )
}
