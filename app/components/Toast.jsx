'use client';
import { useEffect, useState } from 'react';

export default function Toast({ message, type, show }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (show) {
      setVisible(true);
      const t = setTimeout(() => setVisible(false), 2800);
      return () => clearTimeout(t);
    } else {
      setVisible(false);
    }
  }, [show, message]);

  return (
    <div className={`toast ${visible ? 'show' : ''} ${type || ''}`}>
      {message}
    </div>
  );
}
