import React from 'react';
import { Search } from 'lucide-react';
import { Input } from './primitives';

interface SearchBarProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}

export function SearchBar({ value, onChange, placeholder = 'Buscar...' }: SearchBarProps) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dim pointer-events-none" />
      <Input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-9"
      />
    </div>
  );
}
