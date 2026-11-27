/**
 * Fetch for Supabase clients that must always see fresh data. Next.js memoizes identical GET requests
 * during a server render, so a page that reads an order, changes it and reads it again (e.g. payment
 * fulfilment on the success page) would get the stale first response. A per-request AbortSignal opts
 * out of memoization; `no-store` keeps responses out of the data cache.
 */
export const uncachedFetch: typeof fetch = (input, init) =>
  fetch(input, { ...init, cache: "no-store", signal: init?.signal ?? new AbortController().signal });
