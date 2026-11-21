import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { startVisibilityPolling } from "./visibility-poll";

describe("startVisibilityPolling", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function setup(initialHidden: boolean) {
    let hidden = initialHidden;
    let listener: (() => void) | undefined;
    const removeListener = vi.fn();
    const refresh = vi.fn();
    const stop = startVisibilityPolling({
      intervalMs: 1000,
      refresh,
      isHidden: () => hidden,
      addVisibilityListener: (l) => {
        listener = l;
      },
      removeVisibilityListener: (l) => {
        removeListener(l);
        listener = undefined;
      },
    });
    return {
      refresh,
      stop,
      removeListener,
      setHidden: (value: boolean) => {
        hidden = value;
      },
      visibilityChanged: () => listener?.(),
    };
  }

  it("sends no requests while the tab is hidden", () => {
    const poll = setup(true);
    vi.advanceTimersByTime(5000);
    expect(poll.refresh).not.toHaveBeenCalled();
    poll.stop();
  });

  it("fetches once on becoming visible, then resumes the interval", () => {
    const poll = setup(true);
    vi.advanceTimersByTime(5000);
    expect(poll.refresh).not.toHaveBeenCalled();

    poll.setHidden(false);
    poll.visibilityChanged();
    expect(poll.refresh).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(2000);
    expect(poll.refresh).toHaveBeenCalledTimes(3);
    poll.stop();
  });

  it("stops polling again when the tab is hidden and cleans up on dispose", () => {
    const poll = setup(false);
    vi.advanceTimersByTime(1000);
    expect(poll.refresh).toHaveBeenCalledTimes(1);

    poll.setHidden(true);
    poll.visibilityChanged();
    vi.advanceTimersByTime(5000);
    expect(poll.refresh).toHaveBeenCalledTimes(1);

    poll.stop();
    expect(poll.removeListener).toHaveBeenCalledTimes(1);
    poll.setHidden(false);
    vi.advanceTimersByTime(5000);
    expect(poll.refresh).toHaveBeenCalledTimes(1);
  });

  it("polls normally when the tab starts visible", () => {
    const poll = setup(false);
    vi.advanceTimersByTime(3000);
    expect(poll.refresh).toHaveBeenCalledTimes(3);
    poll.stop();
  });

  it("uses the real document visibility API when no fakes are injected", () => {
    const globals = globalThis as { document?: unknown };
    const original = globals.document;
    const listeners: Array<() => void> = [];
    const doc = {
      hidden: true,
      visibilityState: "hidden",
      addEventListener: (_type: string, listener: () => void) => listeners.push(listener),
      removeEventListener: () => {},
    };
    globals.document = doc;

    try {
      const refresh = vi.fn();
      const stop = startVisibilityPolling({ intervalMs: 1000, refresh });

      // Stubbed hidden tab: no requests go out.
      vi.advanceTimersByTime(3000);
      expect(refresh).not.toHaveBeenCalled();

      // Simulate visibilitychange to visible.
      doc.hidden = false;
      doc.visibilityState = "visible";
      listeners.forEach((listener) => listener());
      expect(refresh).toHaveBeenCalledTimes(1);
      vi.advanceTimersByTime(1000);
      expect(refresh).toHaveBeenCalledTimes(2);

      stop();
    } finally {
      globals.document = original;
    }
  });
});
