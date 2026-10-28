'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/components/auth/AuthContext';
import {
  Shield,
  KeyRound,
  Users,
  CheckSquare,
  Square,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  Lock,
  Layers,
  FileText,
  Compass,
  AlertCircle
} from 'lucide-react';
import { Role, PermissionKey } from '@/types';
import { ALL_PERMISSIONS } from '@/lib/mock-data';

export default function RolesPage() {
  const { hasPermission } = useAuth();
  const canCreateRole = hasPermission('ROLE_CREATE');
  const canEditRole = hasPermission('ROLE_EDIT');
  const canDeleteRole = hasPermission('ROLE_DELETE');

  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Form state for creating / editing
  const [roleName, setRoleName] = useState('');
  const [roleDesc, setRoleDesc] = useState('');
  const [selectedPerms, setSelectedPerms] = useState<PermissionKey[]>([]);

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

  const openEditModal = (role: Role) => {
    setEditingRole(role);
    setRoleName(role.name);
    setRoleDesc(role.description);
    setSelectedPerms([...role.permissions]);
  };

  const openCreateModal = () => {
    setEditingRole(null);
    setRoleName('');
    setRoleDesc('');
    setSelectedPerms(['RECORD_VIEW', 'DOCUMENT_VIEW']);
    setIsCreateModalOpen(true);
  };

  const togglePermission = (key: PermissionKey) => {
    if (selectedPerms.includes(key)) {
      setSelectedPerms(selectedPerms.filter(k => k !== key));
    } else {
      setSelectedPerms([...selectedPerms, key]);
    }
  };

  const toggleCategory = (category: string) => {
    const catPerms = ALL_PERMISSIONS.filter(p => p.category === category).map(p => p.key);
    const allSelected = catPerms.every(k => selectedPerms.includes(k));

    if (allSelected) {
      setSelectedPerms(selectedPerms.filter(k => !catPerms.includes(k)));
    } else {
      const union = Array.from(new Set([...selectedPerms, ...catPerms]));
      setSelectedPerms(union);
    }
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingRole) {
        // Update existing
        const res = await fetch('/api/roles', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingRole.id,
            name: roleName,
            description: roleDesc,
            permissions: selectedPerms
          })
        });
        const data = await res.json();
        if (data.success) {
          setActionMessage(`Role "${roleName}" permissions updated.`);
          setEditingRole(null);
          fetchRoles();
          setTimeout(() => setActionMessage(null), 4000);
        }
      } else {
        // Create new
        const res = await fetch('/api/roles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: roleName,
            description: roleDesc,
            permissions: selectedPerms
          })
        });
        const data = await res.json();
        if (data.success) {
          setActionMessage(`Created custom role "${roleName}".`);
          setIsCreateModalOpen(false);
          fetchRoles();
          setTimeout(() => setActionMessage(null), 4000);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteRole = async (role: Role) => {
    if (role.isSystem) {
      alert('System-protected roles cannot be deleted.');
      return;
    }
    if (!confirm(`Are you sure you want to delete role "${role.name}"?`)) return;

    try {
      const res = await fetch(`/api/roles?id=${role.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setActionMessage(`Role "${role.name}" deleted.`);
        fetchRoles();
        setTimeout(() => setActionMessage(null), 4000);
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Group permissions by category for modal checklist
  const categories = Array.from(new Set(ALL_PERMISSIONS.map(p => p.category)));

  return (
    <AppLayout
      title="Role-Based Access Control (RBAC)"
      subtitle="Ministry of Rural Development • Department of Land Resources (DoLR)"
      requiredPermission="ROLE_VIEW"
    >
      <div className="space-y-6">
          {actionMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-lg text-xs font-semibold text-emerald-800 flex items-center gap-2 shadow-sm animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{actionMessage}</span>
            </div>
          )}

          {/* Top Overview & Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-indigo-600" />
                <span>Administrative Roles &amp; Security Privileges</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage 8 built-in government roles and granular assignments across 31 system capabilities.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/permissions"
                className="px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-md shadow-xs flex items-center gap-1.5 transition"
              >
                <Layers className="w-4 h-4 text-slate-500" />
                <span>View Full 31-Capability Matrix</span>
              </Link>

              <button
                onClick={openCreateModal}
                className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-md shadow flex items-center gap-1.5 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Create Custom Role</span>
              </button>
            </div>
          </div>

          {/* Role Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {roles.map(role => {
              const permCount = role.permissions.length;
              const permPercent = Math.round((permCount / ALL_PERMISSIONS.length) * 100);

              return (
                <div
                  key={role.id}
                  className="bg-white rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition p-5 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900">{role.name}</h3>
                          {role.isSystem ? (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-bold">
                              System
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold">
                              Custom
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400 mt-0.5">{role.code}</div>
                      </div>

                      <div className="flex items-center gap-1 text-slate-500 text-xs font-mono">
                        <Users className="w-3.5 h-3.5" />
                        <span>{role.userCount || 0}</span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2 mt-2">{role.description}</p>

                    {/* Progress indicator */}
                    <div className="mt-4 pt-3 border-t border-slate-100">
                      <div className="flex items-center justify-between text-[11px] font-mono mb-1.5">
                        <span className="text-slate-500">Authority Level</span>
                        <span className="font-bold text-slate-700">
                          {permCount} / {ALL_PERMISSIONS.length} ({permPercent}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                          style={{ width: `${permPercent}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <button
                      onClick={() => openEditModal(role)}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Configure Permissions</span>
                    </button>

                    {!role.isSystem && (
                      <button
                        onClick={() => handleDeleteRole(role)}
                        className="text-xs text-slate-400 hover:text-rose-600 transition p-1"
                        title="Delete Role"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

        {/* Modal for Edit / Create Role */}
        {(editingRole || isCreateModalOpen) && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full border border-slate-200 overflow-hidden my-8">
              <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-indigo-400" />
                  <h3 className="font-bold text-sm">
                    {editingRole ? `Edit Role: ${editingRole.name}` : 'Create New Administrative Role'}
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setEditingRole(null);
                    setIsCreateModalOpen(false);
                  }}
                  className="text-slate-400 hover:text-white text-lg font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveRole} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Role Display Name *</label>
                    <input
                      type="text"
                      required
                      value={roleName}
                      onChange={e => setRoleName(e.target.value)}
                      placeholder="e.g. Senior Land Surveyor"
                      className="w-full text-xs p-2 border border-slate-300 rounded focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Role Description</label>
                    <input
                      type="text"
                      value={roleDesc}
                      onChange={e => setRoleDesc(e.target.value)}
                      placeholder="e.g. Authorized to conduct boundary surveys and verify village maps"
                      className="w-full text-xs p-2 border border-slate-300 rounded focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Assigned Permissions ({selectedPerms.length} / {ALL_PERMISSIONS.length})
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Check or uncheck specific functional privileges for this role.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedPerms(ALL_PERMISSIONS.map(p => p.key))}
                        className="text-[11px] text-indigo-600 hover:underline font-semibold"
                      >
                        Grant All
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={() => setSelectedPerms([])}
                        className="text-[11px] text-rose-600 hover:underline font-semibold"
                      >
                        Revoke All
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {categories.map(category => {
                      const categoryPerms = ALL_PERMISSIONS.filter(p => p.category === category);
                      const allSelected = categoryPerms.every(p => selectedPerms.includes(p.key));

                      return (
                        <div key={category} className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200">
                            <span className="text-xs font-bold text-slate-800 font-mono uppercase tracking-wide">
                              {category} Module
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleCategory(category)}
                              className="text-[10px] text-slate-500 hover:text-indigo-600 font-semibold"
                            >
                              {allSelected ? 'Unselect Section' : 'Select Section'}
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                            {categoryPerms.map(perm => {
                              const checked = selectedPerms.includes(perm.key);
                              return (
                                <button
                                  key={perm.key}
                                  type="button"
                                  onClick={() => togglePermission(perm.key)}
                                  className={`flex items-center gap-2 p-2 rounded text-left transition border ${
                                    checked
                                      ? 'bg-white border-indigo-400 text-indigo-900 shadow-xs'
                                      : 'bg-slate-100/60 border-slate-200 text-slate-600 hover:bg-white'
                                  }`}
                                >
                                  {checked ? (
                                    <CheckSquare className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
                                  ) : (
                                    <Square className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                  )}
                                  <span className="text-[11px] font-medium leading-tight">{perm.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingRole(null);
                      setIsCreateModalOpen(false);
                    }}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded shadow"
                  >
                    Save Privileges
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
