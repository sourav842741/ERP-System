import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Package, Boxes, ShoppingCart, Store,
  Truck, Warehouse, Users, DollarSign, BarChart3,
  ShieldCheck, Settings, LogOut, ChevronRight, UserCog,
  Images, Wand2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ProfileModal } from './ProfileModal';

const NAV_ITEMS = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Products', path: '/products', icon: Package },
  { name: 'Central Inventory', path: '/inventory', icon: Boxes },
  { name: 'Orders', path: '/orders', icon: ShoppingCart },
  { name: 'Marketplaces', path: '/marketplaces', icon: Store },
  { name: 'Cloud Media Assets', path: '/media', icon: Images },
  { name: 'AI Studio & Crop', path: '/studio', icon: Wand2 },
  { name: 'Purchases', path: '/purchases', icon: Truck },
  { name: 'Warehouses', path: '/warehouses', icon: Warehouse },
  { name: 'Customers', path: '/customers', icon: Users },
  { name: 'Finance & P&L', path: '/finance', icon: DollarSign },
  { name: 'Reports', path: '/reports', icon: BarChart3 },
  { name: 'Employees & RBAC', path: '/employees', icon: ShieldCheck },
  { name: 'Settings', path: '/settings', icon: Settings },
];

export const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const [showProfileModal, setShowProfileModal] = useState(false);

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-40 h-screen w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Nexus ERP"
              className="w-9 h-9 rounded-xl object-contain shadow-md ring-1 ring-primary-500/20 bg-slate-950 p-0.5"
            />
            <div>
              <h1 className="font-heading font-black text-sm text-slate-900 dark:text-white leading-tight tracking-tight">
                Nexus ERP
              </h1>
              <span className="text-[10px] font-bold text-primary-600 dark:text-primary-400 uppercase tracking-widest">
                Enterprise OS
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Main Menu
          </div>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => onClose && onClose()}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-150 group ${
                    isActive
                      ? 'bg-primary-50 text-primary-600 dark:bg-primary-950/60 dark:text-primary-400'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/60'
                  }`
                }
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </NavLink>
            );
          })}
        </div>

        {/* Bottom User Area */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800">
          <div
            onClick={() => setShowProfileModal(true)}
            title="Click to Edit Profile, Change Password & Manage Team"
            className="flex items-center justify-between p-2 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800/90 cursor-pointer border border-transparent hover:border-primary-500/30 transition-all group"
          >
            <div className="flex items-center gap-2.5 overflow-hidden">
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user?.name}
                  className="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-primary-500/30 group-hover:ring-2 group-hover:ring-primary-500/60 transition-all"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300 flex items-center justify-center font-bold text-xs uppercase shrink-0 group-hover:ring-2 group-hover:ring-primary-500/40 transition-all">
                  {user?.name?.[0] || 'A'}
                </div>
              )}
              <div className="overflow-hidden">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                  {user?.name || 'Administrator'}
                </p>
                <p className="text-[10px] text-slate-400 truncate flex items-center gap-1">
                  <span>{user?.role?.name || 'Super Admin'}</span>
                  <span className="text-[9px] text-primary-500 opacity-0 group-hover:opacity-100 transition-opacity font-bold">
                    • Edit
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowProfileModal(true);
                }}
                title="Account Settings"
                className="p-1.5 text-slate-400 hover:text-primary-600 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors"
              >
                <UserCog className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  logout();
                }}
                title="Logout"
                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Interactive Profile & Account Management Modal */}
      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />
    </>
  );
};
