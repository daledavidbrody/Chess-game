import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function ProfileMenu({ onLoginClick }) {
  const { user, logout, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(event) {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  function handleLogin() {
    setOpen(false);
    onLoginClick?.();
  }

  function handleLogout() {
    setOpen(false);
    logout();
  }

  return (
    <div className="profile-menu" ref={rootRef}>
      <button
        type="button"
        className={`profile-menu__trigger ${open ? 'is-open' : ''}`}
        onClick={() => setOpen((value) => !value)}
        aria-label="Open profile menu"
        aria-expanded={open}
      >
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
          <path
            fill="currentColor"
            d="M12 12c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm0 2c-3.87 0-7 2.13-7 4.75V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-1.25C19 16.13 15.87 14 12 14z"
          />
        </svg>
      </button>

      {open && (
        <div className="profile-menu__panel">
          {loading ? (
            <p className="hint">Loading…</p>
          ) : user ? (
            <>
              <div className="profile-menu__identity">
                <div className="profile-menu__field">
                  <span className="profile-menu__label">Username</span>
                  <strong>{user.username}</strong>
                </div>
                <div className="profile-menu__field">
                  <span className="profile-menu__label">Player ID</span>
                  <strong className="profile-menu__code">{user.playerCode}</strong>
                </div>
              </div>
              <button type="button" className="profile-menu__action" onClick={handleLogout}>
                Log out
              </button>
            </>
          ) : (
            <>
              <div className="profile-menu__identity">
                <strong>Guest</strong>
                <span>Log in to play online and track stats</span>
              </div>
              <button type="button" className="profile-menu__action is-primary" onClick={handleLogin}>
                Log in / Sign up
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
