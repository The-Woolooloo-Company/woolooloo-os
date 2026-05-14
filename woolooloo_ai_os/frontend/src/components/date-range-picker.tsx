'use client';

import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addMonths } from 'date-fns';

interface DateRange {
  start: Date;
  end: Date;
}

interface DateRangePickerProps {
  dateRange: DateRange;
  onChange: (range: DateRange) => void;
}

export function DateRangePicker({ dateRange, onChange }: DateRangePickerProps) {
  const today = new Date();
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [preset, setPreset] = useState<'custom' | 'thisMonth' | 'lastMonth' | 'thisWeek' | 'thisQuarter'>('thisMonth');

  const thisMonthStart = startOfMonth(today);
  const lastMonthStart = startOfMonth(addMonths(today, -1));
  const lastMonthEnd = endOfMonth(addMonths(today, -1));
  const thisWeekStart = startOfWeek(today, { weekStartsOn: 1 });
  const thisWeekEnd = endOfWeek(today, { weekStartsOn: 1 });
  const thisQuarterStart = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1);

  // Sync custom dates when dateRange changes externally
  useEffect(() => {
    setCustomStart(format(dateRange.start, 'yyyy-MM-dd'));
    setCustomEnd(format(dateRange.end, 'yyyy-MM-dd'));
  }, [dateRange]);

  const applyPreset = (newPreset: typeof preset) => {
    setPreset(newPreset);
    let range: DateRange;
    switch (newPreset) {
      case 'thisMonth':
        range = { start: thisMonthStart, end: today };
        break;
      case 'lastMonth':
        range = { start: lastMonthStart, end: lastMonthEnd };
        break;
      case 'thisWeek':
        range = { start: thisWeekStart, end: today };
        break;
      case 'thisQuarter':
        range = { start: thisQuarterStart, end: today };
        break;
      default:
        range = { start: thisMonthStart, end: today };
    }
    onChange(range);
    setCustomStart(format(range.start, 'yyyy-MM-dd'));
    setCustomEnd(format(range.end, 'yyyy-MM-dd'));
  };

  const applyCustom = () => {
    if (customStart && customEnd) {
      const start = new Date(customStart + 'T00:00:00');
      const end = new Date(customEnd + 'T23:59:59');
      onChange({ start, end });
      setPreset('custom');
    }
  };

  return (
    <div>
      <div className="d-flex flex-wrap gap-2 mb-2">
        <button
          onClick={() => applyPreset('thisMonth')}
          className={`btn btn-sm ${preset === 'thisMonth' ? 'bg-gradient-primary' : 'btn-outline-dark'}`}
        >
          This Month
        </button>
        <button
          onClick={() => applyPreset('lastMonth')}
          className={`btn btn-sm ${preset === 'lastMonth' ? 'bg-gradient-primary' : 'btn-outline-dark'}`}
        >
          Last Month
        </button>
        <button
          onClick={() => applyPreset('thisWeek')}
          className={`btn btn-sm ${preset === 'thisWeek' ? 'bg-gradient-primary' : 'btn-outline-dark'}`}
        >
          This Week
        </button>
        <button
          onClick={() => applyPreset('thisQuarter')}
          className={`btn btn-sm ${preset === 'thisQuarter' ? 'bg-gradient-primary' : 'btn-outline-dark'}`}
        >
          This Quarter
        </button>
        <button
          onClick={() => setPreset('custom')}
          className={`btn btn-sm ${preset === 'custom' ? 'bg-gradient-primary' : 'btn-outline-dark'}`}
        >
          Custom
        </button>
      </div>

      {preset === 'custom' && (
        <div className="d-flex gap-2 align-items-center">
          <input
            type="date"
            className="form-control form-control-sm"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            max={customEnd}
          />
          <span className="text-secondary">→</span>
          <input
            type="date"
            className="form-control form-control-sm"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            min={customStart}
            max={format(today, 'yyyy-MM-dd')}
          />
          <button onClick={applyCustom} className="btn btn-sm bg-gradient-primary">
            Apply
          </button>
        </div>
      )}

      <div className="text-xs text-secondary mt-1">
        <i className="material-symbols-rounded me-1" style={{ fontSize: '14px' }}>calendar_today</i>
        {format(dateRange.start, 'MMM dd, yyyy')} — {format(dateRange.end, 'MMM dd, yyyy')}
      </div>
    </div>
  );
}
