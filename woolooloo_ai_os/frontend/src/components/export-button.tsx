'use client';

import { ClockifyTimeEntry } from '@/lib/clockify';
import { exportTimeEntriesToCSV } from '@/lib/clockify';

interface ExportButtonProps {
  entries: ClockifyTimeEntry[];
  filename?: string;
}

export function ExportButton({ entries, filename = 'time-tracking-export.csv' }: ExportButtonProps) {
  const handleExport = () => {
    const csv = exportTimeEntriesToCSV(entries);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (entries.length === 0) {
    return (
      <button
        onClick={handleExport}
        disabled
        className="px-4 py-2 bg-gray-100 text-gray-400 rounded-lg cursor-not-allowed text-sm font-medium"
      >
        Export CSV
      </button>
    );
  }

  return (
    <button
      onClick={handleExport}
      className="px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg hover:shadow-lg transition-all text-sm font-medium flex items-center gap-2"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      Export CSV
    </button>
  );
}
