'use client';
import { useMemo, useState } from 'react';
import * as Data from '@/lib/data';
import Card from './Card';
import { SearchIcon } from './icons';

export default function GridView({ section, allItems, onPlay, onClearHistory }) {
  const [genreFilter, setGenreFilter] = useState('__all');
  const [searchQuery, setSearchQuery] = useState('');

  const config = useMemo(() => {
    switch (section) {
      case 'movies':
        return { title: 'Film', items: allItems.filter(i => i.category === 'movies'), emptyMsg: 'Belum ada film' };
      case 'tv':
        return { title: 'TV Series', items: allItems.filter(i => i.category === 'tv'), emptyMsg: 'Belum ada series' };
      case 'trending': {
        const trending = allItems.filter(i => i.tag === 'trending');
        return { title: 'Trending Now', items: trending.length ? trending : allItems, emptyMsg: 'Belum ada trending' };
      }
      case 'mylist': {
        const liked = Data.getLikedItems();
        const saved = Data.getSavedItems();
        const merged = [...new Map([...liked, ...saved].map(i => [i.id, i])).values()];
        return { title: 'Favoritku', items: merged, emptyMsg: 'Belum ada favorit. Klik ♥ atau 📌 di video untuk menambahkan.' };
      }
      case 'history':
        return { title: 'History', items: Data.getHistoryItems(), emptyMsg: 'Belum ada riwayat tonton.' };
      case 'genre':
        return { title: 'Genre', items: allItems, emptyMsg: 'Belum ada konten' };
      case 'search':
        return { title: 'Cari', items: searchQuery ? Data.search(searchQuery) : [], emptyMsg: searchQuery ? `Tidak ada hasil untuk "${searchQuery}"` : '' };
      default:
        return { title: section, items: allItems, emptyMsg: 'Belum ada konten' };
    }
  }, [section, allItems, searchQuery]);

  const allGenres = useMemo(() => {
    if (section !== 'genre') return [];
    const s = new Set();
    allItems.forEach(i => (i.genres || []).forEach(g => g && s.add(g)));
    return Array.from(s).sort();
  }, [section, allItems]);

  const finalItems = useMemo(() => {
    if (section !== 'genre') return config.items;
    if (genreFilter === '__all') return config.items;
    return config.items.filter(i => (i.genres || []).includes(genreFilter));
  }, [section, config.items, genreFilter]);

  return (
    <div className="view view-grid active">
      <div className="view-head">
        <h1 className="view-title">{config.title}</h1>
        <div className="view-actions">
          {section === 'history' && Data.getHistoryItems().length > 0 && (
            <button className="btn-ghost btn-sm" onClick={onClearHistory}>Hapus Semua</button>
          )}
        </div>
      </div>

      {section === 'search' && (
        <div className="search-wrap">
          <div className="search-input-wrap">
            <SearchIcon />
            <input
              type="text"
              placeholder="Cari film, series, atau judul..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
          </div>
        </div>
      )}

      {section === 'genre' && allGenres.length > 0 && (
        <div className="grid-toolbar">
          <button className={`genre-chip ${genreFilter === '__all' ? 'active' : ''}`} onClick={() => setGenreFilter('__all')}>
            Semua ({allItems.length})
          </button>
          {allGenres.map(g => {
            const count = allItems.filter(i => (i.genres || []).includes(g)).length;
            return (
              <button
                key={g}
                className={`genre-chip ${genreFilter === g ? 'active' : ''}`}
                onClick={() => setGenreFilter(g)}
              >
                {g} <span className="chip-count">{count}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="grid">
        {finalItems.length === 0 ? (
          <div className="empty-state" style={{ gridColumn: '1/-1' }}>{config.emptyMsg}</div>
        ) : (
          finalItems.map(it => <Card key={it.id} item={it} onPlay={onPlay} />)
        )}
      </div>
    </div>
  );
}
