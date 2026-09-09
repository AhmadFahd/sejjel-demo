import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, extname, join, resolve, sep } from 'node:path'
import type { FileStorage } from './types'

/**
 * A real implementation, not a fake: a directory in development, the mounted
 * volume in production. Object storage is what it would become if the app ever
 * ran on more than one instance.
 */
export function createDiskStorage(root: string): FileStorage {
  const base = resolve(root)

  const pathFor = (key: string) => {
    const full = resolve(base, key)
    // A key is ours, but a traversal out of the directory must still be impossible.
    if (full !== base && !full.startsWith(base + sep)) {
      throw new Error('Refusing a storage key that points outside the root')
    }
    return full
  }

  return {
    name: 'disk',

    async put({ body, contentType, fileName }) {
      const id = randomUUID()
      const key = join(id.slice(0, 2), `${id}${extname(fileName)}`)
      const path = pathFor(key)
      await mkdir(dirname(path), { recursive: true })
      await writeFile(path, body)
      return { key, contentType, byteSize: body.byteLength }
    },

    async read(key) {
      try {
        return new Uint8Array(await readFile(pathFor(key)))
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
        throw error
      }
    },

    async delete(key) {
      await rm(pathFor(key), { force: true })
    },
  }
}
