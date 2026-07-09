import { useEffect, useMemo, useState } from 'react';
import {
  BOT_LEVELS,
  GAME_MODES,
  TIME_PRESETS,
  formatTimeControlLabel,
  timeControlToMs,
} from '../constants';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import IncomingChallenges from './IncomingChallenges';
import OnlineChallengePanel from './OnlineChallengePanel';

function TimeControlPicker({
  useCustom,
  setUseCustom,
  customBase,
  setCustomBase,
  customIncrement,
  setCustomIncrement,
  presetId,
  setPresetId,
  groupedPresets,
  timeControl,
  stepLabel,
}) {
  return (
    <section className="panel">
      {stepLabel && <p className="step-label">{stepLabel}</p>}
      <div className="panel__row">
        <h2>Time control</h2>
        <label className="toggle">
          <input
            type="checkbox"
            checked={useCustom}
            onChange={(e) => setUseCustom(e.target.checked)}
          />
          Custom
        </label>
      </div>

      {useCustom ? (
        <div className="custom-time">
          <label>
            Base time (minutes)
            <input
              type="number"
              min="1"
              max="180"
              value={customBase}
              onChange={(e) => setCustomBase(Number(e.target.value))}
            />
          </label>
          <label>
            Increment per move (seconds)
            <input
              type="number"
              min="0"
              max="60"
              value={customIncrement}
              onChange={(e) => setCustomIncrement(Number(e.target.value))}
            />
          </label>
          <p className="hint">
            Selected: {formatTimeControlLabel({ baseMinutes: customBase, incrementSeconds: customIncrement })}
          </p>
        </div>
      ) : (
        Object.entries(groupedPresets).map(([category, presets]) => (
          <div key={category} className="preset-group">
            <h3>{category}</h3>
            <div className="chip-row">
              {presets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className={`chip ${presetId === preset.id ? 'is-selected' : ''}`}
                  onClick={() => setPresetId(preset.id)}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        ))
      )}

      {timeControl && (
        <p className="hint">
          Selected for invite: <strong>{timeControl.label}</strong>
        </p>
      )}
    </section>
  );
}

export default function GameSetup({ onStart, preselectedFriend, onPreselectedFriendUsed }) {
  const { user } = useAuth();
  const [mode, setMode] = useState('local');
  const [botLevelId, setBotLevelId] = useState('medium');
  const [presetId, setPresetId] = useState('blitz_5_3');
  const [customBase, setCustomBase] = useState(10);
  const [customIncrement, setCustomIncrement] = useState(5);
  const [useCustom, setUseCustom] = useState(false);
  const [playerColor, setPlayerColor] = useState('w');
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [challengeMessage, setChallengeMessage] = useState('');
  const [challengeError, setChallengeError] = useState('');
  const [sendingChallenge, setSendingChallenge] = useState(false);

  const timeControl = useMemo(() => {
    if (useCustom) {
      return {
        id: 'custom',
        label: formatTimeControlLabel({
          baseMinutes: customBase,
          incrementSeconds: customIncrement,
        }),
        baseMinutes: customBase,
        incrementSeconds: customIncrement,
      };
    }
    return TIME_PRESETS.find((p) => p.id === presetId) ?? TIME_PRESETS[0];
  }, [useCustom, presetId, customBase, customIncrement]);

  const groupedPresets = useMemo(() => {
    return TIME_PRESETS.reduce((acc, preset) => {
      if (!acc[preset.category]) acc[preset.category] = [];
      acc[preset.category].push(preset);
      return acc;
    }, {});
  }, []);

  useEffect(() => {
    if (!preselectedFriend) return;
    setMode('online');
    setSelectedFriend(preselectedFriend);
    onPreselectedFriendUsed?.();
  }, [preselectedFriend, onPreselectedFriendUsed]);

  function handleModeChange(nextMode) {
    setMode(nextMode);
    setChallengeMessage('');
    setChallengeError('');
    if (nextMode !== 'online') {
      setSelectedFriend(null);
    }
  }

  function handleStart() {
    onStart({
      mode,
      botLevel: BOT_LEVELS.find((l) => l.id === botLevelId),
      playerColor: mode === 'bot' ? playerColor : null,
      timeControl,
      clock: timeControlToMs(timeControl),
    });
  }

  async function handleSendChallenge() {
    if (!user) {
      setChallengeError('Sign in first to send an invite.');
      return;
    }
    if (!selectedFriend) {
      setChallengeError('Search and select a friend to invite.');
      return;
    }

    setChallengeError('');
    setChallengeMessage('');
    setSendingChallenge(true);
    try {
      await api.createChallenge({
        challengedId: selectedFriend.id,
        baseMinutes: timeControl.baseMinutes,
        incrementSeconds: timeControl.incrementSeconds,
      });
      setChallengeMessage(
        `Invite sent to ${selectedFriend.username} for a ${timeControl.label} game. Waiting for them to accept…`
      );
    } catch (err) {
      setChallengeError(err.message);
    } finally {
      setSendingChallenge(false);
    }
  }

  const timePicker = (
    <TimeControlPicker
      useCustom={useCustom}
      setUseCustom={setUseCustom}
      customBase={customBase}
      setCustomBase={setCustomBase}
      customIncrement={customIncrement}
      setCustomIncrement={setCustomIncrement}
      presetId={presetId}
      setPresetId={setPresetId}
      groupedPresets={groupedPresets}
      timeControl={timeControl}
      stepLabel={mode === 'online' ? 'Step 1 — Choose time control' : null}
    />
  );

  return (
    <div className="setup">
      <header className="setup__header">
        <div>
          <h1>Play chess</h1>
          <p className="lede">Local games, bots, or online friend challenges.</p>
        </div>
      </header>

      {user && <IncomingChallenges />}

      <section className="panel">
        <h2>Game mode</h2>
        <div className="option-grid">
          {GAME_MODES.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`option-card ${mode === item.id ? 'is-selected' : ''}`}
              onClick={() => handleModeChange(item.id)}
            >
              <strong>{item.label}</strong>
              <span>{item.description}</span>
            </button>
          ))}
        </div>
      </section>

      {mode === 'online' && (
        <>
          {timePicker}
          <OnlineChallengePanel
            user={user}
            timeControl={timeControl}
            selectedFriend={selectedFriend}
            onSelectFriend={setSelectedFriend}
            challengeMessage={challengeMessage}
            challengeError={challengeError}
            sendingChallenge={sendingChallenge}
            onSendInvite={handleSendChallenge}
          />
        </>
      )}

      {mode === 'bot' && (
        <section className="panel">
          <h2>Bot difficulty</h2>
          <div className="chip-row">
            {BOT_LEVELS.map((level) => (
              <button
                key={level.id}
                type="button"
                className={`chip ${botLevelId === level.id ? 'is-selected' : ''}`}
                onClick={() => setBotLevelId(level.id)}
              >
                {level.label}
              </button>
            ))}
          </div>

          <h2 className="subsection">Your color</h2>
          <div className="chip-row">
            <button
              type="button"
              className={`chip ${playerColor === 'w' ? 'is-selected' : ''}`}
              onClick={() => setPlayerColor('w')}
            >
              White
            </button>
            <button
              type="button"
              className={`chip ${playerColor === 'b' ? 'is-selected' : ''}`}
              onClick={() => setPlayerColor('b')}
            >
              Black
            </button>
          </div>
        </section>
      )}

      {mode !== 'online' && timePicker}

      {mode !== 'online' && (
        <button type="button" className="primary-button" onClick={handleStart}>
          Play {timeControl.label}
        </button>
      )}
    </div>
  );
}
