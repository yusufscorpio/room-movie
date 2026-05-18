'use client';
import * as Data from '@/lib/data';
import { PlayIcon, CalendarIcon, StarIcon, TagIcon, InfoIcon } from './icons';

const COLORS = ['#ff7b2e', '#5fb0ff', '#ff5252', '#9f7aea', '#48bb78', '#f5c518'];

export default function Hero({ items, onPlay }) {
  if (!items || items.length === 0) {
    return (
      <section className="hero">
        <div className="hero-loading">Belum ada konten — Login admin (Shift+W) untuk menambahkan.</div>
      </section>
    );
  }

  const featured = items.find(i => i.tag === 'featured') || items[0];
  const bgImg = Data.backdropSrc(featured) || Data.imgSrc(featured) || '';
  const initials = (featured.title || '?').replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 6).split('');
  const dateLabel = featured.year
    ? new Date(featured.year, 0, 1).toLocaleString('en-US', { month: 'short' }) + ' ' + featured.year
    : '';
  const genreLabel = (featured.genres || []).slice(0, 2).join(' / ');

  return (
    <section className="hero">
      <div className="hero-bg" style={{ backgroundImage: `url('${bgImg}')` }} />
      <div className="hero-content">
        <h1 className="hero-title-circle">
          {featured.title}
          {featured.year && <span className="hero-year"> ({featured.year})</span>}
        </h1>
        <div className="hero-meta-circle">
          {dateLabel && <span className="hero-meta-item"><CalendarIcon />{dateLabel}</span>}
          {featured.rating && <span className="hero-meta-item"><StarIcon />{featured.rating}/10</span>}
          {genreLabel && <span className="hero-meta-item"><TagIcon />{genreLabel}</span>}
        </div>
        <div className="hero-actions">
          <button className="btn-watch" onClick={() => onPlay(featured.id)}>
            <PlayIcon width={14} height={14} /> Watch now
          </button>
          <button className="btn-detail" onClick={() => onPlay(featured.id)}>
            <InfoIcon width={14} height={14} /> View detail
          </button>
        </div>
        <div className="hero-cast">
          {initials.map((ch, i) => (
            <div key={i} className="cast-avatar" style={{ background: COLORS[i % COLORS.length] }}>{ch}</div>
          ))}
        </div>
      </div>
    </section>
  );
}
