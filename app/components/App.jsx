'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import * as Data from '@/lib/data';
import * as IDB from '@/lib/idb';
import MobileNav from './MobileNav';
import TopBar from './TopBar';
import HomeView from './HomeView';
import GridView from './GridView';
import WatchView from './WatchView';
import AdminLogin from './AdminLogin';
import AdminPanel from './AdminPanel';
import UserAuthModal from './UserAuthModal';
import Toast from './Toast';

export default function App() {
  const [section, setSection] = useState('home');
  const [allItems, setAllItems] = useState([]);
  const [watching, setWatching] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminLoginOpen, setAdminLoginOpen] = useState(false);
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [userAuthOpen, setUserAuthOpen] = useState(false);
  const [lang, setLangState] = useState('id');
  const [subtitle, setSubtitleState] = useState('off');
  const [subtitleFile, setSubtitleFile] = useState(null);
  const [toast, setToast] = useState({ message: '', type: '', stamp: 0 });
  const [hydrated, setHydrated] = useState(false);
  const [notifRefreshKey, setNotifRefreshKey] = useState(0);

  const showToast = useCallback((message, type = '') => {
    setToast({ message, type, stamp: Date.now() });
  }, []);

  const refreshData = useCallback(async () => {
    await Data.resolveAll();
    setAllItems(Data.getAll().slice());
  }, []);

  // Boot
  useEffect(() => {
    let mounted = true;
    (async () => {
      try { await IDB.open(); } catch {}
      Data.runMigrations();
      await Data.resolveAll();
      if (!mounted) return;
      setAllItems(Data.getAll().slice());
      setUser(Data.getCurrentUser());
      setLangState(Data.getLang());
      setSubtitleState(Data.getSubtitle());
      setHydrated(true);
      try {
        const params = new URLSearchParams(window.location.search);
        const id = params.get('play');
        if (id) {
          const it = Data.getById(id);
          if (it) { Data.addToHistory(id); setWatching(it); }
        }
      } catch {}
    })();
    return () => { mounted = false; };
  }, []);

  // Shift+W shortcut for admin
  useEffect(() => {
    const handler = (e) => {
      if (e.shiftKey && e.code === 'KeyW') {
        const t = e.target;
        if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
        if (window.innerWidth < 768) return;
        e.preventDefault();
        if (isAdmin) setAdminPanelOpen(true);
        else setAdminLoginOpen(true);
      }
      if (e.key === 'Escape' && watching) setWatching(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isAdmin, watching]);

  const handleNav = useCallback((s) => {
    if (s === 'shuffle') {
      const list = Data.getAll();
      if (list.length === 0) { showToast('Tidak ada konten untuk diacak', 'error'); return; }
      const r = list[Math.floor(Math.random() * list.length)];
      Data.addToHistory(r.id);
      setWatching(r);
      return;
    }
    if (watching) setWatching(null);
    setSection(s);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [watching, showToast]);

  const handlePlay = useCallback((id) => {
    const it = Data.getById(id);
    if (!it) { showToast('Konten tidak ditemukan', 'error'); return; }
    Data.addToHistory(id);
    setWatching(it);
    window.scrollTo({ top: 0 });
  }, [showToast]);

  const handleClearHistory = useCallback(() => {
    if (!confirm('Hapus semua riwayat tonton?')) return;
    Data.clearHistory();
    setAllItems(Data.getAll().slice());
    showToast('History dihapus', 'success');
  }, [showToast]);

  const handleAdminLoginSuccess = () => {
    setIsAdmin(true);
    setAdminLoginOpen(false);
    setAdminPanelOpen(true);
  };

  const handleAdminLogout = () => {
    setIsAdmin(false);
    setAdminPanelOpen(false);
    showToast('Admin logout', 'success');
  };

  // User auth handlers
  const handleUserLoginSuccess = (username) => {
    setUser(username);
    setUserAuthOpen(false);
  };

  const handleUserLogout = () => {
    Data.logoutUser();
    setUser(null);
    showToast('Anda telah logout', 'success');
  };

  // Language / subtitle
  const handleChangeLang = (code) => {
    Data.setLang(code);
    setLangState(code);
    showToast(`Bahasa diubah ke ${code.toUpperCase()}`, 'success');
  };

  const handleChangeSubtitle = (code) => {
    Data.setSubtitle(code);
    setSubtitleState(code);
    if (code === 'off') showToast('Subtitle dimatikan', '');
    else if (code !== 'manual') showToast(`Subtitle: ${code.toUpperCase()}`, 'success');
  };

  const handleUploadSubtitle = (file) => {
    setSubtitleFile(file);
    showToast(`Subtitle "${file.name}" dimuat`, 'success');
  };

  const renderView = () => {
    if (watching) {
      return (
        <WatchView
          item={watching}
          allItems={allItems}
          onBack={() => setWatching(null)}
          onPlay={handlePlay}
          onToast={showToast}
          subtitleFile={subtitleFile}
          subtitle={subtitle}
        />
      );
    }
    if (section === 'home') return <HomeView allItems={allItems} onPlay={handlePlay} />;
    return <GridView section={section} allItems={allItems} onPlay={handlePlay} onClearHistory={handleClearHistory} />;
  };

  return (
    <div className="app" suppressHydrationWarning>
      <main className="main-content">
        <TopBar
          section={watching ? '' : section}
          onNav={handleNav}
          user={user}
          isAdmin={isAdmin}
          onLogin={() => setUserAuthOpen(true)}
          onLogout={handleUserLogout}
          onAdmin={() => setAdminPanelOpen(true)}
          onPlay={handlePlay}
          lang={lang}
          onChangeLang={handleChangeLang}
          subtitle={subtitle}
          onChangeSubtitle={handleChangeSubtitle}
          onUploadSubtitle={handleUploadSubtitle}
          notifRefreshKey={notifRefreshKey}
          onNotifChange={() => setNotifRefreshKey(k => k + 1)}
        />

        {hydrated ? renderView() : <div style={{ padding: 48, color: '#7d818a' }}>Memuat...</div>}
      </main>

      <MobileNav section={watching ? '' : section} onNav={handleNav} />

      <AdminLogin
        open={adminLoginOpen}
        onClose={() => setAdminLoginOpen(false)}
        onSuccess={handleAdminLoginSuccess}
        onToast={showToast}
      />

      <AdminPanel
        open={adminPanelOpen}
        onClose={() => setAdminPanelOpen(false)}
        onLogout={handleAdminLogout}
        onDataChanged={refreshData}
        onNotifChange={() => setNotifRefreshKey(k => k + 1)}
        onToast={showToast}
      />

      <UserAuthModal
        open={userAuthOpen}
        onClose={() => setUserAuthOpen(false)}
        onSuccess={handleUserLoginSuccess}
        onToast={showToast}
      />

      <Toast message={toast.message} type={toast.type} show={toast.stamp > 0} key={toast.stamp} />
    </div>
  );
}
