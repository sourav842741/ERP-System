import React, { useState, useEffect, useRef } from 'react';
import {
  User, Lock, Users, ShieldCheck, Mail, Phone,
  Eye, EyeOff, Plus, Edit2, Trash2, CheckCircle2,
  AlertCircle, X, Shield, RefreshCw, KeyRound, LogOut,
  Camera, Upload, Image as ImageIcon
} from 'lucide-react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';

export const ProfileModal = ({ isOpen, onClose }) => {
  const { user, updateCurrentUser, logout, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'password' | 'team' | 'permissions'

  // Tab 1: Profile form state
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');
  const fileInputRef = useRef(null);

  // Tab 2: Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [passLoading, setPassLoading] = useState(false);
  const [passSuccess, setPassSuccess] = useState('');
  const [passError, setPassError] = useState('');

  // Tab 3: Team Users CRUD state
  const [teamUsers, setTeamUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [teamError, setTeamError] = useState('');
  const [teamSuccess, setTeamSuccess] = useState('');

  // Add / Edit User Modal state
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null); // null = Add, object = Edit
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserRole, setNewUserRole] = useState('');
  const [newUserStatus, setNewUserStatus] = useState('active');
  const [userFormLoading, setUserFormLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
      setAvatar(user.avatar || '');
    }
  }, [user]);

  // Handle Profile Picture Upload
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setProfileError('Image size must be under 5MB.');
      return;
    }

    setAvatarLoading(true);
    setProfileError('');
    setProfileSuccess('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const uploadRes = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (uploadRes.data.success) {
        const newAvatarUrl = uploadRes.data.data.url;
        // Persist to user profile
        const res = await api.put('/auth/profile', { avatar: newAvatarUrl });
        if (res.data.success) {
          updateCurrentUser(res.data.data.user);
          setAvatar(newAvatarUrl);
          setProfileSuccess('Profile picture updated successfully!');
          setTimeout(() => setProfileSuccess(''), 4000);
        }
      }
    } catch (err) {
      setProfileError(err.response?.data?.message || err.message || 'Failed to upload photo.');
    } finally {
      setAvatarLoading(false);
      if (e.target) e.target.value = '';
    }
  };

  // Handle Profile Picture Delete / Removal
  const handleDeleteAvatar = async () => {
    setAvatarLoading(true);
    setProfileError('');
    setProfileSuccess('');

    try {
      const res = await api.put('/auth/profile', { avatar: '' });
      if (res.data.success) {
        updateCurrentUser(res.data.data.user);
        setAvatar('');
        setProfileSuccess('Profile picture removed. Reverted to initials avatar.');
        setTimeout(() => setProfileSuccess(''), 4000);
      }
    } catch (err) {
      setProfileError(err.response?.data?.message || err.message || 'Failed to remove photo.');
    } finally {
      setAvatarLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && activeTab === 'team') {
      fetchTeamData();
    }
  }, [isOpen, activeTab]);

  const fetchTeamData = async () => {
    setTeamLoading(true);
    setTeamError('');
    try {
      const [usersRes, rolesRes] = await Promise.all([
        api.get('/users').catch(() => ({ data: { success: false } })),
        api.get('/users/roles/list').catch(() => ({ data: { success: false } }))
      ]);

      if (usersRes.data?.success) {
        setTeamUsers(usersRes.data.data.users || []);
      }
      if (rolesRes.data?.success) {
        setRoles(rolesRes.data.data.roles || []);
      }
    } catch (err) {
      setTeamError('Failed to load team users.');
    } finally {
      setTeamLoading(false);
    }
  };

  // 1. Update Profile (Name, Email, Phone, Avatar)
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');
    setProfileLoading(true);

    try {
      const res = await api.put('/auth/profile', { name, email, phone, avatar });
      if (res.data.success) {
        updateCurrentUser(res.data.data.user);
        setProfileSuccess('Profile details updated successfully!');
        setTimeout(() => setProfileSuccess(''), 4000);
      }
    } catch (err) {
      setProfileError(err.response?.data?.message || err.message || 'Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  };

  // 2. Change Password
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPassError('');
    setPassSuccess('');

    if (newPassword !== confirmPassword) {
      setPassError('New passwords do not match!');
      return;
    }

    if (newPassword.length < 6) {
      setPassError('New password must be at least 6 characters long.');
      return;
    }

    setPassLoading(true);
    try {
      const res = await api.post('/auth/change-password', {
        currentPassword,
        newPassword
      });
      if (res.data.success) {
        setPassSuccess('Password changed successfully! Keep it confidential.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setPassSuccess(''), 4000);
      }
    } catch (err) {
      setPassError(err.response?.data?.message || err.message || 'Password update failed.');
    } finally {
      setPassLoading(false);
    }
  };

  // 3. Open Add User Form
  const handleOpenAddUser = () => {
    setEditingUser(null);
    setNewUserName('');
    setNewUserEmail('');
    setNewUserPassword('');
    setNewUserPhone('');
    setNewUserRole(roles[0]?._id || '');
    setNewUserStatus('active');
    setShowUserForm(true);
  };

  // 4. Open Edit User Form
  const handleOpenEditUser = (u) => {
    setEditingUser(u);
    setNewUserName(u.name || '');
    setNewUserEmail(u.email || '');
    setNewUserPassword('');
    setNewUserPhone(u.phone || '');
    setNewUserRole(u.role?._id || u.roleId || roles[0]?._id || '');
    setNewUserStatus(u.status || 'active');
    setShowUserForm(true);
  };

  // 5. Submit Add / Edit User Form
  const handleSaveUser = async (e) => {
    e.preventDefault();
    setUserFormLoading(true);
    setTeamError('');

    try {
      if (editingUser) {
        // Edit User
        const payload = {
          name: newUserName,
          email: newUserEmail,
          phone: newUserPhone,
          roleId: newUserRole,
          status: newUserStatus
        };
        if (newUserPassword) payload.password = newUserPassword;

        await api.put(`/users/${editingUser._id}`, payload);
        setTeamSuccess(`User "${newUserName}" updated successfully!`);
      } else {
        // Add New User
        await api.post('/users', {
          name: newUserName,
          email: newUserEmail,
          password: newUserPassword,
          phone: newUserPhone,
          roleId: newUserRole
        });
        setTeamSuccess(`New user "${newUserName}" created successfully!`);
      }

      setShowUserForm(false);
      fetchTeamData();
      setTimeout(() => setTeamSuccess(''), 4000);
    } catch (err) {
      setTeamError(err.response?.data?.message || err.message || 'Failed to save user.');
    } finally {
      setUserFormLoading(false);
    }
  };

  // 6. Delete User
  const handleDeleteUser = async (u) => {
    if (!window.confirm(`Are you sure you want to permanently delete user "${u.name}"?`)) {
      return;
    }

    try {
      await api.delete(`/users/${u._id}`);
      setTeamSuccess(`User "${u.name}" deleted.`);
      fetchTeamData();
      setTimeout(() => setTeamSuccess(''), 4000);
    } catch (err) {
      setTeamError(err.response?.data?.message || err.message || 'Failed to delete user.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header with User Info */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            {avatar || user?.avatar ? (
              <img
                src={avatar || user?.avatar}
                alt={user?.name}
                className="w-12 h-12 rounded-2xl object-cover shadow-md ring-2 ring-primary-500/40"
              />
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-indigo-600 text-white font-black text-lg flex items-center justify-center shadow-md uppercase">
                {user?.name?.[0] || 'U'}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-black text-base text-slate-900 dark:text-white">
                  {user?.name || 'Administrator'}
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary-500/10 text-primary-600 dark:text-primary-400 border border-primary-500/20">
                  {user?.role?.name || 'Super Admin'}
                </span>
              </div>
              <p className="text-xs text-slate-400">{user?.email}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-slate-200 dark:border-slate-800 px-6 gap-2 bg-slate-50/40 dark:bg-slate-900/40 overflow-x-auto text-xs font-semibold">
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-3 px-3 border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === 'profile'
                ? 'border-primary-600 text-primary-600 dark:text-primary-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <User className="w-3.5 h-3.5" /> Edit Profile & Photo
          </button>

          <button
            onClick={() => setActiveTab('password')}
            className={`py-3 px-3 border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === 'password'
                ? 'border-primary-600 text-primary-600 dark:text-primary-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" /> Change Password
          </button>

          <button
            onClick={() => setActiveTab('team')}
            className={`py-3 px-3 border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === 'team'
                ? 'border-primary-600 text-primary-600 dark:text-primary-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" /> Team Users (CRUD)
          </button>

          <button
            onClick={() => setActiveTab('permissions')}
            className={`py-3 px-3 border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === 'permissions'
                ? 'border-primary-600 text-primary-600 dark:text-primary-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" /> Role & Permissions
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* TAB 1: EDIT PROFILE */}
          {activeTab === 'profile' && (
            <form onSubmit={handleUpdateProfile} className="space-y-5 max-w-lg mx-auto">
              <div className="text-center pb-1">
                <h4 className="font-heading font-black text-base text-slate-900 dark:text-white">
                  Profile & Account Settings
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Update your profile picture, display name, corporate email, and contact info.
                </p>
              </div>

              {profileSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{profileSuccess}</span>
                </div>
              )}

              {profileError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{profileError}</span>
                </div>
              )}

              {/* Profile Photo Studio */}
              <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
                <div className="relative group shrink-0">
                  {avatar ? (
                    <img
                      src={avatar}
                      alt={name}
                      className="w-20 h-20 rounded-2xl object-cover shadow-lg ring-2 ring-primary-500/50"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500 to-indigo-600 text-white font-black text-2xl flex items-center justify-center shadow-lg uppercase">
                      {name?.[0] || 'U'}
                    </div>
                  )}

                  {avatarLoading && (
                    <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs rounded-2xl flex items-center justify-center text-white">
                      <RefreshCw className="w-6 h-6 animate-spin text-primary-400" />
                    </div>
                  )}
                </div>

                <div className="flex-1 text-center sm:text-left space-y-1.5">
                  <div>
                    <h5 className="font-heading font-black text-xs text-slate-900 dark:text-white">
                      Profile Photo
                    </h5>
                    <p className="text-[11px] text-slate-400">
                      Upload PNG, JPG or WEBP. Photo syncs across the entire ERP workspace.
                    </p>
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept="image/*"
                    className="hidden"
                  />

                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={avatarLoading}
                      className="text-xs h-8 px-3"
                    >
                      <Camera className="w-3.5 h-3.5 mr-1" />
                      {avatar ? 'Change Photo' : 'Upload Photo'}
                    </Button>

                    {avatar && (
                      <button
                        type="button"
                        onClick={handleDeleteAvatar}
                        disabled={avatarLoading}
                        className="px-3 h-8 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg border border-rose-200 dark:border-rose-900/60 transition-colors flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Work Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter work email"
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 9876543210"
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  Role: <strong className="text-slate-600 dark:text-slate-300">{user?.role?.name || 'Super Admin'}</strong>
                </span>
                <Button type="submit" loading={profileLoading} className="px-5 text-xs">
                  Save Profile Changes
                </Button>
              </div>
            </form>
          )}

          {/* TAB 2: CHANGE PASSWORD */}
          {activeTab === 'password' && (
            <form onSubmit={handleChangePassword} className="space-y-4 max-w-lg mx-auto">
              <div className="text-center pb-2">
                <h4 className="font-heading font-black text-base text-slate-900 dark:text-white">
                  Update Password
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Verify current password to set a new secure cryptographic password.
                </p>
              </div>

              {passSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{passSuccess}</span>
                </div>
              )}

              {passError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{passError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Current Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showCurrentPass ? 'text' : 'password'}
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="pt-2 text-right">
                <Button type="submit" loading={passLoading} className="px-5 text-xs">
                  Update Password
                </Button>
              </div>
            </form>
          )}

          {/* TAB 3: TEAM USERS CRUD */}
          {activeTab === 'team' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-heading font-black text-base text-slate-900 dark:text-white">
                    Team Members & Employees
                  </h4>
                  <p className="text-xs text-slate-400">
                    Add new employees, update details, or remove user access.
                  </p>
                </div>

                <Button size="sm" onClick={handleOpenAddUser} className="text-xs">
                  <Plus className="w-3.5 h-3.5 mr-1" /> + Add Member
                </Button>
              </div>

              {teamSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{teamSuccess}</span>
                </div>
              )}

              {teamError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{teamError}</span>
                </div>
              )}

              {/* User Add / Edit Modal Drawer */}
              {showUserForm && (
                <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-2xl p-4 shadow-lg space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                    <span className="font-heading font-bold text-xs text-slate-900 dark:text-white">
                      {editingUser ? `Edit Member: ${editingUser.name}` : 'Add New Team Member'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowUserForm(false)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <form onSubmit={handleSaveUser} className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={newUserName}
                        onChange={(e) => setNewUserName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        required
                        value={newUserEmail}
                        onChange={(e) => setNewUserEmail(e.target.value)}
                        placeholder="john@company.com"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        {editingUser ? 'New Password (Optional)' : 'Password *'}
                      </label>
                      <input
                        type="password"
                        required={!editingUser}
                        value={newUserPassword}
                        onChange={(e) => setNewUserPassword(e.target.value)}
                        placeholder={editingUser ? 'Leave blank to keep current' : '••••••••'}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Role *
                      </label>
                      <select
                        value={newUserRole}
                        onChange={(e) => setNewUserRole(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-900 dark:text-white"
                      >
                        {roles.map((r) => (
                          <option key={r._id} value={r._id}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Phone
                      </label>
                      <input
                        type="text"
                        value={newUserPhone}
                        onChange={(e) => setNewUserPhone(e.target.value)}
                        placeholder="+91 9876543210"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Status
                      </label>
                      <select
                        value={newUserStatus}
                        onChange={(e) => setNewUserStatus(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-900 dark:text-white"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive / Suspended</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2 flex items-center justify-end gap-2 pt-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => setShowUserForm(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" size="sm" loading={userFormLoading}>
                        {editingUser ? 'Save Changes' : 'Create User'}
                      </Button>
                    </div>
                  </form>
                </div>
              )}

              {/* Users List */}
              {teamLoading ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-primary-500" />
                  Loading team members...
                </div>
              ) : teamUsers.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 border border-dashed rounded-xl">
                  No other team members found. Click "+ Add Member" to invite staff.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  {teamUsers.map((u) => (
                    <div
                      key={u._id}
                      className="p-3 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/40 flex items-center justify-between gap-3 text-xs transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {u.avatar ? (
                          <img
                            src={u.avatar}
                            alt={u.name}
                            className="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-primary-500/30"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                            {u.name?.[0] || 'U'}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 dark:text-white truncate">
                              {u.name}
                            </span>
                            {u._id === user?._id && (
                              <span className="text-[10px] bg-primary-500/10 text-primary-600 dark:text-primary-400 px-1.5 py-0.2 rounded font-bold">
                                You
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate">{u.email}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {u.role?.name || 'Staff'}
                        </span>
                        <span
                          className={`w-2 h-2 rounded-full ${
                            u.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}
                          title={u.status}
                        />

                        {/* Edit & Delete Action Buttons */}
                        <button
                          onClick={() => handleOpenEditUser(u)}
                          title="Edit User"
                          className="p-1.5 text-slate-400 hover:text-primary-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {u._id !== user?._id && (
                          <button
                            onClick={() => handleDeleteUser(u)}
                            title="Delete User"
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: ROLE & PERMISSIONS */}
          {activeTab === 'permissions' && (
            <div className="space-y-4 max-w-lg mx-auto">
              <div className="text-center pb-2">
                <div className="w-12 h-12 rounded-2xl bg-primary-500/10 text-primary-600 dark:text-primary-400 border border-primary-500/20 flex items-center justify-center mx-auto mb-2">
                  <Shield className="w-6 h-6" />
                </div>
                <h4 className="font-heading font-black text-base text-slate-900 dark:text-white">
                  {user?.role?.name || 'Super Admin'}
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Assigned permissions & capability scope for your account.
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Active Capabilities
                </div>
                {user?.role?.name === 'Super Admin' ? (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Full System Super Administrator: All permissions granted.</span>
                  </div>
                ) : (
                  (user?.role?.permissions || []).map((perm, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-primary-500 shrink-0" />
                      <span className="font-mono text-[11px]">{perm}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between text-xs">
          <button
            onClick={() => {
              onClose();
              logout();
            }}
            className="text-rose-600 hover:text-rose-700 dark:text-rose-400 flex items-center gap-1.5 font-semibold transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign Out of ERP
          </button>

          <Button size="sm" variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
