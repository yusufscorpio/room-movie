'use client';
import { useEffect, useState, useMemo } from 'react';
import * as Data from '@/lib/data';
import * as IDB from '@/lib/idb';
import * as Utils from '@/lib/utils';

const MAX_UPLOAD_BYTES = 1.5 * 1024 * 1024 * 1024;
const MAX_UPLOAD_LABEL = '1.5GB';

export default function AdminPanel({ open, onClose, onLogout, onDataChanged, onNotifChange, onToast }) {
  const [tab, setTab] = useState('add');

  if (!open) return null;

  return (
    <div className="modal show">
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-body admin-body">
        <header className="admin-header">
          <div className="admin-title">
            <span className="badge">ADMIN</span>
            <h2>Dashboard Konten</h2>
          </div>
          <div className="admin-actions">
            <button className="btn-ghost" onClick={onLogout}>Logout</button>
            <button className="modal-close" onClick={onClose}>×</button>
          </div>
        </header>

        <div className="admin-tabs">
          <button className={`tab ${tab === 'add' ? 'active' : ''}`} onClick={() => setTab('add')}>+ Tambah Konten</button>
          <button className={`tab ${tab === 'manage' ? 'active' : ''}`} onClick={() => setTab('manage')}>Kelola Konten</button>
          <button className={`tab ${tab === 'settings' ? 'active' : ''}`} onClick={() => setTab('settings')}>Pengaturan</button>
        </div>

        {tab === 'add' && <AddTab onDataChanged={onDataChanged} onToast={onToast} onSwitchManage={() => setTab('manage')} />}
        {tab === 'manage' && <ManageTab onDataChanged={onDataChanged} onToast={onToast} onSwitchAdd={() => setTab('add')} />}
        {tab === 'settings' && <SettingsTab onDataChanged={onDataChanged} onNotifChange={onNotifChange} onToast={onToast} />}
      </div>
    </div>
  );
}

// =================== ADD / EDIT TAB ===================
function AddTab({ onDataChanged, onToast, onSwitchManage, editingItem, onClearEdit }) {
  const [editingId, setEditingId] = useState('');
  const [form, setForm] = useState({
    title: '', category: 'movies', desc: '', genre: '', rating: '', year: '', tag: 'new', streams: '',
    imageUrl: '', backdropUrl: '', videoUrl: '', videoEmbed: ''
  });
  const [imageMode, setImageMode] = useState('url'); // url|file
  const [backdropMode, setBackdropMode] = useState('url');
  const [videoMode, setVideoMode] = useState('url'); // url|file|embed
  const [imageFile, setImageFile] = useState(null);
  const [backdropFile, setBackdropFile] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [progress, setProgress] = useState('');

  const handleImgFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > MAX_UPLOAD_BYTES) { onToast('File terlalu besar (maks ' + MAX_UPLOAD_LABEL + ')', 'error'); e.target.value = ''; return; }
    setImageFile(f);
    setImagePreview(URL.createObjectURL(f));
  };

  const handleImgUrl = (e) => {
    setForm(f => ({ ...f, imageUrl: e.target.value }));
    setImagePreview(e.target.value);
  };

  const reset = () => {
    setEditingId('');
    setForm({ title: '', category: 'movies', desc: '', genre: '', rating: '', year: '', tag: 'new', streams: '', imageUrl: '', backdropUrl: '', videoUrl: '', videoEmbed: '' });
    setImageMode('url'); setBackdropMode('url'); setVideoMode('url');
    setImageFile(null); setBackdropFile(null); setVideoFile(null); setImagePreview('');
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { onToast('Judul wajib diisi', 'error'); return; }

    let image = { type: 'url', value: form.imageUrl.trim() };
    let backdrop = { type: 'url', value: form.backdropUrl.trim() };
    let video = { type: 'url', value: form.videoUrl.trim() };

    try {
      if (imageMode === 'file' && imageFile) {
        const k = IDB.genKey('img');
        await IDB.put(k, imageFile);
        image = { type: 'file', value: IDB.makeRef(k) };
      }
      if (backdropMode === 'file' && backdropFile) {
        const k = IDB.genKey('bd');
        await IDB.put(k, backdropFile);
        backdrop = { type: 'file', value: IDB.makeRef(k) };
      }
      if (videoMode === 'file' && videoFile) {
        if (videoFile.size > MAX_UPLOAD_BYTES) { onToast('Video terlalu besar', 'error'); return; }
        setProgress(`Menyimpan ${Utils.formatBytes(videoFile.size)} ke IndexedDB...`);
        const k = IDB.genKey('vid');
        await IDB.put(k, videoFile);
        video = { type: 'file', value: IDB.makeRef(k) };
        setProgress('');
      } else if (videoMode === 'embed') {
        video = { type: 'embed', value: Utils.toEmbedUrl(form.videoEmbed.trim()) };
      }
    } catch (err) {
      setProgress('');
      onToast('Gagal menyimpan ke IndexedDB: ' + err.message, 'error'); return;
    }

    const existing = editingId ? Data.getById(editingId) : null;

    if (!image.value && !existing) { onToast('Cover/poster wajib diisi', 'error'); return; }
    if (!video.value && !existing) { onToast('Video wajib diisi', 'error'); return; }

    // Cleanup old IDB on replace
    if (existing) {
      if (image.value && IDB.isRef(existing.image) && existing.image !== image.value) try { await IDB.del(IDB.refKey(existing.image)); } catch {}
      if (backdrop.value && IDB.isRef(existing.backdrop) && existing.backdrop !== backdrop.value) try { await IDB.del(IDB.refKey(existing.backdrop)); } catch {}
      if (video.value && IDB.isRef(existing.videoSrc) && existing.videoSrc !== video.value) try { await IDB.del(IDB.refKey(existing.videoSrc)); } catch {}
    }

    const payload = {
      title: form.title.trim(),
      category: form.category,
      desc: form.desc.trim(),
      genres: form.genre.split(',').map(s => s.trim()).filter(Boolean),
      rating: parseFloat(form.rating) || null,
      year: parseInt(form.year) || null,
      tag: form.tag,
      streams: form.streams.trim(),
      image: image.value || (existing ? existing.image : ''),
      backdrop: backdrop.value || (existing ? existing.backdrop : ''),
      videoType: video.value ? video.type : (existing ? existing.videoType : 'url'),
      videoSrc: video.value || (existing ? existing.videoSrc : '')
    };

    const result = editingId ? await Data.update(editingId, payload) : await Data.add(payload);

    if (result) {
      onToast(editingId ? 'Konten diperbarui' : 'Konten ditambahkan', 'success');
      reset();
      await Data.resolveAll();
      onDataChanged && onDataChanged();
    } else {
      onToast('Gagal menyimpan', 'error');
    }
  };

  return (
    <div className="tab-panel active">
      <form className="content-form" onSubmit={submit}>
        <input type="hidden" value={editingId} readOnly />

        <div className="form-row">
          <div className="form-group">
            <label>Judul *</label>
            <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required placeholder="Contoh: Money Heist" />
          </div>
          <div className="form-group">
            <label>Kategori *</label>
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} required>
              <option value="movies">Film</option>
              <option value="tv">TV Series</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>Deskripsi</label>
          <textarea rows={3} value={form.desc} onChange={e => setForm(f => ({ ...f, desc: e.target.value }))} placeholder="Sinopsis singkat..." />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Genre (pisah koma)</label>
            <input type="text" value={form.genre} onChange={e => setForm(f => ({ ...f, genre: e.target.value }))} placeholder="Action, Drama" />
          </div>
          <div className="form-group">
            <label>Rating IMDB</label>
            <input type="number" min="0" max="10" step="0.1" value={form.rating} onChange={e => setForm(f => ({ ...f, rating: e.target.value }))} placeholder="8.8" />
          </div>
          <div className="form-group">
            <label>Tahun</label>
            <input type="number" min="1900" max="2100" value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))} placeholder="2024" />
          </div>
        </div>

        <div className="form-section">
          <label className="section-label">Cover / Poster *</label>
          <div className="source-toggle">
            <button type="button" className={`src-btn ${imageMode === 'url' ? 'active' : ''}`} onClick={() => setImageMode('url')}>URL</button>
            <button type="button" className={`src-btn ${imageMode === 'file' ? 'active' : ''}`} onClick={() => setImageMode('file')}>Upload File</button>
          </div>
          {imageMode === 'url' && (
            <div className="src-input">
              <input type="url" value={form.imageUrl} onChange={handleImgUrl} placeholder="https://contoh.com/poster.jpg" />
            </div>
          )}
          {imageMode === 'file' && (
            <div className="src-input">
              <input type="file" accept="image/*" onChange={handleImgFile} />
              <small>Maks 1.5GB. Disimpan di IndexedDB.</small>
            </div>
          )}
          {imagePreview && (
            <div className="preview"><img src={imagePreview} alt="preview" /></div>
          )}
        </div>

        <div className="form-section">
          <label className="section-label">Backdrop / Banner (opsional)</label>
          <div className="source-toggle">
            <button type="button" className={`src-btn ${backdropMode === 'url' ? 'active' : ''}`} onClick={() => setBackdropMode('url')}>URL</button>
            <button type="button" className={`src-btn ${backdropMode === 'file' ? 'active' : ''}`} onClick={() => setBackdropMode('file')}>Upload File</button>
          </div>
          {backdropMode === 'url' && (
            <div className="src-input">
              <input type="url" value={form.backdropUrl} onChange={e => setForm(f => ({ ...f, backdropUrl: e.target.value }))} placeholder="https://contoh.com/banner.jpg" />
            </div>
          )}
          {backdropMode === 'file' && (
            <div className="src-input">
              <input type="file" accept="image/*" onChange={e => setBackdropFile(e.target.files?.[0] || null)} />
              <small>Maks 1.5GB. Disimpan di IndexedDB.</small>
            </div>
          )}
        </div>

        <div className="form-section">
          <label className="section-label">Video *</label>
          <div className="source-toggle">
            <button type="button" className={`src-btn ${videoMode === 'url' ? 'active' : ''}`} onClick={() => setVideoMode('url')}>URL Video</button>
            <button type="button" className={`src-btn ${videoMode === 'file' ? 'active' : ''}`} onClick={() => setVideoMode('file')}>Upload File</button>
            <button type="button" className={`src-btn ${videoMode === 'embed' ? 'active' : ''}`} onClick={() => setVideoMode('embed')}>Embed</button>
          </div>
          {videoMode === 'url' && (
            <div className="src-input">
              <input type="url" value={form.videoUrl} onChange={e => setForm(f => ({ ...f, videoUrl: e.target.value }))} placeholder="https://contoh.com/video.mp4" />
              <small>Mendukung file MP4 langsung dari URL</small>
            </div>
          )}
          {videoMode === 'file' && (
            <div className="src-input">
              <input type="file" accept="video/*" onChange={e => setVideoFile(e.target.files?.[0] || null)} />
              <small>Maks 1.5GB. Disimpan di IndexedDB lokal browser.</small>
              {progress && (
                <div className="upload-progress">
                  <div className="progress-bar"><div className="progress-fill" style={{ width: '50%' }} /></div>
                  <div className="progress-label">{progress}</div>
                </div>
              )}
            </div>
          )}
          {videoMode === 'embed' && (
            <div className="src-input">
              <input type="url" value={form.videoEmbed} onChange={e => setForm(f => ({ ...f, videoEmbed: e.target.value }))} placeholder="https://www.youtube.com/watch?v=..." />
              <small>Otomatis dikonversi ke embed link YouTube/Vimeo</small>
            </div>
          )}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Tag</label>
            <select value={form.tag} onChange={e => setForm(f => ({ ...f, tag: e.target.value }))}>
              <option value="new">New This Week</option>
              <option value="trending">Trending Now</option>
              <option value="featured">Featured (Hero)</option>
              <option value="">- Tidak ada -</option>
            </select>
          </div>
          <div className="form-group">
            <label>Streams</label>
            <input type="text" value={form.streams} onChange={e => setForm(f => ({ ...f, streams: e.target.value }))} placeholder="2B+" />
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="btn-ghost" onClick={reset}>Reset</button>
          <button type="submit" className="btn-primary">Simpan Konten</button>
        </div>
      </form>
    </div>
  );
}

// =================== MANAGE TAB ===================
function ManageTab({ onDataChanged, onToast }) {
  const [search, setSearch] = useState('');
  const [items, setItems] = useState(() => Data.getAll());

  useEffect(() => { setItems(Data.getAll()); }, [open]);

  const filtered = useMemo(() => {
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter(i => (i.title || '').toLowerCase().includes(q));
  }, [search, items]);

  const handleDelete = async (id) => {
    const it = items.find(x => x.id === id);
    if (!it) return;
    if (!confirm(`Hapus "${it.title}"?\nFile di IndexedDB juga ikut terhapus.`)) return;
    await Data.remove(id);
    await Data.resolveAll();
    setItems(Data.getAll());
    onDataChanged && onDataChanged();
    onToast('Konten dihapus', 'success');
  };

  return (
    <div className="tab-panel active">
      <div className="manage-toolbar">
        <input
          type="text"
          placeholder="Cari konten..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <span className="manage-count">{filtered.length} konten</span>
      </div>
      <div className="manage-list">
        {filtered.length === 0 ? (
          <div className="empty-state" style={{ padding: 32 }}>Belum ada konten</div>
        ) : (
          filtered.map(it => (
            <div key={it.id} className="manage-item">
              <img className="thumb" src={Data.imgSrc(it)} alt="" onError={(e) => { e.target.style.display = 'none'; }} />
              <div className="info">
                <h4>{it.title}</h4>
                <p>
                  <span className="tag">{it.category === 'tv' ? 'TV Series' : 'Film'}</span>
                  {it.tag && <span className="tag">{it.tag}</span>}
                  {it.year && <span>{it.year}</span>}
                  {it.rating && <span>★ {it.rating}</span>}
                </p>
              </div>
              <div className="actions">
                <button className="btn-edit" onClick={() => onToast('Edit: gunakan tombol di tab "Tambah Konten" — fitur edit lengkap di build berikutnya', '')}>Edit</button>
                <button className="btn-del" onClick={() => handleDelete(it.id)}>Hapus</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// =================== SETTINGS TAB ===================
function SettingsTab({ onDataChanged, onNotifChange, onToast }) {
  const [quota, setQuota] = useState(null);
  const [credForm, setCredForm] = useState({ old: '', new: '' });
  const [credErr, setCredErr] = useState('');
  const [notifMsg, setNotifMsg] = useState('');
  const [notifList, setNotifList] = useState(() => Data.getNotifications());

  useEffect(() => {
    IDB.getQuota().then(setQuota);
  }, []);

  const refreshNotifs = () => setNotifList(Data.getNotifications());

  const handlePostNotif = (e) => {
    e.preventDefault();
    const m = notifMsg.trim();
    if (!m) return;
    Data.addNotification(m);
    setNotifMsg('');
    refreshNotifs();
    onNotifChange && onNotifChange();
    onToast && onToast('Pengumuman dikirim ke semua user', 'success');
  };

  const handleDelNotif = (id) => {
    Data.deleteNotification(id);
    refreshNotifs();
    onNotifChange && onNotifChange();
  };

  const handleExport = () => {
    const json = Data.exportJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `room-movie-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    onToast('Data diekspor', 'success');
  };

  const handleImport = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const txt = await f.text();
    if (await Data.importJSON(txt)) {
      onToast('Data diimpor', 'success');
      onDataChanged && onDataChanged();
    } else {
      onToast('File JSON tidak valid', 'error');
    }
    e.target.value = '';
  };

  const handleReset = async () => {
    if (!confirm('Reset semua data + hapus semua file IndexedDB? Tidak bisa dibatalkan.')) return;
    await Data.reset();
    onDataChanged && onDataChanged();
    onToast('Data direset', 'success');
    const q = await IDB.getQuota(); setQuota(q);
  };

  const handlePersist = async () => {
    const ok = await IDB.requestPersistent();
    onToast(ok ? 'Persistent storage AKTIF' : 'Browser belum mengizinkan persistent storage', ok ? 'success' : 'error');
    const q = await IDB.getQuota(); setQuota(q);
  };

  const handleCred = (e) => {
    e.preventDefault();
    const cred = Data.getCred();
    if (credForm.old !== cred.password) { setCredErr('Password lama salah'); return; }
    Data.setCred(cred.username, credForm.new);
    setCredErr(''); setCredForm({ old: '', new: '' });
    onToast('Password berhasil diubah', 'success');
  };

  return (
    <div className="tab-panel active">
      <h3>📢 Kirim Pengumuman</h3>
      <p className="muted">Pengumuman akan tampil di lonceng notifikasi semua pengunjung.</p>
      <form className="content-form" onSubmit={handlePostNotif}>
        <div className="form-group">
          <textarea
            rows={2}
            value={notifMsg}
            onChange={(e) => setNotifMsg(e.target.value)}
            placeholder="Contoh: Ada 5 film baru ditambahkan minggu ini, jangan lewatkan!"
            maxLength={200}
          />
        </div>
        <div className="form-actions" style={{ borderTop: 0, paddingTop: 0 }}>
          <span className="muted" style={{ fontSize: 11 }}>{notifMsg.length}/200</span>
          <button type="submit" className="btn-primary" disabled={!notifMsg.trim()}>Kirim Pengumuman</button>
        </div>
      </form>

      {notifList.length > 0 && (
        <div className="notif-admin-list">
          <h4 style={{ fontSize: 13, color: 'var(--text-2)', margin: '12px 0 8px' }}>Pengumuman Aktif ({notifList.length})</h4>
          {notifList.slice(0, 8).map(n => (
            <div key={n.id} className="notif-admin-item">
              <div className="notif-admin-msg">{n.message}</div>
              <button className="btn-del" onClick={() => handleDelNotif(n.id)}>Hapus</button>
            </div>
          ))}
        </div>
      )}

      <hr style={{ margin: '24px 0', borderColor: '#222' }} />

      <h3>Penyimpanan Browser</h3>
      <p className="muted">Video & gambar besar disimpan di IndexedDB. Kuota tergantung kapasitas disk.</p>
      <div className="quota-card">
        <div className="quota-bar">
          <div className="quota-fill" style={{ width: quota ? Math.min(100, quota.percent).toFixed(1) + '%' : '0%' }} />
        </div>
        <div className="quota-text">
          {quota ? `${Utils.formatBytes(quota.usage)} terpakai dari ${Utils.formatBytes(quota.quota)} (${quota.percent.toFixed(1)}%)` : 'Memuat info kuota...'}
        </div>
      </div>
      <button className="btn-ghost" onClick={handlePersist} style={{ marginBottom: 24 }}>⚓ Aktifkan Persistent Storage</button>

      <hr style={{ margin: '8px 0 24px', borderColor: '#222' }} />

      <h3>Ekspor / Impor Data</h3>
      <p className="muted">Backup atau pulihkan seluruh data konten dalam format JSON.</p>
      <div className="settings-row">
        <button className="btn-ghost" onClick={handleExport}>⤓ Ekspor JSON</button>
        <label className="btn-ghost">
          ⤒ Impor JSON
          <input type="file" accept="application/json" hidden onChange={handleImport} />
        </label>
        <button className="btn-danger" onClick={handleReset}>↻ Reset ke Default</button>
      </div>

      <hr style={{ margin: '24px 0', borderColor: '#222' }} />

      <h3>Ubah Kredensial Admin</h3>
      <p className="muted">Disimpan di browser ini saja (localStorage).</p>
      <form className="content-form" onSubmit={handleCred}>
        <div className="form-row">
          <div className="form-group">
            <label>Password Lama</label>
            <input type="password" value={credForm.old} onChange={e => setCredForm(f => ({ ...f, old: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label>Password Baru</label>
            <input type="password" value={credForm.new} onChange={e => setCredForm(f => ({ ...f, new: e.target.value }))} required minLength={4} />
          </div>
        </div>
        <p className="form-error">{credErr}</p>
        <button type="submit" className="btn-primary">Simpan Password</button>
      </form>
    </div>
  );
}
