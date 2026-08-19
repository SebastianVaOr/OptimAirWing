import React from 'react';

export type BadgeVariant = 'ok' | 'warn' | 'bad' | 'default' | 'accent';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  children: React.ReactNode;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-line text-lo',
  ok: 'bg-ok/15 text-ok border-ok/40',
  warn: 'bg-warn/15 text-warn border-warn/40',
  bad: 'bg-bad/15 text-bad border-bad/40',
  accent: 'bg-accent/15 text-accent2 border-accent/40',
};

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  children,
  className = '',
  ...props
}) => {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};