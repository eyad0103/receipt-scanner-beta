import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div
        className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl"
        style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}
      >
        {icon}
      </div>
      <h3 className="mb-2 text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
        {title}
      </h3>
      <p className="mb-6 max-w-sm text-sm" style={{ color: 'var(--text-tertiary)' }}>
        {description}
      </p>
      {action}
    </div>
  );
}
