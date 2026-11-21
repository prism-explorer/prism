import { AsyncLocalStorage } from "node:async_hooks";
import * as React from "react";

type AnyFn = (...args: never[]) => unknown;

interface CacheScope {
  entries: Map<string, unknown>;
}

/**
 * A scope for memoising request-scoped work in environments that do not
 * provide React's request cache (unit tests, scripts). Everything called
 * inside `runWithCacheScope` shares the same memo; nested scopes are isolated.
 */
const scopeStorage = new AsyncLocalStorage<CacheScope>();

export function runWithCacheScope<T>(fn: () => T): T {
  return scopeStorage.run({ entries: new Map() }, fn);
}

/**
 * React's `cache()` is present in the React build Next.js uses for App Router
 * server components and deduplicates work across an entire request (e.g.
 * `generateMetadata` and the page itself). The published React 18 package that
 * unit tests resolve does not export it, so fall back to the local scope above.
 */
const reactCache = (React as unknown as { cache?: <F extends AnyFn>(fn: F) => F }).cache;

function scopedCache<F extends AnyFn>(fn: F): F {
  const wrapped = ((...args: Parameters<F>) => {
    const scope = scopeStorage.getStore();
    if (!scope) return fn(...args);
    const key = JSON.stringify(args);
    if (scope.entries.has(key)) return scope.entries.get(key) as ReturnType<F>;
    const result = fn(...args);
    scope.entries.set(key, result);
    return result;
  }) as F;
  return wrapped;
}

export const cache: <F extends AnyFn>(fn: F) => F = reactCache ?? scopedCache;
