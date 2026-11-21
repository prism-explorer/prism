/**
 * Visibility-aware polling used by the live history lists.
 *
 * A plain `setInterval` keeps spending the shared API rate limit in background
 * tabs. This wrapper stops the timer while the document is hidden and does a
 * single refresh when the tab becomes visible again, then resumes the regular
 * cadence. All browser/DOM access is injectable so it can be tested in Node.
 */
export interface VisibilityPollOptions {
  intervalMs: number;
  /** The refresh to run. Called once on becoming visible and on each tick. */
  refresh: () => void | Promise<void>;
  /** Returns true while the tab is in the background. */
  isHidden?: () => boolean;
  /** Subscribe to visibility changes (defaults to `document`). */
  addVisibilityListener?: (listener: () => void) => void;
  removeVisibilityListener?: (listener: () => void) => void;
}

function defaultIsHidden(): boolean {
  return typeof document !== "undefined" && document.hidden;
}

function defaultAddVisibilityListener(listener: () => void): void {
  document.addEventListener("visibilitychange", listener);
}

function defaultRemoveVisibilityListener(listener: () => void): void {
  document.removeEventListener("visibilitychange", listener);
}

/** Start polling; returns a disposer that clears the timer and the listener. */
export function startVisibilityPolling({
  intervalMs,
  refresh,
  isHidden = defaultIsHidden,
  addVisibilityListener = defaultAddVisibilityListener,
  removeVisibilityListener = defaultRemoveVisibilityListener,
}: VisibilityPollOptions): () => void {
  let timer: ReturnType<typeof setInterval> | null = null;

  const stopTimer = () => {
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  };

  const startTimer = () => {
    if (timer === null && !isHidden()) {
      timer = setInterval(() => {
        if (!isHidden()) void refresh();
      }, intervalMs);
    }
  };

  const onVisibilityChange = () => {
    if (isHidden()) {
      stopTimer();
      return;
    }
    // Became visible: refresh immediately so the user sees current data,
    // then carry on with the normal interval.
    void refresh();
    startTimer();
  };

  addVisibilityListener(onVisibilityChange);
  startTimer();

  return () => {
    stopTimer();
    removeVisibilityListener(onVisibilityChange);
  };
}
