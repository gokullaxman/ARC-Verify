'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCheck,
  ExternalLink,
  Clock,
  Filter
} from 'lucide-react';
import { AppNotification } from '@/types';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'ALL' | 'UNREAD' | 'ACTION_REQUIRED'>('ALL');

  useEffect(() => {
    fetchNotifications();
  }, []);

  async function fetchNotifications() {
    try {
      setLoading(true);
      const res = await fetch('/api/notifications');
      const data = await res.json();
      if (data.success) {
        setNotifications(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleMarkRead = async (id: string) => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_read', id })
      });
      if (res.ok) {
        setNotifications(notifications.map(n => (n.id === id ? { ...n, read: true } : n)));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_all_read' })
      });
      if (res.ok) {
        setNotifications(notifications.map(n => ({ ...n, read: true })));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const filteredList = notifications.filter(n => {
    if (filterType === 'UNREAD') return !n.read;
    if (filterType === 'ACTION_REQUIRED') return n.type === 'WARNING' || n.type === 'ERROR';
    return true;
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'SUCCESS':
        return <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
      case 'WARNING':
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case 'ERROR':
        return <AlertCircle className="w-5 h-5 text-rose-600" />;
      default:
        return <Info className="w-5 h-5 text-indigo-600" />;
    }
  };

  return (
    <AppLayout
      title="Administrative Alert Dispatch"
      subtitle="Ministry of Rural Development • Department of Land Resources (DoLR)"
    >
      <div className="max-w-5xl w-full mx-auto space-y-6">
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">System Notifications &amp; Alerts</h2>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold font-mono bg-rose-100 text-rose-800 border border-rose-200">
                    {unreadCount} Unread
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time updates regarding OCR pipelines, boundary mismatch anomalies, and verification routing.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleMarkAllRead}
                disabled={unreadCount === 0}
                className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-md shadow-xs flex items-center gap-1.5 transition disabled:opacity-40"
              >
                <CheckCheck className="w-3.5 h-3.5 text-slate-500" />
                <span>Mark All Read</span>
              </button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
                filterType === 'ALL'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              All Alerts ({notifications.length})
            </button>
            <button
              onClick={() => setFilterType('UNREAD')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
                filterType === 'UNREAD'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Unread Only ({unreadCount})
            </button>
            <button
              onClick={() => setFilterType('ACTION_REQUIRED')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
                filterType === 'ACTION_REQUIRED'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Action Required (Warnings)
            </button>
          </div>

          {/* Notification List */}
          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                Loading system notifications...
              </div>
            ) : filteredList.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border border-slate-200 text-slate-500 text-xs">
                No notifications to display in this category.
              </div>
            ) : (
              filteredList.map(n => (
                <div
                  key={n.id}
                  className={`p-4 rounded-lg border transition flex items-start justify-between gap-4 ${
                    !n.read
                      ? 'bg-white border-indigo-200 shadow-xs ring-1 ring-indigo-50'
                      : 'bg-slate-50/70 border-slate-200 text-slate-600'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <div className="mt-0.5 flex-shrink-0">{getIcon(n.type)}</div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className={`text-xs font-bold ${!n.read ? 'text-slate-900' : 'text-slate-700'}`}>
                          {n.title}
                        </h4>
                        {!n.read && (
                          <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">{n.message}</p>

                      <div className="flex items-center gap-4 mt-2 text-[11px] text-slate-400 font-mono">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(n.createdAt || n.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })},{' '}
                          {new Date(n.createdAt || n.timestamp || Date.now()).toLocaleDateString()}
                        </span>

                        {n.link && (
                          <Link
                            href={n.link}
                            className="text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                          >
                            <span>Open Record / Queue</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>

                  {!n.read && (
                    <button
                      onClick={() => handleMarkRead(n.id)}
                      className="text-[11px] text-slate-400 hover:text-slate-700 font-medium px-2 py-1 rounded hover:bg-slate-100 transition flex-shrink-0"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
      </div>
    </AppLayout>
  );
}
