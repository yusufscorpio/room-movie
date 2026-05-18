'use client';
import { useEffect, useState } from 'react';
import * as Data from '@/lib/data';

const COUNTDOWN_SECONDS = 10;

export default function AutoNextOverlay({ nextItem, onPlay, onCancel }) {
  const [count, setCount] = useState(COUNTDOWN_SECONDS);

  useEffect(() => {
    if (!nextItem) return;
    setCount(COUNTDOWN_SECONDS);
    const interval = setInterval(() => {
      setCount(c => {
        if (c <= 1) {
          clearInterval(interval);
          // Trigger next play
          setTimeout(() => onPlay(nextItem.id), 0);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [nextItem, onPlay]);

  if (!nextItem) return null;

  const img = Data.imgSrc(nextItem) || Data.backdropSrc(nextItem);
  const pct = ((COUNTDOWN_SECONDS - count) / COUNTDOWN_SECONDS) * 100;

  return (
    <div className="autonext-overlay">
      <div className="autonext-card">
        <div className="autonext-thumb">
          {img && <img src={img} alt={nextItem.title} />}
          <div className="autonext-thumb-overlay" />
        </div>
        <div className="autonext-info">
          <div className="autonext-label">SELANJUTNYA</div>
          <h2 className="autonext-title">{nextItem.title}</h2>
          <p className="autonext-meta">
            {nextItem.year ? `${nextItem.year} · ` : ''}
            {nextItem.category === 'tv' ? 'Serial TV' : 'Film'}
            {nextItem.rating ? ` · ★ ${nextItem.rating}` : ''}
          </p>
          {nextItem.desc && <p className="autonext-desc">{nextItem.desc}</p>}
          <div className="autonext-actions">
            <button className="btn-watch autonext-play-btn" onClick={() => onPlay(nextItem.id)}>
              <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M8 5v14l11-7z" /></svg>
              Putar Sekarang
            </button>
            <button className="btn-detail autonext-cancel-btn" onClick={onCancel}>
              Batal
            </button>
          </div>
          <div className="autonext-countdown">
            <span className="autonext-count-text">Memutar selanjutnya dalam <strong>{count}</strong>s</span>
            <div className="autonext-progress">
              <div className="autonext-progress-fill" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
