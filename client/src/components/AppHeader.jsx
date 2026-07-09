import AppNav from './AppNav';
import ProfileMenu from './ProfileMenu';

export default function AppHeader({ current, onNavigate, onLoginClick, showNav = true }) {
  return (
    <header className="app-shell__nav-wrap">
      <div className="app-shell__left">
        <p className="eyebrow app-shell__brand">Chess Games</p>
        {showNav && <AppNav current={current} onNavigate={onNavigate} />}
      </div>
      <ProfileMenu onLoginClick={onLoginClick} />
    </header>
  );
}
