import React, { useState, useEffect } from 'react';
import {
  ShieldCheck, Users, Plus, Edit, Trash2, CheckSquare, Square, Shield
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

  // Modals
  const [showUserModal, setShowUserModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState(null);

  // User form
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [userRole, setUserRole] = useState('');

  // Role form
  const [roleName, setRoleName] = useState('');
  const [roleDesc, setRoleDesc] = useState('');
  const [selectedPerms, setSelectedPerms] = useState([]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/users');
      if (res.data.success) setUsers(res.data.data.users);
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
        setRoles(res.data.data.roles);
        setAvailablePermissions(res.data.data.availablePermissions || []);
      }
    } catch (err) {}
  };

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await api.post('/users', {
        name: userName,
        email: userEmail,
        password: userPassword,
        phone: userPhone,
        roleId: userRole
      });
      setShowUserModal(false);
      setUserName('');
      setUserEmail('');
      setUserPassword('');
      setUserPhone('');
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const handleSaveRole = async (e) => {
    e.preventDefault();
    try {
      if (editingRole) {
        await api.put(`/users/roles/${editingRole._id}`, {
          name: roleName,
          description: roleDesc,
          permissions: selectedPerms
        });
      } else {
        await api.post('/users/roles/create', {
          name: roleName,
          description: roleDesc,
          permissions: selectedPerms
        });
      }
      setShowRoleModal(false);
      fetchRoles();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const togglePermission = (code) => {
    if (selectedPerms.includes(code)) {
      setSelectedPerms(selectedPerms.filter((p) => p !== code));
    } else {
      setSelectedPerms([...selectedPerms, code]);
    }
  };

  // Group permissions by category
  const permGroups = availablePermissions.reduce((acc, p) => {
    if (!acc[p.category]) acc[p.category] = [];
    acc[p.category].push(p);
    return acc;
  }, {});

  const userColumns = [
    {
      header: 'Employee Name & Email',
      render: (row) => (
        <div>
          <p className="font-bold text-slate-900 dark:text-white leading-tight">{row.name}</p>
          <span className="text-xs text-slate-400">{row.email}</span>
        </div>
      )
    },
    {
      header: 'Assigned Role',
      render: (row) => (
        <Badge variant={row.role?.name === 'Super Admin' ? 'primary' : 'neutral'} size="sm">
          <Shield className="w-3 h-3 mr-1" /> {row.role?.name || 'Staff'}
        </Badge>
      )
    },
    {
      header: 'Phone',
      render: (row) => <span className="text-xs text-slate-500">{row.phone || 'N/A'}</span>
    },
    {
      header: 'Status',
      render: (row) => (
        <Badge variant={row.status === 'active' ? 'success' : 'neutral'} size="sm">
          {row.status}
        </Badge>
      )
    },
    {
      header: 'Last Active',
      render: (row) => (
        <span className="text-xs text-slate-400">
          {row.lastLogin ? new Date(row.lastLogin).toLocaleDateString() : 'Never logged in'}
        </span>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Employees & Granular RBAC Permissions
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Role-Based Access Control matrix (Section 25). Create custom roles and toggle feature permissions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => {
            setEditingRole(null);
            setRoleName('');
            setRoleDesc('');
            setSelectedPerms([]);
            setShowRoleModal(true);
          }} variant="outline" size="sm">
            <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Create Custom Role
          </Button>
          <Button onClick={() => setShowUserModal(true)} size="sm">
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Employee
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6">
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-2.5 text-xs font-bold transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === 'users'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" /> Employees Directory ({users.length})
        </button>
        <button
          onClick={() => setActiveTab('roles')}
          className={`pb-2.5 text-xs font-bold transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === 'roles'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <ShieldCheck className="w-4 h-4" /> Roles & Permissions ({roles.length})
        </button>
      </div>

      {activeTab === 'users' ? (
        <DataTable columns={userColumns} data={users} loading={loading} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {roles.map((r) => (
            <div key={r._id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">{r.name}</h4>
                  {r.isSystem && <Badge variant="primary" size="sm">System Role</Badge>}
                </div>
                <p className="text-xs text-slate-400 mt-1">{r.description || 'Custom organizational role'}</p>

                <div className="mt-4">
                  <span className="text-[11px] font-bold uppercase text-slate-400 block mb-2">
                    Granted Permissions ({r.permissions?.length || 0})
                  </span>
                  <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                    {r.name === 'Super Admin' ? (
                      <span className="text-[11px] text-emerald-600 font-bold">✓ Full Unrestricted SuperAdmin Access</span>
                    ) : (
                      r.permissions?.map((p) => (
                        <span key={p} className="text-[10px] px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-mono text-slate-600 dark:text-slate-300">
                          {p}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {!r.isSystem && (
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingRole(r);
                      setRoleName(r.name);
                      setRoleDesc(r.description || '');
                      setSelectedPerms(r.permissions || []);
                      setShowRoleModal(true);
                    }}
                  >
                    <Edit className="w-3.5 h-3.5 mr-1" /> Edit Permissions
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Employee Modal */}
      <Modal
        isOpen={showUserModal}
        onClose={() => setShowUserModal(false)}
        title="Add New Employee"
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          <Input
            label="Full Name *"
            required
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="Amit Verma"
          />
          <Input
            label="Email Address *"
            type="email"
            required
            value={userEmail}
            onChange={(e) => setUserEmail(e.target.value)}
            placeholder="amit@company.com"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Temporary Password *"
              type="password"
              required
              value={userPassword}
              onChange={(e) => setUserPassword(e.target.value)}
              placeholder="••••••••••••"
            />
            <Select
              label="Role Assignment *"
              required
              value={userRole}
              onChange={(e) => setUserRole(e.target.value)}
            >
              <option value="">-- Choose Role --</option>
              {roles.map((r) => (
                <option key={r._id} value={r._id}>{r.name}</option>
              ))}
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-3">
            <Button variant="outline" onClick={() => setShowUserModal(false)}>Cancel</Button>
            <Button type="submit">Create Employee</Button>
          </div>
        </form>
      </Modal>

      {/* Role Builder Modal (Section 25 Custom Role Builder) */}
      <Modal
        isOpen={showRoleModal}
        onClose={() => setShowRoleModal(false)}
        title={editingRole ? `Edit Role: ${editingRole.name}` : 'Custom Role Builder'}
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleSaveRole} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Role Name *"
              required
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
              placeholder="e.g. Warehouse Dispatcher"
            />
            <Input
              label="Description"
              value={roleDesc}
              onChange={(e) => setRoleDesc(e.target.value)}
              placeholder="Handles packing slips and warehouse stock intake"
            />
          </div>

          <div className="pt-2">
            <h4 className="text-xs font-bold uppercase text-slate-500 mb-2">Granular Permissions Matrix</h4>
            <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
              {Object.entries(permGroups).map(([cat, perms]) => (
                <div key={cat} className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider block mb-2">
                    {cat}
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {perms.map((p) => {
                      const isChecked = selectedPerms.includes(p.code);
                      return (
                        <button
                          key={p.code}
                          type="button"
                          onClick={() => togglePermission(p.code)}
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
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button variant="outline" onClick={() => setShowRoleModal(false)}>Cancel</Button>
            <Button type="submit">Save Role</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
