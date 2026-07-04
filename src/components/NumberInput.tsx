'use client';

import { useState } from 'react';

// Free-form text while typing; clamps to [min, max] on blur/Enter. Negative
// input is blocked via onKeyDown ('-' key) because type="number" inputs
// report "" (not "-") for partial input, making onChange unusable for this.
export default function NumberInput({
  value,
  min,
  max,
  onChange,
  className,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  className?: string;
}) {
  const [str, setStr] = useState(String(value));

  const commit = () => {
    const parsed = parseInt(str, 10);
    const clamped = isNaN(parsed) ? min : Math.max(min, Math.min(max, parsed));
    onChange(clamped);
    setStr(String(clamped));
  };

  return (
    <input
      type="number"
      min={min}
      max={max}
      value={str}
      onChange={e => {
        const val = e.target.value;
        if (min > 0) {
          const parsed = parseInt(val, 10);
          if (!isNaN(parsed) && parsed === 0) return;
        }
        setStr(val);
      }}
      onBlur={commit}
      onKeyDown={e => {
        if (e.key === '-') { e.preventDefault(); return; }
        if (e.key === 'Enter') commit();
      }}
      className={`${className ?? ''} bg-card border border-grid rounded-md text-ink font-mono text-sm focus:outline-none focus:border-pen focus:ring-1 focus:ring-pen`}
    />
  );
}
