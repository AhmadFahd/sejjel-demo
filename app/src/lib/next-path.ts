/**
 * Where to go after signing in. Only somewhere inside this app: a path that
 * starts with a single slash. Anything else — another host, a protocol, a
 * protocol-relative `//host` — is dropped rather than followed, because the
 * value arrives in a link somebody else may have written.
 */
export function safeNextPath(value: unknown): string | null {
  if (typeof value !== 'string') return null
  if (!value.startsWith('/') || value.startsWith('//')) return null
  if (value.includes('\\')) return null
  return value
}
