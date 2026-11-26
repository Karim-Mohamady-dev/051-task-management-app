# Taskflow

A functional task manager. Create tasks, group them into projects, set a priority and a due date, and keep track of what is done, active and overdue. All data stays in the browser.

## Run

```bash
npm install
npm run dev
```

Open the address shown in the terminal, usually http://localhost:5173

## Build

```bash
npm run build
npm run preview
```

## Deploy on Vercel

Import this folder as a Vercel project, or deploy from the command line:

```bash
npm run build
vercel deploy
```

No environment variables are needed.

## Features

- Create tasks with title, notes, project, priority, due date and status
- Edit tasks in a modal, with title validation
- Delete tasks with a confirm step
- Toggle a task complete, or change its status from the task card
- Create, rename and delete projects. Deleting a project moves its tasks to no project
- Filter by All, Active or Completed, by priority and by project
- Search by title or notes
- Sort by due date, priority or creation date
- Stats header with total, active, completed and overdue counts, computed from real data
- Overdue tasks highlighted when the due date has passed and the task is not done
- Due dates shown in the active language, with today and tomorrow labels
- Full Arabic (RTL) and English (LTR) interface with a language switcher in the header
- Responsive layout. The project sidebar becomes a collapsible panel on mobile
- Skip to content link, labelled controls, visible focus rings and keyboard accessible dialogs

## Data model

```ts
type Priority = 'low' | 'medium' | 'high'
type Status = 'todo' | 'inProgress' | 'done'

interface Project { id: string; name: string }

interface Task {
  id: string
  title: string
  notes: string
  projectId: string | null
  priority: Priority
  dueDate: string | null
  status: Status
  createdAt: number
}
```

## Storage

| Key | Purpose |
| --- | --- |
| `taskflow-data` | Tasks, projects and the seeded flag, saved as JSON in localStorage |
| `taskflow-lang` | Language preference, `en` or `ar`, saved in localStorage |

On first run the app seeds five demo tasks in three demo projects. They are labelled as demo data in the interface and can be edited or deleted like any other task.

## Internationalisation

All interface strings live in `locales/en/common.json` and `locales/ar/common.json`. Components read strings from those files only, with no hardcoded interface text in components. Switching language sets `lang` and `dir` on the `<html>` element and saves the choice under `taskflow-lang`. Dates use `Intl.DateTimeFormat` with the active locale. Typography uses Manrope for Latin text with the system Arabic fallback.

## Design

Manrope only, flat light neutral surfaces, Phosphor icons, motion curve `cubic-bezier(0.22,1,0.36,1)`, duration 500 for layout and 300 for hover colour and opacity, reduced motion respected.

## Known gaps

- No user accounts, sharing or sync. Data lives in one browser only
- No reminders or notifications
- No recurring tasks, subtasks or file attachments
- Demo tasks use dates relative to the first run, so their overdue state depends on when the app is first opened
