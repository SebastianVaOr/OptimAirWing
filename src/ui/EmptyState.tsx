import React from 'react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className="w-12 h-12 rounded-full bg-[#131f2e] flex items-center justify-center mb-3 text-[#5a7390]">
        {icon || <Inbox className="w-6 h-6" />}
      </div>
      <p className="text-sm font-semibold text-[#9aaec9]">{title}</p>
      {description && <p className="text-xs text-[#5a7390] mt-1 max-w-xs">{description}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 px-4 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold hover:bg-cyan-500/20 transition cursor-pointer"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
