import { describe, expect, it } from 'vitest'
import {
  FALLBACK_POLL_MS,
  KEEP_MS,
  MINTED,
  SETTLED,
  WATCHED,
  fallbackAction,
} from '#/lib/freshness'

/** What `EventSource` calls its states, which the server does not have. */
const CONNECTING = 0
const OPEN = 1
const CLOSED = 2

describe('#80: what the fallback does while the stream is quiet', () => {
  it('asks nothing of an open stream', () => {
    // The server sweeps the events table behind every wake, so an open stream
    // saying nothing means nothing has changed. Asking anyway cost every idle
    // tab a round trip a minute to be told so.
    expect(fallbackAction(OPEN)).toBe('nothing')
  })

  it('asks while the stream is still trying to connect', () => {
    expect(fallbackAction(CONNECTING)).toBe('ask')
  })

  it('asks and opens a new stream once the browser has given up', () => {
    // A stream we open ourselves starts from now rather than from the last
    // event heard, so the ask is what covers what was missed.
    expect(fallbackAction(CLOSED)).toBe('ask-and-reopen')
  })

  it('asks on its own in a browser with no stream at all', () => {
    expect(fallbackAction(null)).toBe('ask')
  })
})

describe('#80: the tiers', () => {
  it('watches a figure for half a minute, and preloads for as long', () => {
    // A preload window shorter than the stale one refetches on a hover over a
    // screen the router already holds a fresh copy of.
    expect(WATCHED.staleTime).toBe(30_000)
    expect(WATCHED.preloadStaleTime).toBe(WATCHED.staleTime)
  })

  it('keeps a settled answer until something says otherwise', () => {
    expect(SETTLED.staleTime).toBe(Infinity)
    expect(SETTLED.preloadStaleTime).toBe(Infinity)
  })

  it('keeps nothing of a minted one, and does not mint it on a hover', () => {
    expect(MINTED.staleTime).toBe(0)
    // Nothing kept is what makes the next visit wait for a real code rather
    // than paint the last one.
    expect(MINTED.gcTime).toBe(0)
    expect(MINTED.preload).toBe(false)
  })

  it('keeps a screen walked away from for minutes, not seconds', () => {
    expect(KEEP_MS).toBeGreaterThan(WATCHED.staleTime)
    expect(FALLBACK_POLL_MS).toBeGreaterThan(WATCHED.staleTime)
  })
})
