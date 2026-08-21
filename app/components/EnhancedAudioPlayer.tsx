"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";

interface EnhancedAudioPlayerProps {
  recordingId: string;
  driveLink?: string | null;
  compact?: boolean;
  autoPlay?: boolean;
  className?: string;
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || !isFinite(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// Generate smooth soft-clipping sigmoid curve to prevent harsh digital distortion on mobile DACs/speakers
function makeSoftClipperCurve(k: number = 1.8, samples: number = 4096): Float32Array {
  const curve = new Float32Array(samples);
  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1;
    curve[i] = Math.tanh(x * k) / Math.tanh(k);
  }
  return curve;
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
  const highpassNodeRef = useRef<BiquadFilterNode | null>(null);
  const presenceNodeRef = useRef<BiquadFilterNode | null>(null);
  const preGainNodeRef = useRef<GainNode | null>(null);
  const compressorNodeRef = useRef<DynamicsCompressorNode | null>(null);
  const waveshaperNodeRef = useRef<WaveShaperNode | null>(null);
  const masterGainNodeRef = useRef<GainNode | null>(null);
  const isGraphConnectedRef = useRef<boolean>(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [boostLevel, setBoostLevel] = useState<number>(3.0); // Default 300% boost (3x)
  const [clarityEnabled, setClarityEnabled] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize Web Audio API Mobile-Optimized Booster & Clarity Graph
  const setupAudioGraph = useCallback(() => {
    if (!audioRef.current || isGraphConnectedRef.current) return;

    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      let ctx = audioCtxRef.current;
      if (!ctx || ctx.state === "closed") {
        ctx = new AudioCtx();
        audioCtxRef.current = ctx;
      }

      // 1. Highpass filter: 95Hz, Q=0.7
      // Eliminates sub-bass rumble that rattles tiny mobile speakers and triggers phone hardware limiters
      const highpass = ctx.createBiquadFilter();
      highpass.type = "highpass";
      highpass.frequency.setValueAtTime(95, ctx.currentTime);
      highpass.Q.setValueAtTime(0.7, ctx.currentTime);
      highpassNodeRef.current = highpass;

      // 2. Voice presence filter: 2.5kHz peaking filter for speech intelligibility on phone speakers
      const presence = ctx.createBiquadFilter();
      presence.type = "peaking";
      presence.frequency.setValueAtTime(2500, ctx.currentTime);
      presence.Q.setValueAtTime(1.2, ctx.currentTime);
      presence.gain.setValueAtTime(clarityEnabled ? 4.5 : 0, ctx.currentTime);
      presenceNodeRef.current = presence;

      // 3. Pre-Gain Node for loudness boost (1x to 5x)
      const preGain = ctx.createGain();
      preGain.gain.setValueAtTime(boostLevel, ctx.currentTime);
      preGainNodeRef.current = preGain;

      // 4. Dynamics Compressor for vocal leveling & raising average RMS speech loudness
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-22, ctx.currentTime);
      compressor.knee.setValueAtTime(20, ctx.currentTime);
      compressor.ratio.setValueAtTime(12, ctx.currentTime);
      compressor.attack.setValueAtTime(0.003, ctx.currentTime);
      compressor.release.setValueAtTime(0.18, ctx.currentTime);
      compressorNodeRef.current = compressor;

      // 5. Soft Clipper / Limiter: prevents harsh digital clipping on mobile DACs when boosted to 4x/5x
      const waveshaper = ctx.createWaveShaper();
      waveshaper.curve = makeSoftClipperCurve(1.8) as Float32Array<ArrayBuffer>;
      waveshaper.oversample = "2x";
      waveshaperNodeRef.current = waveshaper;

      // 6. Master Gain Node
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(volume, ctx.currentTime);
      masterGainNodeRef.current = masterGain;

      // 7. Attach source node (only once per media element)
      if (!sourceNodeRef.current) {
        sourceNodeRef.current = ctx.createMediaElementSource(audioRef.current);
      }

      // Graph: Source -> Highpass -> Presence -> PreGain -> Compressor -> Waveshaper -> MasterGain -> Destination
      sourceNodeRef.current.connect(highpass);
      highpass.connect(presence);
      presence.connect(preGain);
      preGain.connect(compressor);
      compressor.connect(waveshaper);
      waveshaper.connect(masterGain);
      masterGain.connect(ctx.destination);

      isGraphConnectedRef.current = true;
    } catch (err) {
      console.warn("Web Audio API boost setup warning:", err);
    }
  }, [boostLevel, clarityEnabled, volume]);

  // Synchronous unlock for iOS Safari and mobile WebViews during user gesture
  const unlockAudioContext = useCallback(() => {
    try {
      if (!isGraphConnectedRef.current) {
        setupAudioGraph();
      }

      const ctx = audioCtxRef.current;
      if (ctx && (ctx.state === "suspended" || (ctx as unknown as { state: string }).state === "interrupted")) {
        ctx.resume().catch((e) => console.warn("AudioContext resume error:", e));
      }

      // iOS WebKit silent buffer pulse to awaken the audio hardware session immediately
      if (ctx && ctx.state === "running") {
        try {
          const buffer = ctx.createBuffer(1, 1, 22050);
          const source = ctx.createBufferSource();
          source.buffer = buffer;
          source.connect(ctx.destination);
          source.start(0);
        } catch {
          // Ignore
        }
      }
    } catch (e) {
      console.warn("AudioContext unlock error:", e);
    }
  }, [setupAudioGraph]);

  // Update Pre-Gain when boostLevel changes
  useEffect(() => {
    if (preGainNodeRef.current && audioCtxRef.current) {
      try {
        preGainNodeRef.current.gain.setTargetAtTime(
          boostLevel,
          audioCtxRef.current.currentTime,
          0.02
        );
      } catch {
        preGainNodeRef.current.gain.value = boostLevel;
      }
    }
  }, [boostLevel]);

  // Update Presence filter when clarityEnabled changes
  useEffect(() => {
    if (presenceNodeRef.current && audioCtxRef.current) {
      const targetGain = clarityEnabled ? 4.5 : 0;
      try {
        presenceNodeRef.current.gain.setTargetAtTime(
          targetGain,
          audioCtxRef.current.currentTime,
          0.05
        );
      } catch {
        presenceNodeRef.current.gain.value = targetGain;
      }
    }
  }, [clarityEnabled]);

  // Update Master Gain when volume changes
  useEffect(() => {
    if (masterGainNodeRef.current && audioCtxRef.current) {
      try {
        masterGainNodeRef.current.gain.setTargetAtTime(
          volume,
          audioCtxRef.current.currentTime,
          0.05
        );
      } catch {
        masterGainNodeRef.current.gain.value = volume;
      }
    }
  }, [volume]);

  // Clean up Web Audio Context on unmount
  useEffect(() => {
    return () => {
      if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
        try {
          audioCtxRef.current.close();
        } catch {
          // Ignore
        }
      }
    };
  }, []);

  const togglePlay = async () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      setIsLoading(true);
      setError(null);

      // Immediate synchronous unlock within touch/click handler
      unlockAudioContext();

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
    unlockAudioContext();
    const time = Number(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const skipSeconds = (secs: number) => {
    unlockAudioContext();
    if (!audioRef.current) return;
    const newTime = Math.max(0, Math.min(audioRef.current.currentTime + secs, duration || 9999));
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const cycleBoost = () => {
    unlockAudioContext();
    const presets = [1.0, 2.0, 3.0, 4.0, 5.0];
    const currentIndex = presets.indexOf(boostLevel);
    const nextBoost = presets[(currentIndex + 1) % presets.length];
    setBoostLevel(nextBoost);
  };

  const handleSetBoost = (level: number) => {
    unlockAudioContext();
    setBoostLevel(level);
  };

  const cycleRate = () => {
    unlockAudioContext();
    const rates = [1.0, 1.25, 1.5, 2.0];
    const nextRate = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  const handleSetRate = (rate: number) => {
    unlockAudioContext();
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
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
      {/* Hidden native audio element with iOS/mobile inline playback support */}
      <audio
        ref={audioRef}
        crossOrigin="anonymous"
        preload="metadata"
        playsInline={true}
        autoPlay={autoPlay}
        src={`/api/recordings/${recordingId}/audio`}
        onPlay={() => {
          setIsPlaying(true);
          unlockAudioContext();
        }}
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
      />

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
                    onClick={() => handleSetBoost(preset.value)}
                    className={`px-2 py-1 rounded-lg font-semibold text-[11px] transition-all ${
                      boostLevel === preset.value
                        ? "bg-amber-500 text-white shadow-xs font-bold ring-2 ring-amber-300/60"
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
              onClick={() => {
                unlockAudioContext();
                setClarityEnabled(!clarityEnabled);
              }}
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
                  onClick={() => handleSetRate(rate)}
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
