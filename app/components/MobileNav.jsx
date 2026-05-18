'use client';
import { HomeIcon, SearchIcon, TrendingIcon, TagIcon, ClockIcon } from './icons';

const ITEMS = [
  { id: 'home', label: 'Home', Icon: HomeIcon },
  { id: 'search', label: 'Cari', Icon: SearchIcon },
  { id: 'trending', label: 'Trending', Icon: TrendingIcon },
  { id: 'genre', label: 'Genre', Icon: TagIcon },
  { id: 'history', label: 'History', Icon: ClockIcon }
];

export default function MobileNav({ section, onNav }) {
  return (
    <nav className="mobile-nav">
      {ITEMS.map(({ id, label, Icon }) => (
        <button
          key={id}
          className={`mnav-btn ${section === id ? 'active' : ''}`}
          onClick={() => onNav(id)}
        >
          <Icon /><span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
