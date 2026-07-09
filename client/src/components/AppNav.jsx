export default function AppNav({ current, onNavigate }) {
  return (
    <nav className="app-nav">
      <button
        type="button"
        className={`app-nav__link ${current === 'home' ? 'is-active' : ''}`}
        onClick={() => onNavigate('home')}
      >
        Home
      </button>
      <button
        type="button"
        className={`app-nav__link ${current === 'play' ? 'is-active' : ''}`}
        onClick={() => onNavigate('play')}
      >
        Play
      </button>
    </nav>
  );
}
