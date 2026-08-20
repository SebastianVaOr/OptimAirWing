import React from 'react';
import { Inbox } from 'lucide-react';
import { Button } from './primitives';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className="w-12 h-12 rounded-full bg-panel2 flex items-center justify-center mb-3 text-dim">
        {icon || <Inbox className="w-6 h-6" />}
      </div>
      <p className="text-sm font-semibold text-lo">{title}</p>
      {description && <p className="text-xs text-dim mt-1 max-w-xs">{description}</p>}
      {action && (
        <Button
          variant="secondary"
          size="sm"
          className="mt-4"
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}
