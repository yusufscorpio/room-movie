'use client';
import { useState, useEffect, useRef } from 'react';
import * as Data from '@/lib/data';

function timeAgo(timestamp) {
  const sec = Math.floor((Date.now() - timestamp) / 1000);
  if (sec < 60) return 'baru saja';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} mnt lalu`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} hari lalu`;
  return new Date(timestamp).toLocaleDateString('id');
}

export default function NotificationBell({ refreshKey, onChange }) {
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const [readSet, setReadSet] = useState(() => new Set());
  const wrapRef = useRef(null);

  const refresh = () => {
    setNotifs(Data.getNotifications());
    // Trigger re-read of read set via Data API
    setReadSet(new Set(Data.getNotifications().filter(n => Data.isNotifRead(n.id)).map(n => n.id)));
  };

  useEffect(() => { refresh(); }, [refreshKey]);

  // Poll for new notifications every 5 seconds (cheap localStorage read)
  useEffect(() => {
    const t = setInterval(refresh, 5000);
    return () => clearInterval(t);
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const unread = notifs.filter(n => !readSet.has(n.id)).length;

  const handleOpen = () => {
    const willOpen = !open;
    setOpen(willOpen);
    if (willOpen && unread > 0) {
      // Mark all as read when dropdown opens
      Data.markAllNotifsAsRead();
      setReadSet(new Set(notifs.map(n => n.id)));
      onChange && onChange();
    }
  };

  const handleClearAll = () => {
    if (!confirm('Hapus semua notifikasi?')) return;
    Data.clearAllNotifications();
    setNotifs([]);
    setReadSet(new Set());
    onChange && onChange();
  };

  const handleDelete = (id, e) => {
    e.stopPropagation();
    Data.deleteNotification(id);
    refresh();
    onChange && onChange();
  };

  return (
    <div className="topbar-dropdown notif-wrap" ref={wrapRef}>
      <button className="topbar-btn notif-btn" onClick={handleOpen} title="Notifikasi">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && <span className="notif-badge">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="topbar-menu notif-menu">
          <div className="notif-header">
            <span className="notif-title">Notifikasi</span>
            {notifs.length > 0 && (
              <button className="notif-clear" onClick={handleClearAll}>Hapus semua</button>
            )}
          </div>
          {notifs.length === 0 ? (
            <div className="notif-empty">
              <div className="notif-empty-icon">🔔</div>
              <div className="notif-empty-text">Tidak ada notifikasi</div>
            </div>
          ) : (
            <div className="notif-list">
              {notifs.map(n => (
                <div key={n.id} className={`notif-item ${readSet.has(n.id) ? '' : 'unread'}`}>
                  <div className="notif-dot" />
                  <div className="notif-body">
                    <div className="notif-msg">{n.message}</div>
                    <div className="notif-time">{timeAgo(n.createdAt)}</div>
                  </div>
                  <button className="notif-del" onClick={(e) => handleDelete(n.id, e)} title="Hapus">×</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
