import React from 'react';

interface SkeletonProps {
  className?: string;
  lines?: number;
  width?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', lines = 1, width = '100%' }) => (
  <div className={`flex flex-col gap-2 ${className}`} role="status" aria-label="Cargando">
    {Array.from({ length: lines }).map((_, i) => (
      <div key={i} className="animate-pulse bg-[#1e2d42]/50 rounded h-3" style={{ width: i === lines - 1 ? '60%' : width }} />
    ))}
  </div>
);

export const CardSkeleton: React.FC = () => (
  <div className="bg-[#0d1520] border border-[#1e2d42] rounded-lg p-4 animate-pulse" role="status" aria-label="Cargando">
    <div className="h-3 bg-[#1e2d42]/50 rounded w-1/3 mb-3" />
    <div className="h-6 bg-[#1e2d42]/50 rounded w-1/2 mb-2" />
    <div className="h-3 bg-[#1e2d42]/50 rounded w-2/3" />
  </div>
);

export const TableSkeleton: React.FC<{ rows?: number; cols?: number }> = ({ rows = 3, cols = 4 }) => (
  <div className="flex flex-col gap-2" role="status" aria-label="Cargando tabla">
    {Array.from({ length: rows }).map((_, r) => (
      <div key={r} className="flex gap-3">
        {Array.from({ length: cols }).map((_, c) => (
          <div key={c} className="h-3 bg-[#1e2d42]/50 animate-pulse rounded flex-1" />
        ))}
      </div>
    ))}
  </div>
);
