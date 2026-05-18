'use client';
import { useState, useEffect, useRef } from 'react';
import * as Data from '@/lib/data';

export default function AdminLogin({ open, onClose, onSuccess, onToast }) {
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setUser(''); setPass(''); setError('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  if (!open) return null;

  const submit = (e) => {
    e.preventDefault();
    if (Data.verifyCred(user.trim(), pass)) {
      onToast && onToast('Selamat datang, Admin!', 'success');
      onSuccess && onSuccess();
    } else {
      setError('ID atau password salah');
      setPass('');
    }
  };

  return (
    <div className="modal show">
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-body login-body">
        <button className="modal-close" onClick={onClose}>×</button>
        <div className="login-header">
          <div className="brand-logo login-logo">
            <span className="brand-letter">R</span>
          </div>
          <div className="brand-wordmark">
            <span className="wm-room">ROOM</span><span className="wm-movie">MOVIE</span>
          </div>
          <h2>Admin Login</h2>
          <p>Masukkan kredensial untuk mengelola konten</p>
        </div>
        <form className="login-form" onSubmit={submit} autoComplete="off">
          <div className="form-group">
            <label>ID Admin</label>
            <input ref={inputRef} type="text" value={user} onChange={(e) => setUser(e.target.value)} required autoComplete="off" />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} required autoComplete="new-password" />
          </div>
          <p className="form-error">{error}</p>
          <button type="submit" className="btn-primary btn-full">Masuk</button>
        </form>
      </div>
    </div>
  );
}
