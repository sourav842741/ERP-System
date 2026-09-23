import React, { useState, useRef, useEffect } from 'react';
import {
  Menu, Search, Bell, Sun, Moon, Palette, Check,
  CheckCheck, AlertCircle, ShoppingBag, PackageX, ExternalLink
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { ProfileModal } from './ProfileModal';
import api from '../../api/client';

const ACCENT_COLORS = [
  { id: 'indigo', name: 'Indigo', bg: 'bg-indigo-600' },
  { id: 'blue', name: 'Ocean Blue', bg: 'bg-blue-600' },
  { id: 'emerald', name: 'Emerald', bg: 'bg-emerald-600' },
  { id: 'violet', name: 'Royal Violet', bg: 'bg-violet-600' },
  { id: 'rose', name: 'Crimson Rose', bg: 'bg-rose-600' },
  { id: 'amber', name: 'Sunset Amber', bg: 'bg-amber-600' },
  { id: 'cyan', name: 'Deep Cyan', bg: 'bg-cyan-600' },
  { id: 'slate', name: 'Neutral Slate', bg: 'bg-slate-700' }
];

export const TopBar = ({ onOpenSidebar, onOpenSearch }) => {
  const { user } = useAuth();
  const { theme, setTheme, accentColor, setAccentColor } = useTheme();
  const { notifications, unreadCount, markAllRead, markAsRead, toastMessage } = useSocket();

  const [showNotifs, setShowNotifs] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const notifRef = useRef(null);
  const paletteRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false);
      if (paletteRef.current && !paletteRef.current.contains(e.target)) setShowPalette(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-30 h-16 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 lg:px-8 flex items-center justify-between">
        {/* Left: Mobile Toggle & Global Search Trigger */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenSidebar}
            className="lg:hidden p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 lg:hidden">
            <img
              src="/logo.png"
              alt="Nexus ERP"
              className="w-7 h-7 rounded-lg object-contain bg-slate-950 p-0.5 shadow-sm"
            />
            <span className="font-heading font-black text-xs text-slate-900 dark:text-white">Nexus ERP</span>
          </div>

          {/* Quick Search Button */}
          <button
            onClick={onOpenSearch}
            className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-400 bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 rounded-lg border border-slate-200/60 dark:border-slate-700/60 transition-colors w-48 sm:w-72 justify-between"
          >
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5" />
              <span>Search products, SKU, orders...</span>
            </div>
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded shadow-2xs">
              Ctrl+K
            </kbd>
          </button>
        </div>

        {/* Right: Theme, Palette, Notifications */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Accent Color Picker */}
          <div className="relative" ref={paletteRef}>
            <button
              onClick={() => setShowPalette(!showPalette)}
              title="Change Accent Color"
              className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Palette className="w-4 h-4" />
            </button>
            {showPalette && (
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-3 z-50">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Accent Theme</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {ACCENT_COLORS.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setAccentColor(c.id);
                        setShowPalette(false);
                      }}
                      className="flex flex-col items-center gap-1 p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      <div className={`w-6 h-6 rounded-full ${c.bg} flex items-center justify-center text-white shadow-xs`}>
                        {accentColor === c.id && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                      <span className="text-[10px] text-slate-600 dark:text-slate-300 font-medium">{c.name.split(' ')[0]}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Theme Switcher (Dark / Light) */}
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            title="Toggle theme"
            className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Notifications Dropdown */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setShowNotifs(!showNotifs)}
              className="relative p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900 animate-pulse" />
              )}
            </button>

            {showNotifs && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between p-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="px-1.5 py-0.2 bg-primary-100 text-primary-700 dark:bg-primary-950 dark:text-primary-300 text-[10px] font-bold rounded-full">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-[11px] font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1"
                    >
                      <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center px-4">
                      <CheckCheck className="w-8 h-8 mx-auto text-emerald-500/80 mb-2" />
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">All caught up!</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">No unread notifications.</p>
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif._id}
                        className={`p-3 text-xs hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors ${
                          !notif.isRead ? 'bg-primary-50/30 dark:bg-primary-950/20' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2.5">
                          <div className="flex items-start gap-2.5 flex-1 min-w-0">
                            <div className="mt-0.5 shrink-0">
                              {notif.type === 'NEW_ORDER' ? (
                                <ShoppingBag className="w-4 h-4 text-emerald-500" />
                              ) : notif.type === 'OUT_OF_STOCK' || notif.type === 'LOW_STOCK' ? (
                                <PackageX className="w-4 h-4 text-rose-500" />
                              ) : (
                                <AlertCircle className="w-4 h-4 text-primary-500" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-slate-800 dark:text-slate-200 leading-tight truncate">
                                {notif.title}
                              </p>
                              <p className="text-slate-500 dark:text-slate-400 mt-0.5 leading-snug break-words">
                                {notif.message}
                              </p>
                              <span className="text-[10px] text-slate-400 mt-1 block">
                                {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(notif._id);
                            }}
                            title="Mark as read and dismiss"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors shrink-0"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Avatar Quick Trigger */}
          <button
            onClick={() => setShowProfileModal(true)}
            title="My Profile, Password & Team Management"
            className="flex items-center gap-2 p-1 pl-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
          >
            <div className="hidden sm:block text-right">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-none">
                {user?.name || 'Administrator'}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5 leading-none">
                {user?.role?.name || 'Super Admin'}
              </p>
            </div>
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user?.name}
                className="w-8 h-8 rounded-xl object-cover shrink-0 shadow-xs ring-1 ring-primary-500/30"
              />
            ) : (
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-indigo-600 text-white flex items-center justify-center font-bold text-xs uppercase shadow-xs">
                {user?.name?.[0] || 'A'}
              </div>
            )}
          </button>
        </div>
      </header>

      {/* Interactive Profile & Account Management Modal */}
      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />

      {/* Floating Socket.IO Live Toast */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-slate-800 dark:border-slate-200 animate-in slide-in-from-bottom-5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          <div>
            <p className="text-xs font-bold leading-none">{toastMessage.title}</p>
            <p className="text-[11px] opacity-80 mt-0.5 leading-tight">{toastMessage.message}</p>
          </div>
        </div>
      )}
    </>
  );
};
