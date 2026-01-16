import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const INACTIVITY_MS = 30 * 60 * 1000; // 30 minutes
const CHECK_EVERY_MS = 15 * 1000;
const LAST_ACTIVE_KEY = 'diner_last_active_at';

function now() {
  return Date.now();
}

function readLastActive() {
  const raw = localStorage.getItem(LAST_ACTIVE_KEY);
  const value = raw ? Number(raw) : NaN;
  return Number.isFinite(value) ? value : 0;
}

function writeLastActive(ts) {
  try {
    localStorage.setItem(LAST_ACTIVE_KEY, String(ts));
  } catch {
    // ignore storage errors
  }
}

function clearSession() {
  try {
    localStorage.removeItem('token');
  } catch {
    // ignore
  }
}

export default function SessionTimeout() {
  const navigate = useNavigate();
  const location = useLocation();

  const lastWriteRef = useRef(0);

  useEffect(() => {
    const logout = (reason) => {
      clearSession();
      if (location.pathname !== '/login') {
        navigate('/login', { replace: true, state: { reason } });
      }
    };

    const touch = () => {
      if (!localStorage.getItem('token')) return;
      const t = now();

      if (t - lastWriteRef.current >= 5000) {
        lastWriteRef.current = t;
        writeLastActive(t);
      }
    };

    const check = () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      let last = readLastActive();
      if (!last) {
        last = now();
        writeLastActive(last);
        return;
      }

      if (now() - last > INACTIVITY_MS) {
        logout('inactive');
      }
    };

    const onStorage = (e) => {
      if (e.key === 'token' && !e.newValue) {
        if (location.pathname !== '/login') navigate('/login', { replace: true });
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        check();
        touch();
      }
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'focus'];
    for (const ev of events) window.addEventListener(ev, touch, { passive: true });
    window.addEventListener('storage', onStorage);
    document.addEventListener('visibilitychange', onVisibilityChange);

    const intervalId = window.setInterval(check, CHECK_EVERY_MS);

    check();

    return () => {
      for (const ev of events) window.removeEventListener(ev, touch);
      window.removeEventListener('storage', onStorage);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.clearInterval(intervalId);
    };
  }, [navigate, location.pathname]);

  return null;
}
