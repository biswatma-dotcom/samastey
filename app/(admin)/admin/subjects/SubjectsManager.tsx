'use client'

import { useState, useEffect, useCallback } from 'react'

interface SubjectRow {
  id: string
  name: string
  code: string
  grade: number
  board: string
  isActive: boolean
  conceptCount: number
  contentCount: number
  questionCount: number
  materialCount: number
}

interface SeedLog {
  type: 'start' | 'progress' | 'skip' | 'done' | 'error'
  message?: string
  subject?: string
  count?: number
  success?: boolean
  concepts?: string[]
  grade?: number
  board?: string
}

interface ConceptMaterialItem {
  id: string
  title: string
  content: string
  source: string | null
}

interface ConceptWithMaterials {
  id: string
  title: string
  orderIndex: number
  materials: ConceptMaterialItem[]
}

interface ConceptRow {
  id: string
  title: string
  description: string
  orderIndex: number
  isActive: boolean
  estimatedMinutes: number
  _count: { materials: number; questions: number; contents: number }
}

function StatusBadge({ count }: { count: number }) {
  if (count === 0) return <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-medium text-red-400">Not seeded</span>
  return <span className="rounded-full bg-green-500/15 px-2 py-0.5 text-xs font-medium text-green-400">{count} concepts</span>
}

function ActiveToggle({ isActive, onChange, disabled }: { isActive: boolean; onChange: () => void; disabled: boolean }) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      title={isActive ? 'Active — click to deactivate' : 'Inactive — click to activate'}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-40 ${isActive ? 'bg-green-500' : 'bg-gray-600'}`}
    >
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${isActive ? 'translate-x-4' : 'translate-x-1'}`} />
    </button>
  )
}

interface MaterialFormState {
  conceptId: string
  materialId: string | null
  title: string
  content: string
  source: string
}

function MaterialsPanel({ subjectId, onClose }: { subjectId: string; onClose: () => void }) {
  const [concepts, setConcepts] = useState<ConceptWithMaterials[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [form, setForm] = useState<MaterialFormState | null>(null)
  const [toast, setToast] = useState<{ text: string; type: 'ok' | 'err' } | null>(null)

  function showToast(text: string, type: 'ok' | 'err' = 'ok') {
    setToast({ text, type })
    setTimeout(() => setToast(null), 4000)
  }

  const loadMaterials = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/admin/materials?subjectId=${subjectId}`)
    const data = await res.json()
    setConcepts(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [subjectId])

  useEffect(() => { loadMaterials() }, [loadMaterials])

  function openAddForm(conceptId: string) {
    setForm({ conceptId, materialId: null, title: 'Reference Material', content: '', source: '' })
  }

  function openEditForm(conceptId: string, mat: ConceptMaterialItem) {
    setForm({ conceptId, materialId: mat.id, title: mat.title, content: mat.content, source: mat.source ?? '' })
  }

  function cancelForm() {
    setForm(null)
  }

  async function handlePdfUpload(e: React.ChangeEvent<HTMLInputElement>, conceptId: string) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('conceptId', conceptId)
      fd.append('title', file.name.replace(/\.pdf$/i, ''))
      fd.append('source', file.name)
      const res = await fetch('/api/admin/materials/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Upload failed')
      showToast(`PDF uploaded — ${data.extractedLength.toLocaleString()} characters extracted.`)
      await loadMaterials()
    } catch (err: any) {
      showToast(err.message, 'err')
    } finally {
      setUploading(false)
    }
  }

  async function saveForm() {
    if (!form || !form.content.trim()) return
    setSaving(true)
    try {
      if (form.materialId) {
        await fetch('/api/admin/materials', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: form.materialId, title: form.title, content: form.content, source: form.source }),
        })
        showToast('Material updated.')
      } else {
        await fetch('/api/admin/materials', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conceptId: form.conceptId, title: form.title, content: form.content, source: form.source }),
        })
        showToast('Material added.')
      }
      setForm(null)
      await loadMaterials()
    } finally {
      setSaving(false)
    }
  }

  async function deleteMaterial(id: string) {
    if (!confirm('Delete this material?')) return
    setDeleting(id)
    await fetch('/api/admin/materials', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setDeleting(null)
    showToast('Material deleted.')
    await loadMaterials()
  }

  return (
    <div className="mt-2 rounded-xl border border-orange-500/30 bg-gray-900 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-orange-400">Reference Materials</h3>
        <button onClick={onClose} className="text-xs text-gray-500 hover:text-gray-300">Close</button>
      </div>

      {uploading && (
        <div className="mb-3 rounded-lg bg-orange-500/15 px-3 py-2 text-xs text-orange-400 flex items-center gap-2">
          <span className="inline-flex gap-0.5">{[0,1,2].map(i=><span key={i} className="inline-block h-1.5 w-1.5 rounded-full bg-orange-400 animate-bounce" style={{animationDelay:`${i*150}ms`}}/>)}</span>
          Extracting text from PDF...
        </div>
      )}
      {toast && (
        <div className={`mb-3 rounded-lg px-3 py-2 text-xs ${toast.type === 'ok' ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'}`}>{toast.text}</div>
      )}

      {loading ? (
        <p className="text-xs text-gray-500">Loading...</p>
      ) : concepts.length === 0 ? (
        <p className="text-xs text-gray-500">No concepts found for this subject.</p>
      ) : (
        <div className="space-y-3">
          {concepts.map((concept, i) => {
            const hasMaterial = concept.materials.length > 0
            const isEditing = form?.conceptId === concept.id
            return (
              <div key={concept.id} className="rounded-lg border border-gray-800 bg-gray-950 p-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-300">{i + 1}. {concept.title}</span>
                    {hasMaterial
                      ? <span className="rounded-full bg-green-500/15 px-2 py-0.5 text-xs text-green-400">Has material</span>
                      : <span className="rounded-full bg-gray-700/50 px-2 py-0.5 text-xs text-gray-500">No material</span>
                    }
                  </div>
                  <div className="flex gap-1.5 flex-wrap items-center">
                    {!hasMaterial && !isEditing && (
                      <button
                        onClick={() => openAddForm(concept.id)}
                        className="rounded-lg bg-orange-500/15 px-2.5 py-1 text-xs font-medium text-orange-400 hover:bg-orange-500/25 transition-colors"
                      >
                        + Paste Text
                      </button>
                    )}
                    {/* PDF upload — always available if no form is open */}
                    {!isEditing && (
                      <label className={`cursor-pointer rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${uploading ? 'opacity-40 pointer-events-none' : ''} bg-purple-500/15 text-purple-400 hover:bg-purple-500/25`}>
                        Upload PDF
                        <input
                          type="file"
                          accept=".pdf,application/pdf"
                          className="sr-only"
                          onChange={(e) => handlePdfUpload(e, concept.id)}
                          disabled={uploading}
                        />
                      </label>
                    )}
                    {hasMaterial && concept.materials.map((mat) => (
                      <div key={mat.id} className="flex gap-1">
                        {!isEditing && (
                          <button
                            onClick={() => openEditForm(concept.id, mat)}
                            className="rounded-lg bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-400 hover:bg-blue-500/20 transition-colors"
                          >
                            Edit
                          </button>
                        )}
                        <button
                          onClick={() => deleteMaterial(mat.id)}
                          disabled={deleting === mat.id}
                          className="rounded-lg bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-400 hover:bg-red-500/20 disabled:opacity-40 transition-colors"
                        >
                          {deleting === mat.id ? '...' : 'Delete'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Inline form */}
                {isEditing && form && (
                  <div className="mt-3 space-y-2.5 border-t border-gray-800 pt-3">
                    <div>
                      <label className="mb-1 block text-xs text-gray-500">Title</label>
                      <input
                        value={form.title}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                        className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-1.5 text-xs text-white focus:border-orange-500 focus:outline-none"
                        placeholder="Reference Material"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-gray-500">Source</label>
                      <input
                        value={form.source}
                        onChange={(e) => setForm({ ...form, source: e.target.value })}
                        className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-1.5 text-xs text-white focus:border-orange-500 focus:outline-none"
                        placeholder="e.g. NCERT Class 9 Chapter 2, p. 45"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-gray-500">Content</label>
                      <textarea
                        value={form.content}
                        onChange={(e) => setForm({ ...form, content: e.target.value })}
                        rows={6}
                        className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-1.5 text-xs text-white focus:border-orange-500 focus:outline-none resize-y"
                        placeholder="Paste textbook excerpt here..."
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={saveForm}
                        disabled={saving || !form.content.trim()}
                        className="rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-600 disabled:opacity-40 transition-colors"
                      >
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={cancelForm}
                        disabled={saving}
                        className="rounded-lg bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-400 hover:bg-gray-700 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

interface TopicEditFormState {
  id: string
  title: string
  description: string
  estimatedMinutes: number
}

interface TopicAddFormState {
  title: string
  description: string
  estimatedMinutes: number
}

interface ImportPreview {
  source: string
  explanationWords: number
  mcqEasy: number
  mcqMedium: number
  mcqHard: number
  board1: number
  board2: number
  board3: number
  board5: number
  referenceMaterialWords: number
}

interface ImportPanelState {
  json: string
  replaceExisting: boolean
  preview: ImportPreview | null
  parseError: string | null
  importing: boolean
  importError: string | null
  importResult: { imported: { explanations: number; mcq: number; board: number; material: number } } | null
}

function TopicsPanel({ subjectId, onClose }: { subjectId: string; onClose: () => void }) {
  const [concepts, setConcepts] = useState<ConceptRow[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<TopicEditFormState | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [addForm, setAddForm] = useState<TopicAddFormState>({ title: '', description: '', estimatedMinutes: 30 })
  const [savingAdd, setSavingAdd] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  // Import panel state — keyed by conceptId
  const [importPanelId, setImportPanelId] = useState<string | null>(null)
  const [importPanels, setImportPanels] = useState<Record<string, ImportPanelState>>({})
  // Verified badges — conceptIds that were successfully imported in this session
  const [verifiedIds, setVerifiedIds] = useState<Set<string>>(new Set())

  function getImportPanel(conceptId: string): ImportPanelState {
    return importPanels[conceptId] ?? {
      json: '',
      replaceExisting: false,
      preview: null,
      parseError: null,
      importing: false,
      importError: null,
      importResult: null,
    }
  }

  function setImportPanel(conceptId: string, patch: Partial<ImportPanelState>) {
    setImportPanels((prev) => ({
      ...prev,
      [conceptId]: { ...getImportPanel(conceptId), ...patch },
    }))
  }

  function toggleImportPanel(conceptId: string) {
    setImportPanelId((prev) => (prev === conceptId ? null : conceptId))
    // Close edit form if open
    setEditForm(null)
  }

  function validateImportJson(conceptId: string) {
    const panel = getImportPanel(conceptId)
    try {
      const parsed = JSON.parse(panel.json)
      if (!parsed.source || typeof parsed.source !== 'string') throw new Error('Missing "source" field')
      if (!parsed.explanation || typeof parsed.explanation !== 'string') throw new Error('Missing "explanation" field')
      if (!Array.isArray(parsed.mcq_questions)) throw new Error('"mcq_questions" must be an array')
      if (!Array.isArray(parsed.board_questions)) throw new Error('"board_questions" must be an array')
      if (!parsed.reference_material || typeof parsed.reference_material !== 'string') throw new Error('Missing "reference_material" field')

      const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length

      const mcqs: any[] = parsed.mcq_questions
      const boards: any[] = parsed.board_questions

      const preview: ImportPreview = {
        source: parsed.source,
        explanationWords: wordCount(parsed.explanation),
        mcqEasy: mcqs.filter((q) => q.difficulty === 'easy').length,
        mcqMedium: mcqs.filter((q) => q.difficulty === 'medium').length,
        mcqHard: mcqs.filter((q) => q.difficulty === 'hard').length,
        board1: boards.filter((q) => q.marks === 1).length,
        board2: boards.filter((q) => q.marks === 2).length,
        board3: boards.filter((q) => q.marks === 3).length,
        board5: boards.filter((q) => q.marks === 5).length,
        referenceMaterialWords: wordCount(parsed.reference_material),
      }
      setImportPanel(conceptId, { preview, parseError: null, importResult: null, importError: null })
    } catch (err: any) {
      setImportPanel(conceptId, { preview: null, parseError: err.message ?? 'Invalid JSON' })
    }
  }

  async function runImport(conceptId: string) {
    const panel = getImportPanel(conceptId)
    if (!panel.preview) return
    setImportPanel(conceptId, { importing: true, importError: null, importResult: null })
    try {
      const parsed = JSON.parse(panel.json)
      const res = await fetch('/api/admin/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conceptId, replaceExisting: panel.replaceExisting, data: parsed }),
      })
      const result = await res.json()
      if (!res.ok) {
        setImportPanel(conceptId, { importing: false, importError: result.error ?? 'Import failed' })
        return
      }
      setImportPanel(conceptId, { importing: false, importResult: result })
      setVerifiedIds((prev) => new Set(prev).add(conceptId))
      showToast(`Content imported for this concept — ${result.imported.mcq} MCQs, ${result.imported.board} board questions.`)
      await loadConcepts()
    } catch (err: any) {
      setImportPanel(conceptId, { importing: false, importError: err.message ?? 'Import failed' })
    }
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }

  const loadConcepts = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/admin/concepts?subjectId=${subjectId}`)
    const data = await res.json()
    setConcepts(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [subjectId])

  useEffect(() => { loadConcepts() }, [loadConcepts])

  async function toggleActive(concept: ConceptRow) {
    setTogglingId(concept.id)
    await fetch('/api/admin/concepts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: concept.id, isActive: !concept.isActive }),
    })
    setTogglingId(null)
    await loadConcepts()
  }

  async function deleteConcept(id: string) {
    if (!confirm('Delete this topic? This cannot be undone.')) return
    setDeletingId(id)
    await fetch('/api/admin/concepts', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setDeletingId(null)
    showToast('Topic deleted.')
    await loadConcepts()
  }

  function openEditForm(concept: ConceptRow) {
    setEditForm({ id: concept.id, title: concept.title, description: concept.description, estimatedMinutes: concept.estimatedMinutes })
  }

  async function saveEditForm() {
    if (!editForm) return
    setSavingEdit(true)
    await fetch('/api/admin/concepts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: editForm.id, title: editForm.title, description: editForm.description, estimatedMinutes: editForm.estimatedMinutes }),
    })
    setSavingEdit(false)
    setEditForm(null)
    showToast('Topic updated.')
    await loadConcepts()
  }

  async function saveAddForm() {
    if (!addForm.title.trim() || !addForm.description.trim()) return
    setSavingAdd(true)
    setAddError(null)
    try {
      const res = await fetch('/api/admin/concepts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjectId, title: addForm.title, description: addForm.description, estimatedMinutes: addForm.estimatedMinutes }),
      })
      if (!res.ok) {
        const data = await res.json()
        setAddError(data.error ?? 'Failed to add topic.')
        return
      }
      setShowAddForm(false)
      setAddForm({ title: '', description: '', estimatedMinutes: 30 })
      showToast('Topic added.')
      await loadConcepts()
    } finally {
      setSavingAdd(false)
    }
  }

  return (
    <div className="mt-2 rounded-xl border border-blue-500/30 bg-gray-900 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-blue-400">
          Topics {!loading && <span className="text-gray-500 font-normal">({concepts.length})</span>}
        </h3>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setShowAddForm(!showAddForm); setEditForm(null) }}
            className="rounded-lg bg-blue-500/15 px-3 py-1 text-xs font-medium text-blue-400 hover:bg-blue-500/25 transition-colors"
          >
            + Add Topic
          </button>
          <button onClick={onClose} className="text-xs text-gray-500 hover:text-gray-300">Close</button>
        </div>
      </div>

      {toast && (
        <div className="mb-3 rounded-lg bg-green-500/15 px-3 py-2 text-xs text-green-400">{toast}</div>
      )}

      {loading ? (
        <p className="text-xs text-gray-500">Loading...</p>
      ) : concepts.length === 0 ? (
        <p className="text-xs text-gray-500">No topics found for this subject.</p>
      ) : (
        <div className="space-y-2">
          {concepts.map((concept, i) => {
            const isEditing = editForm?.id === concept.id
            const isImporting = importPanelId === concept.id
            const panel = getImportPanel(concept.id)
            // Verified: either imported this session, or already has both contents and materials
            const isVerified = verifiedIds.has(concept.id) || (concept._count.contents > 0 && concept._count.materials > 0)
            return (
              <div key={concept.id} className="rounded-lg border border-gray-800 bg-gray-950 p-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium text-gray-300">{i + 1}. {concept.title}</span>
                    {isVerified && (
                      <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-xs font-semibold text-green-400 border border-green-500/30">Verified</span>
                    )}
                    <span className="text-xs text-gray-600">{concept.estimatedMinutes} min</span>
                    {concept.isActive
                      ? <span className="rounded-full bg-green-500/15 px-2 py-0.5 text-xs text-green-400">Active</span>
                      : <span className="rounded-full bg-gray-700/50 px-2 py-0.5 text-xs text-gray-500">Inactive</span>
                    }
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <ActiveToggle
                      isActive={concept.isActive}
                      onChange={() => toggleActive(concept)}
                      disabled={togglingId === concept.id}
                    />
                    {!isEditing && (
                      <button
                        onClick={() => openEditForm(concept)}
                        className="rounded-lg bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-400 hover:bg-blue-500/20 transition-colors"
                      >
                        Edit
                      </button>
                    )}
                    <button
                      onClick={() => toggleImportPanel(concept.id)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${isImporting ? 'bg-purple-500/25 text-purple-300' : 'bg-purple-500/10 text-purple-400 hover:bg-purple-500/20'}`}
                    >
                      Import Content
                    </button>
                    <button
                      onClick={() => deleteConcept(concept.id)}
                      disabled={deletingId === concept.id}
                      className="rounded-lg bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-400 hover:bg-red-500/20 disabled:opacity-40 transition-colors"
                    >
                      {deletingId === concept.id ? '...' : 'Delete'}
                    </button>
                  </div>
                </div>

                {isEditing && editForm && (
                  <div className="mt-3 space-y-2.5 border-t border-gray-800 pt-3">
                    <div>
                      <label className="mb-1 block text-xs text-gray-500">Title</label>
                      <input
                        value={editForm.title}
                        onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                        className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-1.5 text-xs text-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-gray-500">Description</label>
                      <textarea
                        value={editForm.description}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        rows={3}
                        className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-1.5 text-xs text-white focus:border-blue-500 focus:outline-none resize-y"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-gray-500">Estimated Minutes</label>
                      <input
                        type="number"
                        value={editForm.estimatedMinutes}
                        onChange={(e) => setEditForm({ ...editForm, estimatedMinutes: parseInt(e.target.value) || 30 })}
                        className="w-24 rounded-lg border border-gray-700 bg-gray-900 px-3 py-1.5 text-xs text-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={saveEditForm}
                        disabled={savingEdit || !editForm.title.trim()}
                        className="rounded-lg bg-blue-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-600 disabled:opacity-40 transition-colors"
                      >
                        {savingEdit ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={() => setEditForm(null)}
                        disabled={savingEdit}
                        className="rounded-lg bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-400 hover:bg-gray-700 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Import Content Panel */}
                {isImporting && (
                  <div className="mt-3 rounded-lg border border-purple-500/30 bg-gray-900 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-purple-400">Import Structured Content</p>
                      <button onClick={() => setImportPanelId(null)} className="text-xs text-gray-500 hover:text-gray-300">Close</button>
                    </div>
                    <p className="text-xs text-gray-500">Paste the JSON generated by Claude Sonnet from the textbook PDF</p>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={panel.replaceExisting}
                        onChange={(e) => setImportPanel(concept.id, { replaceExisting: e.target.checked })}
                        className="rounded border-gray-600 bg-gray-800 text-purple-500 focus:ring-purple-500"
                      />
                      <span className="text-xs text-gray-400">Replace existing AI-generated content</span>
                    </label>

                    <textarea
                      value={panel.json}
                      onChange={(e) => setImportPanel(concept.id, { json: e.target.value, preview: null, parseError: null, importResult: null })}
                      rows={12}
                      placeholder={'{\n  "source": "NCERT Class 9 Science Chapter 8 — Motion",\n  "explanation": "...",\n  "mcq_questions": [...],\n  "board_questions": [...],\n  "reference_material": "..."\n}'}
                      className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 font-mono text-xs text-white focus:border-purple-500 focus:outline-none resize-y"
                    />

                    {panel.parseError && (
                      <div className="rounded-lg bg-red-500/15 px-3 py-2 text-xs text-red-400">
                        Parse error: {panel.parseError}
                      </div>
                    )}

                    {panel.preview && (
                      <div className="rounded-lg border border-purple-500/20 bg-gray-950 p-3 space-y-1.5">
                        <p className="text-xs font-semibold text-purple-300">Preview</p>
                        <p className="text-xs text-gray-300"><span className="text-gray-500">Source:</span> {panel.preview.source}</p>
                        <p className="text-xs text-gray-300"><span className="text-gray-500">Explanation:</span> {panel.preview.explanationWords} words</p>
                        <p className="text-xs text-gray-300">
                          <span className="text-gray-500">MCQs:</span>{' '}
                          {panel.preview.mcqEasy + panel.preview.mcqMedium + panel.preview.mcqHard} total
                          {' '}({panel.preview.mcqEasy} easy / {panel.preview.mcqMedium} medium / {panel.preview.mcqHard} hard)
                        </p>
                        <p className="text-xs text-gray-300">
                          <span className="text-gray-500">Board Qs:</span>{' '}
                          {panel.preview.board1 + panel.preview.board2 + panel.preview.board3 + panel.preview.board5} total
                          {' '}(1m×{panel.preview.board1} / 2m×{panel.preview.board2} / 3m×{panel.preview.board3} / 5m×{panel.preview.board5})
                        </p>
                        <p className="text-xs text-gray-300"><span className="text-gray-500">Reference material:</span> {panel.preview.referenceMaterialWords} words</p>
                      </div>
                    )}

                    {panel.importResult && (
                      <div className="rounded-lg bg-green-500/15 border border-green-500/30 px-3 py-2 text-xs text-green-400">
                        Import successful — {panel.importResult.imported.explanations} explanations, {panel.importResult.imported.mcq} MCQs, {panel.importResult.imported.board} board questions, {panel.importResult.imported.material} reference material.
                      </div>
                    )}

                    {panel.importError && (
                      <div className="rounded-lg bg-red-500/15 px-3 py-2 text-xs text-red-400">
                        Import error: {panel.importError}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={() => validateImportJson(concept.id)}
                        disabled={!panel.json.trim()}
                        className="rounded-lg bg-gray-700 px-3 py-1.5 text-xs font-medium text-gray-200 hover:bg-gray-600 disabled:opacity-40 transition-colors"
                      >
                        Validate
                      </button>
                      <button
                        onClick={() => runImport(concept.id)}
                        disabled={!panel.preview || panel.importing}
                        className="rounded-lg bg-purple-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-600 disabled:opacity-40 transition-colors"
                      >
                        {panel.importing ? 'Importing...' : 'Import'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add Topic Form */}
      {showAddForm && (
        <div className="mt-4 rounded-lg border border-blue-500/20 bg-gray-950 p-4 space-y-3">
          <p className="text-xs font-semibold text-blue-400">New Topic</p>
          {addError && (
            <div className="rounded-lg bg-red-500/15 px-3 py-2 text-xs text-red-400">{addError}</div>
          )}
          <div>
            <label className="mb-1 block text-xs text-gray-500">Title <span className="text-red-400">*</span></label>
            <input
              value={addForm.title}
              onChange={(e) => setAddForm({ ...addForm, title: e.target.value })}
              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-1.5 text-xs text-white focus:border-blue-500 focus:outline-none"
              placeholder="e.g. Introduction to Algebra"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">Description <span className="text-red-400">*</span></label>
            <textarea
              value={addForm.description}
              onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
              rows={3}
              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-1.5 text-xs text-white focus:border-blue-500 focus:outline-none resize-y"
              placeholder="Brief description of this topic..."
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">Estimated Minutes</label>
            <input
              type="number"
              value={addForm.estimatedMinutes}
              onChange={(e) => setAddForm({ ...addForm, estimatedMinutes: parseInt(e.target.value) || 30 })}
              className="w-24 rounded-lg border border-gray-700 bg-gray-900 px-3 py-1.5 text-xs text-white focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={saveAddForm}
              disabled={savingAdd || !addForm.title.trim() || !addForm.description.trim()}
              className="rounded-lg bg-blue-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-600 disabled:opacity-40 transition-colors"
            >
              {savingAdd ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={() => { setShowAddForm(false); setAddError(null) }}
              disabled={savingAdd}
              className="rounded-lg bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-400 hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

interface AddSubjectFormState {
  name: string
  code: string
  grade: string
  board: string
}

export function SubjectsManager() {
  const [subjects, setSubjects] = useState<SubjectRow[]>([])
  const [loading, setLoading] = useState(false)
  const [board, setBoard] = useState('')
  const [grade, setGrade] = useState('')

  // Seeding state
  const [seedingId, setSeedingId] = useState<string | null>(null)
  const [seedLogs, setSeedLogs] = useState<SeedLog[]>([])
  const [seedTarget, setSeedTarget] = useState<string>('')

  // Delete / clear cache state
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [clearingId, setClearingId] = useState<string | null>(null)

  // Toggle state
  const [togglingId, setTogglingId] = useState<string | null>(null)

  // Materials panel
  const [materialsSubjectId, setMaterialsSubjectId] = useState<string | null>(null)

  // Topics panel
  const [topicsSubjectId, setTopicsSubjectId] = useState<string | null>(null)

  // Add Subject form
  const [showAddSubjectForm, setShowAddSubjectForm] = useState(false)
  const [addSubjectForm, setAddSubjectForm] = useState<AddSubjectFormState>({ name: '', code: '', grade: '', board: 'CBSE' })
  const [savingSubject, setSavingSubject] = useState(false)
  const [addSubjectError, setAddSubjectError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (board) params.set('board', board)
    if (grade) params.set('grade', grade)
    const res = await fetch(`/api/admin/subjects?${params}`)
    const data = await res.json()
    setSubjects(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [board, grade])

  useEffect(() => { load() }, [load])

  async function toggleActive(s: SubjectRow) {
    setTogglingId(s.id)
    await fetch('/api/admin/subjects', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subjectId: s.id, isActive: !s.isActive }),
    })
    setTogglingId(null)
    load()
  }

  async function seedSubject(s: SubjectRow) {
    setSeedingId(s.id)
    setSeedTarget(s.name)
    setSeedLogs([])

    const res = await fetch('/api/admin/seed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subjectId: s.id }),
    })

    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    let buf = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buf += decoder.decode(value, { stream: true })
      const parts = buf.split('\n\n')
      buf = parts.pop() ?? ''
      for (const part of parts) {
        const line = part.replace(/^data: /, '').trim()
        if (!line) continue
        try {
          const evt: SeedLog = JSON.parse(line)
          setSeedLogs((prev) => [...prev, evt])
          if (evt.type === 'done') {
            setSeedingId(null)
            load()
          }
        } catch { /* skip */ }
      }
    }
    setSeedingId(null)
  }

  async function deleteConceptsForSubject(s: SubjectRow) {
    if (!confirm(`Delete all ${s.conceptCount} concepts for "${s.name}"? This cannot be undone.`)) return
    setDeletingId(s.id)
    await fetch(`/api/admin/seed?subjectId=${s.id}`, { method: 'DELETE' })
    setDeletingId(null)
    load()
  }

  async function clearCacheForSubject(s: SubjectRow) {
    if (!confirm(`Clear all cached explanations for "${s.name}"?`)) return
    setClearingId(s.id)
    await fetch(`/api/admin/content?subjectId=${s.id}`, { method: 'DELETE' })
    setClearingId(null)
    load()
  }

  async function submitAddSubject() {
    if (!addSubjectForm.name.trim() || !addSubjectForm.code.trim() || !addSubjectForm.grade || !addSubjectForm.board) return
    setSavingSubject(true)
    setAddSubjectError(null)
    try {
      const res = await fetch('/api/admin/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addSubjectForm),
      })
      const data = await res.json()
      if (!res.ok) {
        setAddSubjectError(data.error ?? 'Failed to create subject.')
        return
      }
      setShowAddSubjectForm(false)
      setAddSubjectForm({ name: '', code: '', grade: '', board: 'CBSE' })
      await load()
    } finally {
      setSavingSubject(false)
    }
  }

  function handleMaterialsClick(subjectId: string) {
    if (materialsSubjectId === subjectId) {
      setMaterialsSubjectId(null)
    } else {
      setMaterialsSubjectId(subjectId)
      setTopicsSubjectId(null)
    }
  }

  function handleTopicsClick(subjectId: string) {
    if (topicsSubjectId === subjectId) {
      setTopicsSubjectId(null)
    } else {
      setTopicsSubjectId(subjectId)
      setMaterialsSubjectId(null)
    }
  }

  const unseeded = subjects.filter((s) => s.conceptCount === 0)
  const seeded = subjects.filter((s) => s.conceptCount > 0)

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <select value={board} onChange={(e) => setBoard(e.target.value)} className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white focus:border-orange-500 focus:outline-none">
          <option value="">All Boards</option>
          <option>CBSE</option>
          <option>ICSE</option>
        </select>
        <select value={grade} onChange={(e) => setGrade(e.target.value)} className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white focus:border-orange-500 focus:outline-none">
          <option value="">All Grades</option>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
            <option key={g} value={g}>Class {g}</option>
          ))}
        </select>
        <div className="flex gap-2 text-xs text-gray-500">
          <span className="rounded-full bg-green-500/10 px-2 py-1 text-green-400">{seeded.length} seeded</span>
          <span className="rounded-full bg-red-500/10 px-2 py-1 text-red-400">{unseeded.length} pending</span>
        </div>
        <div className="ml-auto">
          <button
            onClick={() => { setShowAddSubjectForm(!showAddSubjectForm); setAddSubjectError(null) }}
            className="rounded-lg bg-orange-500/15 px-3 py-2 text-xs font-medium text-orange-400 hover:bg-orange-500/25 transition-colors"
          >
            + Add Subject
          </button>
        </div>
      </div>

      {/* Add Subject Form */}
      {showAddSubjectForm && (
        <div className="rounded-xl border border-orange-500/30 bg-gray-900 p-5 space-y-4">
          <p className="text-sm font-semibold text-orange-400">New Subject</p>
          {addSubjectError && (
            <div className="rounded-lg bg-red-500/15 px-3 py-2 text-xs text-red-400">{addSubjectError}</div>
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-gray-500">Name <span className="text-red-400">*</span></label>
              <input
                value={addSubjectForm.name}
                onChange={(e) => setAddSubjectForm({ ...addSubjectForm, name: e.target.value })}
                className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white focus:border-orange-500 focus:outline-none"
                placeholder="e.g. Mathematics"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">Code <span className="text-red-400">*</span></label>
              <input
                value={addSubjectForm.code}
                onChange={(e) => setAddSubjectForm({ ...addSubjectForm, code: e.target.value })}
                className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white focus:border-orange-500 focus:outline-none"
                placeholder="e.g. CBSE-MATH-9"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">Grade <span className="text-red-400">*</span></label>
              <select
                value={addSubjectForm.grade}
                onChange={(e) => setAddSubjectForm({ ...addSubjectForm, grade: e.target.value })}
                className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white focus:border-orange-500 focus:outline-none"
              >
                <option value="">Select grade</option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
                  <option key={g} value={g}>Class {g}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">Board <span className="text-red-400">*</span></label>
              <select
                value={addSubjectForm.board}
                onChange={(e) => setAddSubjectForm({ ...addSubjectForm, board: e.target.value })}
                className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white focus:border-orange-500 focus:outline-none"
              >
                <option value="CBSE">CBSE</option>
                <option value="ICSE">ICSE</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={submitAddSubject}
              disabled={savingSubject || !addSubjectForm.name.trim() || !addSubjectForm.code.trim() || !addSubjectForm.grade}
              className="rounded-lg bg-orange-500 px-4 py-2 text-xs font-medium text-white hover:bg-orange-600 disabled:opacity-40 transition-colors"
            >
              {savingSubject ? 'Creating...' : 'Create Subject'}
            </button>
            <button
              onClick={() => { setShowAddSubjectForm(false); setAddSubjectError(null) }}
              disabled={savingSubject}
              className="rounded-lg bg-gray-800 px-4 py-2 text-xs font-medium text-gray-400 hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Seed progress modal */}
      {(seedingId || seedLogs.length > 0) && (
        <div className="rounded-xl border border-orange-500/30 bg-gray-900 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white">
              Seeding: <span className="text-orange-400">{seedTarget}</span>
            </h3>
            {!seedingId && (
              <button onClick={() => setSeedLogs([])} className="text-xs text-gray-500 hover:text-gray-300">Dismiss</button>
            )}
          </div>
          <div className="space-y-1.5 font-mono text-xs">
            {seedLogs.map((log, i) => (
              <div key={i} className={
                log.type === 'error' ? 'text-red-400' :
                log.type === 'done' && log.success ? 'text-green-400' :
                log.type === 'skip' ? 'text-yellow-400' :
                'text-gray-400'
              }>
                {log.type === 'start' && `▶ Starting seed for ${log.subject} (Class ${log.grade} ${log.board})`}
                {log.type === 'progress' && `  · ${log.message}`}
                {log.type === 'skip' && `⚠ ${log.message}`}
                {log.type === 'error' && `✗ Error: ${log.message}`}
                {log.type === 'done' && log.success && `✓ Done — ${log.count} concepts created`}
                {log.type === 'done' && !log.success && log.type === 'done' && '✗ Seeding failed'}
              </div>
            ))}
            {seedingId && (
              <div className="flex items-center gap-2 text-orange-400 mt-1">
                <span className="inline-flex gap-0.5">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="inline-block h-1.5 w-1.5 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                  ))}
                </span>
                Processing...
              </div>
            )}
            {seedLogs.find((l) => l.type === 'done' && l.success && l.concepts) && (
              <div className="mt-2 pt-2 border-t border-gray-800">
                <p className="text-gray-500 mb-1">Created concepts:</p>
                {seedLogs.find((l) => l.concepts)!.concepts!.map((c, i) => (
                  <div key={i} className="text-gray-400">  {i + 1}. {c}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-800">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-800 bg-gray-900">
            <tr>
              {['Subject', 'Grade', 'Board', 'Active', 'Status', 'Content', 'Questions', 'Actions'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800 bg-gray-950">
            {loading ? (
              <tr><td colSpan={8} className="py-12 text-center text-gray-500">Loading...</td></tr>
            ) : subjects.length === 0 ? (
              <tr><td colSpan={8} className="py-12 text-center text-gray-500">No subjects found</td></tr>
            ) : subjects.map((s) => (
              <>
                <tr key={s.id} className="hover:bg-gray-900/50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{s.name}</p>
                    <p className="text-xs text-gray-600">{s.code}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-300">Class {s.grade}</td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-gray-800 px-1.5 py-0.5 text-xs text-gray-400">{s.board}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      <ActiveToggle
                        isActive={s.isActive}
                        onChange={() => toggleActive(s)}
                        disabled={togglingId === s.id}
                      />
                      <span className={`text-xs ${s.isActive ? 'text-green-400' : 'text-gray-500'}`}>
                        {s.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3"><StatusBadge count={s.conceptCount} /></td>
                  <td className="px-4 py-3 text-gray-400">{s.contentCount}</td>
                  <td className="px-4 py-3 text-gray-400">{s.questionCount}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 flex-wrap">
                      {s.conceptCount === 0 ? (
                        <button
                          onClick={() => seedSubject(s)}
                          disabled={!!seedingId}
                          className="rounded-lg bg-orange-500/15 px-3 py-1.5 text-xs font-medium text-orange-400 hover:bg-orange-500/25 disabled:opacity-40 transition-colors"
                        >
                          {seedingId === s.id ? 'Seeding...' : '⚡ Seed'}
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => clearCacheForSubject(s)}
                            disabled={!!clearingId || s.contentCount === 0}
                            className="rounded-lg bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-400 hover:bg-blue-500/20 disabled:opacity-40 transition-colors"
                          >
                            {clearingId === s.id ? 'Clearing...' : '🗑 Clear Cache'}
                          </button>
                          <button
                            onClick={() => deleteConceptsForSubject(s)}
                            disabled={!!deletingId}
                            className="rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/20 disabled:opacity-40 transition-colors"
                          >
                            {deletingId === s.id ? 'Deleting...' : '✕ Re-seed'}
                          </button>
                        </>
                      )}
                      {s.conceptCount > 0 && (
                        <>
                          <button
                            onClick={() => handleTopicsClick(s.id)}
                            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${topicsSubjectId === s.id ? 'bg-blue-500/30 text-blue-300' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                          >
                            Topics ({s.conceptCount})
                          </button>
                          <button
                            onClick={() => handleMaterialsClick(s.id)}
                            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${materialsSubjectId === s.id ? 'bg-orange-500/30 text-orange-300' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                          >
                            Materials{s.materialCount > 0 ? ` (${s.materialCount})` : ''}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
                {topicsSubjectId === s.id && (
                  <tr key={`${s.id}-topics`}>
                    <td colSpan={8} className="px-4 pb-4">
                      <TopicsPanel subjectId={s.id} onClose={() => setTopicsSubjectId(null)} />
                    </td>
                  </tr>
                )}
                {materialsSubjectId === s.id && (
                  <tr key={`${s.id}-materials`}>
                    <td colSpan={8} className="px-4 pb-4">
                      <MaterialsPanel subjectId={s.id} onClose={() => setMaterialsSubjectId(null)} />
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
