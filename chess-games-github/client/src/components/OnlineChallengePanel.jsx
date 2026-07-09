import AuthForm from './AuthForm';
import UserSearch from './UserSearch';

export default function OnlineChallengePanel({
  user,
  timeControl,
  selectedFriend,
  onSelectFriend,
  challengeMessage,
  challengeError,
  sendingChallenge,
  onSendInvite,
}) {
  return (
    <section className="panel online-panel">
      <h2>Invite a friend</h2>
      <p className="lede online-panel__intro">
        Search for your friend&apos;s username or ID, choose a time control below, then send them an invite.
        When they accept on their device, the game starts automatically.
      </p>

      {!user ? (
        <>
          <p className="step-label">Step 2 — Sign in</p>
          <AuthForm />
        </>
      ) : (
        <>
          <p className="step-label">Step 2 — Find your friend</p>
          <UserSearch
            selectedUser={selectedFriend}
            onSelect={onSelectFriend}
          />

          {selectedFriend && (
            <div className="invite-preview">
              <p>
                Invite <strong>{selectedFriend.username}</strong> to a{' '}
                <strong>{timeControl.label}</strong> game.
              </p>
            </div>
          )}

          {challengeError && <p className="form-error">{challengeError}</p>}
          {challengeMessage && <p className="success-message">{challengeMessage}</p>}

          <button
            type="button"
            className="primary-button"
            onClick={onSendInvite}
            disabled={sendingChallenge || !selectedFriend}
          >
            {sendingChallenge
              ? 'Sending invite…'
              : selectedFriend
                ? `Send invite to ${selectedFriend.username} · ${timeControl.label}`
                : 'Select a friend to send invite'}
          </button>
        </>
      )}

      {!user && (
        <p className="hint online-panel__next">
          After signing in, you&apos;ll be able to search for friends and send invites.
        </p>
      )}
    </section>
  );
}
