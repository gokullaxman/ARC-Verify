'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import {
  Layers,
  ArrowLeft,
  Check,
  Minus,
  Search,
  Filter,
  ShieldCheck,
  Lock,
  KeyRound
} from 'lucide-react';
import { Role, PermissionKey } from '@/types';
import { ALL_PERMISSIONS } from '@/lib/mock-data';

export default function PermissionsPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchRoles();
  }, []);

  async function fetchRoles() {
    try {
      setLoading(true);
      const res = await fetch('/api/roles');
      const data = await res.json();
      if (data.success) {
        setRoles(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const categories = ['ALL', ...Array.from(new Set(ALL_PERMISSIONS.map(p => p.category)))];

  const filteredPermissions = ALL_PERMISSIONS.filter(p => {
    if (selectedCategory !== 'ALL' && p.category !== selectedCategory) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return p.label.toLowerCase().includes(q) || p.key.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <AppLayout
      title="RBAC Capability & Permission Matrix"
      subtitle="Ministry of Rural Development • Department of Land Resources (DoLR)"
      requiredPermission="ROLE_VIEW"
    >
      <div className="space-y-6">
          {/* Navigation and Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Link
                  href="/roles"
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Role Profiles</span>
                </Link>
              </div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-600" />
                <span>31 Granular Security Capabilities vs 8 Administrative Roles</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Examine role-based authorization matrix enforced across API routes, UI screens, and audit logging.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-md border border-indigo-200 font-bold">
                {ALL_PERMISSIONS.length} Total Capabilities
              </span>
            </div>
          </div>

          {/* Filters & Search */}
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search capability by keyword or key..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Category Pills */}
            <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 text-xs rounded font-medium transition ${
                    selectedCategory === cat
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Full Grid Matrix */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[850px]">
                <thead className="bg-slate-900 text-white font-mono text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3 min-w-[240px]">Capability / Permission</th>
                    <th className="px-3 py-3 text-center">Category</th>
                    {roles.map(r => (
                      <th key={r.id} className="px-2 py-3 text-center min-w-[100px]" title={r.name}>
                        <div className="truncate font-semibold">{r.name.split(' ')[0]}</div>
                        <div className="text-[9px] text-slate-400 truncate">{r.code.slice(0, 8)}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {loading ? (
                    <tr>
                      <td colSpan={roles.length + 2} className="text-center py-8 text-slate-400">
                        Loading permissions matrix...
                      </td>
                    </tr>
                  ) : filteredPermissions.map(perm => (
                    <tr key={perm.key} className="hover:bg-slate-50/80 transition">
                      <td className="px-4 py-2.5">
                        <div className="font-semibold text-slate-900">{perm.label}</div>
                        <div className="text-[10px] font-mono text-slate-400">{perm.key}</div>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                          {perm.category}
                        </span>
                      </td>
                      {roles.map(r => {
                        const hasPerm = r.permissions.includes(perm.key);
                        return (
                          <td key={r.id} className="px-2 py-2.5 text-center">
                            {hasPerm ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-700">
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              </span>
                            ) : (
                              <span className="inline-flex items-center justify-center w-6 h-6 text-slate-300">
                                <Minus className="w-3.5 h-3.5" />
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
      </div>
    </AppLayout>
  );
}
