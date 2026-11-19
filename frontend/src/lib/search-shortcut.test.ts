import { describe, expect, it, vi } from "vitest";
import { attachSearchShortcut, isSearchShortcutKey } from "./search-shortcut";

class TaggedTarget extends EventTarget {
  constructor(readonly tagName: string) {
    super();
  }
}

function press(target: EventTarget, key: string): boolean {
  const event = new Event("keydown", { cancelable: true });
  Object.defineProperty(event, "key", { value: key });
  target.dispatchEvent(event);
  return event.defaultPrevented;
}

describe("isSearchShortcutKey", () => {
  it("matches slash outside a text field", () => {
    expect(isSearchShortcutKey("/", "BODY")).toBe(true);
    expect(isSearchShortcutKey("/", undefined)).toBe(true);
  });

  it("ignores slash while the user is typing", () => {
    expect(isSearchShortcutKey("/", "INPUT")).toBe(false);
    expect(isSearchShortcutKey("/", "TEXTAREA")).toBe(false);
    expect(isSearchShortcutKey("/", "SELECT")).toBe(false);
  });

  it("ignores every other key", () => {
    expect(isSearchShortcutKey("a", "BODY")).toBe(false);
    expect(isSearchShortcutKey("?", "BODY")).toBe(false);
  });
});

describe("attachSearchShortcut", () => {
  it("adds one listener, focuses on slash, and detaches on release", () => {
    const target = new EventTarget();
    const focus = vi.fn();
    const add = vi.spyOn(target, "addEventListener");

    const release = attachSearchShortcut(target, focus);

    expect(add).toHaveBeenCalledTimes(1);
    expect(add).toHaveBeenCalledWith("keydown", expect.any(Function));

    expect(press(target, "/")).toBe(true);
    expect(focus).toHaveBeenCalledTimes(1);

    release();
    expect(press(target, "/")).toBe(false);
    expect(focus).toHaveBeenCalledTimes(1);
  });

  it("does not steal slash from an input, textarea, or select", () => {
    for (const tagName of ["INPUT", "TEXTAREA", "SELECT"]) {
      const target = new TaggedTarget(tagName);
      const focus = vi.fn();
      attachSearchShortcut(target, focus);
      expect(press(target, "/")).toBe(false);
      expect(focus).not.toHaveBeenCalled();
    }
  });

  it("ignores keys other than slash", () => {
    const target = new EventTarget();
    const focus = vi.fn();
    attachSearchShortcut(target, focus);

    expect(press(target, "a")).toBe(false);
    expect(press(target, "?")).toBe(false);
    expect(focus).not.toHaveBeenCalled();
  });
});
