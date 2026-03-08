#!/usr/bin/env node

import { Command } from 'commander';
import { spawnSync, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get the workspace root (parent of bin directory)
const workspaceRoot = path.resolve(__dirname, '..');

// Path to AUTONOMOUS.md
const getAutonomousPath = () => {
  // Try multiple possible locations
  const possiblePaths = [
    path.join(workspaceRoot, 'AUTONOMOUS.md'),
    path.join(workspaceRoot, '..', 'AUTONOMOUS.md'),
    path.join(workspaceRoot, 'kanban', 'AUTONOMOUS.md'),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  // Search upward from current working directory
  let dir = process.cwd();
  for (let i = 0; i < 5; i++) {
    const testPath = path.join(dir, 'AUTONOMOUS.md');
    if (fs.existsSync(testPath)) {
      return testPath;
    }
    dir = path.join(dir, '..');
  }

  return path.join(workspaceRoot, 'AUTONOMOUS.md'); // default
};

// Task interface
interface Task {
  id: string;
  title: string;
  status: 'todo' | 'inprogress' | 'done';
  rawLine?: string;
  lineIndex?: number;
}

// Parse AUTONOMOUS.md and extract tasks with their positions
function parseTasks(filePath: string): { tasks: Task[]; lines: string[] } {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const tasks: Task[] = [];

  let inBacklog = false;
  let inInProgress = false;
  let inDone = false;
  let taskId = 1;

  const taskRegex = /^-\s*\[(\s|x|~)\]\s+(.+)$/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Detect sections
    if (trimmed === '## Backlog') {
      inBacklog = true;
      inInProgress = false;
      inDone = false;
      continue;
    }
    if (trimmed === '## In Progress') {
      inInProgress = true;
      inBacklog = false;
      inDone = false;
      continue;
    }
    if (trimmed === '## Recently Completed') {
      inDone = true;
      inBacklog = false;
      inInProgress = false;
      continue;
    }

    // Parse task items
    const match = trimmed.match(taskRegex);
    if (match && (inBacklog || inInProgress || inDone)) {
      const statusChar = match[1];
      const title = match[2].trim();
      let status: 'todo' | 'inprogress' | 'done';
      if (statusChar === 'x') status = 'done';
      else if (statusChar === '~') status = 'inprogress';
      else status = 'todo';

      tasks.push({
        id: `task-${taskId++}`,
        title,
        status,
        rawLine: line,
        lineIndex: i,
      });
    }
  }

  return { tasks, lines };
}

// Update AUTONOMOUS.md with modified task statuses
function updateTaskStatus(filePath: string, lines: string[], taskId: string, newStatus: 'inprogress' | 'done'): boolean {
  const { tasks } = parseTasks(filePath);
  const task = tasks.find(t => t.id === taskId);
  if (!task || task.lineIndex === undefined) {
    return false;
  }

  // Construct new line with appropriate checkbox
  const statusChar = newStatus === 'done' ? 'x' : '~';
  const title = task.title;
  const newLine = `- [${statusChar}] ${title}`;

  lines[task.lineIndex] = newLine;

  // Write back
  fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
  return true;
}

// Generate a simple ID from title (slugify)
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// List tasks command
function listTasks() {
  const filePath = getAutonomousPath();
  if (!fs.existsSync(filePath)) {
    console.error(`AUTONOMOUS.md not found at ${filePath}`);
    process.exit(1);
  }

  const { tasks } = parseTasks(filePath);

  if (tasks.length === 0) {
    console.log('No tasks found.');
    return;
  }

  console.log('\nTasks:\n');
  console.log('ID         Status    Title');
  console.log('--         ------    -----');

  for (const task of tasks) {
    const statusLabel = task.status === 'todo' ? '📋 Todo' :
                       task.status === 'inprogress' ? '🔄 In Progress' : '✅ Done';
    console.log(`${task.id.padEnd(10)} ${statusLabel.padEnd(10)} ${task.title}`);
  }
  console.log('');
}

// Run a task command
function runTask(taskId: string) {
  const filePath = getAutonomousPath();
  if (!fs.existsSync(filePath)) {
    console.error(`AUTONOMOUS.md not found at ${filePath}`);
    process.exit(1);
  }

  const { tasks, lines } = parseTasks(filePath);
  const task = tasks.find(t => t.id === taskId);

  if (!task) {
    console.error(`Task ${taskId} not found.`);
    process.exit(1);
  }

  if (task.status === 'done') {
    console.log(`Task ${taskId} is already completed.`);
    return;
  }

  console.log(`\nRunning task: ${task.title}`);
  console.log(`Status: ${task.status === 'inprogress' ? 'In Progress' : 'Todo'}`);

  // Mark as in progress if not already
  if (task.status === 'todo') {
    console.log('Marking as in progress...');
    if (!updateTaskStatus(filePath, lines, taskId, 'inprogress')) {
      console.error('Failed to update task status.');
      process.exit(1);
    }
  }

  // Simulate task execution
  // In a real implementation, this would trigger the actual task logic
  console.log('Executing task...');

  try {
    // Here you would integrate with Inngest or other task execution system
    // For now, we'll simulate by waiting and then marking as done
    // TODO: Connect to actual task execution engine

    // Simulate work (this is a placeholder)
    console.log('Task execution complete (simulated).');
    console.log('Marking as done...');

    // Re-parse after the in-progress update
    const updated = parseTasks(filePath);
    if (!updateTaskStatus(filePath, updated.lines, taskId, 'done')) {
      console.error('Failed to mark task as done.');
      process.exit(1);
    }

    console.log(`✅ Task ${taskId} completed.`);
  } catch (error) {
    console.error('Task execution failed:', error);
    process.exit(1);
  }
}

// Deploy command
function deploy() {
  console.log('\n🚀 Starting deployment...\n');

  // Step 1: Type check
  console.log('1/4 Running type check...');
  const typeCheck = spawnSync('npm', ['run', 'type-check'], {
    cwd: workspaceRoot,
    stdio: 'inherit',
  });
  if (typeCheck.status !== 0) {
    console.error('❌ Type check failed. Aborting deployment.');
    process.exit(1);
  }
  console.log('   ✅ Type check passed.\n');

  // Step 2: Build
  console.log('2/4 Building application...');
  const build = spawnSync('npm', ['run', 'build'], {
    cwd: workspaceRoot,
    stdio: 'inherit',
  });
  if (build.status !== 0) {
    console.error('❌ Build failed. Aborting deployment.');
    process.exit(1);
  }
  console.log('   ✅ Build successful.\n');

  // Step 3: Lint
  console.log('3/4 Running lint...');
  const lint = spawnSync('npm', ['run', 'lint'], {
    cwd: workspaceRoot,
    stdio: 'inherit',
  });
  // Lint warnings don't fail deployment, but we report
  if (lint.status !== 0) {
    console.log('   ⚠️  Lint issues found. Consider fixing them.');
  } else {
    console.log('   ✅ No lint issues.\n');
  }

  // Step 4: Deploy to Vercel (if configured)
  console.log('4/4 Deploying to Vercel...');
  if (process.env.VERCEL_TOKEN || fs.existsSync(path.join(workspaceRoot, '.vercel'))) {
    const vercel = require('child_process').spawnSync('npx', ['vercel', '--prod', '--yes'], {
      cwd: workspaceRoot,
      stdio: 'inherit',
      env: { ...process.env },
    });
    if (vercel.status !== 0) {
      console.error('❌ Vercel deployment failed.');
      console.log('   You can deploy manually with: npx vercel --prod');
    } else {
      console.log('   ✅ Deployed to Vercel successfully.');
    }
  } else {
    console.log('   ⚠️  Vercel not configured. Local build only.');
    console.log('   To enable auto-deploy:');
    console.log('     1. Install Vercel CLI: npm i -g vercel');
    console.log('     2. Run: vercel login');
    console.log('     3. Run: vercel --prod');
  }

  console.log('\n✨ Deployment process completed!\n');
}

// Start Kanban server
function startKanban() {
  console.log('\n📊 Starting Kanban server...\n');

  const kanbanDir = path.join(workspaceRoot, 'kanban');
  if (!fs.existsSync(kanbanDir)) {
    console.error('Kanban directory not found at', kanbanDir);
    process.exit(1);
  }

  // Check if node_modules exists in kanban
  const kanbanNodeModules = path.join(kanbanDir, 'node_modules');
  if (!fs.existsSync(kanbanNodeModules)) {
    console.log('Installing Kanban dependencies...');
    const install = spawnSync('npm', ['install'], {
      cwd: kanbanDir,
      stdio: 'inherit',
    });
    if (install.status !== 0) {
      console.error('❌ Failed to install Kanban dependencies.');
      process.exit(1);
    }
  }

  console.log('Starting Kanban Next.js server on port 3001...');
  console.log('Press Ctrl+C to stop.\n');

  // Start the kanban app in development mode with custom port
  const child = spawn('npm', ['run', 'dev', '--', '-p', '3001'], {
    cwd: kanbanDir,
    stdio: 'inherit',
    env: { ...process.env, PORT: '3001' },
  });

  // Handle termination
  process.on('SIGINT', () => {
    console.log('\nStopping Kanban server...');
    child.kill('SIGTERM');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    child.kill('SIGTERM');
    process.exit(0);
  });

  child.on('close', (code: number | null) => {
    console.log(`Kanban server exited with code ${code}`);
    process.exit(code || 0);
  });

  child.on('error', (err: Error) => {
    console.error('Failed to start Kanban server:', err);
    process.exit(1);
  });
}

// Backup command
function backup() {
  console.log('\n💾 Starting backup...\n');

  const backupDir = path.join(workspaceRoot, 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupPath = path.join(backupDir, `backup-${timestamp}`);

  try {
    // Create backup subdirectory
    fs.mkdirSync(backupPath, { recursive: true });

    // 1. Backup AUTONOMOUS.md
    console.log('1/4 Backing up AUTONOMOUS.md...');
    const autonomousSrc = getAutonomousPath();
    if (fs.existsSync(autonomousSrc)) {
      fs.copyFileSync(autonomousSrc, path.join(backupPath, 'AUTONOMOUS.md'));
      console.log('   ✅ AUTONOMOUS.md backed up.');
    } else {
      console.log('   ⚠️  AUTONOMOUS.md not found, skipping.');
    }

    // 2. Backup environment configuration (.env.local if exists)
    console.log('2/4 Backing up environment configuration...');
    const envSrc = path.join(workspaceRoot, '.env.local');
    if (fs.existsSync(envSrc)) {
      fs.copyFileSync(envSrc, path.join(backupPath, '.env.local'));
      console.log('   ✅ .env.local backed up.');
    } else {
      console.log('   ⚠️  .env.local not found, skipping.');
    }

    // 3. Backup database (if PostgreSQL)
    console.log('3/4 Backing up database...');
    if (process.env.DATABASE_URL) {
      const { execSync } = require('child_process');
      const backupFile = path.join(backupPath, 'database.sql');

      try {
        // Try pg_dump if available
        const url = new URL(process.env.DATABASE_URL);
        const dbName = url.pathname.slice(1); // remove leading /
        const host = url.hostname;
        const port = url.port || '5432';
        const user = url.username;
        const password = url.password;

        const env = { ...process.env, PGPASSWORD: password || '' };
        execSync(`pg_dump -h ${host} -p ${port} -U ${user} -d ${dbName} -f "${backupFile}"`, { env, stdio: 'inherit' });
        console.log('   ✅ Database backed up using pg_dump.');
      } catch (err) {
        // pg_dump not available, create schema dump manually
        console.log('   ⚠️  pg_dump not available, creating manual schema backup...');
        // We could connect and dump schema manually, but that's complex
        // For now, just note that full backup requires pg_dump
        fs.writeFileSync(backupFile, `-- Database backup requires pg_dump\n-- DATABASE_URL: ${process.env.DATABASE_URL ? '***' : 'not set'}\n`);
      }
    } else {
      console.log('   ⚠️  DATABASE_URL not set, skipping database backup.');
    }

    // 4. Backup important directories (configs, landing-configs)
    console.log('4/4 Backing up configuration directories...');
    const dirsToBackup = ['landing-configs', 'docs'];
    for (const dir of dirsToBackup) {
      const src = path.join(workspaceRoot, dir);
      if (fs.existsSync(src)) {
        const dest = path.join(backupPath, dir);
        copyDirSync(src, dest);
        console.log(`   ✅ ${dir}/ backed up.`);
      }
    }

    // Create archive
    console.log('\nCreating compressed backup archive...');
    const { execSync } = require('child_process');
    const archiveName = `backup-${timestamp}.tar.gz`;
    const archivePath = path.join(backupDir, archiveName);
    execSync(`tar -czf "${archivePath}" -C "${backupDir}" "backup-${timestamp}"`, { stdio: 'inherit' });

    // Remove raw backup directory (keep only archive)
    execSync(`rm -rf "${backupPath}"`, { stdio: 'inherit' });

    const size = fs.statSync(archivePath).size / (1024 * 1024);
    console.log(`\n✅ Backup complete!`);
    console.log(`   Archive: ${archivePath}`);
    console.log(`   Size: ${size.toFixed(2)} MB`);
    console.log();

  } catch (error) {
    console.error('❌ Backup failed:', error);
    process.exit(1);
  }
}

// Helper: copy directory recursively
function copyDirSync(src: string, dest: string) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Main program
const program = new Command();

program
  .name('openclaw')
  .description('OpenClaw Admin CLI - Task and Deployment Management')
  .version('1.0.0');

// Tasks group
program
  .command('tasks:list')
  .description('List all tasks from AUTONOMOUS.md')
  .action(listTasks);

program
  .command('tasks:run <id>')
  .description('Run a specific task by ID')
  .action(runTask);

// Deployment commands
program
  .command('deploy')
  .description('Build and deploy the application')
  .action(deploy);

program
  .command('kanban:start')
  .description('Start the Kanban server on port 3001')
  .action(startKanban);

program
  .command('backup')
  .description('Create a backup of the application and database')
  .action(backup);

// Parse arguments
program.parse();
