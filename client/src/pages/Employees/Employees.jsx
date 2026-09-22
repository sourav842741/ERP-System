import React, { useState, useEffect } from 'react';
import {
  ShieldCheck, Users, Plus, Edit2, Trash2, CheckSquare, Square,
  Shield, Key, Lock, Phone, Mail, Search, RefreshCw, AlertCircle,
  CheckCircle2, XCircle, ShieldAlert, Sparkles, Filter, Check, X,
  UserCheck, ShieldOff
} from 'lucide-react';
import api from '../../api/client';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { DataTable } from '../../components/ui/DataTable';

export const Employees = () => {
  const [activeTab, setActiveTab] = useState('users'); // 'users' | 'roles'
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [availablePermissions, setAvailablePermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [showDeleteUserModal, setShowDeleteUserModal] = useState(false);

  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showDeleteRoleModal, setShowDeleteRoleModal] = useState(false);

  // Selected State
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);

  // User Form State
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    roleId: '',
    status: 'active'
  });
  const [userFormLoading, setUserFormLoading] = useState(false);
  const [userFormError, setUserFormError] = useState('');

  // Role Form State
  const [roleForm, setRoleForm] = useState({
    name: '',
    description: '',
    permissions: []
  });
  const [roleFormLoading, setRoleFormLoading] = useState(false);
  const [roleFormError, setRoleFormError] = useState('');

  // Delete State
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // ================= DATA FETCHING =================
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/users');
      if (res.data.success) {
        setUsers(res.data.data.users || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await api.get('/users/roles/list');
      if (res.data.success) {
        setRoles(res.data.data.roles || []);
        setAvailablePermissions(res.data.data.availablePermissions || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  // ================= KPI CALCULATIONS =================
  const activeUsersCount = users.filter((u) => u.status === 'active').length;
  const superAdminCount = users.filter((u) => u.role?.name === 'Super Admin').length;
  const customRolesCount = roles.filter((r) => !r.isSystem).length;

  // Group permissions by category for the matrix
  const permGroups = availablePermissions.reduce((acc, p) => {
    if (!acc[p.category]) acc[p.category] = [];
    acc[p.category].push(p);
    return acc;
  }, {});

  // ================= USER HANDLERS =================
  const handleOpenAddUser = () => {
    setUserForm({
      name: '',
      email: '',
      password: '',
      phone: '',
      roleId: roles[0]?._id || '',
      status: 'active'
    });
    setUserFormError('');
    setShowAddUserModal(true);
  };

  const handleOpenEditUser = (user) => {
    setSelectedUser(user);
    setUserForm({
      name: user.name || '',
      email: user.email || '',
      password: '', // Blank unless admin wants to reset password
      phone: user.phone || '',
      roleId: user.role?._id || user.role || '',
      status: user.status || 'active'
    });
    setUserFormError('');
    setShowEditUserModal(true);
  };

  const handleOpenDeleteUser = (user) => {
    setSelectedUser(user);
    setDeleteError('');
    setShowDeleteUserModal(true);
  };

  const handleToggleUserStatus = async (user) => {
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    try {
      await api.put(`/users/${user._id}`, { status: newStatus });
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  // Save Create User
  const handleSaveCreateUser = async (e) => {
    e.preventDefault();
    if (!userForm.name.trim() || !userForm.email.trim() || !userForm.password.trim()) {
      setUserFormError('Name, email, and initial password are required.');
      return;
    }

    setUserFormLoading(true);
    setUserFormError('');
    try {
      const res = await api.post('/users', userForm);
      if (res.data.success) {
        setShowAddUserModal(false);
        fetchUsers();
      }
    } catch (err) {
      setUserFormError(err.response?.data?.message || err.message);
    } finally {
      setUserFormLoading(false);
    }
  };

  // Save Edit User
  const handleSaveEditUser = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    if (!userForm.name.trim()) {
      setUserFormError('Employee name is required.');
      return;
    }

    setUserFormLoading(true);
    setUserFormError('');
    try {
      const payload = {
        name: userForm.name,
        phone: userForm.phone,
        roleId: userForm.roleId,
        status: userForm.status
      };
      if (userForm.password.trim()) {
        payload.password = userForm.password;
      }

      const res = await api.put(`/users/${selectedUser._id}`, payload);
      if (res.data.success) {
        setShowEditUserModal(false);
        fetchUsers();
      }
    } catch (err) {
      setUserFormError(err.response?.data?.message || err.message);
    } finally {
      setUserFormLoading(false);
    }
  };

  // Delete User
  const handleConfirmDeleteUser = async () => {
    if (!selectedUser) return;
    setDeleteLoading(true);
    setDeleteError('');
    try {
      const res = await api.delete(`/users/${selectedUser._id}`);
      if (res.data.success) {
        setShowDeleteUserModal(false);
        fetchUsers();
      }
    } catch (err) {
      setDeleteError(err.response?.data?.message || err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  // ================= ROLE HANDLERS =================
  const handleOpenCreateRole = () => {
    setSelectedRole(null);
    setRoleForm({
      name: '',
      description: '',
      permissions: []
    });
    setRoleFormError('');
    setShowRoleModal(true);
  };

  const handleOpenEditRole = (role) => {
    setSelectedRole(role);
    setRoleForm({
      name: role.name || '',
      description: role.description || '',
      permissions: role.permissions || []
    });
    setRoleFormError('');
    setShowRoleModal(true);
  };

  const handleOpenDeleteRole = (role) => {
    setSelectedRole(role);
    setDeleteError('');
    setShowDeleteRoleModal(true);
  };

  const handleTogglePermission = (code) => {
    setRoleForm((prev) => {
      const exists = prev.permissions.includes(code);
      return {
        ...prev,
        permissions: exists
          ? prev.permissions.filter((p) => p !== code)
          : [...prev.permissions, code]
      };
    });
  };

  const handleToggleCategoryPermissions = (category, shouldSelect) => {
    const catCodes = permGroups[category]?.map((p) => p.code) || [];
    setRoleForm((prev) => {
      let updated;
      if (shouldSelect) {
        updated = Array.from(new Set([...prev.permissions, ...catCodes]));
      } else {
        updated = prev.permissions.filter((p) => !catCodes.includes(p));
      }
      return { ...prev, permissions: updated };
    });
  };

  // Save Role
  const handleSaveRole = async (e) => {
    e.preventDefault();
    if (!roleForm.name.trim()) {
      setRoleFormError('Role Name is required.');
      return;
    }

    setRoleFormLoading(true);
    setRoleFormError('');
    try {
      if (selectedRole) {
        await api.put(`/users/roles/${selectedRole._id}`, roleForm);
      } else {
        await api.post('/users/roles/create', roleForm);
      }
      setShowRoleModal(false);
      fetchRoles();
    } catch (err) {
      setRoleFormError(err.response?.data?.message || err.message);
    } finally {
      setRoleFormLoading(false);
    }
  };

  // Delete Role
  const handleConfirmDeleteRole = async () => {
    if (!selectedRole) return;
    setDeleteLoading(true);
    setDeleteError('');
    try {
      const res = await api.delete(`/users/roles/${selectedRole._id}`);
      if (res.data.success) {
        setShowDeleteRoleModal(false);
        fetchRoles();
      }
    } catch (err) {
      setDeleteError(err.response?.data?.message || err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  // Filtered Users
  const filteredUsers = users.filter((u) => {
    if (roleFilter && (u.role?._id !== roleFilter && u.role?.name !== roleFilter)) return false;
    if (statusFilter && u.status !== statusFilter) return false;
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      u.name?.toLowerCase().includes(term) ||
      u.email?.toLowerCase().includes(term) ||
      u.phone?.toLowerCase().includes(term) ||
      u.role?.name?.toLowerCase().includes(term)
    );
  });

  // Table Columns for Users
  const userColumns = [
    {
      header: 'Employee Name & Email',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary-50 dark:bg-primary-950/60 border border-primary-200 dark:border-primary-900/40 text-primary-600 dark:text-primary-400 font-black text-xs flex items-center justify-center shrink-0">
            {row.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div>
            <p className="font-bold text-xs text-slate-900 dark:text-white leading-tight">
              {row.name}
            </p>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              {row.email}
            </span>
          </div>
        </div>
      )
    },
    {
      header: 'Assigned Role',
      render: (row) => {
        const isSuper = row.role?.name === 'Super Admin';
        return (
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
            isSuper
              ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
              : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
          }`}>
            <Shield className="w-3 h-3" />
            {row.role?.name || 'Staff Member'}
          </span>
        );
      }
    },
    {
      header: 'Contact Phone',
      render: (row) => (
        row.phone ? (
          <a href={`tel:${row.phone}`} className="text-xs text-slate-600 dark:text-slate-300 hover:text-primary-600">
            {row.phone}
          </a>
        ) : (
          <span className="text-xs text-slate-400">N/A</span>
        )
      )
    },
    {
      header: 'Account Status',
      render: (row) => {
        const isActive = row.status === 'active';
        return (
          <button
            onClick={() => handleToggleUserStatus(row)}
            title="Click to toggle status"
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border transition-colors cursor-pointer ${
              isActive
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
            {row.status}
          </button>
        );
      }
    },
    {
      header: 'Last Active Session',
      render: (row) => (
        <span className="text-xs text-slate-400">
          {row.lastLogin ? new Date(row.lastLogin).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
          }) : 'Never logged in'}
        </span>
      )
    },
    {
      header: 'Actions',
      className: 'text-right',
      cellClassName: 'text-right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => handleOpenEditUser(row)}
            title="Edit Employee / Reset Password"
            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleOpenDeleteUser(row)}
            title="Delete Employee"
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-primary-500" />
            Employees & Granular RBAC Permissions
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Workforce role-based access control (Section 25). Configure permission matrices and govern staff authorizations.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            onClick={handleOpenCreateRole}
            variant="outline"
            size="sm"
            className="shadow-xs"
          >
            <ShieldCheck className="w-4 h-4 mr-1.5 text-slate-500" />
            Create Custom Role
          </Button>

          <Button
            onClick={handleOpenAddUser}
            size="sm"
            className="shadow-xs bg-primary-600 hover:bg-primary-700 text-white font-bold"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add Employee
          </Button>
        </div>
      </div>

      {/* Security & Workforce KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-slate-400">Total Workforce</span>
            <Users className="w-4 h-4 text-primary-500" />
          </div>
          <p className="text-lg font-black text-slate-900 dark:text-white mt-1">
            {users.length} Employees
          </p>
          <span className="text-[10px] text-slate-400 block mt-0.5">{activeUsersCount} active logins</span>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-slate-400">Super Administrators</span>
            <Shield className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-lg font-black text-blue-600 dark:text-blue-400 mt-1">
            {superAdminCount} Root Admins
          </p>
          <span className="text-[10px] text-slate-400 block mt-0.5">Unrestricted master privileges</span>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-slate-400">Configured Roles</span>
            <ShieldCheck className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-lg font-black text-slate-900 dark:text-white mt-1">
            {roles.length} Roles
          </p>
          <span className="text-[10px] text-slate-400 block mt-0.5">{customRolesCount} custom role matrices</span>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-slate-400">RBAC Enforcement</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            Strict & Active
          </p>
          <span className="text-[10px] text-slate-400 block mt-0.5">Checked on all endpoint routes</span>
        </div>
      </div>

      {/* Tabs & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        {/* Modern Tabs */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'users'
                ? 'bg-primary-50 text-primary-700 dark:bg-primary-950/60 dark:text-primary-300 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Employees Directory
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              activeTab === 'users' ? 'bg-primary-200/60 dark:bg-primary-900/60' : 'bg-slate-200 dark:bg-slate-800'
            }`}>
              {users.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('roles')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'roles'
                ? 'bg-primary-50 text-primary-700 dark:bg-primary-950/60 dark:text-primary-300 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Roles & Permissions Matrix
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              activeTab === 'roles' ? 'bg-primary-200/60 dark:bg-primary-900/60' : 'bg-slate-200 dark:bg-slate-800'
            }`}>
              {roles.length}
            </span>
          </button>
        </div>

        {/* Search & Filters */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={activeTab === 'users' ? 'Search employee name, email...' : 'Search role name...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 w-52 sm:w-60 focus:outline-hidden focus:ring-1 focus:ring-primary-500"
            />
          </div>

          {activeTab === 'users' && (
            <>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
              >
                <option value="">All Roles</option>
                {roles.map((r) => (
                  <option key={r._id} value={r._id}>{r.name}</option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </>
          )}

          <button
            onClick={() => {
              fetchUsers();
              fetchRoles();
            }}
            title="Refresh"
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Tab 1: Employees Directory */}
      {activeTab === 'users' ? (
        <DataTable
          columns={userColumns}
          data={filteredUsers}
          loading={loading}
          emptyMessage="No employees found matching criteria. Click '+ Add Employee' to onboard staff."
        />
      ) : (
        /* Tab 2: Roles & Permissions Cards */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map((r) => {
            const assignedCount = users.filter((u) => u.role?._id === r._id || u.role?.name === r.name).length;
            return (
              <div
                key={r._id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-primary-500" />
                      {r.name}
                    </h4>
                    {r.isSystem ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        System Protected
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                        Custom Role
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    {r.description || 'Configured organization role'}
                  </p>

                  <div className="mt-3 flex items-center gap-2 text-xs">
                    <span className="text-slate-400">Assigned Staff:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {assignedCount} employee{assignedCount !== 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex justify-between items-center mb-2 text-[11px]">
                      <span className="font-bold uppercase text-slate-400">Granted Authorizations</span>
                      <span className="font-mono text-slate-500">
                        {r.name === 'Super Admin' ? 'All' : `${r.permissions?.length || 0} permissions`}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto pr-1">
                      {r.name === 'Super Admin' ? (
                        <div className="p-2 rounded bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-700 dark:text-emerald-300 font-bold w-full flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          Unrestricted SuperAdmin Full Access
                        </div>
                      ) : (
                        r.permissions?.map((p) => (
                          <span
                            key={p}
                            className="text-[10px] px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-mono text-slate-600 dark:text-slate-300"
                          >
                            {p}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom Role Actions */}
                {!r.isSystem && (
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleOpenDeleteRole(r)}
                      title="Delete Custom Role"
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenEditRole(r)}
                      className="text-xs"
                    >
                      <Edit2 className="w-3.5 h-3.5 mr-1" /> Edit Matrix
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 1: ADD EMPLOYEE */}
      {/* ============================================================== */}
      <Modal
        isOpen={showAddUserModal}
        onClose={() => setShowAddUserModal(false)}
        title="Add New Employee"
      >
        <form onSubmit={handleSaveCreateUser} className="space-y-4">
          {userFormError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg text-xs text-rose-600">
              {userFormError}
            </div>
          )}

          <Input
            label="Full Name *"
            required
            value={userForm.name}
            onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
            placeholder="Amit Verma"
          />

          <Input
            label="Email Address *"
            type="email"
            required
            value={userForm.email}
            onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
            placeholder="amit@company.com"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Temporary Password *"
              type="password"
              required
              value={userForm.password}
              onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
              placeholder="••••••••••••"
            />
            <Input
              label="Phone Number"
              value={userForm.phone}
              onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
              placeholder="+91 98765 43210"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Role Assignment *"
              required
              value={userForm.roleId}
              onChange={(e) => setUserForm({ ...userForm, roleId: e.target.value })}
            >
              <option value="">-- Choose Role --</option>
              {roles.map((r) => (
                <option key={r._id} value={r._id}>{r.name}</option>
              ))}
            </Select>

            <Select
              label="Initial Status"
              value={userForm.status}
              onChange={(e) => setUserForm({ ...userForm, status: e.target.value })}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" type="button" onClick={() => setShowAddUserModal(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={userFormLoading} className="font-bold">
              {userFormLoading ? 'Onboarding...' : 'Onboard Employee'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 2: EDIT EMPLOYEE & PASSWORD RESET */}
      {/* ============================================================== */}
      <Modal
        isOpen={showEditUserModal}
        onClose={() => setShowEditUserModal(false)}
        title={`Edit Employee: ${selectedUser?.name}`}
      >
        <form onSubmit={handleSaveEditUser} className="space-y-4">
          {userFormError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg text-xs text-rose-600">
              {userFormError}
            </div>
          )}

          <Input
            label="Full Name *"
            required
            value={userForm.name}
            onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Phone Number"
              value={userForm.phone}
              onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
            />
            <Select
              label="Assigned Role *"
              value={userForm.roleId}
              onChange={(e) => setUserForm({ ...userForm, roleId: e.target.value })}
            >
              {roles.map((r) => (
                <option key={r._id} value={r._id}>{r.name}</option>
              ))}
            </Select>
          </div>

          <Select
            label="Account Status"
            value={userForm.status}
            onChange={(e) => setUserForm({ ...userForm, status: e.target.value })}
          >
            <option value="active">Active (Access Allowed)</option>
            <option value="inactive">Inactive (Access Suspended)</option>
          </Select>

          {/* Optional Password Reset */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
              <Key className="w-3.5 h-3.5 text-amber-500" />
              Reset Login Password (Optional)
            </div>
            <Input
              type="password"
              value={userForm.password}
              onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
              placeholder="Leave blank to keep existing password"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" type="button" onClick={() => setShowEditUserModal(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={userFormLoading} className="font-bold">
              {userFormLoading ? 'Updating...' : 'Save Employee Details'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 3: DELETE EMPLOYEE */}
      {/* ============================================================== */}
      <Modal
        isOpen={showDeleteUserModal}
        onClose={() => setShowDeleteUserModal(false)}
        title="Delete Employee Account"
      >
        <div className="space-y-4">
          {deleteError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg text-xs text-rose-600">
              {deleteError}
            </div>
          )}

          <div className="p-3.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300">
            <p className="font-bold flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-rose-500" />
              De-provisioning Verification
            </p>
            <p className="mt-1">
              Are you sure you want to remove <strong>{selectedUser?.name} ({selectedUser?.email})</strong>?
            </p>
            <p className="mt-1 text-slate-500">
              This will revoke login sessions and soft-delete the profile while preserving historical order and inventory audit trails.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowDeleteUserModal(false)}>
              Keep Employee
            </Button>
            <Button
              variant="danger"
              disabled={deleteLoading}
              onClick={handleConfirmDeleteUser}
            >
              {deleteLoading ? 'Deleting...' : 'Confirm Delete Account'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 4: ROLE BUILDER (CREATE / EDIT ROLE) */}
      {/* ============================================================== */}
      <Modal
        isOpen={showRoleModal}
        onClose={() => setShowRoleModal(false)}
        title={selectedRole ? `Edit Role: ${selectedRole.name}` : 'Custom Role Builder'}
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleSaveRole} className="space-y-4">
          {roleFormError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg text-xs text-rose-600">
              {roleFormError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Role Name *"
              required
              value={roleForm.name}
              onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
              placeholder="e.g. Warehouse Operations Lead"
            />
            <Input
              label="Description"
              value={roleForm.description}
              onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
              placeholder="Oversees shipping vouchers and physical stock"
            />
          </div>

          <div className="pt-2">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-xs font-bold uppercase text-slate-500">
                Granular Permissions Matrix ({roleForm.permissions.length} selected)
              </h4>
            </div>

            <div className="space-y-3.5 max-h-80 overflow-y-auto pr-1">
              {Object.entries(permGroups).map(([cat, perms]) => {
                const allSelected = perms.every((p) => roleForm.permissions.includes(p.code));
                return (
                  <div
                    key={cat}
                    className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                        {cat}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleToggleCategoryPermissions(cat, !allSelected)}
                        className="text-[11px] font-bold text-primary-600 hover:underline"
                      >
                        {allSelected ? 'Clear All' : 'Select All'}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {perms.map((p) => {
                        const isChecked = roleForm.permissions.includes(p.code);
                        return (
                          <button
                            key={p.code}
                            type="button"
                            onClick={() => handleTogglePermission(p.code)}
                            className={`flex items-center gap-2 p-2 rounded-lg border text-left text-xs transition-colors ${
                              isChecked
                                ? 'bg-primary-50 border-primary-300 text-primary-900 dark:bg-primary-950/60 dark:border-primary-700 dark:text-primary-200'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            {isChecked ? (
                              <CheckSquare className="w-4 h-4 text-primary-600 shrink-0" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-400 shrink-0" />
                            )}
                            <span className="font-medium truncate">{p.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" type="button" onClick={() => setShowRoleModal(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={roleFormLoading} className="font-bold">
              {roleFormLoading ? 'Saving...' : 'Save Role Matrix'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 5: DELETE CUSTOM ROLE */}
      {/* ============================================================== */}
      <Modal
        isOpen={showDeleteRoleModal}
        onClose={() => setShowDeleteRoleModal(false)}
        title="Delete Custom Role"
      >
        <div className="space-y-4">
          {deleteError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg text-xs text-rose-600">
              {deleteError}
            </div>
          )}

          <div className="p-3.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300">
            <p className="font-bold flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-rose-500" />
              Role Deletion Check
            </p>
            <p className="mt-1">
              Are you sure you want to delete custom role <strong>{selectedRole?.name}</strong>?
            </p>
            <p className="mt-1 text-slate-500">
              Note: You cannot delete a role if active staff members are still assigned to it.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowDeleteRoleModal(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={deleteLoading}
              onClick={handleConfirmDeleteRole}
            >
              {deleteLoading ? 'Deleting...' : 'Confirm Delete Role'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
