'use client';

import NumberInput from '@/components/NumberInput';

export const MAX_WEIGHT = 5;

export default function WeightInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <NumberInput
      value={value}
      min={0}
      max={MAX_WEIGHT}
      onChange={onChange}
      className="w-14 px-2 py-1"
    />
  );
}
