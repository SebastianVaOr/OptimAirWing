import React from 'react';

interface LabelProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  as?: 'span' | 'label';
  htmlFor?: string;
}

export const Label: React.FC<LabelProps> = ({
  children,
  as: Component = 'span',
  htmlFor,
  className = '',
  ...props
}) => {
  return (
    <Component
      className={`hud-label ${className}`}
      {...(Component === 'label' ? { htmlFor } : {})}
      {...props}
    >
      {children}
    </Component>
  );
};