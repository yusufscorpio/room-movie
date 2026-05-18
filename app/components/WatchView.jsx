'use client';
import { useEffect, useMemo, useState, useRef } from 'react';
import * as Data from '@/lib/data';
import * as IDB from '@/lib/idb';
import { ChevronLeftIcon, HeartIcon, BookmarkIcon, ShareIcon, PlayIcon } from './icons';
import CustomVideoPlayer from './CustomVideoPlayer';
import AutoNextOverlay from './AutoNextOverlay';

export default function WatchView({ item, allItems, onBack, onPlay, onToast, subtitleFile, subtitle }) {
  const [resolvedSrc, setResolvedSrc] = useState(item.videoSrc || '');
  const [liked, setLiked] = useState(() => Data.isLiked(item.id));
  const [saved, setSaved] = useState(() => Data.isSaved(item.id));
  const [subUrl, setSubUrl] = useState('');
  const [theaterMode, setTheaterMode] = useState(false);
  const [showAutoNext, setShowAutoNext] = useState(false);
  const blobUrlRef = useRef(null);
  const subUrlRef = useRef(null);
  const videoRef = useRef(null);
  const lastSaveRef = useRef(0);

  // Subtitle file → object URL
  useEffect(() => {
    if (subUrlRef.current) {
      URL.revokeObjectURL(subUrlRef.current);
      subUrlRef.current = null;
    }
    if (subtitleFile && subtitle === 'manual') {
      const url = URL.createObjectURL(subtitleFile);
      subUrlRef.current = url;
      setSubUrl(url);
    } else {
      setSubUrl('');
    }
    return () => {
      if (subUrlRef.current) {
        URL.revokeObjectURL(subUrlRef.current);
        subUrlRef.current = null;
      }
    };
  }, [subtitleFile, subtitle]);

  // Resolve idb: video → object URL
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!item.videoSrc) return;
      if (IDB.isRef(item.videoSrc)) {
        onToast && onToast('Memuat video dari penyimpanan lokal...', '');
        const url = await Data.videoSrc(item);
        if (cancelled) {
          if (url) URL.revokeObjectURL(url);
          return;
        }
        if (url) {
          blobUrlRef.current = url;
          setResolvedSrc(url);
        } else {
          onToast && onToast('File video hilang dari IndexedDB', 'error');
        }
      } else {
        setResolvedSrc(item.videoSrc);
      }
    })();
    return () => {
      cancelled = true;
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [item.id, item.videoSrc, onToast]);

  useEffect(() => {
    setLiked(Data.isLiked(item.id));
    setSaved(Data.isSaved(item.id));
    setShowAutoNext(false); // reset on change
  }, [item.id]);

  // Reset theater mode on item change
  useEffect(() => {
    setTheaterMode(false);
  }, [item.id]);

  // Apply body class for theater mode (so sidebar/topbar fade)
  useEffect(() => {
    if (theaterMode) document.body.classList.add('theater-mode-active');
    else document.body.classList.remove('theater-mode-active');
    return () => document.body.classList.remove('theater-mode-active');
  }, [theaterMode]);

  // Watch progress save/restore via player events
  const handlePlayerLoadedMetadata = (v) => {
    const p = Data.getProgress(item.id);
    if (p && p.time > 5 && p.time < (v.duration - 5)) {
      v.currentTime = p.time;
      onToast && onToast(`Resume dari ${formatTime(p.time)}`, 'success');
    }
  };

  const handlePlayerTimeUpdate = (v) => {
    const now = Date.now();
    if (now - lastSaveRef.current > 5000 && v.duration && v.currentTime > 5) {
      lastSaveRef.current = now;
      Data.setProgress(item.id, v.currentTime, v.duration);
    }
  };

  const handlePlayerPause = (v) => {
    if (v && v.duration && v.currentTime > 5) {
      Data.setProgress(item.id, v.currentTime, v.duration);
    }
  };

  const handlePlayerEnded = () => {
    Data.clearProgress(item.id);
    // Show auto-next overlay if there's a recommendation
    if (recs.length > 0) setShowAutoNext(true);
  };

  const recs = useMemo(() => {
    const rest = allItems.filter(x => x.id !== item.id);
    const cgenres = item.genres || [];
    const sameGenre = rest.filter(x => (x.genres || []).some(g => cgenres.includes(g)));
    const others = rest.filter(x => !sameGenre.includes(x));
    return [...sameGenre, ...others].slice(0, 10);
  }, [item.id, allItems]);

  const dateLabel = item.year || '—';
  const categoryLabel = item.category === 'tv' ? 'Serial TV' : 'Film';
  const genresText = (item.genres || []).join(' · ') || '—';

  const handleLike = () => {
    const v = Data.toggleLike(item.id);
    setLiked(v);
    onToast && onToast(v ? 'Ditambahkan ke Suka' : 'Dihapus dari Suka', 'success');
  };

  const handleSave = () => {
    const v = Data.toggleSave(item.id);
    setSaved(v);
    onToast && onToast(v ? 'Disimpan' : 'Hapus dari simpanan', 'success');
  };

  const handleShare = () => {
    if (typeof window === 'undefined') return;
    const url = `${window.location.origin}${window.location.pathname}?play=${encodeURIComponent(item.id)}`;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(
        () => onToast && onToast('Link disalin ke clipboard', 'success'),
        () => onToast && onToast('Gagal menyalin: ' + url, 'error')
      );
    } else {
      onToast && onToast('Link: ' + url, '');
    }
  };

  const handleAutoNextPlay = (id) => {
    setShowAutoNext(false);
    onPlay(id);
  };

  return (
    <div className={`view view-watch active ${theaterMode ? 'theater-on' : ''}`}>
      <div className="watch-header">
        <button className="back-btn" onClick={onBack}><ChevronLeftIcon /></button>
        <h1 className="watch-h1">{item.title}</h1>
      </div>

      <div className="watch-grid">
        <div className="watch-main">
          <div className={`watch-player ${theaterMode ? 'theater' : ''}`}>
            {item.videoType === 'embed' && resolvedSrc ? (
              <iframe
                src={resolvedSrc}
                allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={item.title}
              />
            ) : resolvedSrc ? (
              <CustomVideoPlayer
                ref={videoRef}
                src={resolvedSrc}
                subUrl={subUrl}
                subLang={subtitle === 'manual' ? 'id' : subtitle}
                theaterMode={theaterMode}
                onToggleTheater={() => setTheaterMode(t => !t)}
                onLoadedMetadata={handlePlayerLoadedMetadata}
                onTimeUpdate={handlePlayerTimeUpdate}
                onPause={handlePlayerPause}
                onEnded={handlePlayerEnded}
              />
            ) : (
              <div className="watch-player-fallback">
                <div>Sumber video tidak tersedia</div>
              </div>
            )}

            {showAutoNext && recs[0] && (
              <AutoNextOverlay
                nextItem={recs[0]}
                onPlay={handleAutoNextPlay}
                onCancel={() => setShowAutoNext(false)}
              />
            )}
          </div>

          <div className="watch-meta-bar">
            <span className="meta-pill">{dateLabel}</span>
            <span className="meta-pill">{categoryLabel}</span>
            <span className="meta-pill meta-genre">{genresText}</span>
            {item.rating && <span className="meta-pill meta-rating">★ {item.rating}</span>}
            <div className="watch-actions-mini">
              <button className={`icon-btn ${liked ? 'active' : ''}`} onClick={handleLike} title="Suka"><HeartIcon /></button>
              <button className={`icon-btn ${saved ? 'active' : ''}`} onClick={handleSave} title="Simpan"><BookmarkIcon /></button>
              <button className="icon-btn" onClick={handleShare} title="Bagikan"><ShareIcon /></button>
              <button className={`icon-btn ${theaterMode ? 'active' : ''}`} onClick={() => setTheaterMode(t => !t)} title="Theater Mode (T)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="6" width="18" height="12" rx="1" /></svg>
              </button>
            </div>
          </div>

          <div className="watch-info">
            <h2>{item.title}</h2>
            <p className="watch-desc">{item.desc || 'Tidak ada deskripsi.'}</p>
          </div>
        </div>

        <aside className="watch-side">
          <div className="side-section">
            <h3 className="side-title">Rekomendasi</h3>
            <div className="rec-list">
              {recs.length === 0 ? (
                <div className="empty-state" style={{ padding: '24px 0' }}>Tidak ada rekomendasi.</div>
              ) : (
                recs.map(it => <RecCard key={it.id} item={it} onPlay={onPlay} />)
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function formatTime(seconds) {
  if (!seconds || !isFinite(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function RecCard({ item, onPlay }) {
  const [imgFailed, setImgFailed] = useState(false);
  const img = Data.imgSrc(item);
  const showImg = img && !imgFailed;

  return (
    <div className="rec-card" onClick={() => onPlay(item.id)}>
      <div className="rec-thumb">
        {showImg && <img src={img} alt={item.title} loading="lazy" onError={() => setImgFailed(true)} />}
        {!showImg && <div className="rec-thumb-fallback">{(item.title || '?').charAt(0)}</div>}
        <span className="rec-play"><PlayIcon /></span>
      </div>
      <div className="rec-meta">
        <h4>{item.title}</h4>
        <p>
          {item.category === 'tv' ? 'Serial TV' : 'Film'}
          {item.year ? ` · ${item.year}` : ''}
          {item.rating ? ` · ★ ${item.rating}` : ''}
        </p>
        <p className="rec-genres">{(item.genres || []).slice(0, 2).join(' · ')}</p>
      </div>
    </div>
  );
}
