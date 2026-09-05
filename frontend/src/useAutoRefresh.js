import { useEffect, useRef } from 'react';

// Re-runs `callback` on an interval, but only while the tab is actually being
// looked at. A backgrounded tab makes no requests at all, and coming back to
// it refreshes immediately rather than waiting out the remainder of a tick —
// otherwise returning to a tab left open overnight would show yesterday's
// prices for up to a minute before correcting itself.
//
// Ticks never overlap: if a refresh is still in flight when the next one is
// due, that tick is skipped rather than queued. On a slow connection the
// alternative is a growing pile of in-flight requests all writing to the same
// state, landing out of order.
export function useAutoRefresh(callback, intervalMs, enabled = true) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) return undefined;

    let timer = null;
    let inFlight = false;

    const isVisible = () => document.visibilityState === 'visible';

    const run = async () => {
      if (inFlight || !isVisible()) return;
      inFlight = true;
      try {
        await savedCallback.current();
      } catch {
        // A failed refresh is not worth interrupting anyone over — the data
        // already on screen is still the last good data, and the individual
        // loaders surface their own errors. Swallowing here just stops one bad
        // tick from tearing down the interval.
      } finally {
        inFlight = false;
      }
    };

    const start = () => {
      if (timer === null) timer = setInterval(run, intervalMs);
    };

    const stop = () => {
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
    };

    const onVisibilityChange = () => {
      if (isVisible()) {
        run();
        start();
      } else {
        stop();
      }
    };

    if (isVisible()) start();
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [intervalMs, enabled]);
}
