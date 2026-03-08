# Kanban Board

A simple, clean Kanban board built with Next.js 15, TypeScript, and Tailwind CSS.

## Features

- Three columns: To Do, In Progress, Done
- Drag-and-drop task management using native HTML5 drag-and-drop API
- Tasks persist in localStorage (survive page refresh)
- Read initial tasks from AUTONOMOUS.md backlog automatically
- Add new tasks with input field
- Responsive design (works on mobile and desktop)
- Clean, minimal UI

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Drag-and-drop:** Native HTML5 API (no external dependencies)

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn

### Installation

1. Install dependencies:

```bash
npm install
# or
yarn install
```

2. Run the development server:

```bash
npm run dev
# or
yarn dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Production Build

```bash
# Build the app
npm run build

# Start the production server
npm start
```

## Usage

- **Move tasks:** Drag and drop task cards between columns
- **Add task:** Type in the input field and click "Add Task" or press Enter
- **Persistence:** Your task layout is automatically saved to localStorage

## Project Structure

```
kanban/
├── app/
│   ├── globals.css      # Global styles with Tailwind
│   ├── layout.tsx       # Root layout
│   └── page.tsx         # Main page component
├── components/
│   ├── KanbanBoard.tsx  # Main board component with state/logic
│   └── TaskCard.tsx     # Individual task card component
├── package.json
├── tailwind.config.js
├── tsconfig.json
├── next.config.js
└── README.md
```

## Notes

- The initial tasks are loaded from AUTONOMOUS.md in the parent workspace
- Task positions are stored in browser localStorage under the key `kanban-tasks`
- No backend or database required - fully client-side
