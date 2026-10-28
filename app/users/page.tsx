'use client';

import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/components/auth/AuthContext';
import {
  Users as UsersIcon,
  UserPlus,
  Search,
  Filter,
  Shield,
  KeyRound,
  CheckCircle2,
  XCircle,
  MoreVertical,
  Edit2,
  Trash2,
  RefreshCw,
  Lock,
  Mail,
  Phone,
  Building,
  MapPin,
  AlertTriangle
} from 'lucide-react';
import { User, UserRole } from '@/types';

export default function UsersPage() {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('USER_CREATE');
  const canEdit = hasPermission('USER_EDIT');
  const canDisable = hasPermission('USER_DISABLE');

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [resetPasswordVal, setResetPasswordVal] = useState('Password@123');
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // New user form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'REVENUE_OFFICER' as UserRole,
    designation: 'Revenue Inspector / Sub-Registrar',
    department: 'Revenue & Disaster Management',
    state: 'Tamil Nadu',
    district: 'Madurai',
    taluk: 'Madurai North',
    village: 'Kovilur',
    employeeId: 'TN-REV-2026-08',
    phone: '+91 94441 23456',
    passwordHash: 'Password@123'
  });

  // Edit user form state
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    role: 'REVENUE_OFFICER' as UserRole,
    designation: '',
    department: '',
    state: 'Tamil Nadu',
    district: '',
    taluk: '',
    village: '',
    employeeId: '',
    phone: ''
  });

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setEditFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      designation: user.designation || '',
      department: user.department || '',
      state: user.state || 'Tamil Nadu',
      district: user.district || '',
      taluk: user.taluk || '',
      village: user.village || '',
      employeeId: user.employeeId || '',
      phone: user.phone || ''
    });
    setIsEditModalOpen(true);
  };

  const handleEditUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      const res = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData)
      });
      const data = await res.json();
      if (data.success) {
        setIsEditModalOpen(false);
        setActionMessage(`Updated ${data.data.name}. Role assigned: ${data.data.role} (Permissions synchronized)`);
        fetchUsers();
        setTimeout(() => setActionMessage(null), 4000);
      } else {
        alert(data.message || 'Error updating user');
      }
    } catch (err: any) {
      alert(err.message || 'Update failed');
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [roleFilter, statusFilter]);

  async function fetchUsers() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (roleFilter !== 'ALL') params.append('role', roleFilter);
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (searchQuery) params.append('search', searchQuery);

      const res = await fetch(`/api/users?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setUsers(data.data);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleToggleStatus = async (user: User) => {
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_status' })
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage(`Status updated for ${user.name} (${data.data.status})`);
        fetchUsers();
        setTimeout(() => setActionMessage(null), 4000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser) return;
    try {
      const res = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset_password', newPassword: resetPasswordVal })
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage(`Password reset successfully for ${selectedUser.name}`);
        setIsResetModalOpen(false);
        setTimeout(() => setActionMessage(null), 4000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (!confirm(`Are you sure you want to remove ${user.name} (${user.email})?`)) return;
    try {
      const res = await fetch(`/api/users/${user.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setActionMessage(`User ${user.name} deleted.`);
        fetchUsers();
        setTimeout(() => setActionMessage(null), 4000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        setIsAddModalOpen(false);
        setActionMessage(`Created new user ${data.data.name} with role ${data.data.role}`);
        fetchUsers();
        setTimeout(() => setActionMessage(null), 4000);
      } else {
        alert(data.message || 'Error creating user');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const roleColors: Record<string, string> = {
    SUPER_ADMIN: 'bg-purple-100 text-purple-800 border-purple-200',
    ADMIN: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    REVENUE_OFFICER: 'bg-blue-100 text-blue-800 border-blue-200',
    VERIFICATION_OFFICER: 'bg-amber-100 text-amber-800 border-amber-200',
    DATA_ENTRY_OPERATOR: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    GIS_OFFICER: 'bg-teal-100 text-teal-800 border-teal-200',
    AUDITOR: 'bg-rose-100 text-rose-800 border-rose-200',
    VIEWER: 'bg-slate-100 text-slate-800 border-slate-200'
  };

  const filteredUsers = users.filter(u => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.district.toLowerCase().includes(q) ||
      (u.employeeId && u.employeeId.toLowerCase().includes(q))
    );
  });

  return (
    <AppLayout
      title="Personnel Directory & User Administration"
      subtitle="Ministry of Rural Development • Department of Land Resources (DoLR)"
      requiredPermission="USER_VIEW"
    >
      <div className="space-y-6">
          {/* Action Notification Toast */}
          {actionMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-lg text-xs font-semibold text-emerald-800 flex items-center gap-2 shadow-sm animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{actionMessage}</span>
            </div>
          )}

          {/* Top Control Bar & Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-xs">
              <div className="text-xs font-semibold text-slate-500 uppercase">Total Personnel</div>
              <div className="text-2xl font-bold text-slate-900 mt-1">{users.length}</div>
              <div className="text-[11px] text-slate-400 mt-1 font-mono">Registered Revenue Users</div>
            </div>
            <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-xs">
              <div className="text-xs font-semibold text-emerald-600 uppercase">Active Accounts</div>
              <div className="text-2xl font-bold text-emerald-700 mt-1">
                {users.filter(u => u.status === 'ACTIVE').length}
              </div>
              <div className="text-[11px] text-emerald-600/80 mt-1 font-mono">Authorized NIC Access</div>
            </div>
            <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-xs">
              <div className="text-xs font-semibold text-indigo-600 uppercase">Field Officers</div>
              <div className="text-2xl font-bold text-indigo-700 mt-1">
                {users.filter(u => ['REVENUE_OFFICER', 'VERIFICATION_OFFICER', 'GIS_OFFICER'].includes(u.role)).length}
              </div>
              <div className="text-[11px] text-indigo-500 mt-1 font-mono">Tahsildar / RI / Surveyors</div>
            </div>
            <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase">Quick Action</div>
                <div className="text-sm font-bold text-slate-800 mt-1">Onboard Officer</div>
              </div>
              {canCreate ? (
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-md shadow flex items-center gap-1.5 transition"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Add User</span>
                </button>
              ) : (
                <span className="text-[10px] text-slate-400 font-mono px-2 py-1 bg-slate-100 rounded border border-slate-200">
                  Read Only Mode
                </span>
              )}
            </div>
          </div>

          {/* Search and Filters */}
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-96">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by name, email, employee ID, district..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="flex items-center gap-1 text-xs text-slate-500 font-medium">
                <Filter className="w-3.5 h-3.5" />
                <span>Role:</span>
              </div>
              <select
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none"
              >
                <option value="ALL">All Roles (8)</option>
                <option value="SUPER_ADMIN">Super Admin</option>
                <option value="ADMIN">Admin</option>
                <option value="REVENUE_OFFICER">Revenue Officer</option>
                <option value="VERIFICATION_OFFICER">Verification Officer</option>
                <option value="DATA_ENTRY_OPERATOR">Data Entry Operator</option>
                <option value="GIS_OFFICER">GIS Officer</option>
                <option value="AUDITOR">Auditor</option>
                <option value="VIEWER">Viewer</option>
              </select>

              <div className="flex items-center gap-1 text-xs text-slate-500 font-medium">
                <span>Status:</span>
              </div>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none"
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          </div>

          {/* Personnel Table */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 min-w-[700px]">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 font-mono text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Personnel</th>
                    <th className="px-4 py-3">Role &amp; Permissions</th>
                    <th className="px-4 py-3">Jurisdiction</th>
                    <th className="px-4 py-3">Contact Details</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Last Login</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-400">
                        Loading registered personnel...
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-400">
                        No personnel found matching filters.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map(user => (
                      <tr key={user.id} className="hover:bg-slate-50/80 transition">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs flex-shrink-0">
                              {user.name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900">{user.name}</div>
                              <div className="text-[11px] text-slate-500 font-mono">
                                {user.employeeId || 'ID: ' + user.id}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[11px] font-mono font-semibold border ${
                              roleColors[user.role] || 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            {user.role.replace('_', ' ')}
                          </span>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {user.permissions?.length || 0} granular privileges
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px]">
                          <div className="text-slate-800 font-medium">{user.district}, {user.state}</div>
                          <div className="text-slate-400 text-[10px]">
                            {user.taluk || 'All Taluks'} {user.village ? `• ${user.village}` : ''}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 text-slate-700">
                            <Mail className="w-3 h-3 text-slate-400" />
                            <span>{user.email}</span>
                          </div>
                          {user.phone && (
                            <div className="flex items-center gap-1.5 text-slate-500 text-[11px] mt-0.5">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>{user.phone}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleToggleStatus(user)}
                            className={`px-2 py-1 rounded text-[11px] font-mono font-bold flex items-center gap-1.5 transition ${
                              user.status === 'ACTIVE'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
                                : 'bg-slate-100 text-slate-600 border border-slate-300 hover:bg-slate-200'
                            }`}
                            title="Click to toggle status"
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                user.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-400'
                              }`}
                            ></span>
                            <span>{user.status}</span>
                          </button>
                        </td>
                        <td className="px-4 py-3 font-mono text-[10px] text-slate-500">
                          {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString('en-IN') : 'Never'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openEditModal(user)}
                              className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-indigo-600"
                              title="Edit User & Role"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setIsResetModalOpen(true);
                              }}
                              className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-amber-600"
                              title="Reset Password"
                            >
                              <Lock className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user)}
                              className="p-1 rounded hover:bg-rose-50 text-slate-500 hover:text-rose-600"
                              title="Delete User"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        {/* Add User Modal */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-xl w-full border border-slate-200 overflow-hidden">
              <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-indigo-400" />
                  <h3 className="font-bold text-sm">Onboard Government Officer / Staff</h3>
                </div>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="text-slate-400 hover:text-white text-lg font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAddUserSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. K. Sundararajan, IAS"
                      className="w-full text-xs p-2 border border-slate-300 rounded focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Government Email *</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      placeholder="e.g. ksundar@nic.in"
                      className="w-full text-xs p-2 border border-slate-300 rounded focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Role *</label>
                    <select
                      value={formData.role}
                      onChange={e => setFormData({ ...formData, role: e.target.value as UserRole })}
                      className="w-full text-xs p-2 border border-slate-300 rounded focus:outline-none focus:border-indigo-500 bg-white"
                    >
                      <option value="SUPER_ADMIN">Super Admin (State/National)</option>
                      <option value="ADMIN">Admin (District Collector)</option>
                      <option value="REVENUE_OFFICER">Revenue Officer (Tahsildar)</option>
                      <option value="VERIFICATION_OFFICER">Verification Officer (RI)</option>
                      <option value="DATA_ENTRY_OPERATOR">Data Entry Operator (VAO)</option>
                      <option value="GIS_OFFICER">GIS Officer (Surveyor)</option>
                      <option value="AUDITOR">Auditor (Vigilance)</option>
                      <option value="VIEWER">Viewer (Public / Citizen)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Employee ID</label>
                    <input
                      type="text"
                      value={formData.employeeId}
                      onChange={e => setFormData({ ...formData, employeeId: e.target.value })}
                      placeholder="e.g. TN-REV-2026-99"
                      className="w-full text-xs p-2 border border-slate-300 rounded focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">District *</label>
                    <input
                      type="text"
                      required
                      value={formData.district}
                      onChange={e => setFormData({ ...formData, district: e.target.value })}
                      className="w-full text-xs p-2 border border-slate-300 rounded focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Taluk</label>
                    <input
                      type="text"
                      value={formData.taluk}
                      onChange={e => setFormData({ ...formData, taluk: e.target.value })}
                      className="w-full text-xs p-2 border border-slate-300 rounded focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Village Jurisdiction</label>
                    <input
                      type="text"
                      value={formData.village}
                      onChange={e => setFormData({ ...formData, village: e.target.value })}
                      className="w-full text-xs p-2 border border-slate-300 rounded focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full text-xs p-2 border border-slate-300 rounded focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded shadow"
                  >
                    Create Account
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Reset Password Modal */}
        {isResetModalOpen && selectedUser && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden">
              <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lock className="w-5 h-5 text-amber-400" />
                  <h3 className="font-bold text-sm">Administrative Password Reset</h3>
                </div>
                <button
                  onClick={() => setIsResetModalOpen(false)}
                  className="text-slate-400 hover:text-white text-lg font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-xs text-slate-600">
                  Reset password for <strong className="text-slate-900">{selectedUser.name}</strong> ({selectedUser.email}).
                </p>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">New Temporary Password</label>
                  <input
                    type="text"
                    value={resetPasswordVal}
                    onChange={e => setResetPasswordVal(e.target.value)}
                    className="w-full text-xs p-2 font-mono border border-slate-300 rounded focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setIsResetModalOpen(false)}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleResetPassword}
                    className="px-4 py-1.5 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded shadow"
                  >
                    Update Password
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Edit User Modal */}
        {isEditModalOpen && selectedUser && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-xl w-full border border-slate-200 overflow-hidden">
              <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Edit2 className="w-5 h-5 text-indigo-400" />
                  <h3 className="font-bold text-sm">Edit Personnel &amp; Reassign Authority</h3>
                </div>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="text-slate-400 hover:text-white text-lg font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleEditUserSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={editFormData.name}
                      onChange={e => setEditFormData({ ...editFormData, name: e.target.value })}
                      className="w-full text-xs p-2 border border-slate-300 rounded focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Government Email</label>
                    <input
                      type="email"
                      disabled
                      value={editFormData.email}
                      className="w-full text-xs p-2 border border-slate-200 bg-slate-100 text-slate-500 rounded cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Administrative Role *</label>
                    <select
                      value={editFormData.role}
                      onChange={e => setEditFormData({ ...editFormData, role: e.target.value as UserRole })}
                      className="w-full text-xs p-2 border border-slate-300 rounded focus:outline-none focus:border-indigo-500 bg-white font-semibold text-indigo-700"
                    >
                      <option value="SUPER_ADMIN">Super Admin (State/National Scope)</option>
                      <option value="ADMIN">Admin (District Collector)</option>
                      <option value="REVENUE_OFFICER">Revenue Officer (Tahsildar)</option>
                      <option value="VERIFICATION_OFFICER">Verification Officer (RI)</option>
                      <option value="DATA_ENTRY_OPERATOR">Data Entry Operator (VAO)</option>
                      <option value="GIS_OFFICER">GIS Officer (Surveyor)</option>
                      <option value="AUDITOR">Auditor (Vigilance)</option>
                      <option value="VIEWER">Viewer (Public / Citizen)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Designation</label>
                    <input
                      type="text"
                      value={editFormData.designation}
                      onChange={e => setEditFormData({ ...editFormData, designation: e.target.value })}
                      className="w-full text-xs p-2 border border-slate-300 rounded focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">District Jurisdiction *</label>
                    <input
                      type="text"
                      required
                      value={editFormData.district}
                      onChange={e => setEditFormData({ ...editFormData, district: e.target.value })}
                      className="w-full text-xs p-2 border border-slate-300 rounded focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Taluk / Tehsil</label>
                    <input
                      type="text"
                      value={editFormData.taluk}
                      onChange={e => setEditFormData({ ...editFormData, taluk: e.target.value })}
                      className="w-full text-xs p-2 border border-slate-300 rounded focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Village Scope</label>
                    <input
                      type="text"
                      value={editFormData.village}
                      onChange={e => setEditFormData({ ...editFormData, village: e.target.value })}
                      className="w-full text-xs p-2 border border-slate-300 rounded focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={editFormData.phone}
                      onChange={e => setEditFormData({ ...editFormData, phone: e.target.value })}
                      className="w-full text-xs p-2 border border-slate-300 rounded focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded shadow"
                  >
                    Save Changes &amp; Sync Permissions
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
