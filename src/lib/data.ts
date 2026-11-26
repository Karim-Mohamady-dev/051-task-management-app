import en from '../../locales/en/common.json'
import ar from '../../locales/ar/common.json'

export type Lang = 'en' | 'ar'
export type Dict = typeof en
export const dicts: Record<Lang, Dict> = { en, ar }
export const locales: Record<Lang, string> = { en: 'en-US', ar: 'ar-EG' }

export type Priority = 'low' | 'medium' | 'high'
export type Status = 'todo' | 'inProgress' | 'done'

export interface Project {
  id: string
  name: string
}

export interface Task {
  id: string
  title: string
  notes: string
  projectId: string | null
  priority: Priority
  dueDate: string | null
  status: Status
  createdAt: number
}

export interface StoreData {
  tasks: Task[]
  projects: Project[]
  seeded: boolean
}

export const DATA_KEY = 'taskflow-data'
export const LANG_KEY = 'taskflow-lang'

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

function iso(offsetDays: number): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}

export function seedData(): StoreData {
  const now = Date.now()
  const projects: Project[] = [
    { id: 'p-home', name: 'Home' },
    { id: 'p-work', name: 'Work' },
    { id: 'p-study', name: 'Study' },
  ]
  const tasks: Task[] = [
    { id: uid(), title: 'Buy groceries for the week', notes: 'Milk, bread, vegetables and fruit', projectId: 'p-home', priority: 'medium', dueDate: iso(-1), status: 'todo', createdAt: now - 400000 },
    { id: uid(), title: 'Finish the monthly report', notes: 'Add the sales summary and the charts', projectId: 'p-work', priority: 'high', dueDate: iso(1), status: 'inProgress', createdAt: now - 300000 },
    { id: uid(), title: 'Read chapter three', notes: 'Take notes on the key ideas', projectId: 'p-study', priority: 'low', dueDate: iso(3), status: 'todo', createdAt: now - 200000 },
    { id: uid(), title: 'Call the plumber', notes: 'Fix the kitchen tap', projectId: 'p-home', priority: 'medium', dueDate: iso(0), status: 'todo', createdAt: now - 100000 },
    { id: uid(), title: 'Plan the team meeting', notes: 'Share the agenda before Thursday', projectId: 'p-work', priority: 'high', dueDate: iso(2), status: 'done', createdAt: now - 50000 },
  ]
  return { tasks, projects, seeded: true }
}

export function loadData(): StoreData {
  try {
    const raw = localStorage.getItem(DATA_KEY)
    if (!raw) return seedData()
    const parsed = JSON.parse(raw) as StoreData
    if (!Array.isArray(parsed.tasks) || !Array.isArray(parsed.projects)) return seedData()
    return parsed
  } catch {
    return seedData()
  }
}

export function loadLang(): Lang {
  return localStorage.getItem(LANG_KEY) === 'ar' ? 'ar' : 'en'
}
