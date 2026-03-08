import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface Task {
  id: string;
  content: string;
  status: 'todo' | 'inprogress' | 'done';
}

function parseTasksFromAutonomous(content: string): Task[] {
  const lines = content.split('\n');
  const tasks: Task[] = [];
  let id = 1;

  const taskRegex = /^-\s*\[(\s|x|~)\]\s+(.+)$/;

  for (const line of lines) {
    const match = line.match(taskRegex);
    if (match) {
      const statusChar = match[1];
      const text = match[2].trim();
      let status: 'todo' | 'inprogress' | 'done';
      if (statusChar === 'x') status = 'done';
      else if (statusChar === '~') status = 'inprogress';
      else status = 'todo';

      tasks.push({
        id: `task-${id++}`,
        content: text,
        status,
      });
    }
  }

  return tasks;
}

export async function GET() {
  try {
    // Find AUTONOMOUS.md by searching upward from current directory
    let dir = process.cwd();
    let autonomousPath: string | null = null;
    for (let i = 0; i < 5; i++) {
      const testPath = path.join(dir, 'AUTONOMOUS.md');
      if (fs.existsSync(testPath)) {
        autonomousPath = testPath;
        break;
      }
      dir = path.join(dir, '..');
    }
    if (!autonomousPath) {
      throw new Error('AUTONOMOUS.md not found in parent directories');
    }
    const fileContent = fs.readFileSync(autonomousPath, 'utf-8');
    const tasks = parseTasksFromAutonomous(fileContent);
    const mtime = fs.statSync(autonomousPath).mtimeMs;

    return NextResponse.json({ tasks, mtime });
  } catch (error) {
    console.error('Failed to read AUTONOMOUS.md:', error);
    return NextResponse.json({ tasks: [], mtime: null }, { status: 500 });
  }
}
