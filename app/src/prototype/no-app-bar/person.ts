import { useEffect, useState } from 'react'
import { loadSignedInUser } from '#/auth/session'
import type { SignedInUser } from '#/auth/session'

/**
 * PROTOTYPE. Who is signed in, asked for by the profile surface itself rather
 * than handed down from a route's loader. A real version would take it from
 * the route it already has; this one has to work from three different places
 * in the tree, and a prototype is allowed a round trip to save that plumbing.
 */
export function useSignedInPerson() {
  const [person, setPerson] = useState<SignedInUser | null>(null)

  useEffect(() => {
    let live = true
    void loadSignedInUser().then((found) => {
      if (live) setPerson(found)
    })
    return () => {
      live = false
    }
  }, [])

  return person
}
