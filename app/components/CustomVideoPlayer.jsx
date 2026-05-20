'use client';
import { useRef, useState, useEffect, useImperativeHandle, forwardRef } from 'react';

function fmtTime(s) {
  if (!s || !isFinite(s)) return '0:00';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60).toString().padStart(2, '0');
  if (h) return `${h}:${m.toString().padStart(2, '0')}:${sec}`;
  return `${m}:${sec}`;
}

const SUBS = [
  { code: 'off', label: 'Nonaktif' },
  { code: 'id', label: '🇮🇩 Indonesia' },
  { code: 'en', label: '🇬🇧 English' },
  { code: 'zh', label: '🇨🇳 Mandarin' },
  { code: 'ms', label: '🇲🇾 Melayu' },
  { code: 'manual', label: '📁 Upload File (.srt/.vtt)' },
];

const CustomVideoPlayer = forwardRef(function CustomVideoPlayer({
  src,
  poster,
  autoPlay = true,
  subUrl,
  subLang,
  subtitle,
  theaterMode,
  onToggleTheater,
  onLoadedMetadata,
  onTimeUpdate,
  onPause,
  onEnded,
  onPlayStart,
  onSubUpload,
  onSubChange
}, ref) {
  const videoRef = useRef(null);
  const wrapRef = useRef(null);
  const hideTimerRef = useRef(null);
  const subInputRef = useRef(null);

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showSubMenu, setShowSubMenu] = useState(false);
  const [subActive, setSubActive] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [seekHover, setSeekHover] = useState(null);

  // Expose video element to parent
  useImperativeHandle(ref, () => videoRef.current, []);

  const showAndScheduleHide = () => {
    setShowControls(true);
    clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      if (!videoRef.current?.paused) setShowControls(false);
    }, 3000);
  };

  // Bind native video events
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const onPlayE = () => { setPlaying(true); showAndScheduleHide(); onPlayStart && onPlayStart(); };
    const onPauseE = () => { setPlaying(false); setShowControls(true); onPause && onPause(); };
    const onTimeE = () => { setCurrentTime(v.currentTime); onTimeUpdate && onTimeUpdate(v); };
    const onMetaE = () => { setDuration(v.duration); setVolume(v.volume); setMuted(v.muted); onLoadedMetadata && onLoadedMetadata(v); };
    const onProgE = () => {
      if (v.buffered.length > 0) setBuffered(v.buffered.end(v.buffered.length - 1));
    };
    const onEndE = () => { setPlaying(false); setShowControls(true); onEnded && onEnded(); };
    const onVolE = () => { setVolume(v.volume); setMuted(v.muted); };
    const onRateE = () => setSpeed(v.playbackRate);

    v.addEventListener('play', onPlayE);
    v.addEventListener('pause', onPauseE);
    v.addEventListener('timeupdate', onTimeE);
    v.addEventListener('loadedmetadata', onMetaE);
    v.addEventListener('progress', onProgE);
    v.addEventListener('ended', onEndE);
    v.addEventListener('volumechange', onVolE);
    v.addEventListener('ratechange', onRateE);

    return () => {
      v.removeEventListener('play', onPlayE);
      v.removeEventListener('pause', onPauseE);
      v.removeEventListener('timeupdate', onTimeE);
      v.removeEventListener('loadedmetadata', onMetaE);
      v.removeEventListener('progress', onProgE);
      v.removeEventListener('ended', onEndE);
      v.removeEventListener('volumechange', onVolE);
      v.removeEventListener('ratechange', onRateE);
      clearTimeout(hideTimerRef.current);
    };
  }, [src]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      const v = videoRef.current;
      if (!v) return;
      const k = e.code;
      if (k === 'Space' || k === 'KeyK') { e.preventDefault(); v.paused ? v.play() : v.pause(); }
      else if (k === 'ArrowLeft') { e.preventDefault(); v.currentTime = Math.max(0, v.currentTime - 10); showAndScheduleHide(); }
      else if (k === 'ArrowRight') { e.preventDefault(); v.currentTime = Math.min(v.duration || 0, v.currentTime + 10); showAndScheduleHide(); }
      else if (k === 'KeyM') { e.preventDefault(); v.muted = !v.muted; }
      else if (k === 'KeyF') { e.preventDefault(); toggleFullscreen(); }
      else if (k === 'KeyT') { e.preventDefault(); onToggleTheater && onToggleTheater(); }
      else if (k === 'ArrowUp') { e.preventDefault(); v.volume = Math.min(1, v.volume + 0.05); }
      else if (k === 'ArrowDown') { e.preventDefault(); v.volume = Math.max(0, v.volume - 0.05); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onToggleTheater]);

  // Fullscreen change
  useEffect(() => {
    const onFs = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  // Click outside menus
  useEffect(() => {
    if (!showSettings && !showSubMenu) return;
    const onDoc = (e) => {
      if (!wrapRef.current?.contains(e.target)) { setShowSettings(false); setShowSubMenu(false); }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [showSettings, showSubMenu]);

  // Sync subtitle track mode with subActive state
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !subUrl) return;
    const sync = () => {
      if (v.textTracks.length > 0) {
        v.textTracks[0].mode = subActive ? 'showing' : 'hidden';
      }
    };
    if (v.readyState >= 1) sync();
    else v.addEventListener('loadedmetadata', sync, { once: true });
  }, [subUrl, subActive]);

  const toggleSubActive = () => {
    setSubActive(v => !v);
    setShowSubMenu(false);
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    v.paused ? v.play().catch(() => {}) : v.pause();
  };

  const skipBack = () => {
    const v = videoRef.current;
    if (v) { v.currentTime = Math.max(0, v.currentTime - 10); showAndScheduleHide(); }
  };

  const skipForward = () => {
    const v = videoRef.current;
    if (v) { v.currentTime = Math.min(v.duration || 0, v.currentTime + 10); showAndScheduleHide(); }
  };

  const seek = (e) => {
    const v = videoRef.current;
    if (!v || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    v.currentTime = pct * duration;
  };

  const seekHoverMove = (e) => {
    if (!duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setSeekHover({ pct, time: pct * duration, x: e.clientX - rect.left });
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (v) v.muted = !v.muted;
  };

  const setVolumeVal = (val) => {
    const v = videoRef.current;
    if (v) {
      v.volume = val;
      if (val > 0 && v.muted) v.muted = false;
    }
  };

  const setSpeedVal = (s) => {
    const v = videoRef.current;
    if (v) v.playbackRate = s;
    setShowSettings(false);
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      wrapRef.current?.requestFullscreen?.().catch(() => {});
    }
  };

  const pct = duration ? (currentTime / duration) * 100 : 0;
  const bufPct = duration ? (buffered / duration) * 100 : 0;

  return (
    <div
      ref={wrapRef}
      className={`vplayer ${showControls ? 'show-controls' : ''} ${fullscreen ? 'is-fullscreen' : ''}`}
      onMouseMove={showAndScheduleHide}
      onMouseLeave={() => playing && setShowControls(false)}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        autoPlay={autoPlay}
        playsInline
        onClick={togglePlay}
        onDoubleClick={toggleFullscreen}
        {...(subUrl ? { crossOrigin: 'anonymous' } : {})}
      >
        {subUrl && <track kind="subtitles" src={subUrl} srcLang={subLang || 'id'} label="Subtitle" default />}
      </video>

      {/* Big play button overlay when paused */}
      {!playing && duration > 0 && (
        <button className="vp-big-play" onClick={togglePlay} aria-label="Play">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
        </button>
      )}

      {/* Buffering / loading state */}
      {duration === 0 && (
        <div className="vp-loading">
          <div className="vp-spinner" />
          <span>Memuat...</span>
        </div>
      )}

      {/* Custom controls overlay */}
      <div className="vp-controls">
        {/* Progress bar */}
        <div
          className="vp-progress"
          onClick={seek}
          onMouseMove={seekHoverMove}
          onMouseLeave={() => setSeekHover(null)}
        >
          <div className="vp-bar-track">
            <div className="vp-bar-buffered" style={{ width: `${bufPct}%` }} />
            <div className="vp-bar-fill" style={{ width: `${pct}%` }} />
            <div className="vp-bar-thumb" style={{ left: `${pct}%` }} />
          </div>
          {seekHover && (
            <div className="vp-bar-tooltip" style={{ left: seekHover.x }}>
              {fmtTime(seekHover.time)}
            </div>
          )}
        </div>

        {/* Controls row */}
        <div className="vp-row">
          <button className="vp-btn vp-play" onClick={togglePlay} title={playing ? 'Pause (Space)' : 'Play (Space)'}>
            {playing ? (
              <svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" /><rect x="14" y="5" width="4" height="14" /></svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
            )}
          </button>

          <button className="vp-btn" onClick={skipBack} title="Skip back 10s (←)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="11 17 6 12 11 7" /><polyline points="18 17 13 12 18 7" />
            </svg>
            <span className="vp-skip-num">10</span>
          </button>

          <button className="vp-btn" onClick={skipForward} title="Skip forward 10s (→)">
            <span className="vp-skip-num">10</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="13 17 18 12 13 7" /><polyline points="6 17 11 12 6 7" />
            </svg>
          </button>

          <div className="vp-volume">
            <button className="vp-btn" onClick={toggleMute} title="Mute (M)">
              {muted || volume === 0 ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" /></svg>
              ) : volume < 0.5 ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /></svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" /></svg>
              )}
            </button>
            <input
              type="range"
              className="vp-volume-slider"
              min="0" max="1" step="0.05"
              value={muted ? 0 : volume}
              onChange={(e) => setVolumeVal(parseFloat(e.target.value))}
            />
          </div>

          <div className="vp-time">
            <span className="vp-current">{fmtTime(currentTime)}</span>
            <span className="vp-sep">/</span>
            <span className="vp-duration">{fmtTime(duration)}</span>
          </div>

          <div className="vp-spacer" />

          {/* Settings (speed) */}
          <div className="vp-dropdown-wrap">
            <button className="vp-btn" onClick={() => { setShowSettings(s => !s); setShowSubMenu(false); }} title="Pengaturan">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
            </button>
            {showSettings && (
              <div className="vp-menu">
                <div className="vp-menu-header">Kecepatan Putar</div>
                {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map(s => (
                  <button
                    key={s}
                    className={`vp-menu-item ${speed === s ? 'active' : ''}`}
                    onClick={() => setSpeedVal(s)}
                  >
                    {s === 1 ? 'Normal' : `${s}x`}
                    {speed === s && <span className="vp-check">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Subtitle / CC */}
          <div className="vp-dropdown-wrap">
            <button
              className={`vp-btn ${subUrl && subActive ? 'active' : ''}`}
              onClick={() => { setShowSubMenu(s => !s); setShowSettings(false); }}
              title="Subtitle (CC)"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <path d="M7 12h4M7 15h2M13 12h4M13 15h2" />
              </svg>
            </button>
            {showSubMenu && (
              <div className="vp-menu">
                <div className="vp-menu-header">Subtitle</div>
                {SUBS.map(s => (
                  <button
                    key={s.code}
                    className={`vp-menu-item ${subtitle === s.code ? 'active' : ''}`}
                    onClick={() => {
                      if (s.code === 'manual') {
                        subInputRef.current?.click();
                      } else {
                        onSubChange && onSubChange(s.code);
                        setShowSubMenu(false);
                      }
                    }}
                  >
                    <span style={{ flex: 1 }}>{s.label}</span>
                    {subtitle === s.code && <span className="vp-check">✓</span>}
                  </button>
                ))}
                {subUrl && (
                  <button className={`vp-menu-item ${subActive ? 'active' : ''}`} onClick={toggleSubActive}
                    style={{ borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: 4 }}>
                    {subActive ? '✓ Subtitle Aktif' : '✗ Subtitle Nonaktif'}
                  </button>
                )}
              </div>
            )}
            <input
              ref={subInputRef}
              type="file"
              accept=".srt,.vtt,.ass,.ssa"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) { onSubUpload && onSubUpload(file); setSubActive(true); setShowSubMenu(false); }
                e.target.value = '';
              }}
            />
          </div>

          {/* Theater mode */}
          <button
            className={`vp-btn ${theaterMode ? 'active' : ''}`}
            onClick={onToggleTheater}
            title="Theater Mode (T)"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="6" width="18" height="12" rx="1" /></svg>
          </button>

          {/* Fullscreen */}
          <button className="vp-btn" onClick={toggleFullscreen} title="Fullscreen (F)">
            {fullscreen ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3M16 21v-3a2 2 0 0 1 2-2h3" /></svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" /></svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
});

export default CustomVideoPlayer;
