import { NextResponse } from 'next/server';

interface Task {
  id: string;
  title: string;
  status: 'todo' | 'inprogress' | 'done';
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseAutonomous(content: string): Task[] {
  const tasks: Task[] = [];
  const lines = content.split('\n');

  let currentSection: 'backlog' | 'inprogress' | 'done' | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    // Detect sections
    if (trimmed === '## Backlog') {
      currentSection = 'backlog';
      continue;
    }
    if (trimmed === '## In Progress') {
      currentSection = 'inprogress';
      continue;
    }
    if (trimmed === '## Recently Completed') {
      currentSection = 'done';
      continue;
    }

    // Parse task items in lists
    if (currentSection && trimmed.startsWith('- [')) {
      const match = trimmed.match(/^-\s*\[(.)\]\s*(.+)$/);
      if (match) {
        const statusChar = match[1];
        const title = match[2].trim();
        let status: 'todo' | 'inprogress' | 'done';
        if (statusChar === ' ') status = 'todo';
        else if (statusChar === '~') status = 'inprogress';
        else if (statusChar === 'x') status = 'done';
        else continue;

        tasks.push({
          id: slugify(title),
          title,
          status,
        });
      }
    }
  }

  return tasks;
}

export async function GET() {
  try {
    const content = await Deno.readTextFile('/data/workspace/AUTONOMOUS.md');
    const tasks = parseAutonomous(content);
    return NextResponse.json({ tasks });
  } catch (error) {
    console.error('Failed to read AUTONOMOUS.md:', error);
    return NextResponse.json({ tasks: [] }, { status: 500 });
  }
}
