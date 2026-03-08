'use client';

import KanbanBoard from '@/components/KanbanBoard';
import EmailCapture from '@/components/EmailCapture';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">OpenClaw MVP Factory</h1>
          <nav className="flex items-center gap-4">
            <Link
              href="/admin"
              className="text-gray-600 hover:text-gray-900 font-medium"
            >
              Admin Dashboard
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-12">
        {/* Newsletter Signup Section */}
        <section className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-lg p-8 text-white">
          <div className="max-w-2xl mx-auto text-center space-y-4">
            <h2 className="text-3xl font-bold">Stay in the Loop</h2>
            <p className="text-lg opacity-90">
              Get weekly updates on new MVPs, insights, and micro-SaaS inspiration.
            </p>
            <div className="py-4">
              <EmailCapture source="homepage" />
            </div>
            <p className="text-sm opacity-75">
              No spam, unsubscribe anytime.
            </p>
          </div>
        </section>

        {/* Kanban Board */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Autonomous Task Board</h2>
          <KanbanBoard />
        </section>
      </main>
    </div>
  );
}
