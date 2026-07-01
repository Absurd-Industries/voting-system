import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from '../../lib/api.js'

interface Talk {
  id: string
  title: string
  description: string | null
  duration_minutes: number
  presenter_name: string
  presenter_bio: string | null
  presenter_email: string | null
  vote_count: number
}

function TalkForm({
  initial,
  onSave,
  onCancel,
  isPending,
}: {
  initial?: Partial<Talk>
  onSave: (data: Omit<Talk, 'id' | 'vote_count'>) => void
  onCancel: () => void
  isPending: boolean
}) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [presenterName, setPresenterName] = useState(initial?.presenter_name ?? '')
  const [presenterBio, setPresenterBio] = useState(initial?.presenter_bio ?? '')
  const [presenterEmail, setPresenterEmail] = useState(initial?.presenter_email ?? '')

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-slate-700">Title *</label>
          <input value={title} onChange={e => setTitle(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Presenter Name *</label>
          <input value={presenterName} onChange={e => setPresenterName(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200" />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-slate-700">Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)}
            rows={2} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Presenter Bio</label>
          <textarea value={presenterBio} onChange={e => setPresenterBio(e.target.value)}
            rows={2} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Presenter Email</label>
          <input type="email" value={presenterEmail} onChange={e => setPresenterEmail(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200" />
        </div>
      </div>
      <div className="flex gap-2">
        <button
          disabled={!title || !presenterName || isPending}
          onClick={() => onSave({
            title, description: description || null,
            duration_minutes: initial?.duration_minutes ?? 0,
            presenter_name: presenterName,
            presenter_bio: presenterBio || null,
            presenter_email: presenterEmail || null,
          })}
          className="min-h-11 rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
        >
          {isPending ? 'Saving...' : 'Save'}
        </button>
        <button onClick={onCancel} className="min-h-11 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
      </div>
    </div>
  )
}

export default function TalksPage() {
  const qc = useQueryClient()
  const [editingId, setEditingId] = useState<string | 'new' | null>(null)
  const [csvError, setCsvError] = useState<string | null>(null)
  const [csvSuccess, setCsvSuccess] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const { data: talks = [], isLoading } = useQuery({
    queryKey: ['admin-talks'],
    queryFn: () => apiFetch<Talk[]>('/api/admin/talks'),
  })

  const createTalk = useMutation({
    mutationFn: (data: Omit<Talk, 'id' | 'vote_count'>) =>
      apiFetch('/api/admin/talks', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-talks'] }); setEditingId(null) },
  })

  const updateTalk = useMutation({
    mutationFn: ({ id, ...data }: Omit<Talk, 'vote_count'>) =>
      apiFetch(`/api/admin/talks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-talks'] }); setEditingId(null) },
  })

  const deleteTalk = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/admin/talks/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-talks'] }),
  })

  const importCsv = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      return apiFetch<{ imported: number }>('/api/admin/talks/import', {
        method: 'POST',
        body: formData,
      })
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['admin-talks'] })
      setCsvSuccess(`Imported ${data.imported} talks.`)
      setCsvError(null)
      if (fileRef.current) fileRef.current.value = ''
    },
    onError: (e: Error) => {
      setCsvError(e.message)
      setCsvSuccess(null)
    },
  })

  if (isLoading) return <div className="text-gray-500">Loading...</div>

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Admin</p>
          <h1 className="text-2xl font-bold text-slate-950">Talks ({talks.length})</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/admin/results" className="min-h-11 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            View Results
          </Link>
          <button onClick={() => setEditingId('new')}
            className="min-h-11 rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800">
            + Add Talk
          </button>
        </div>
      </div>

      {/* CSV Import */}
      <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm font-medium text-slate-950">Import from CSV</p>
        <p className="text-xs text-slate-500">
          Columns: title, description, presenter_name, presenter_bio, presenter_email
        </p>
        {csvError && <pre className="whitespace-pre-wrap rounded-md bg-red-50 p-2 text-xs text-red-700">{csvError}</pre>}
        {csvSuccess && <p className="text-xs font-medium text-emerald-700">{csvSuccess}</p>}
        <div className="flex flex-wrap items-center gap-2">
          <input ref={fileRef} type="file" accept=".csv,text/csv"
            onChange={e => {
              const file = e.target.files?.[0]
              if (file) importCsv.mutate(file)
            }}
            className="text-sm text-slate-700" />
          {importCsv.isPending && <span className="text-sm text-slate-500">Importing...</span>}
        </div>
      </div>

      {/* New talk form */}
      {editingId === 'new' && (
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 font-medium text-slate-950">New Talk</h2>
          <TalkForm
            onSave={(data) => createTalk.mutate(data)}
            onCancel={() => setEditingId(null)}
            isPending={createTalk.isPending}
          />
        </div>
      )}

      {/* Talk list */}
      <div className="space-y-3">
        {talks.map(talk => (
          <div key={talk.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            {editingId === talk.id ? (
              <TalkForm
                initial={talk}
                onSave={(data) => updateTalk.mutate({ id: talk.id, ...data })}
                onCancel={() => setEditingId(null)}
                isPending={updateTalk.isPending}
              />
            ) : (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="font-medium text-slate-950">{talk.title}</h3>
                  </div>
                  <p className="text-sm text-slate-500">{talk.presenter_name}</p>
                  {talk.description && <p className="mt-1 text-sm leading-6 text-slate-700">{talk.description}</p>}
                </div>
                <div className="flex flex-wrap items-center gap-3 sm:shrink-0">
                  <span className="text-sm text-slate-500">{talk.vote_count} votes</span>
                  <button onClick={() => setEditingId(talk.id)}
                    className="min-h-11 text-sm font-medium text-blue-700 hover:text-blue-800">Edit</button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete "${talk.title}"?${talk.vote_count > 0 ? ` This will also delete ${talk.vote_count} vote(s).` : ''}`))
                        deleteTalk.mutate(talk.id)
                    }}
                    className="min-h-11 text-sm font-medium text-red-600 hover:text-red-700">Delete</button>
                </div>
              </div>
            )}
          </div>
        ))}
        {talks.length === 0 && !editingId && (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            No talks yet. Add one above or import a CSV.
          </div>
        )}
      </div>
    </div>
  )
}
