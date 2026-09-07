// Whether this user has already been shown the walkthrough.
//
// Keyed per username rather than globally: two people using the same browser
// are two accounts, and the second shouldn't be denied the introduction
// because the first dismissed it.
//
// Versioned so a materially rewritten walkthrough can be shown again without
// having to guess at, or clear, whatever is already stored.
const KEY_PREFIX = 'pulse.walkthrough.v1.';

const keyFor = (username) => `${KEY_PREFIX}${username}`;

// localStorage doesn't merely return null when unavailable — it throws.
// Safari private mode, blocked site data and some embedded webviews all do it.
// Same guard as App.jsx, and the same reasoning: this is a convenience, and
// losing it should cost a repeated walkthrough rather than the whole screen.
export function hasSeenWalkthrough(username) {
  try {
    return localStorage.getItem(keyFor(username)) !== null;
  } catch {
    // Fails towards showing it. The alternative — treating an unreadable store
    // as "already seen" — would silently deny the walkthrough to exactly the
    // users whose browser can't remember they saw it.
    return false;
  }
}

export function markWalkthroughSeen(username) {
  try {
    localStorage.setItem(keyFor(username), String(Date.now()));
  } catch {
    // Nothing to fall back to: with no store, dismissal can't outlive the
    // session, and it will be shown again on the next sign-in.
  }
}
