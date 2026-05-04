'use client';

import { useState } from 'react';

export const MAX_WEIGHT = 5;

export default function WeightInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [str, setStr] = useState(String(value));

  const commit = () => {
    const parsed = parseInt(str, 10);
    const clamped = isNaN(parsed) ? 0 : Math.max(0, Math.min(MAX_WEIGHT, parsed));
    onChange(clamped);
    setStr(String(clamped));
  };

  return (
    <input
      type="number"
      min={0}
      max={MAX_WEIGHT}
      value={str}
      onChange={e => setStr(e.target.value)}
      onBlur={commit}
      onKeyDown={e => {
        if (e.key === '-') { e.preventDefault(); return; }
        if (e.key === 'Enter') commit();
      }}
      className="w-14 bg-slate-700 border border-slate-600 rounded-lg px-2 py-1 text-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
    />
  );
}
