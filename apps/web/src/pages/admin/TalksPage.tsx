import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from '../../lib/api.js'
import TalkDetailModal, { type TalkDetail } from '../../components/TalkDetailModal.js'

interface Talk {
  id: string
  title: string
  description: string | null
  duration_minutes: number
  presenter_name: string
  presenter_bio: string | null
  presenter_email: string | null
  talk_type: string | null
  cfp_url: string | null
  cfp_content: string | null
  references: string | null
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
  const [talkType, setTalkType] = useState(initial?.talk_type ?? '')
  const [cfpUrl, setCfpUrl] = useState(initial?.cfp_url ?? '')

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="kp-label">Title *</label>
          <input value={title} onChange={e => setTitle(e.target.value)} className="kp-input" />
        </div>
        <div>
          <label className="kp-label">Presenter Name *</label>
          <input value={presenterName} onChange={e => setPresenterName(e.target.value)} className="kp-input" />
        </div>
        <div>
          <label className="kp-label">Talk Type</label>
          <input value={talkType} onChange={e => setTalkType(e.target.value)} placeholder="Talk / Lightning Talk" className="kp-input" />
        </div>
        <div className="sm:col-span-2">
          <label className="kp-label">Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className="kp-input" />
        </div>
        <div>
          <label className="kp-label">Presenter Bio</label>
          <textarea value={presenterBio} onChange={e => setPresenterBio(e.target.value)} rows={2} className="kp-input" />
        </div>
        <div>
          <label className="kp-label">Presenter Email</label>
          <input type="email" value={presenterEmail} onChange={e => setPresenterEmail(e.target.value)} className="kp-input" />
        </div>
        <div className="sm:col-span-2">
          <label className="kp-label">CFP URL</label>
          <input value={cfpUrl} onChange={e => setCfpUrl(e.target.value)} placeholder="https://fossunited.org/c/…" className="kp-input" />
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
            talk_type: talkType || null,
            cfp_url: cfpUrl || null,
            cfp_content: initial?.cfp_content ?? null,
            references: initial?.references ?? null,
          })}
          className="btn-ink"
        >
          {isPending ? 'Saving…' : 'Save'}
        </button>
        <button onClick={onCancel} className="btn-label">Cancel</button>
      </div>
    </div>
  )
}

export default function TalksPage() {
  const qc = useQueryClient()
  const [editingId, setEditingId] = useState<string | 'new' | null>(null)
  const [csvError, setCsvError] = useState<string | null>(null)
  const [csvSuccess, setCsvSuccess] = useState<string | null>(null)
  const [detailTalk, setDetailTalk] = useState<TalkDetail | null>(null)
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

  if (isLoading) return <div className="text-sm uppercase tracking-wide text-stencil">Loading…</div>

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="supertitle">Admin</p>
          <h1 className="page-title">Talks ({talks.length})</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/admin/results" className="btn-label">View Results</Link>
          <button onClick={() => setEditingId('new')} className="btn-ink">+ Add Talk</button>
        </div>
      </div>

      {/* CSV Import */}
      <div className="kp-card space-y-2 p-4">
        <p className="section-title">Import from CSV</p>
        <p className="text-xs text-stencil">
          Columns: title, description, duration_minutes, presenter_name, presenter_bio, presenter_email, talk_type, cfp_url, cfp_content.
          Also accepts the FOSS United submissions export (session_title, speaker, track, link).
        </p>
        {csvError && <pre className="status-error whitespace-pre-wrap">{csvError}</pre>}
        {csvSuccess && <p className="text-xs font-bold uppercase text-funded">{csvSuccess}</p>}
        <div className="flex flex-wrap items-center gap-2">
          <input ref={fileRef} type="file" accept=".csv,text/csv"
            onChange={e => {
              const file = e.target.files?.[0]
              if (file) importCsv.mutate(file)
            }}
            className="text-sm text-ink" />
          {importCsv.isPending && <span className="text-sm text-stencil">Importing…</span>}
        </div>
      </div>

      {/* New talk form */}
      {editingId === 'new' && (
        <div className="kp-card p-4">
          <h2 className="section-title mb-3">New Talk</h2>
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
          <div key={talk.id} className="kp-card p-4">
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
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    {talk.talk_type && (
                      <span className="border border-ink/40 px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-widest text-stencil">
                        {talk.talk_type}
                      </span>
                    )}
                    <h3 className="font-bold text-ink">{talk.title}</h3>
                  </div>
                  <p className="text-sm text-stencil">{talk.presenter_name}</p>
                  {talk.description && <p className="mt-1 line-clamp-2 text-sm leading-6 text-ink-light">{talk.description}</p>}
                </div>
                <div className="flex flex-wrap items-center gap-3 sm:shrink-0">
                  <span className="text-sm text-stencil">{talk.vote_count} votes</span>
                  <button onClick={() => setDetailTalk(talk)}
                    className="min-h-11 text-sm font-bold uppercase tracking-wide text-ink hover:text-stamp">Details</button>
                  <button onClick={() => setEditingId(talk.id)}
                    className="min-h-11 text-sm font-bold uppercase tracking-wide text-ink hover:text-stamp">Edit</button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete "${talk.title}"?${talk.vote_count > 0 ? ` This will also delete ${talk.vote_count} vote(s).` : ''}`))
                        deleteTalk.mutate(talk.id)
                    }}
                    className="min-h-11 text-sm font-semibold text-ink-faint transition-colors hover:text-red-700">Delete</button>
                </div>
              </div>
            )}
          </div>
        ))}
        {talks.length === 0 && !editingId && (
          <div className="empty-state">No talks yet. Add one above or import a CSV.</div>
        )}
      </div>

      {detailTalk && (
        <TalkDetailModal talk={detailTalk} onClose={() => setDetailTalk(null)} />
      )}
    </div>
  )
}
