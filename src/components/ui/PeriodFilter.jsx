import { useEffect, useMemo, useState } from 'react';
import { getCurrentPeriod } from '../../utils/formatters';

const MONTHS = [
  ['1', 'Jan'],
  ['2', 'Feb'],
  ['3', 'Mar'],
  ['4', 'Apr'],
  ['5', 'May'],
  ['6', 'Jun'],
  ['7', 'Jul'],
  ['8', 'Aug'],
  ['9', 'Sep'],
  ['10', 'Oct'],
  ['11', 'Nov'],
  ['12', 'Dec'],
];

export const PeriodFilter = ({ period, onChange, onApply, minPeriod, className = '', compact = false }) => {
  const current = getCurrentPeriod();
  const [draft, setDraft] = useState(period);
  const earliest = minPeriod || { month: 1, year: current.year - 5 };
  const years = Array.from(
    { length: Math.max(1, current.year - earliest.year + 1) },
    (_, index) => current.year - index,
  );
  const active = onApply ? draft : period;
  const monthOptions = useMemo(
    () => MONTHS.filter(([value]) => {
      const month = Number(value);
      const afterStart = Number(active.year) > earliest.year || month >= earliest.month;
      const beforeNow = Number(active.year) < current.year || month <= current.month;
      return afterStart && beforeNow;
    }),
    [active.year, current.month, current.year, earliest.month, earliest.year],
  );

  useEffect(() => {
    setDraft(period);
  }, [period]);

  useEffect(() => {
    if (active.year === current.year && active.month > current.month) {
      const nextPeriod = { ...active, month: current.month };
      if (onApply) setDraft(nextPeriod);
      else onChange(nextPeriod);
    }
    if (active.year === earliest.year && active.month < earliest.month) {
      const nextPeriod = { ...active, month: earliest.month };
      if (onApply) setDraft(nextPeriod);
      else onChange(nextPeriod);
    }
  }, [active, current.month, current.year, earliest.month, earliest.year, onApply, onChange]);

  const updateDraft = (nextPeriod) => {
    if (onApply) setDraft(nextPeriod);
    else onChange(nextPeriod);
  };

  return (
    <div className={`inline-flex max-w-full flex-nowrap items-center gap-1.5 overflow-x-auto ${className}`}>
      <select
        value={active.month}
        onChange={(event) => updateDraft({ ...active, month: Number(event.target.value) })}
        className={`${compact ? 'h-8 w-[72px] rounded-lg px-2 py-1 text-xs' : 'h-9 w-[88px] rounded-lg px-2.5 py-1.5 text-sm'} select !w-auto shrink-0`}
        aria-label="Select month"
      >
        {monthOptions.map(([value, label]) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </select>
      <select
        value={active.year}
        onChange={(event) => {
          const year = Number(event.target.value);
          const maxedMonth = year === current.year ? Math.min(active.month, current.month) : active.month;
          const nextMonth = year === earliest.year ? Math.max(maxedMonth, earliest.month) : maxedMonth;
          updateDraft({ ...active, year, month: nextMonth });
        }}
        className={`${compact ? 'h-8 w-[76px] rounded-lg px-2 py-1 text-xs' : 'h-9 w-[84px] rounded-lg px-2.5 py-1.5 text-sm'} select !w-auto shrink-0`}
        aria-label="Select year"
      >
        {years.map((year) => (
          <option key={year} value={year}>{year}</option>
        ))}
      </select>
      {onApply && (
        <button
          type="button"
          onClick={() => onApply(draft)}
          className={`${compact ? 'h-8 rounded-lg px-3 text-xs' : 'h-9 rounded-lg px-4 text-sm'} shrink-0 bg-accent-green font-bold text-black transition-all active:scale-95 disabled:opacity-50`}
          disabled={draft.month === period.month && draft.year === period.year}
        >
          Apply
        </button>
      )}
    </div>
  );
};
