import React from 'react';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'gold';

const classes: Record<BadgeVariant, string> = {
  default: 'bg-coffee-800/40 text-coffee-400 border-coffee-700/30',
  success: 'bg-green-900/40 text-green-400 border-green-700/30',
  warning: 'bg-amber-900/40 text-amber-400 border-amber-700/30',
  danger:  'bg-red-900/40 text-red-400 border-red-700/30',
  info:    'bg-blue-900/40 text-blue-400 border-blue-700/30',
  gold:    'bg-coffee-300/15 text-coffee-300 border-coffee-300/20',
};

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

export default function Badge({ variant = 'default', children, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${classes[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

export function statusBadgeVariant(status: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    pending:   'warning',
    confirmed: 'info',
    shipped:   'gold',
    delivered: 'success',
    cancelled: 'danger',
    paid:      'success',
    partial:   'warning',
    unpaid:    'danger',
    raw:       'info',
    roasted:   'gold',
    packaging: 'default',
  };
  return map[status] ?? 'default';
}
