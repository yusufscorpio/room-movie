'use client';
import { useState } from 'react';
import * as Data from '@/lib/data';
import { PlayIcon } from './icons';

export default function ContinueWatchingRow({ items, onPlay, onRemove }) {
  if (!items || items.length === 0) return null;

  return (
    <div className="continue-row">
      <div className="continue-head">
        <h3 className="continue-title">CONTINUE WATCHING</h3>
        <span className="continue-sub">{items.length} {items.length === 1 ? 'video' : 'videos'} ›</span>
      </div>
      <div className="continue-track">
        {items.map(item => (
          <ContinueCard key={item.id} item={item} onPlay={onPlay} onRemove={onRemove} />
        ))}
      </div>
    </div>
  );
}

function ContinueCard({ item, onPlay, onRemove }) {
  const [imgFailed, setImgFailed] = useState(false);
  const img = Data.backdropSrc(item) || Data.imgSrc(item);
  const showImg = img && !imgFailed;
  const p = item._progress;
  const remaining = p && p.duration ? p.duration - p.time : 0;
  const remainingMin = Math.max(1, Math.ceil(remaining / 60));

  return (
    <div className="continue-card" onClick={() => onPlay(item.id)}>
      <div className="continue-thumb">
        {showImg ? (
          <img src={img} alt={item.title} loading="lazy" onError={() => setImgFailed(true)} />
        ) : (
          <div className="continue-thumb-fallback">{(item.title || '?').charAt(0)}</div>
        )}
        <div className="continue-overlay">
          <span className="continue-play-icon"><PlayIcon /></span>
        </div>
        <button
          className="continue-remove"
          onClick={(e) => { e.stopPropagation(); onRemove && onRemove(item.id); }}
          title="Hapus dari Continue Watching"
        >×</button>
        <div className="continue-progress">
          <div className="continue-progress-fill" style={{ width: `${Math.min(100, p.percent)}%` }} />
        </div>
      </div>
      <div className="continue-meta">
        <h4>{item.title}</h4>
        <p>
          <span className="continue-resume">▸ Lanjutkan</span>
          {' · '}
          <span>{remainingMin} menit lagi</span>
        </p>
      </div>
    </div>
  );
}
