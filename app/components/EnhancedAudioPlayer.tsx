"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";

interface EnhancedAudioPlayerProps {
  recordingId: string;
  driveLink?: string | null;
  compact?: boolean;
  autoPlay?: boolean;
  className?: string;
}

function extractDriveId(url?: string | null) {
  if (!url) return null;
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

function getAudioStreamUrl(url?: string | null) {
  if (!url) return null;
  const fileId = extractDriveId(url);
  if (fileId) {
    return `https://lh3.googleusercontent.com/d/${fileId}`;
  }
  return url;
}

function getDownloadLink(url?: string | null) {
  if (!url) return null;
  const fileId = extractDriveId(url);
  if (fileId) {
    return `https://drive.google.com/uc?export=download&id=${fileId}`;
  }
  return url;
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || !isFinite(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function EnhancedAudioPlayer({
  recordingId,
  driveLink,
  compact = false,
  autoPlay = false,
  className = "",
}: EnhancedAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const compressorNodeRef = useRef<DynamicsCompressorNode | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1); // 0 to 1
  const [boostLevel, setBoostLevel] = useState<number>(3.0); // Default 300% boost (3x)
  const [clarityEnabled, setClarityEnabled] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize Web Audio API Gain & Voice Clarity Booster
  const setupAudioGraph = useCallback(() => {
    if (!audioRef.current || sourceNodeRef.current) return;

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;

      const source = ctx.createMediaElementSource(audioRef.current);
      sourceNodeRef.current = source;

      // Create Dynamic Compressor for voice clarity & leveling
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-24, ctx.currentTime);
      compressor.knee.setValueAtTime(30, ctx.currentTime);
      compressor.ratio.setValueAtTime(12, ctx.currentTime);
      compressor.attack.setValueAtTime(0.003, ctx.currentTime);
      compressor.release.setValueAtTime(0.25, ctx.currentTime);
      compressorNodeRef.current = compressor;

      // Create Gain Node for volume boosting (1x to 5x)
      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(boostLevel, ctx.currentTime);
      gainNodeRef.current = gainNode;

      // Connect: Source -> Compressor -> Gain -> Destination
      source.connect(compressor);
      compressor.connect(gainNode);
      gainNode.connect(ctx.destination);
    } catch (err) {
      console.warn("Web Audio API boost setup warning:", err);
    }
  }, [boostLevel]);

  // Update Gain when boost level or volume changes
  useEffect(() => {
    if (gainNodeRef.current && audioCtxRef.current) {
      const targetGain = boostLevel * volume;
      try {
        gainNodeRef.current.gain.setTargetAtTime(
          targetGain,
          audioCtxRef.current.currentTime,
          0.05
        );
      } catch {
        gainNodeRef.current.gain.value = targetGain;
      }
    }
  }, [boostLevel, volume]);

  // Toggle clarity compressor bypass
  useEffect(() => {
    if (sourceNodeRef.current && gainNodeRef.current && compressorNodeRef.current && audioCtxRef.current) {
      try {
        sourceNodeRef.current.disconnect();
        if (clarityEnabled) {
          sourceNodeRef.current.connect(compressorNodeRef.current);
          compressorNodeRef.current.connect(gainNodeRef.current);
        } else {
          sourceNodeRef.current.connect(gainNodeRef.current);
        }
      } catch (e) {
        console.warn("Failed to toggle compressor bypass", e);
      }
    }
  }, [clarityEnabled]);

  const togglePlay = async () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      setIsLoading(true);
      setError(null);

      // Ensure AudioContext is initialized and resumed within user gesture
      if (!sourceNodeRef.current) {
        setupAudioGraph();
      }

      if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
        try {
          await audioCtxRef.current.resume();
        } catch (e) {
          console.warn("AudioContext resume error:", e);
        }
      }

      try {
        await audioRef.current.play();
      } catch (err) {
        console.error("Audio playback error:", err);
        setError("Unable to play audio stream.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const skipSeconds = (secs: number) => {
    if (!audioRef.current) return;
    const newTime = Math.max(0, Math.min(audioRef.current.currentTime + secs, duration || 9999));
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const cycleBoost = () => {
    const presets = [1.0, 2.0, 3.0, 4.0, 5.0];
    const currentIndex = presets.indexOf(boostLevel);
    const nextBoost = presets[(currentIndex + 1) % presets.length];
    setBoostLevel(nextBoost);
  };

  const cycleRate = () => {
    const rates = [1.0, 1.25, 1.5, 2.0];
    const nextRate = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  const boostPresets = [
    { label: "1x (Normal)", value: 1.0 },
    { label: "2x (200% Loud)", value: 2.0 },
    { label: "3x (300% High)", value: 3.0 },
    { label: "4x (400% Ultra)", value: 4.0 },
    { label: "5x (500% Max Boost 🚀)", value: 5.0 },
  ];

  return (
    <div className={`select-none ${className}`}>
      {/* Hidden native audio element */}
      <audio
        ref={audioRef}
        crossOrigin="anonymous"
        preload="metadata"
        autoPlay={autoPlay}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={() => {
          if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
          }
        }}
        onLoadedMetadata={() => {
          if (audioRef.current) {
            setDuration(audioRef.current.duration);
            audioRef.current.playbackRate = playbackRate;
          }
        }}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
        }}
        onError={() => {
          setIsLoading(false);
          setError("Audio stream error");
        }}
      >
        <source src={`/api/recordings/${recordingId}/audio`} />
        {driveLink && <source src={getAudioStreamUrl(driveLink) || ""} />}
        {driveLink && <source src={getDownloadLink(driveLink) || ""} />}
      </audio>

      {compact ? (
        /* ================= COMPACT TABLE CELL VIEW ================= */
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/90 rounded-lg px-2.5 py-1.5 shadow-sm hover:border-blue-300 transition-all max-w-[280px] sm:max-w-[320px]">
          {/* Play/Pause Button */}
          <button
            type="button"
            onClick={togglePlay}
            disabled={isLoading}
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-all shadow-sm shrink-0 ${
              isPlaying
                ? "bg-amber-600 text-white hover:bg-amber-700 ring-2 ring-amber-300/60"
                : "bg-blue-600 text-white hover:bg-blue-700 ring-2 ring-blue-200"
            }`}
            title={isPlaying ? "Pause" : "Play (Boosted)"}
          >
            {isLoading ? (
              <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : isPlaying ? (
              <span className="text-xs font-bold leading-none">⏸</span>
            ) : (
              <span className="text-xs font-bold leading-none ml-0.5">▶</span>
            )}
          </button>

          {/* Progress & Time */}
          <div className="flex-1 flex flex-col justify-center min-w-0">
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none"
            />
            <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono mt-0.5">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Quick Boost Cycle Pill */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={cycleBoost}
              className={`px-1.5 py-0.5 text-[10px] font-bold rounded flex items-center gap-0.5 transition-all ${
                boostLevel > 1.0
                  ? "bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200 shadow-xs"
                  : "bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200"
              }`}
              title={`Audio Gain: ${boostLevel * 100}%. Click to cycle boost.`}
            >
              <span>🔊</span>
              <span>{boostLevel}x</span>
            </button>
          </div>

          {/* Speed Toggle Pill */}
          <button
            type="button"
            onClick={cycleRate}
            className="px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 bg-white border border-slate-200 rounded hover:bg-slate-100 transition-colors shrink-0"
            title="Playback Speed"
          >
            {playbackRate}x
          </button>
        </div>
      ) : (
        /* ================= FULL / MODAL EXPANDED VIEW ================= */
        <div className="bg-gradient-to-b from-slate-50 to-slate-100/80 border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
          {/* Main Controls Row */}
          <div className="flex items-center gap-3">
            {/* Play/Pause Main Button */}
            <button
              type="button"
              onClick={togglePlay}
              disabled={isLoading}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-md shrink-0 ${
                isPlaying
                  ? "bg-amber-600 text-white hover:bg-amber-700 shadow-amber-200 ring-4 ring-amber-100"
                  : "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200 ring-4 ring-blue-100"
              }`}
              title={isPlaying ? "Pause" : "Play (Audio Boost Enabled)"}
            >
              {isLoading ? (
                <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              ) : isPlaying ? (
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <rect x="6" y="4" width="4" height="16" rx="1.5" />
                  <rect x="14" y="4" width="4" height="16" rx="1.5" />
                </svg>
              ) : (
                <svg className="w-5 h-5 fill-current ml-0.5" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            {/* Skip Backward 5s */}
            <button
              type="button"
              onClick={() => skipSeconds(-5)}
              className="p-2 text-slate-600 hover:text-blue-600 hover:bg-white rounded-xl border border-transparent hover:border-slate-200 transition-all"
              title="Rewind 5 seconds"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.334 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
              </svg>
            </button>

            {/* Scrubber & Timers */}
            <div className="flex-1 space-y-1">
              <div className="flex justify-between items-center text-xs font-mono text-slate-600 font-medium">
                <span className="text-slate-900 font-bold">{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none shadow-inner"
              />
            </div>

            {/* Skip Forward 5s */}
            <button
              type="button"
              onClick={() => skipSeconds(5)}
              className="p-2 text-slate-600 hover:text-blue-600 hover:bg-white rounded-xl border border-transparent hover:border-slate-200 transition-all"
              title="Forward 5 seconds"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z" />
              </svg>
            </button>
          </div>

          {/* Booster & Enhancement Control Panel */}
          <div className="pt-2 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Audio Boost Presets & Slider */}
            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center gap-1.5 text-amber-700 font-bold">
                <span className="text-sm">🔊</span>
                <span>Loudness Boost:</span>
              </div>

              <div className="flex items-center gap-1">
                {boostPresets.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setBoostLevel(preset.value)}
                    className={`px-2 py-1 rounded-lg font-semibold text-[11px] transition-all ${
                      boostLevel === preset.value
                        ? "bg-amber-500 text-white shadow-xs font-bold"
                        : "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200"
                    }`}
                  >
                    {preset.value}x
                  </button>
                ))}
              </div>
            </div>

            {/* Voice Clarity / Leveler Toggle */}
            <button
              type="button"
              onClick={() => setClarityEnabled(!clarityEnabled)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-all shadow-xs ${
                clarityEnabled
                  ? "bg-emerald-50 text-emerald-800 border-emerald-300 ring-2 ring-emerald-100"
                  : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
              }`}
              title="Dynamic voice leveling boosts quiet speech and softens sudden loud spikes"
            >
              <span className="text-sm">✨</span>
              <span>Voice Clarity / Auto-Level: {clarityEnabled ? "ON" : "OFF"}</span>
            </button>

            {/* Speed Selector */}
            <div className="flex items-center gap-1.5 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-slate-500 font-medium">Speed:</span>
              {[1.0, 1.25, 1.5, 2.0].map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => {
                    setPlaybackRate(rate);
                    if (audioRef.current) audioRef.current.playbackRate = rate;
                  }}
                  className={`px-1.5 py-0.5 rounded text-[11px] font-semibold transition-all ${
                    playbackRate === rate
                      ? "bg-blue-600 text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="p-2 text-xs bg-red-50 text-red-700 border border-red-200 rounded-lg flex items-center gap-1.5">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
