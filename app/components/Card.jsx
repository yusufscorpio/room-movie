'use client';
import { useState } from 'react';
import * as Data from '@/lib/data';
import { PlayIcon } from './icons';

export default function Card({ item, onPlay }) {
  const [imgFailed, setImgFailed] = useState(false);
  const imgSrc = Data.imgSrc(item);
  const hasImg = !!imgSrc && !imgFailed;
  const genres = (item.genres || []).slice(0, 3).join(' / ');
  const progress = item._progress;

  return (
    <div className="card" onClick={() => onPlay && onPlay(item.id)}>
      <div className="card-poster">
        {hasImg && (
          <img
            className="card-img"
            src={imgSrc}
            alt={item.title}
            loading="lazy"
            onError={() => setImgFailed(true)}
          />
        )}
        {!hasImg && (
          <div className="card-fallback">
            <div className="ftitle">{item.title}</div>
          </div>
        )}
        <div className="card-poster-overlay">
          <span className="card-play-icon"><PlayIcon /></span>
        </div>
        {item.year && <span className="card-year">{item.year}</span>}
        <span className="card-hd-badge" style={{
          position: 'absolute', top: 8, left: 8,
          background: 'linear-gradient(135deg, #ff6b00, #ff3d00)',
          color: '#fff', fontSize: 10, fontWeight: 800,
          padding: '3px 7px', borderRadius: 4, letterSpacing: 0.5,
          boxShadow: '0 2px 6px rgba(0,0,0,0.4)'
        }}>HD</span>
        {item.duration && (
          <span className="card-duration" style={{
            position: 'absolute', bottom: 8, right: 8,
            background: 'rgba(0,0,0,0.75)', color: '#fff',
            fontSize: 11, fontWeight: 600, padding: '3px 7px',
            borderRadius: 4, backdropFilter: 'blur(4px)'
          }}>⏱ {item.duration}</span>
        )}
        {progress && (
          <div className="card-progress">
            <div className="card-progress-fill" style={{ width: `${Math.min(100, progress.percent)}%` }} />
          </div>
        )}
      </div>
      <div className="card-info">
        {item.rating && (
          <div className="card-rating-line">
            <span className="rating-num">{item.rating}</span>
            <span className="rating-tag">IMDB</span>
          </div>
        )}
        <h4 className="card-title">{item.title}</h4>
        {genres && <p className="card-genres">{genres}</p>}
      </div>
    </div>
  );
}
