import React from 'react';

export const Badge = ({
  children,
  variant = 'neutral',
  size = 'md',
  className = ''
}) => {
  const variants = {
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800',
    warning: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
    danger: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800',
    info: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800',
    primary: 'bg-primary-50 text-primary-700 border-primary-200 dark:bg-primary-950/50 dark:text-primary-300 dark:border-primary-800',
    neutral: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
  };

  const sizes = {
    sm: 'text-[11px] px-1.5 py-0.5',
    md: 'text-xs px-2.5 py-0.5'
  };

  return (
    <span className={`inline-flex items-center font-medium border rounded-full ${variants[variant] || variants.neutral} ${sizes[size]} ${className}`}>
      {children}
    </span>
  );
};
