'use client';
import { useState } from 'react';
import * as Data from '@/lib/data';

export default function Top10Row({ items, onPlay }) {
  if (!items || items.length === 0) return null;

  return (
    <div className="top10-row">
      <div className="top10-head">
        <h3 className="top10-title">
          <span className="top10-badge">TOP 10</span> HARI INI
        </h3>
        <span className="top10-sub">Paling banyak ditonton ›</span>
      </div>
      <div className="top10-track">
        {items.map((item, idx) => (
          <Top10Card key={item.id} item={item} rank={idx + 1} onPlay={onPlay} />
        ))}
      </div>
    </div>
  );
}

function Top10Card({ item, rank, onPlay }) {
  const [imgFailed, setImgFailed] = useState(false);
  const img = Data.imgSrc(item);
  const showImg = img && !imgFailed;

  return (
    <div className="top10-card" onClick={() => onPlay(item.id)}>
      <div className="top10-rank" data-rank={rank}>{rank}</div>
      <div className="top10-poster">
        {showImg ? (
          <img src={img} alt={item.title} loading="lazy" onError={() => setImgFailed(true)} />
        ) : (
          <div className="top10-fallback">{(item.title || '?').charAt(0)}</div>
        )}
        {item.year && <span className="top10-year">{item.year}</span>}
      </div>
    </div>
  );
}
