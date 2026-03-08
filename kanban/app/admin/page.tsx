'use client';

import { useState, useEffect } from 'react';
import { Trash2, Mail, Users, Activity, CheckCircle, XCircle } from 'lucide-react';

interface Subscriber {
  id: number;
  email: string;
  subscribed_at: string;
  source?: string;
  unsubscribed_at: string | null;
}

interface Stats {
  total: number;
  active: number;
  welcomed: number;
}

export default function AdminPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'unsubscribed'>('all');

  const fetchData = async () => {
    try {
      const [subsRes, statsRes] = await Promise.all([
        fetch('/api/admin/subscribers'),
        fetch('/api/admin/stats'),
      ]);

      if (subsRes.ok) {
        const data = await subsRes.json();
        setSubscribers(data.subscribers);
      }
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const sendNewsletter = async () => {
    if (!confirm('Send weekly digest to all active subscribers?')) return;

    setSending(true);
    try {
      const response = await fetch('/api/admin/newsletter', { method: 'POST' });
      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: `Newsletter sent! ${data.success} succeeded, ${data.failed} failed.` });
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to send newsletter' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error while sending newsletter' });
    } finally {
      setSending(false);
    }
  };

  const filteredSubscribers = subscribers.filter((sub) => {
    if (filter === 'active') return sub.unsubscribed_at === null;
    if (filter === 'unsubscribed') return sub.unsubscribed_at !== null;
    return true;
  });

  const clearMessage = () => setMessage(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Newsletter Admin</h1>

        {message && (
          <div
            className={`mb-6 p-4 rounded-lg flex items-center justify-between ${
              message.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {message.type === 'success' ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <XCircle className="w-5 h-5" />
              )}
              <span>{message.text}</span>
            </div>
            <button onClick={clearMessage} className="text-sm underline">
              Dismiss
            </button>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-4">
              <Users className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Total Subscribers</p>
                <p className="text-2xl font-bold">{stats?.total || 0}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-4">
              <Activity className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Active</p>
                <p className="text-2xl font-bold">{stats?.active || 0}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-4">
              <Mail className="w-8 h-8 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Welcomed</p>
                <p className="text-2xl font-bold">{stats?.welcomed || 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Newsletter Actions */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Newsletter</h2>
          <p className="text-gray-600 mb-4">
            Send the weekly digest featuring new MVPs to all active subscribers.
          </p>
          <button
            onClick={sendNewsletter}
            disabled={sending}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {sending ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="w-4 h-4" />
                Send Weekly Digest
              </>
            )}
          </button>
        </div>

        {/* Subscriber List */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-xl font-semibold">Subscribers</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1 rounded ${filter === 'all' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}
              >
                All ({subscribers.length})
              </button>
              <button
                onClick={() => setFilter('active')}
                className={`px-3 py-1 rounded ${filter === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}
              >
                Active ({stats?.active || 0})
              </button>
              <button
                onClick={() => setFilter('unsubscribed')}
                className={`px-3 py-1 rounded ${filter === 'unsubscribed' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}
              >
                Unsubscribed ({subscribers.length - (stats?.active || 0)})
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Subscribed At
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Source
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredSubscribers.map((sub) => (
                  <tr key={sub.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {sub.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(sub.subscribed_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {sub.source || 'website'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {sub.unsubscribed_at ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          <XCircle className="w-3 h-3" />
                          Unsubscribed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3" />
                          Active
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredSubscribers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                      No subscribers found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
