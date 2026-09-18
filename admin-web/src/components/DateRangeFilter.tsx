import clsx from 'clsx';
import { Card, Input } from './ui';
import { PRESET_LABELS, rangeForPreset, toDateInputValue, type DateRangePreset } from '../lib/dateRange';

const PRESETS: DateRangePreset[] = ['today', 'yesterday', 'last7', 'last30', 'last6months'];

interface DateRangeFilterProps {
  preset: DateRangePreset;
  onPresetChange: (preset: DateRangePreset) => void;
  customFrom: string;
  customTo: string;
  onCustomFromChange: (value: string) => void;
  onCustomToChange: (value: string) => void;
}

export function DateRangeFilter({
  preset,
  onPresetChange,
  customFrom,
  customTo,
  onCustomFromChange,
  onCustomToChange,
}: DateRangeFilterProps) {
  return (
    <Card className="flex flex-wrap items-center gap-2 p-3">
      {PRESETS.map((p) => (
        <button
          key={p}
          onClick={() => onPresetChange(p)}
          className={clsx(
            'rounded-lg px-3 py-1.5 text-sm font-medium transition',
            preset === p ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          )}
        >
          {PRESET_LABELS[p]}
        </button>
      ))}

      <button
        onClick={() => onPresetChange('custom')}
        className={clsx(
          'rounded-lg px-3 py-1.5 text-sm font-medium transition',
          preset === 'custom' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100'
        )}
      >
        {PRESET_LABELS.custom}
      </button>

      {preset === 'custom' && (
        <div className="flex items-center gap-2 pl-2">
          <Input
            type="date"
            value={customFrom}
            max={customTo || toDateInputValue(new Date())}
            onChange={(e) => onCustomFromChange(e.target.value)}
            className="w-auto"
          />
          <span className="text-sm text-slate-400">to</span>
          <Input
            type="date"
            value={customTo}
            min={customFrom}
            max={toDateInputValue(new Date())}
            onChange={(e) => onCustomToChange(e.target.value)}
            className="w-auto"
          />
        </div>
      )}
    </Card>
  );
}

/** Resolves the current preset/custom selection into concrete from/to Date objects. */
export function resolveDateRange(
  preset: DateRangePreset,
  customFrom: string,
  customTo: string
): { from: Date; to: Date } | null {
  if (preset !== 'custom') return rangeForPreset(preset);
  if (!customFrom || !customTo) return null;
  const from = new Date(`${customFrom}T00:00:00`);
  const to = new Date(`${customTo}T23:59:59.999`);
  if (from > to) return null;
  return { from, to };
}
