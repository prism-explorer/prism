const TYPING_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

/**
 * "/" focuses search, unless the key would land in a field the user is
 * already typing in. HTML tag names are uppercase.
 */
export function isSearchShortcutKey(key: string, tagName: string | undefined): boolean {
  if (key !== "/") return false;
  return tagName === undefined || !TYPING_TAGS.has(tagName);
}

/**
 * Listen for that shortcut on `target` and call `focus`.
 * Returns a function that removes the listener.
 *
 * Only one SearchBar should call this. Home, search, and not-found render a
 * second box under the navbar, and a listener per box focuses whichever
 * input mounted last.
 */
export function attachSearchShortcut(target: EventTarget, focus: () => void): () => void {
  function onKeyDown(event: Event) {
    const key = (event as KeyboardEvent).key;
    const tag = (event.target as HTMLElement | null)?.tagName;
    if (!isSearchShortcutKey(key, tag)) return;
    event.preventDefault();
    focus();
  }

  target.addEventListener("keydown", onKeyDown);
  return () => target.removeEventListener("keydown", onKeyDown);
}
