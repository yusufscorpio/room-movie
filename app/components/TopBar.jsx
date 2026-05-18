'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import * as Data from '@/lib/data';
import { SearchIcon } from './icons';
import NotificationBell from './NotificationBell';

const LANGS = [
  { code: 'id', label: 'Indonesia', flag: '🇮🇩' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'zh', label: 'Mandarin', flag: '🇨🇳' },
  { code: 'ms', label: 'Melayu', flag: '🇲🇾' }
];

const SUBS = [
  { code: 'off', label: 'Off' },
  { code: 'id', label: 'Indonesia' },
  { code: 'en', label: 'English' },
  { code: 'zh', label: 'Mandarin' },
  { code: 'ms', label: 'Melayu' },
  { code: 'manual', label: 'Manual (Upload .srt/.vtt)' }
];

const MAIN_NAV = [
  { id: 'home', label: 'Home' },
  { id: 'movies', label: 'Films' },
  { id: 'tv', label: 'Series' },
  { id: 'trending', label: 'Trending' }
];

const MORE_NAV = [
  { id: 'genre', label: 'Genre' },
  { id: 'history', label: 'History' },
  { id: 'mylist', label: 'Favoritku' },
  { id: 'shuffle', label: 'Acak' }
];

export default function TopBar({
  section, onNav,
  user, isAdmin, onLogin, onLogout, onAdmin, onPlay,
  lang, onChangeLang,
  subtitle, onChangeSubtitle, onUploadSubtitle,
  notifRefreshKey, onNotifChange
}) {
  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [openMenu, setOpenMenu] = useState(null); // 'lang' | 'sub' | 'user' | 'more' | 'mobileMenu' | null
  const wrapRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setShowResults(false);
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    return Data.search(query).slice(0, 7);
  }, [query]);

  const currentLang = LANGS.find(l => l.code === lang) || LANGS[0];
  const currentSub = SUBS.find(s => s.code === subtitle) || SUBS[0];

  const pickResult = (id) => {
    onPlay(id);
    setQuery('');
    setShowResults(false);
  };

  const handleSubChange = (code) => {
    if (code === 'manual') {
      fileRef.current?.click();
    } else {
      onChangeSubtitle(code);
    }
    setOpenMenu(null);
  };

  const handleSubFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!/\.(srt|vtt)$/i.test(f.name)) {
      alert('File harus .srt atau .vtt');
      e.target.value = '';
      return;
    }
    onChangeSubtitle('manual');
    onUploadSubtitle && onUploadSubtitle(f);
    e.target.value = '';
  };

  const handleNavClick = (id) => {
    onNav(id);
    setOpenMenu(null);
  };

  const isActive = (id) => section === id;
  const isMoreActive = MORE_NAV.some(m => m.id === section);

  return (
    <div className="topbar" ref={wrapRef}>
      {/* === LEFT: Brand + Nav === */}
      <div className="topbar-left">
        <button className="topbar-brand" onClick={() => onNav('home')}>
          <div className="brand-logo brand-logo-sm">
            <span className="brand-letter">R</span>
          </div>
          <span className="topbar-brand-name">Room <span className="brand-accent">Movie</span></span>
        </button>

        {/* Hamburger for mobile */}
        <button
          className="topbar-hamburger"
          onClick={() => setOpenMenu(m => m === 'mobileMenu' ? null : 'mobileMenu')}
          aria-label="Menu"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        {/* Desktop inline nav */}
        <nav className="topbar-nav">
          {MAIN_NAV.map(n => (
            <button
              key={n.id}
              className={`tnav-link ${isActive(n.id) ? 'active' : ''}`}
              onClick={() => handleNavClick(n.id)}
            >
              {n.label}
            </button>
          ))}
          <div className="topbar-dropdown">
            <button
              className={`tnav-link tnav-more ${isMoreActive ? 'active' : ''}`}
              onClick={() => setOpenMenu(m => m === 'more' ? null : 'more')}
            >
              More <span className="dd-arrow">▾</span>
            </button>
            {openMenu === 'more' && (
              <div className="topbar-menu">
                {MORE_NAV.map(n => (
                  <button
                    key={n.id}
                    className={`menu-item ${isActive(n.id) ? 'active' : ''}`}
                    onClick={() => handleNavClick(n.id)}
                  >
                    <span style={{ flex: 1 }}>{n.label}</span>
                    {isActive(n.id) && <span style={{ fontSize: 14 }}>✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </nav>
      </div>

      {/* Mobile menu drawer */}
      {openMenu === 'mobileMenu' && (
        <div className="topbar-menu mobile-drawer">
          {[...MAIN_NAV, ...MORE_NAV].map(n => (
            <button
              key={n.id}
              className={`menu-item ${isActive(n.id) ? 'active' : ''}`}
              onClick={() => handleNavClick(n.id)}
            >
              <span style={{ flex: 1 }}>{n.label}</span>
              {isActive(n.id) && <span style={{ fontSize: 14 }}>✓</span>}
            </button>
          ))}
        </div>
      )}

      {/* === CENTER: Search === */}
      <div className="topbar-search">
        <SearchIcon />
        <input
          type="text"
          placeholder="Cari film..."
          value={query}
          onChange={(e) => { setQuery(e.target.value); setShowResults(true); }}
          onFocus={() => setShowResults(true)}
        />
        {showResults && query.trim() && (
          <div className="search-dropdown">
            {results.length === 0 ? (
              <div className="search-empty">Tidak ada hasil untuk &ldquo;{query}&rdquo;</div>
            ) : (
              results.map(it => {
                const img = Data.imgSrc(it);
                return (
                  <div key={it.id} className="search-result" onClick={() => pickResult(it.id)}>
                    <div className="search-result-thumb">
                      {img
                        ? <img src={img} alt={it.title} onError={(e) => { e.target.style.display = 'none'; }} />
                        : <div className="search-fallback">{(it.title || '?').charAt(0)}</div>}
                    </div>
                    <div className="search-result-meta">
                      <h5>{it.title}</h5>
                      <p>
                        {it.category === 'tv' ? 'Serial TV' : 'Film'}
                        {it.year ? ` · ${it.year}` : ''}
                        {it.rating ? ` · ★ ${it.rating}` : ''}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* === RIGHT: Lang / Sub / Bell / User === */}
      <div className="topbar-actions">
        <div className="topbar-dropdown">
          <button className="topbar-btn" onClick={() => setOpenMenu(m => m === 'lang' ? null : 'lang')}>
            <span className="dd-icon">{currentLang.flag}</span>
            <span className="dd-label">{currentLang.label}</span>
            <span className="dd-arrow">▾</span>
          </button>
          {openMenu === 'lang' && (
            <div className="topbar-menu">
              <div className="menu-header">Bahasa</div>
              {LANGS.map(l => (
                <button
                  key={l.code}
                  className={`menu-item ${lang === l.code ? 'active' : ''}`}
                  onClick={() => { onChangeLang(l.code); setOpenMenu(null); }}
                >
                  <span style={{ fontSize: 16 }}>{l.flag}</span>
                  <span style={{ flex: 1 }}>{l.label}</span>
                  {lang === l.code && <span style={{ fontSize: 14 }}>✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="topbar-dropdown">
          <button className="topbar-btn" onClick={() => setOpenMenu(m => m === 'sub' ? null : 'sub')}>
            <span className="dd-icon dd-cc">CC</span>
            <span className="dd-label">{currentSub.label}</span>
            <span className="dd-arrow">▾</span>
          </button>
          {openMenu === 'sub' && (
            <div className="topbar-menu">
              <div className="menu-header">Subtitle</div>
              {SUBS.map(s => (
                <button
                  key={s.code}
                  className={`menu-item ${subtitle === s.code ? 'active' : ''}`}
                  onClick={() => handleSubChange(s.code)}
                >
                  <span style={{ flex: 1 }}>{s.label}</span>
                  {subtitle === s.code && <span style={{ fontSize: 14 }}>✓</span>}
                </button>
              ))}
            </div>
          )}
          <input
            ref={fileRef}
            type="file"
            accept=".srt,.vtt,application/x-subrip,text/vtt"
            hidden
            onChange={handleSubFile}
          />
        </div>

        <NotificationBell refreshKey={notifRefreshKey} onChange={onNotifChange} />

        {user ? (
          <div className="topbar-dropdown">
            <button className="topbar-user-btn" onClick={() => setOpenMenu(m => m === 'user' ? null : 'user')}>
              <div className="user-avatar-sm">{user.charAt(0).toUpperCase()}</div>
              <span className="user-name-sm">{user}</span>
              <span className="dd-arrow">▾</span>
            </button>
            {openMenu === 'user' && (
              <div className="topbar-menu">
                <div className="menu-header">{user}</div>
                {isAdmin && (
                  <button className="menu-item" onClick={() => { onAdmin(); setOpenMenu(null); }}>
                    <span style={{ flex: 1 }}>⚙ Admin Panel</span>
                  </button>
                )}
                <button className="menu-item" onClick={() => { onLogout(); setOpenMenu(null); }}>
                  <span style={{ flex: 1 }}>Logout</span>
                </button>
              </div>
            )}
          </div>
        ) : isAdmin ? (
          <div className="topbar-dropdown">
            <button className="topbar-btn topbar-admin-btn" onClick={() => onAdmin()} title="Admin Panel">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              <span className="dd-label">Admin</span>
            </button>
          </div>
        ) : (
          <button className="btn-login-user" onClick={onLogin}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              <polyline points="10 17 15 12 10 7" />
              <line x1="15" y1="12" x2="3" y2="12" />
            </svg>
            <span>Login</span>
          </button>
        )}
      </div>
    </div>
  );
}
