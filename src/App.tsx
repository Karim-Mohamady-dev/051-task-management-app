import { useEffect, useMemo, useState } from 'react'
import {
  CalendarBlank, Check, CheckCircle, Circle, Clock, FunnelSimple, Globe, List,
  MagnifyingGlass, PencilSimple, Plus, Trash, WarningCircle, X,
} from '@phosphor-icons/react'
import { DATA_KEY, LANG_KEY, dicts, loadData, loadLang, locales, uid } from './lib/data'
import type { Dict, Lang, Priority, Project, Status, Task } from './lib/data'

type Tab = 'all' | 'active' | 'completed'
type Sort = 'due' | 'priority' | 'created'

const priorityRank: Record<Priority, number> = { high: 0, medium: 1, low: 2 }
const inputCls = 'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-900 focus:outline-none'
const btnPrimary = 'inline-flex items-center justify-center gap-2 rounded-lg bg-neutral-900 px-3 py-2 text-sm font-semibold text-white transition-colors duration-300 hover:bg-neutral-700 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2'
const btnGhost = 'inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-semibold text-neutral-900 transition-colors duration-300 hover:bg-neutral-100 active:scale-[0.98]'

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export default function App() {
  const [lang, setLang] = useState<Lang>(() => loadLang())
  const t: Dict = dicts[lang]
  const [data, setData] = useState(loadData)
  const [tab, setTab] = useState<Tab>('all')
  const [priorityFilter, setPriorityFilter] = useState<'all' | Priority>('all')
  const [projectFilter, setProjectFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<Sort>('due')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Task | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null)
  const [projectForm, setProjectForm] = useState<{ mode: 'new' | 'rename'; project?: Project } | null>(null)
  const [projectDelete, setProjectDelete] = useState<Project | null>(null)

  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
    localStorage.setItem(LANG_KEY, lang)
  }, [lang])

  useEffect(() => {
    localStorage.setItem(DATA_KEY, JSON.stringify(data))
  }, [data])

  useEffect(() => {
    if (!notice) return
    const id = window.setTimeout(() => setNotice(''), 3000)
    return () => window.clearTimeout(id)
  }, [notice])

  const stats = useMemo(() => {
    const today = todayIso()
    return {
      total: data.tasks.length,
      completed: data.tasks.filter((x) => x.status === 'done').length,
      active: data.tasks.filter((x) => x.status !== 'done').length,
      overdue: data.tasks.filter((x) => x.status !== 'done' && x.dueDate && x.dueDate < today).length,
    }
  }, [data.tasks])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = data.tasks.filter((task) => {
      if (tab === 'active' && task.status === 'done') return false
      if (tab === 'completed' && task.status !== 'done') return false
      if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false
      if (projectFilter !== 'all' && task.projectId !== (projectFilter === 'none' ? null : projectFilter)) return false
      if (q && !`${task.title} ${task.notes}`.toLowerCase().includes(q)) return false
      return true
    })
    return [...list].sort((a, b) => {
      if (sort === 'created') return b.createdAt - a.createdAt
      if (sort === 'priority') return priorityRank[a.priority] - priorityRank[b.priority]
      if (!a.dueDate) return 1
      if (!b.dueDate) return -1
      return a.dueDate.localeCompare(b.dueDate)
    })
  }, [data.tasks, tab, priorityFilter, projectFilter, search, sort])

  const hasFilters = tab !== 'all' || priorityFilter !== 'all' || projectFilter !== 'all' || search.trim() !== ''

  function clearFilters() {
    setTab('all')
    setPriorityFilter('all')
    setProjectFilter('all')
    setSearch('')
  }

  function saveTask(values: { title: string; notes: string; projectId: string | null; priority: Priority; dueDate: string | null; status: Status }) {
    if (editing) {
      setData((d) => ({ ...d, tasks: d.tasks.map((x) => (x.id === editing.id ? { ...x, ...values } : x)) }))
    } else {
      setData((d) => ({ ...d, tasks: [{ id: uid(), createdAt: Date.now(), ...values }, ...d.tasks] }))
    }
    setFormOpen(false)
    setEditing(null)
    setNotice(t.saved)
  }

  function toggleDone(task: Task) {
    setData((d) => ({ ...d, tasks: d.tasks.map((x) => (x.id === task.id ? { ...x, status: x.status === 'done' ? 'todo' : 'done' } : x)) }))
  }

  function changeStatus(task: Task, status: Status) {
    setData((d) => ({ ...d, tasks: d.tasks.map((x) => (x.id === task.id ? { ...x, status } : x)) }))
  }

  function deleteTask() {
    if (!deleteTarget) return
    setData((d) => ({ ...d, tasks: d.tasks.filter((x) => x.id !== deleteTarget.id) }))
    setDeleteTarget(null)
    setNotice(t.deleted)
  }

  function saveProject(name: string) {
    if (projectForm?.mode === 'rename' && projectForm.project) {
      const id = projectForm.project.id
      setData((d) => ({ ...d, projects: d.projects.map((p) => (p.id === id ? { ...p, name } : p)) }))
    } else {
      setData((d) => ({ ...d, projects: [...d.projects, { id: uid(), name }] }))
    }
    setProjectForm(null)
    setNotice(t.saved)
  }

  function deleteProject() {
    if (!projectDelete) return
    const id = projectDelete.id
    setData((d) => ({
      ...d,
      projects: d.projects.filter((p) => p.id !== id),
      tasks: d.tasks.map((x) => (x.projectId === id ? { ...x, projectId: null } : x)),
    }))
    if (projectFilter === id) setProjectFilter('all')
    setProjectDelete(null)
    setNotice(t.deleted)
  }

  function projectName(id: string | null): string {
    if (!id) return t.noProject
    return data.projects.find((p) => p.id === id)?.name ?? t.noProject
  }

  function dueLabel(task: Task): { text: string; overdue: boolean } {
    if (!task.dueDate) return { text: t.noDueDate, overdue: false }
    const today = todayIso()
    const label = new Intl.DateTimeFormat(locales[lang], { dateStyle: 'medium' }).format(new Date(`${task.dueDate}T12:00:00`))
    if (task.dueDate === today) return { text: `${t.dueToday} · ${label}`, overdue: false }
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    if (task.dueDate === tomorrow.toISOString().slice(0, 10)) return { text: `${t.dueTomorrow} · ${label}`, overdue: false }
    if (task.dueDate < today && task.status !== 'done') return { text: `${t.overdue} · ${label}`, overdue: true }
    return { text: label, overdue: false }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'all', label: t.filterAll },
    { id: 'active', label: t.filterActive },
    { id: 'completed', label: t.filterCompleted },
  ]

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-900">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:rounded-lg focus:bg-neutral-900 focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-white">
        {t.skipToContent}
      </a>

      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-4">
          <button type="button" className={`${btnGhost} lg:hidden`} onClick={() => setSidebarOpen((v) => !v)} aria-expanded={sidebarOpen} aria-label={t.menu}>
            <List size={20} aria-hidden="true" />
          </button>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-900 text-white" aria-hidden="true">
              <CheckCircle size={24} weight="fill" />
            </span>
            <div>
              <p className="text-xl font-bold leading-7">{t.appName}</p>
              <p className="text-sm font-medium text-neutral-500">{t.appTagline}</p>
            </div>
          </div>
          <div className="ms-auto flex items-center gap-2">
            <label htmlFor="lang" className="sr-only">{t.language}</label>
            <span className="flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 py-2">
              <Globe size={18} aria-hidden="true" />
              <select id="lang" value={lang} onChange={(e) => setLang(e.target.value as Lang)} className="bg-transparent text-sm font-semibold focus:outline-none">
                <option value="en">{t.english}</option>
                <option value="ar">{t.arabic}</option>
              </select>
            </span>
            <button type="button" className={btnPrimary} onClick={() => { setEditing(null); setFormOpen(true) }}>
              <Plus size={18} aria-hidden="true" /> {t.newTask}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 lg:flex-row lg:gap-6 lg:py-6">
        <aside className={`${sidebarOpen ? 'block' : 'hidden'} w-full shrink-0 rounded-2xl border border-neutral-200 bg-white p-4 lg:block lg:w-64`} aria-label={t.projects}>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">{t.projects}</h2>
            <button type="button" className="inline-flex items-center gap-1 rounded-lg px-2 py-2 text-sm font-semibold text-neutral-900 transition-colors duration-300 hover:bg-neutral-100" onClick={() => setProjectForm({ mode: 'new' })}>
              <Plus size={16} aria-hidden="true" /> {t.newProject}
            </button>
          </div>
          <nav className="mt-4 flex flex-col gap-2" aria-label={t.projects}>
            <button type="button" onClick={() => { setProjectFilter('all'); setSidebarOpen(false) }} className={`rounded-lg px-3 py-2 text-start text-sm font-semibold transition-colors duration-300 ${projectFilter === 'all' ? 'bg-neutral-900 text-white' : 'hover:bg-neutral-100'}`}>
              {t.allProjects} ({data.tasks.length})
            </button>
            {data.projects.map((p) => (
              <div key={p.id} className={`flex items-center rounded-lg transition-colors duration-300 ${projectFilter === p.id ? 'bg-neutral-900 text-white' : 'hover:bg-neutral-100'}`}>
                <button type="button" onClick={() => { setProjectFilter(p.id); setSidebarOpen(false) }} className="flex-1 px-3 py-2 text-start text-sm font-semibold">
                  {p.name} ({data.tasks.filter((x) => x.projectId === p.id).length})
                </button>
                <button type="button" onClick={() => setProjectForm({ mode: 'rename', project: p })} aria-label={`${t.rename} ${p.name}`} className="rounded-lg p-2 transition-colors duration-300 hover:bg-neutral-200">
                  <PencilSimple size={16} aria-hidden="true" />
                </button>
                <button type="button" onClick={() => setProjectDelete(p)} aria-label={`${t.delete} ${p.name}`} className="rounded-lg p-2 transition-colors duration-300 hover:bg-neutral-200">
                  <Trash size={16} aria-hidden="true" />
                </button>
              </div>
            ))}
            <button type="button" onClick={() => { setProjectFilter('none'); setSidebarOpen(false) }} className={`rounded-lg px-3 py-2 text-start text-sm font-semibold transition-colors duration-300 ${projectFilter === 'none' ? 'bg-neutral-900 text-white' : 'hover:bg-neutral-100'}`}>
              {t.noProject} ({data.tasks.filter((x) => !x.projectId).length})
            </button>
          </nav>
          <p className="mt-4 rounded-lg bg-neutral-100 p-3 text-xs font-medium text-neutral-500">{t.demoNote}</p>
        </aside>

        <main id="main" className="min-w-0 flex-1">
          <section aria-label={t.statsTotal} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: t.statsTotal, value: stats.total },
              { label: t.statsActive, value: stats.active },
              { label: t.statsCompleted, value: stats.completed },
              { label: t.statsOverdue, value: stats.overdue },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-neutral-200 bg-white p-4">
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="mt-1 text-sm font-medium text-neutral-500">{s.label}</p>
              </div>
            ))}
          </section>

          <section className="mt-4 rounded-2xl border border-neutral-200 bg-white p-4" aria-label={t.searchLabel}>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 rounded-lg border border-neutral-300 px-3 py-2">
                <MagnifyingGlass size={18} aria-hidden="true" className="shrink-0 text-neutral-500" />
                <label htmlFor="search" className="sr-only">{t.searchLabel}</label>
                <input id="search" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t.searchPlaceholder} className="w-full bg-transparent text-sm font-medium focus:outline-none" />
                {search && (
                  <button type="button" onClick={() => setSearch('')} aria-label={t.clearFilters} className="rounded-lg p-1 transition-colors duration-300 hover:bg-neutral-100">
                    <X size={16} aria-hidden="true" />
                  </button>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex rounded-lg border border-neutral-300 p-1" role="group" aria-label={t.filterAll}>
                  {tabs.map((tabItem) => (
                    <button key={tabItem.id} type="button" onClick={() => setTab(tabItem.id)} aria-pressed={tab === tabItem.id} className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors duration-300 ${tab === tabItem.id ? 'bg-neutral-900 text-white' : 'hover:bg-neutral-100'}`}>
                      {tabItem.label}
                    </button>
                  ))}
                </div>
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <FunnelSimple size={18} aria-hidden="true" />
                  <span className="sr-only">{t.filterPriority}</span>
                  <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as 'all' | Priority)} className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-semibold">
                    <option value="all">{t.priorityAll}</option>
                    <option value="low">{t.priorityLow}</option>
                    <option value="medium">{t.priorityMedium}</option>
                    <option value="high">{t.priorityHigh}</option>
                  </select>
                </label>
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <span className="sr-only">{t.sortLabel}</span>
                  <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-semibold">
                    <option value="due">{t.sortDueDate}</option>
                    <option value="priority">{t.sortPriority}</option>
                    <option value="created">{t.sortCreated}</option>
                  </select>
                </label>
                {hasFilters && (
                  <button type="button" onClick={clearFilters} className={btnGhost}>{t.clearFilters}</button>
                )}
              </div>
            </div>
          </section>

          <section className="mt-4" aria-label={t.tasksCount}>
            {visible.length === 0 ? (
              <div className="rounded-2xl border border-neutral-200 bg-white p-8 text-center">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-neutral-100" aria-hidden="true">
                  <CheckCircle size={28} />
                </span>
                <h2 className="mt-4 text-xl font-semibold">{hasFilters ? t.emptySearchTitle : t.emptyTitle}</h2>
                <p className="mx-auto mt-2 max-w-md text-sm font-medium text-neutral-500">{hasFilters ? t.emptySearchBody : t.emptyBody}</p>
                <div className="mt-4 flex justify-center gap-2">
                  {hasFilters ? (
                    <button type="button" className={btnPrimary} onClick={clearFilters}>{t.clearFilters}</button>
                  ) : (
                    <button type="button" className={btnPrimary} onClick={() => { setEditing(null); setFormOpen(true) }}>
                      <Plus size={18} aria-hidden="true" /> {t.newTask}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <ul className="flex flex-col gap-3">
                {visible.map((task) => {
                  const due = dueLabel(task)
                  const done = task.status === 'done'
                  return (
                    <li key={task.id} className="rounded-2xl border border-neutral-200 bg-white p-4 transition-opacity duration-300">
                      <div className="flex items-start gap-3">
                        <button type="button" onClick={() => toggleDone(task)} aria-label={done ? t.markTodo : t.markDone} aria-pressed={done} className="mt-1 shrink-0 rounded-lg p-1 transition-colors duration-300 hover:bg-neutral-100">
                          {done ? <CheckCircle size={24} weight="fill" className="text-neutral-900" aria-hidden="true" /> : <Circle size={24} aria-hidden="true" />}
                        </button>
                        <div className="min-w-0 flex-1">
                          <h3 className={`text-base font-semibold ${done ? 'text-neutral-400 line-through' : ''}`}>{task.title}</h3>
                          {task.notes && <p className="mt-1 text-sm font-medium text-neutral-500">{task.notes}</p>}
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold ${due.overdue ? 'bg-red-100 text-red-800' : 'bg-neutral-100 text-neutral-700'}`}>
                              {due.overdue ? <WarningCircle size={14} aria-hidden="true" /> : <CalendarBlank size={14} aria-hidden="true" />}
                              {due.text}
                            </span>
                            <span className="rounded-lg bg-neutral-100 px-2 py-1 text-xs font-semibold text-neutral-700">{projectName(task.projectId)}</span>
                            <span className={`rounded-lg px-2 py-1 text-xs font-semibold ${task.priority === 'high' ? 'bg-red-100 text-red-800' : task.priority === 'medium' ? 'bg-amber-100 text-amber-800' : 'bg-neutral-100 text-neutral-700'}`}>
                              {task.priority === 'high' ? t.priorityHigh : task.priority === 'medium' ? t.priorityMedium : t.priorityLow}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-lg bg-neutral-100 px-2 py-1 text-xs font-semibold text-neutral-700">
                              <Clock size={14} aria-hidden="true" />
                              {task.status === 'done' ? t.statusDone : task.status === 'inProgress' ? t.statusInProgress : t.statusTodo}
                            </span>
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                          <label className="sr-only" htmlFor={`status-${task.id}`}>{t.status}</label>
                          <select id={`status-${task.id}`} value={task.status} onChange={(e) => changeStatus(task, e.target.value as Status)} className="rounded-lg border border-neutral-300 bg-white px-2 py-2 text-xs font-semibold">
                            <option value="todo">{t.statusTodo}</option>
                            <option value="inProgress">{t.statusInProgress}</option>
                            <option value="done">{t.statusDone}</option>
                          </select>
                          <button type="button" onClick={() => { setEditing(task); setFormOpen(true) }} aria-label={`${t.edit} ${task.title}`} className="rounded-lg border border-neutral-300 p-2 transition-colors duration-300 hover:bg-neutral-100">
                            <PencilSimple size={18} aria-hidden="true" />
                          </button>
                          <button type="button" onClick={() => setDeleteTarget(task)} aria-label={`${t.deleteTask} ${task.title}`} className="rounded-lg border border-neutral-300 p-2 transition-colors duration-300 hover:bg-neutral-100">
                            <Trash size={18} aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          <footer className="mt-4 p-4 text-center">
            <p className="text-xs font-medium text-neutral-500">{t.footerNote} · {t.demoLabel}</p>
          </footer>
        </main>
      </div>

      {notice && (
        <div role="status" className="fixed bottom-4 start-1/2 flex -translate-x-1/2 items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white shadow-lg">
          <Check size={18} aria-hidden="true" /> {notice}
        </div>
      )}

      {formOpen && (
        <TaskForm t={t} projects={data.projects} editing={editing} onClose={() => { setFormOpen(false); setEditing(null) }} onSave={saveTask} />
      )}

      {projectForm && (
        <ProjectForm t={t} initial={projectForm.project?.name ?? ''} title={projectForm.mode === 'rename' ? t.rename : t.newProject} onClose={() => setProjectForm(null)} onSave={saveProject} />
      )}

      {deleteTarget && (
        <ConfirmDialog t={t} title={t.deleteTask} body={t.deleteTaskConfirm} onCancel={() => setDeleteTarget(null)} onConfirm={deleteTask} />
      )}
      {projectDelete && (
        <ConfirmDialog t={t} title={t.delete} body={t.deleteProjectConfirm} onCancel={() => setProjectDelete(null)} onConfirm={deleteProject} />
      )}
    </div>
  )
}

function TaskForm({ t, projects, editing, onClose, onSave }: {
  t: Dict
  projects: Project[]
  editing: Task | null
  onClose: () => void
  onSave: (v: { title: string; notes: string; projectId: string | null; priority: Priority; dueDate: string | null; status: Status }) => void
}) {
  const [title, setTitle] = useState(editing?.title ?? '')
  const [notes, setNotes] = useState(editing?.notes ?? '')
  const [projectId, setProjectId] = useState<string>(editing?.projectId ?? '')
  const [priority, setPriority] = useState<Priority>(editing?.priority ?? 'medium')
  const [dueDate, setDueDate] = useState(editing?.dueDate ?? '')
  const [status, setStatus] = useState<Status>(editing?.status ?? 'todo')
  const [error, setError] = useState('')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) {
      setError(t.titleRequired)
      return
    }
    onSave({ title: title.trim(), notes: notes.trim(), projectId: projectId || null, priority, dueDate: dueDate || null, status })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center" role="dialog" aria-modal="true" aria-label={editing ? t.editTask : t.newTask}>
      <form onSubmit={submit} className="w-full max-w-lg rounded-2xl border border-neutral-200 bg-white p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">{editing ? t.editTask : t.newTask}</h2>
          <button type="button" onClick={onClose} aria-label={t.close} className="rounded-lg p-2 transition-colors duration-300 hover:bg-neutral-100">
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <div className="mt-4 flex flex-col gap-4">
          <div>
            <label htmlFor="task-title" className="text-sm font-semibold">{t.title}</label>
            <input id="task-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t.titlePlaceholder} aria-invalid={!!error} aria-describedby={error ? 'title-error' : undefined} className={`${inputCls} mt-2`} />
            {error && <p id="title-error" role="alert" className="mt-2 text-sm font-medium text-red-700">{error}</p>}
          </div>
          <div>
            <label htmlFor="task-notes" className="text-sm font-semibold">{t.notes}</label>
            <textarea id="task-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t.notesPlaceholder} rows={3} className={`${inputCls} mt-2`} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="task-project" className="text-sm font-semibold">{t.project}</label>
              <select id="task-project" value={projectId} onChange={(e) => setProjectId(e.target.value)} className={`${inputCls} mt-2`}>
                <option value="">{t.noProject}</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="task-priority" className="text-sm font-semibold">{t.priority}</label>
              <select id="task-priority" value={priority} onChange={(e) => setPriority(e.target.value as Priority)} className={`${inputCls} mt-2`}>
                <option value="low">{t.priorityLow}</option>
                <option value="medium">{t.priorityMedium}</option>
                <option value="high">{t.priorityHigh}</option>
              </select>
            </div>
            <div>
              <label htmlFor="task-due" className="text-sm font-semibold">{t.dueDate}</label>
              <input id="task-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={`${inputCls} mt-2`} />
            </div>
            <div>
              <label htmlFor="task-status" className="text-sm font-semibold">{t.status}</label>
              <select id="task-status" value={status} onChange={(e) => setStatus(e.target.value as Status)} className={`${inputCls} mt-2`}>
                <option value="todo">{t.statusTodo}</option>
                <option value="inProgress">{t.statusInProgress}</option>
                <option value="done">{t.statusDone}</option>
              </select>
            </div>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className={btnGhost} onClick={onClose}>{t.cancel}</button>
          <button type="submit" className={btnPrimary}><Check size={18} aria-hidden="true" /> {t.save}</button>
        </div>
      </form>
    </div>
  )
}

function ProjectForm({ t, initial, title, onClose, onSave }: { t: Dict; initial: string; title: string; onClose: () => void; onSave: (name: string) => void }) {
  const [name, setName] = useState(initial)
  const [error, setError] = useState('')
  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError(t.titleRequired)
      return
    }
    onSave(name.trim())
  }
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <form onSubmit={submit} className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">{title}</h2>
          <button type="button" onClick={onClose} aria-label={t.close} className="rounded-lg p-2 transition-colors duration-300 hover:bg-neutral-100">
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <label htmlFor="project-name" className="mt-4 block text-sm font-semibold">{t.projectName}</label>
        <input id="project-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t.projectNamePlaceholder} aria-invalid={!!error} className={`${inputCls} mt-2`} />
        {error && <p role="alert" className="mt-2 text-sm font-medium text-red-700">{error}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className={btnGhost} onClick={onClose}>{t.cancel}</button>
          <button type="submit" className={btnPrimary}>{t.save}</button>
        </div>
      </form>
    </div>
  )
}

function ConfirmDialog({ t, title, body, onCancel, onConfirm }: { t: Dict; title: string; body: string; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-4 sm:p-6">
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="mt-2 text-sm font-medium text-neutral-500">{body}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className={btnGhost} onClick={onCancel}>{t.cancel}</button>
          <button type="button" className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-700 px-3 py-2 text-sm font-semibold text-white transition-colors duration-300 hover:bg-red-800 active:scale-[0.98]" onClick={onConfirm}>
            <Trash size={18} aria-hidden="true" /> {t.confirmDelete}
          </button>
        </div>
      </div>
    </div>
  )
}
