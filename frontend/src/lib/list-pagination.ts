/**
 * Helpers for lists that combine a polled newest page with older pages fetched
 * by cursor. A cursor page can overlap a later first-page poll as new activity
 * arrives, so items are keyed and de-duplicated on every merge.
 */

/** Add a fetched page to the tail, skipping anything already held. */
export function appendUnique<T>(current: T[], incoming: T[], key: (item: T) => string): T[] {
  const seen = new Set(current.map(key));
  return [
    ...current,
    ...incoming.filter((item) => {
      const id = key(item);
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    }),
  ];
}

/**
 * Newest page first, then the appended older pages. If a poll pulls an older
 * item into the first page, it is shown once, in its newer position.
 */
export function mergeVisible<T>(firstPage: T[], older: T[], key: (item: T) => string): T[] {
  const seen = new Set(firstPage.map(key));
  return [
    ...firstPage,
    ...older.filter((item) => {
      const id = key(item);
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    }),
  ];
}
