'use client';
import { useState, useEffect, useRef } from 'react';
import * as Data from '@/lib/data';

export default function UserAuthModal({ open, onClose, onSuccess, onToast }) {
  const [mode, setMode] = useState('login');
  const [user, setUser] = useState('');
  const [pwd, setPwd] = useState('');
  const [err, setErr] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setUser(''); setPwd(''); setErr(''); setMode('login');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  if (!open) return null;

  const submit = async (e) => {
    e.preventDefault();
    const result = await (mode === 'register'
      ? Data.registerUser(user, pwd)
      : Data.loginUser(user, pwd));
    if (result.ok) {
      onSuccess && onSuccess(result.username);
      onToast && onToast(mode === 'register' ? 'Akun dibuat & login!' : `Selamat datang, ${result.username}!`, 'success');
    } else {
      setErr(result.err);
      setPwd('');
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
          <h2>{mode === 'register' ? 'Daftar Akun User' : 'Login User'}</h2>
          <p>{mode === 'register' ? 'Buat akun gratis untuk simpan favorit & history' : 'Masuk ke akun Anda'}</p>
        </div>
        <form className="login-form" onSubmit={submit} autoComplete="off">
          <div className="form-group">
            <label>Username</label>
            <input
              ref={inputRef}
              type="text"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              required
              autoComplete="off"
              placeholder="Contoh: yusuf123"
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              required
              minLength={4}
              autoComplete="new-password"
            />
          </div>
          <p className="form-error">{err}</p>
          <button type="submit" className="btn-primary btn-full">
            {mode === 'register' ? 'Daftar Sekarang' : 'Masuk'}
          </button>
          <button
            type="button"
            className="btn-ghost btn-full"
            style={{ marginTop: 10 }}
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setErr(''); }}
          >
            {mode === 'login' ? 'Belum punya akun? Daftar di sini' : 'Sudah punya akun? Masuk'}
          </button>
        </form>
      </div>
    </div>
  );
}
