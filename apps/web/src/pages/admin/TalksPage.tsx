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
  const [duration, setDuration] = useState(String(initial?.duration_minutes ?? ''))
  const [presenterName, setPresenterName] = useState(initial?.presenter_name ?? '')
  const [presenterBio, setPresenterBio] = useState(initial?.presenter_bio ?? '')
  const [presenterEmail, setPresenterEmail] = useState(initial?.presenter_email ?? '')

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-xs font-medium mb-1">Title *</label>
          <input value={title} onChange={e => setTitle(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Duration (minutes) *</label>
          <input type="number" value={duration} onChange={e => setDuration(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Presenter Name *</label>
          <input value={presenterName} onChange={e => setPresenterName(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm" />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium mb-1">Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)}
            rows={2} className="w-full border rounded px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Presenter Bio</label>
          <textarea value={presenterBio} onChange={e => setPresenterBio(e.target.value)}
            rows={2} className="w-full border rounded px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Presenter Email</label>
          <input type="email" value={presenterEmail} onChange={e => setPresenterEmail(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm" />
        </div>
      </div>
      <div className="flex gap-2">
        <button
          disabled={!title || !presenterName || !duration || isPending}
          onClick={() => onSave({
            title, description: description || null,
            duration_minutes: parseInt(duration, 10),
            presenter_name: presenterName,
            presenter_bio: presenterBio || null,
            presenter_email: presenterEmail || null,
          })}
          className="px-4 py-2 bg-black text-white rounded text-sm font-medium disabled:opacity-50"
        >
          {isPending ? 'Saving...' : 'Save'}
        </button>
        <button onClick={onCancel} className="px-4 py-2 border rounded text-sm">Cancel</button>
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Talks ({talks.length})</h1>
        <div className="flex gap-2">
          <Link to="/admin/results" className="px-4 py-2 border rounded text-sm font-medium">
            View Results →
          </Link>
          <button onClick={() => setEditingId('new')}
            className="px-4 py-2 bg-black text-white rounded text-sm font-medium">
            + Add Talk
          </button>
        </div>
      </div>

      {/* CSV Import */}
      <div className="bg-white border rounded-lg p-4 space-y-2">
        <p className="text-sm font-medium">Import from CSV</p>
        <p className="text-xs text-gray-500">
          Columns: title, description, duration_minutes, presenter_name, presenter_bio, presenter_email
        </p>
        {csvError && <pre className="text-xs text-red-600 bg-red-50 p-2 rounded whitespace-pre-wrap">{csvError}</pre>}
        {csvSuccess && <p className="text-xs text-green-600">{csvSuccess}</p>}
        <div className="flex gap-2 items-center">
          <input ref={fileRef} type="file" accept=".csv,text/csv"
            onChange={e => {
              const file = e.target.files?.[0]
              if (file) importCsv.mutate(file)
            }}
            className="text-sm" />
          {importCsv.isPending && <span className="text-sm text-gray-500">Importing...</span>}
        </div>
      </div>

      {/* New talk form */}
      {editingId === 'new' && (
        <div className="bg-white border rounded-lg p-4">
          <h2 className="font-medium mb-3">New Talk</h2>
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
          <div key={talk.id} className="bg-white border rounded-lg p-4">
            {editingId === talk.id ? (
              <TalkForm
                initial={talk}
                onSave={(data) => updateTalk.mutate({ id: talk.id, ...data })}
                onCancel={() => setEditingId(null)}
                isPending={updateTalk.isPending}
              />
            ) : (
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-medium">
                      {talk.duration_minutes} min
                    </span>
                    <h3 className="font-medium">{talk.title}</h3>
                  </div>
                  <p className="text-sm text-gray-500">{talk.presenter_name}</p>
                  {talk.description && <p className="text-sm text-gray-700 mt-1">{talk.description}</p>}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm text-gray-500">{talk.vote_count} votes</span>
                  <button onClick={() => setEditingId(talk.id)}
                    className="text-sm text-blue-600 hover:underline">Edit</button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete "${talk.title}"?${talk.vote_count > 0 ? ` This will also delete ${talk.vote_count} vote(s).` : ''}`))
                        deleteTalk.mutate(talk.id)
                    }}
                    className="text-sm text-red-500 hover:text-red-700">Delete</button>
                </div>
              </div>
            )}
          </div>
        ))}
        {talks.length === 0 && !editingId && (
          <p className="text-gray-500 text-sm">No talks yet. Add one above or import a CSV.</p>
        )}
      </div>
    </div>
  )
}
