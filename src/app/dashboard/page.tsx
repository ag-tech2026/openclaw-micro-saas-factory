'use client';

import { useState, useMemo } from 'react';
import { OnboardingTour, TourReplayButton, OnboardingStep, useOnboardingTour } from '@/components/onboarding';

/**
 * Dashboard Content Component
 * Contains all UI and uses the tour context.
 */
function DashboardContent() {
  const { start, isCompleted } = useOnboardingTour();

  // Sample data for Kanban board
  const [tasks, setTasks] = useState([
    { id: 1, title: 'Design new landing page', column: 'todo' },
    { id: 2, title: 'Set up autonomous agent', column: 'inprogress' },
    { id: 3, title: 'Review analytics report', column: 'done' },
    { id: 4, title: 'Update user documentation', column: 'todo' },
    { id: 5, title: 'Optimize database queries', column: 'inprogress' },
    { id: 6, title: 'Fix login bug', column: 'done' },
  ]);

  const moveTask = (taskId: number, newColumn: string) => {
    setTasks(tasks.map(task => 
      task.id === taskId ? { ...task, column: newColumn } : task
    ));
  };

  const columns = [
    { id: 'todo', title: 'To Do', color: 'bg-gray-200 dark:bg-gray-700' },
    { id: 'inprogress', title: 'In Progress', color: 'bg-blue-100 dark:bg-blue-900/30' },
    { id: 'done', title: 'Done', color: 'bg-green-100 dark:bg-green-900/30' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header 
        id="dashboard-header"
        className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                OpenClaw
              </h1>
              <nav className="hidden md:flex items-center gap-6">
                <a href="#" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Dashboard
                </a>
                <a href="#" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Tasks
                </a>
                <a href="#" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Analytics
                </a>
                <a href="#" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Settings
                </a>
              </nav>
            </div>
            <div className="flex items-center gap-3">
              {!isCompleted && (
                <button
                  onClick={() => start()}
                  className="text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-3 py-2 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                >
                  Start Tour
                </button>
              )}
              <TourReplayButton tourId="main-app-tour" id="replay-tour-btn" />
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold">
                A
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Dashboard
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Manage your tasks and track progress
          </p>
        </div>

        {/* Kanban Board */}
        <section 
          id="kanban-board"
          className="mb-10"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Kanban Board
            </h3>
            <button className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
              View All
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {columns.map(column => (
              <div 
                key={column.id}
                className={`${column.color} rounded-xl p-4 border border-gray-200 dark:border-gray-700`}
              >
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    {column.title}
                  </h4>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {tasks.filter(t => t.column === column.id).length}
                  </span>
                </div>
                <div className="space-y-3">
                  {tasks
                    .filter(task => task.column === column.id)
                    .map(task => (
                      <div
                        key={task.id}
                        className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 cursor-move hover:shadow-md transition-shadow"
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', task.id.toString());
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          const draggedId = parseInt(e.dataTransfer.getData('text/plain'));
                          if (draggedId === task.id) {
                            moveTask(task.id, column.id);
                          }
                        }}
                      >
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {task.title}
                        </p>
                        <div className="mt-3 flex items-center gap-2">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            ID: #{task.id}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Autonomous Tasks */}
        <section 
          id="autonomous-tasks"
          className="mb-10"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Autonomous Tasks 🤖
            </h3>
            <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
              + New Autonomous Task
            </button>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Task
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Agent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Progress
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      Generate weekly report
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Runs every Monday @ 9:00 AM
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      Research Agent
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">
                      Running
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: '65%' }}></div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button className="text-blue-600 dark:text-blue-400 hover:underline mr-3">
                      Pause
                    </button>
                    <button className="text-gray-600 dark:text-gray-400 hover:underline">
                      Logs
                    </button>
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      Customer support auto-reply
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Trigger: new support email
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      Support Agent
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                      Idle
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-gray-400 rounded-full" style={{ width: '0%' }}></div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button className="text-blue-600 dark:text-blue-400 hover:underline mr-3">
                      Configure
                    </button>
                    <button className="text-green-600 dark:text-green-400 hover:underline mr-3">
                      Start
                    </button>
                    <button className="text-gray-600 dark:text-gray-400 hover:underline">
                      Logs
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Upgrade CTA */}
        <section 
          id="upgrade-cta"
          className="mb-10"
        >
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white text-center">
            <h3 className="text-2xl font-bold mb-3">
              Ready to supercharge your workflow?
            </h3>
            <p className="text-blue-100 mb-6 max-w-md mx-auto">
              Upgrade to Pro to unlock unlimited autonomous tasks, AI-powered insights, priority support, and custom integrations.
            </p>
            <div className="flex justify-center gap-4">
              <button className="px-6 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors">
                Upgrade Now
              </button>
              <button className="px-6 py-3 border-2 border-white text-white font-semibold rounded-lg hover:bg-white/10 transition-colors">
                Compare Plans
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              © 2024 OpenClaw. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <TourReplayButton tourId="main-app-tour" />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

/**
 * Main Dashboard Page
 * Wraps content with OnboardingTour provider.
 */
export default function DashboardPage() {
  const tourId = 'main-app-tour';

  // Define tour steps (using useMemo for stability)
  const tourSteps = useMemo<OnboardingStep[]>(() => [
    {
      target: '#dashboard-header',
      content: (
        <div>
          <h4 className="text-lg font-bold mb-2">Welcome to OpenClaw! 👋</h4>
          <p>This is your command center. From here you can manage all your tasks, track progress, and automate workflows.</p>
        </div>
      ),
      placement: 'bottom' as const,
      disableBeacon: true,
    },
    {
      target: '#kanban-board',
      content: (
        <div>
          <h4 className="text-lg font-bold mb-2">Your Kanban Board 📋</h4>
          <p>Visualize your workflow with drag-and-drop cards. Move tasks between columns as you work. Click a card to add details, assign to team members, or set priorities.</p>
        </div>
      ),
      placement: 'right' as const,
    },
    {
      target: '#autonomous-tasks',
      content: (
        <div>
          <h4 className="text-lg font-bold mb-2">Autonomous Tasks 🤖</h4>
          <p>Tasks marked as autonomous will be automatically executed by AI agents. Monitor their progress in real-time and adjust parameters as needed.</p>
        </div>
      ),
      placement: 'left' as const,
    },
    {
      target: '#upgrade-cta',
      content: (
        <div>
          <h4 className="text-lg font-bold mb-2">Unlock More Power ⚡</h4>
          <p>Upgrade to Pro to unlock unlimited autonomous tasks, AI-powered insights, priority support, and custom integrations.</p>
        </div>
      ),
      placement: 'top' as const,
    },
    {
      target: '#replay-tour-btn',
      content: (
        <div>
          <h4 className="text-lg font-bold mb-2">Need Help? 🤔</h4>
          <p>You can replay this tour anytime by clicking the replay button in the header. We're always here to help you get the most out of OpenClaw!</p>
        </div>
      ),
      placement: 'bottom' as const,
    },
  ], []);

  const tourConfig = {
    tourId,
    steps: tourSteps,
    onComplete: () => {
      console.log('Onboarding tour completed!');
      if (typeof window !== 'undefined') {
        window?.trackEvent?.('tour_completed', { tourId });
      }
    },
    onSkip: () => {
      console.log('Onboarding tour skipped');
      if (typeof window !== 'undefined') {
        window?.trackEvent?.('tour_skipped', { tourId });
      }
    },
    autoStartOnMount: true,
  };

  return (
    <OnboardingTour config={tourConfig}>
      <DashboardContent />
    </OnboardingTour>
  );
}
