import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export default function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="p-5 rounded-2xl bg-coffee-300/5 border border-coffee-300/10 mb-4">
        <Icon size={32} className="text-coffee-600" />
      </div>
      <h3 className="text-coffee-300 font-semibold text-base mb-1">{title}</h3>
      {description && <p className="text-coffee-600 text-sm max-w-xs mb-4">{description}</p>}
      {action}
    </div>
  );
}
