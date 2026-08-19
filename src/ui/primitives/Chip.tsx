import React from 'react';
import { LucideIcon } from 'lucide-react';

export type ChipVariant = 'default' | 'active' | 'accent';

interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ChipVariant;
  icon?: LucideIcon;
  children?: React.ReactNode;
}

const variantClasses: Record<ChipVariant, string> = {
  default: 'chip',
  active: 'chip chip-active',
  accent: 'chip border-accent/45 bg-accent/10 text-accent2',
};

export const Chip: React.FC<ChipProps> = ({
  variant = 'default',
  icon,
  children,
  className = '',
  ...props
}) => {
  const Icon = icon;

  return (
    <button className={`${variantClasses[variant]} ${className}`} {...props}>
      {Icon && <Icon className="w-3.5 h-3.5" aria-hidden="true" />}
      {children}
    </button>
  );
};