"use client";

import React, { useState, useMemo, useDeferredValue } from "react";
import { useRouter } from "next/navigation";

type Recording = {
  recordId: string;
  id: string;
  fileName: string;
  mimeType: string;
  driveLink: string;
  date: string;
  phoneNumber: string;
  Transcript?: string | null;
  Summary?: string | null;
  Time?: string | null;
};

function extractDriveId(url: string) {
  if (!url) return null;
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

function getAudioStreamUrl(url: string) {
  if (!url) return null;
  const fileId = extractDriveId(url);
  if (fileId) {
    return `https://lh3.googleusercontent.com/d/${fileId}`;
  }
  return url;
}

function getAudioFallbackUrl(url: string) {
  if (!url) return null;
  const fileId = extractDriveId(url);
  if (fileId) {
    return `https://docs.google.com/uc?export=open&id=${fileId}`;
  }
  return url;
}

function getDrivePreviewUrl(url: string) {
  if (!url) return null;
  const fileId = extractDriveId(url);
  if (fileId) {
    return `https://drive.google.com/file/d/${fileId}/preview`;
  }
  return url;
}

function getDownloadLink(url: string) {
  if (!url) return null;
  const fileId = extractDriveId(url);
  if (fileId) {
    return `https://drive.google.com/uc?export=download&id=${fileId}`;
  }
  return url;
}

function cleanSummaryText(text?: string | null) {
  if (!text) return '';
  // Remove raw <think>...</think> blocks if present
  let cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  return cleaned;
}

function parseDateTimeForSort(dateStr: string, timeStr?: string | null) {
  if (!dateStr) return 0;
  let isoDate = dateStr.trim();
  const parts = isoDate.split('/');
  if (parts.length === 3) {
    isoDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }
  if (timeStr && timeStr.trim()) {
    const fullStr = `${isoDate} ${timeStr.trim()}`;
    const parsed = new Date(fullStr).getTime();
    if (!isNaN(parsed)) return parsed;
  }
  const parsedDate = new Date(isoDate).getTime();
  return isNaN(parsedDate) ? 0 : parsedDate;
}

export default function RecordingsTable({ recordings, isDevelopment }: { recordings: Recording[], isDevelopment?: boolean }) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearch = useDeferredValue(searchQuery);
  const [dateFilter, setDateFilter] = useState("");
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null);
  const [activeAudioId, setActiveAudioId] = useState<string | null>(null);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Parse and sort all recordings by date & time (newest first)
  const sortedRecordings = useMemo(() => {
    return [...recordings].sort((a, b) => 
      parseDateTimeForSort(b.date, b.Time) - parseDateTimeForSort(a.date, a.Time)
    );
  }, [recordings]);

  // Derive summary metrics
  const stats = useMemo(() => {
    const total = recordings.length;
    const uniquePhones = new Set(recordings.map(r => r.phoneNumber)).size;
    const withTranscript = recordings.filter(r => r.Transcript && r.Transcript.trim().length > 0).length;
    const withSummary = recordings.filter(r => r.Summary && r.Summary.trim().length > 0).length;
    return { total, uniquePhones, withTranscript, withSummary };
  }, [recordings]);

  // Derive unique dates for the dropdown filter, ordered correctly
  const uniqueDates = useMemo(() => {
    const dates = new Set(sortedRecordings.map((r) => r.date));
    return Array.from(dates);
  }, [sortedRecordings]);

  // Filtered dataset
  const filteredRecordings = useMemo(() => {
    const query = deferredSearch.toLowerCase().trim();
    return sortedRecordings.filter((rec) => {
      const matchesSearch = 
        !query ||
        rec.phoneNumber.includes(query) || 
        (rec.Transcript && rec.Transcript.toLowerCase().includes(query)) ||
        (rec.Summary && rec.Summary.toLowerCase().includes(query)) ||
        (rec.Time && rec.Time.toLowerCase().includes(query));
      
      const matchesDate = dateFilter ? rec.date === dateFilter : true;
      return matchesSearch && matchesDate;
    });
  }, [sortedRecordings, deferredSearch, dateFilter]);

  // Paginated dataset
  const totalPages = Math.ceil(filteredRecordings.length / pageSize) || 1;
  const paginatedRecordings = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRecordings.slice(start, start + pageSize);
  }, [filteredRecordings, currentPage, pageSize]);

  // Group paginated recordings by date & sort groups and items by latest date and time
  const { groupedRecordings, sortedGroups } = useMemo(() => {
    const groups: { [key: string]: Recording[] } = {};
    paginatedRecordings.forEach((rec) => {
      if (!groups[rec.date]) {
        groups[rec.date] = [];
      }
      groups[rec.date].push(rec);
    });

    // Ensure items within each group are sorted by time (latest first)
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => parseDateTimeForSort(b.date, b.Time) - parseDateTimeForSort(a.date, a.Time));
    });

    const sortedKeys = Object.keys(groups).sort((a, b) => 
      parseDateTimeForSort(b, groups[b][0]?.Time) - parseDateTimeForSort(a, groups[a][0]?.Time)
    );
    return { groupedRecordings: groups, sortedGroups: sortedKeys };
  }, [paginatedRecordings]);

  // Handle Search Input Change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  // Handle Date Filter Change
  const handleDateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setDateFilter(e.target.value);
    setCurrentPage(1);
  };

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
    <div className="space-y-6">
      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between hover:border-blue-200 transition-colors">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Calls</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-sm">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between hover:border-emerald-200 transition-colors">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Transcribed</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{stats.withTranscript}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-sm">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between hover:border-purple-200 transition-colors">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Unique Contacts</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{stats.uniquePhones}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shadow-sm">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Control Bar: Filters & Actions */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          {/* Search Box */}
          <div className="relative flex-1">
            <svg className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search phone numbers, transcripts, or summaries..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full pl-9 pr-8 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-slate-50/50"
            />
            {searchQuery && (
              <button 
                onClick={() => { setSearchQuery(""); setCurrentPage(1); }} 
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs p-1"
              >
                ✕
              </button>
            )}
          </div>

          {/* Date Filter */}
          <select
            value={dateFilter}
            onChange={handleDateChange}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50 text-slate-700"
          >
            <option value="">All Dates ({uniqueDates.length})</option>
            {uniqueDates.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 justify-between md:justify-end">
          {isDevelopment && (
            <button 
              onClick={handleDeleteAll}
              className="px-3 py-2 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors"
            >
              Delete All (Dev)
            </button>
          )}

          {/* Page Size Select */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span>Show:</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              className="px-2 py-1 border border-slate-200 rounded bg-white text-slate-700 outline-none"
            >
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3.5 text-left font-semibold text-slate-600 uppercase text-xs tracking-wider">Phone & Time</th>
                <th className="px-6 py-3.5 text-left font-semibold text-slate-600 uppercase text-xs tracking-wider">Audio</th>
                <th className="px-6 py-3.5 text-left font-semibold text-slate-600 uppercase text-xs tracking-wider">Summary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedGroups.map((dateKey) => (
                <React.Fragment key={dateKey}>
                  {/* Group Header */}
                  <tr className="bg-slate-100/90 border-y border-slate-200">
                    <td colSpan={3} className="px-6 py-3 text-xs font-bold text-slate-700 uppercase tracking-wider">
                      📅 Date: {dateKey}
                    </td>
                  </tr>
                  
                  {/* Group Rows */}
                  {groupedRecordings[dateKey].map((rec) => (
                    <tr 
                      key={rec.recordId} 
                      onClick={() => setSelectedRecording(rec)}
                      className="hover:bg-blue-50/60 transition-colors cursor-pointer group bg-white"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-900">{rec.phoneNumber}</div>
                        {rec.Time && (
                          <div className="text-xs text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                            <span>⏰</span> {rec.Time}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        {rec.driveLink ? (
                          <div className="flex items-center gap-2">
                            {activeAudioId === rec.recordId ? (
                              <audio controls autoPlay className="h-9 w-48 sm:w-56 outline-none rounded shadow-sm">
                                <source src={`/api/recordings/${rec.recordId}/audio`} />
                                <source src={getAudioStreamUrl(rec.driveLink) || ''} />
                                <source src={getDownloadLink(rec.driveLink) || ''} />
                              </audio>
                            ) : (
                              <button
                                onClick={() => setActiveAudioId(rec.recordId)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-all shadow-sm group-hover:bg-blue-100"
                                title="Click to load and play audio"
                              >
                                <span>▶</span> Listen
                              </button>
                            )}
                            <a href={rec.driveLink} target="_blank" rel="noopener noreferrer" title="Open in Google Drive" className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors rounded hover:bg-slate-100">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic px-2">No Audio</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-600 max-w-[320px] sm:max-w-md">
                        <div className="truncate group-hover:text-slate-900 transition-colors text-sm font-medium" title="Click to view full details">
                          {cleanSummaryText(rec.Summary) ? (
                            <span>{cleanSummaryText(rec.Summary)}</span>
                          ) : rec.Transcript ? (
                            <span className="text-slate-500 font-normal">{rec.Transcript}</span>
                          ) : (
                            <span className="italic text-slate-400">No summary available</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}

              {filteredRecordings.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-16 text-center text-slate-400">
                    <div className="text-3xl mb-2">🔍</div>
                    <p className="font-medium text-slate-600">No recordings found</p>
                    <p className="text-xs text-slate-400 mt-1">Try adjusting your search criteria or date filters.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer & Pagination Controls */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-slate-600">
          <div>
            Showing <span className="font-semibold text-slate-900">{filteredRecordings.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}</span> to <span className="font-semibold text-slate-900">{Math.min(currentPage * pageSize, filteredRecordings.length)}</span> of <span className="font-semibold text-slate-900">{filteredRecordings.length}</span> recordings
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-md font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                Previous
              </button>
              <span className="px-2 font-medium">Page {currentPage} of {totalPages}</span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-md font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {selectedRecording && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <span className="text-xl">🎙️</span>
                <h3 className="text-lg font-bold text-slate-900">Recording Details</h3>
              </div>
              <button 
                onClick={() => setSelectedRecording(null)}
                className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors rounded-full p-1.5"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
              <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Phone Number</label>
                  <p className="text-base font-bold text-slate-900">{selectedRecording.phoneNumber}</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Date</label>
                  <p className="text-base font-semibold text-slate-800">{selectedRecording.date}</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Time</label>
                  <p className="text-base font-semibold text-slate-800">{selectedRecording.Time || "N/A"}</p>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Audio Playback</label>
                  {selectedRecording.driveLink && (
                    <div className="flex items-center gap-3">
                      <a href={getDownloadLink(selectedRecording.driveLink) || '#'} download className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 flex items-center gap-1">
                        Download Audio
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </a>
                      <a href={selectedRecording.driveLink} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1">
                        Open in Drive
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </div>
                  )}
                </div>
                {selectedRecording.driveLink ? (
                  <div className="space-y-2">
                    <audio controls className="w-full h-12 outline-none rounded-xl bg-slate-100 shadow-inner" autoPlay preload="metadata">
                      <source src={`/api/recordings/${selectedRecording.recordId}/audio`} />
                      <source src={getAudioStreamUrl(selectedRecording.driveLink) || ''} />
                      <source src={getDownloadLink(selectedRecording.driveLink) || ''} />
                      Your browser does not support the audio element.
                    </audio>

                    {extractDriveId(selectedRecording.driveLink) && (
                      <details className="text-xs text-slate-500 mt-1">
                        <summary className="cursor-pointer hover:text-slate-700 font-medium select-none flex items-center gap-1 py-1">
                          <span>⚡</span> Having trouble playing? Use embedded Drive player
                        </summary>
                        <div className="mt-2 rounded-xl overflow-hidden border border-slate-200 bg-black/90 shadow-md">
                          <iframe 
                            src={getDrivePreviewUrl(selectedRecording.driveLink) || ''} 
                            width="100%" 
                            height="280" 
                            allow="autoplay"
                            className="border-0 w-full"
                          />
                        </div>
                      </details>
                    )}
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 rounded-xl text-sm text-slate-400 italic border border-slate-100">
                    No audio file available for this recording.
                  </div>
                )}
              </div>

              {/* Transcript Section */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-sm">📝</span>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Transcript</label>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-sm text-slate-800 leading-relaxed font-sans max-h-52 overflow-y-auto whitespace-pre-wrap">
                  {selectedRecording.Transcript || <span className="italic text-slate-400">No transcript provided.</span>}
                </div>
              </div>

              {/* Summary Section (placed right after Transcript) */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-sm">💡</span>
                  <label className="block text-xs font-semibold text-blue-600 uppercase tracking-wider">Summary</label>
                </div>
                <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-100 text-sm text-slate-800 leading-relaxed font-sans max-h-52 overflow-y-auto whitespace-pre-wrap">
                  {cleanSummaryText(selectedRecording.Summary) || <span className="italic text-slate-400">No summary provided.</span>}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex justify-end">
              <button
                onClick={() => setSelectedRecording(null)}
                className="px-5 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-all shadow-sm"
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
