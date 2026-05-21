'use client';
import { useMemo, useState, useCallback } from 'react';
import * as Data from '@/lib/data';
import Hero from './Hero';
import Card from './Card';
import ContinueWatchingRow from './ContinueWatchingRow';
import Top10Row from './Top10Row';
import { SearchIcon } from './icons';

const PAGE_SIZE = 30;

export default function HomeView({ allItems, onPlay }) {
  const [progressTick, setProgressTick] = useState(0);
  const refreshProgress = useCallback(() => setProgressTick(t => t + 1), []);
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('default');
  const [page, setPage] = useState(1);

  const featuredItems = useMemo(
    () => allItems.filter(i => i.tag === 'new' || i.tag === 'featured').slice(0, 6),
    [allItems]
  );

  const continueItems = useMemo(
    () => Data.getContinueWatching(),
    [allItems, progressTick]
  );

  const top10 = useMemo(
    () => Data.getTop10(),
    [allItems, progressTick]
  );

  const handleRemoveFromContinue = useCallback((id) => {
    Data.clearProgress(id);
    refreshProgress();
  }, [refreshProgress]);

  const filtered = useMemo(() => {
    let items = allItems.slice();
    if (filter === 'movies') items = items.filter(i => i.category === 'movies');
    else if (filter === 'tv') items = items.filter(i => i.category === 'tv');
    else if (filter === 'trending') items = items.filter(i => i.tag === 'trending');
    else if (filter === 'new') items = items.filter(i => i.tag === 'new');
    if (query) {
      const q = query.toLowerCase();
      items = items.filter(i =>
        (i.title || '').toLowerCase().includes(q) ||
        (i.genres || []).some(g => g.toLowerCase().includes(q))
      );
    }
    if (sort === 'rating') items.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    else if (sort === 'year') items.sort((a, b) => (b.year || 0) - (a.year || 0));
    else if (sort === 'title') items.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    return items;
  }, [allItems, filter, query, sort]);

  const visible = filtered.slice(0, page * PAGE_SIZE);

  return (
    <div className="view view-home active">
      <Hero items={allItems} onPlay={onPlay} />

      <ContinueWatchingRow items={continueItems} onPlay={onPlay} onRemove={handleRemoveFromContinue} />

      <Top10Row items={top10} onPlay={onPlay} />

      {featuredItems.length > 0 && (
        <div className="featured-row">
          <div className="featured-head">
            <h3 className="featured-title">UPCOMING RELEASES</h3>
            <span className="featured-sub">Show all ›</span>
          </div>
          <div className="featured-track">
            {featuredItems.map(it => (
              <FeaturedCard key={it.id} item={it} onPlay={onPlay} />
            ))}
          </div>
        </div>
      )}

      <div className="home-toolbar">
        <div className="filter-tabs">
          {[
            { v: 'all', t: 'ALL' },
            { v: 'movies', t: 'MOVIES' },
            { v: 'tv', t: 'SERIES' },
            { v: 'trending', t: 'TRENDING' },
            { v: 'new', t: 'NEW' }
          ].map(({ v, t }) => (
            <button
              key={v}
              className={`ftab ${filter === v ? 'active' : ''}`}
              onClick={() => { setFilter(v); setPage(1); }}
            >{t}</button>
          ))}
        </div>
        <div className="home-search-wrap">
          <input
            type="text"
            placeholder="Search..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1); }}
          />
          <SearchIcon />
        </div>
        <select className="sort-select" value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }}>
          <option value="default">SORT BY</option>
          <option value="rating">★ Rating</option>
          <option value="year">📅 Tahun</option>
          <option value="title">A → Z</option>
        </select>
      </div>

      <div className="home-grid">
        {visible.length === 0 ? (
          <div className="empty-state" style={{ gridColumn: '1/-1' }}>Tidak ada hasil.</div>
        ) : (
          visible.map(it => <Card key={it.id} item={it} onPlay={onPlay} />)
        )}
      </div>

      {visible.length < filtered.length && (
        <div className="load-more-wrap">
          <button className="btn-load-more" onClick={() => setPage(p => p + 1)}>LOAD MORE...</button>
        </div>
      )}
    </div>
  );
}

function FeaturedCard({ item, onPlay }) {
  const img = Data.imgSrc(item);
  return (
    <div className="featured-card" onClick={() => onPlay(item.id)}>
      {img && <img src={img} alt={item.title} loading="lazy" />}
      <div className="featured-overlay">
        <span className="featured-badge">{item.tag === 'featured' ? 'FEATURED' : 'NEW'}</span>
        <h4>{item.title}</h4>
      </div>
    </div>
  );
}
