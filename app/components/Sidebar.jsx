'use client';
import {
  SearchIcon, HomeIcon, FilmIcon, TvIcon, TrendingIcon, TagIcon,
  ClockIcon, BookmarkIcon, ShuffleIcon, SettingsIcon,
  FacebookIcon, TwitterIcon, YoutubeIcon, InstagramIcon
} from './icons';

const NAV = [
  { id: 'search', label: 'CARI', Icon: SearchIcon },
  { id: 'home', label: 'HOME', Icon: HomeIcon },
  { id: 'movies', label: 'FILMS', Icon: FilmIcon },
  { id: 'tv', label: 'SERIES', Icon: TvIcon },
  { id: 'trending', label: 'TRENDING', Icon: TrendingIcon },
  { id: 'genre', label: 'GENRE', Icon: TagIcon },
  { id: 'history', label: 'HISTORY', Icon: ClockIcon },
  { id: 'mylist', label: 'FAVORITKU', Icon: BookmarkIcon },
  { id: 'shuffle', label: 'ACAK', Icon: ShuffleIcon }
];

export default function Sidebar({ section, onNav, isAdmin, onAdmin }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-logo sidebar-logo" title="Room Movie">
          <span className="brand-letter">R</span>
        </div>
        <div className="brand-name">
          <span className="brand-name-main">Room</span>
          <span className="brand-name-sub">Movie</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {NAV.map(({ id, label, Icon }) => (
          <button
            key={id}
            className={`nav-btn ${section === id ? 'active' : ''}`}
            onClick={() => onNav(id)}
          >
            <Icon />
            <span className="nav-label">{label}</span>
            <span className="nav-arrow">›</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-card">
          <div className="user-avatar"><span className="user-avatar-letter">{isAdmin ? 'A' : 'G'}</span></div>
          <div className="user-meta">
            <span className="user-greet">Hello,</span>
            <span className="user-name">{isAdmin ? 'Admin' : 'Guest'}</span>
          </div>
        </div>

        <div className="social-row">
          <a className="social-btn" href="#" aria-label="Facebook"><FacebookIcon /></a>
          <a className="social-btn" href="#" aria-label="Twitter"><TwitterIcon /></a>
          <a className="social-btn" href="#" aria-label="YouTube"><YoutubeIcon /></a>
          <a className="social-btn" href="#" aria-label="Instagram"><InstagramIcon /></a>
        </div>

        <div className="copyright">© 2026 Room Movie<br />All Rights Reserved</div>

        {isAdmin && (
          <button className="nav-btn admin-indicator" onClick={onAdmin}>
            <SettingsIcon />
            <span className="nav-label">ADMIN</span>
          </button>
        )}
      </div>
    </aside>
  );
}
