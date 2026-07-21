"use client";

import React, { useState, useMemo } from "react";

type Recording = {
  recordId: string;
  id: string;
  fileName: string;
  mimeType: string;
  driveLink: string;
  date: string;
  phoneNumber: string;
  Transcript: string;
};

function getDownloadLink(url: string) {
  if (!url) return null;
  const idMatch = url.match(/\/d\/(.*?)\//) || url.match(/id=(.*?)(&|$)/);
  if (idMatch && idMatch[1]) {
    return `https://drive.google.com/uc?export=download&id=${idMatch[1]}`;
  }
  return url;
}

function parseDateForSort(dateStr: string) {
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    // Assuming DD/MM/YYYY
    return new Date(`${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`).getTime();
  }
  return new Date(dateStr).getTime();
}

import { useRouter } from "next/navigation";

export default function RecordingsTable({ recordings, isDevelopment }: { recordings: Recording[], isDevelopment?: boolean }) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null);

  // Parse and sort all recordings by date (newest first)
  const sortedRecordings = useMemo(() => {
    return [...recordings].sort((a, b) => parseDateForSort(b.date) - parseDateForSort(a.date));
  }, [recordings]);

  // Derive unique dates for the dropdown filter, ordered correctly
  const uniqueDates = useMemo(() => {
    const dates = new Set(sortedRecordings.map((r) => r.date));
    return Array.from(dates);
  }, [sortedRecordings]);

  // Filter recordings and group them by date
  const { groupedRecordings, sortedGroups } = useMemo(() => {
    const filtered = sortedRecordings.filter((rec) => {
      const matchesSearch = 
        rec.phoneNumber.includes(searchQuery) || 
        rec.Transcript.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesDate = dateFilter ? rec.date === dateFilter : true;
      
      return matchesSearch && matchesDate;
    });

    const groups = filtered.reduce((acc, rec) => {
      if (!acc[rec.date]) {
        acc[rec.date] = [];
      }
      acc[rec.date].push(rec);
      return acc;
    }, {} as Record<string, Recording[]>);

    // Get ordered dates from the groups based on our sorted data
    const sortedKeys = Object.keys(groups).sort((a, b) => parseDateForSort(b) - parseDateForSort(a));

    return { groupedRecordings: groups, sortedGroups: sortedKeys };
  }, [sortedRecordings, searchQuery, dateFilter]);

  const handleDeleteAll = async () => {
    if (!confirm("Are you sure you want to delete ALL recordings? This cannot be undone.")) return;
    
    try {
      const res = await fetch('/api/recordings/delete-all', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to delete recordings');
      alert("All recordings have been deleted.");
      router.refresh();
    } catch (err) {
      alert("Failed to delete recordings.");
    }
  };

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search phone or transcript..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 text-sm border border-[var(--border)] rounded-md bg-white focus:ring-2 focus:ring-[var(--primary)] outline-none transition-all shadow-sm"
          />
        </div>
        <div className="sm:w-48">
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full px-4 py-2 text-sm border border-[var(--border)] rounded-md bg-white focus:ring-2 focus:ring-[var(--primary)] outline-none transition-all shadow-sm"
          >
            <option value="">All Dates</option>
            {uniqueDates.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        {isDevelopment && (
          <div className="sm:ml-auto">
            <button 
              onClick={handleDeleteAll}
              className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              Delete All (Dev)
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden !p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm select-none">
            <thead className="bg-[var(--muted)] border-b border-[var(--border)]">
              <tr>
                <th className="px-6 py-4 font-semibold text-[var(--foreground)] whitespace-nowrap w-[200px]">Phone Number</th>
                <th className="px-6 py-4 font-semibold text-[var(--foreground)] whitespace-nowrap w-[250px]">Audio</th>
                <th className="px-6 py-4 font-semibold text-[var(--foreground)] w-full">Transcript</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {sortedGroups.map((dateKey) => (
                <React.Fragment key={dateKey}>
                  {/* Group Header */}
                  <tr className="bg-slate-100/80 border-y border-slate-200">
                    <td colSpan={3} className="px-6 py-4 text-sm font-semibold text-slate-900 tracking-tight shadow-sm">
                      Date: {dateKey}
                    </td>
                  </tr>
                  
                  {/* Group Rows */}
                  {groupedRecordings[dateKey].map((rec, index) => (
                    <tr 
                      key={rec.recordId} 
                      onClick={() => setSelectedRecording(rec)}
                      className="hover:bg-blue-50/50 transition-colors cursor-pointer group bg-white"
                    >
                      <td className="px-6 py-4 font-medium text-slate-800 whitespace-nowrap">
                        {rec.phoneNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        {rec.driveLink ? (
                          <div className="flex items-center gap-2">
                            <audio controls className="h-9 w-52 outline-none rounded shadow-sm opacity-90 group-hover:opacity-100 transition-opacity">
                              <source src={getDownloadLink(rec.driveLink) || ''} type="audio/mpeg" />
                            </audio>
                            <a href={rec.driveLink} target="_blank" rel="noopener noreferrer" title="Open in Google Drive" className="p-2 text-slate-400 hover:text-blue-600 transition-colors">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                            <a href={getDownloadLink(rec.driveLink) || '#'} download title="Download Audio" className="p-2 text-slate-400 hover:text-green-600 transition-colors">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                            </a>
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400 italic px-2">No Audio</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-600 max-w-[300px]">
                        <div className="truncate group-hover:text-slate-900 transition-colors" title="Click to view full details">
                          {rec.Transcript}
                        </div>
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
              {sortedGroups.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-[var(--muted-foreground)]">
                    No recordings found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="p-3 bg-[var(--muted)]/50 border-t border-[var(--border)] text-xs text-[var(--muted-foreground)] text-center">
          Click any row to view full details.
        </div>
      </div>

      {/* Modal */}
      {selectedRecording && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-[var(--border)]">
              <h3 className="text-xl font-semibold text-[var(--foreground)]">Recording Details</h3>
              <button 
                onClick={() => setSelectedRecording(null)}
                className="text-[var(--muted-foreground)] hover:text-black transition-colors rounded-full p-1"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-1">Phone Number</label>
                  <p className="text-lg font-medium text-[var(--foreground)]">{selectedRecording.phoneNumber}</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-1">Date</label>
                  <p className="text-lg text-[var(--foreground)]">{selectedRecording.date}</p>
                </div>
              </div>

              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Audio Playback</label>
                  {selectedRecording.driveLink && (
                    <div className="flex items-center gap-4">
                      <a href={getDownloadLink(selectedRecording.driveLink) || '#'} download className="text-xs font-medium text-green-600 hover:text-green-800 flex items-center gap-1">
                        Download
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </a>
                      <a href={selectedRecording.driveLink} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1">
                        Open in Drive
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </div>
                  )}
                </div>
                {selectedRecording.driveLink ? (
                  <audio controls className="w-full h-12 outline-none rounded-lg bg-[var(--muted)]" autoPlay>
                    <source src={getDownloadLink(selectedRecording.driveLink) || ''} type="audio/mpeg" />
                    Your browser does not support the audio element.
                  </audio>
                ) : (
                  <div className="p-4 bg-gray-50 rounded-lg text-sm text-[var(--muted-foreground)] italic border border-gray-100">
                    No audio file available for this recording.
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-2">Full Transcript</label>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 text-[var(--foreground)] text-sm leading-relaxed whitespace-pre-wrap min-h-[100px]">
                  {selectedRecording.Transcript || "No transcript available."}
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t border-[var(--border)] bg-gray-50 text-right">
              <button 
                onClick={() => setSelectedRecording(null)}
                className="btn btn-outline"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
