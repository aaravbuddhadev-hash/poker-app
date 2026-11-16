import type { SupabaseClient } from '@supabase/supabase-js'
import type { SessionRemote } from '../data/syncedSessionRepository'
import { parseProgressDoc } from '../sync/progressMerge'
import type { ProgressRemote } from '../sync/progressSync'
import { fromRow, toRow, type SessionRow, type SyncedSession } from '../sync/sessionSync'

/**
 * Supabase connection details come from build-time environment variables
 * (see .env.example). Both are public by design: the publishable key only
 * allows what the database's row-level security policies allow.
 *
 * Without them, accounts are simply switched off and the app works as before,
 * keeping everything on the device.
 */
const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

export const cloudEnabled = Boolean(URL && KEY)

/** Where Supabase keeps the signed-in session on this device. */
export const AUTH_STORAGE_KEY = 'river.v1.auth'

let clientPromise: Promise<SupabaseClient> | null = null

/** The Supabase client, loaded on first use so guests never download it. */
export function getClient(): Promise<SupabaseClient> {
  if (!cloudEnabled) return Promise.reject(new Error('Accounts are not set up for this site.'))
  clientPromise ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(URL!, KEY!, {
      auth: {
        // PKCE puts the email-link code in the query string (?code=), which
        // doesn't collide with the app's hash-based routes.
        flowType: 'pkce',
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: AUTH_STORAGE_KEY,
      },
      // Sync already runs again on the next change, refocus or reconnect, so a
      // failed request should fail fast rather than retry for several seconds.
      db: { retry: false },
    }),
  )
  return clientPromise
}

const PAGE = 1000

export function supabaseSessionRemote(client: SupabaseClient, userId: string): SessionRemote {
  return {
    async pull(cursor) {
      const out: { session: SyncedSession; serverUpdatedAt: string }[] = []
      for (let from = 0; ; from += PAGE) {
        let q = client
          .from('sessions')
          .select('*')
          .order('server_updated_at', { ascending: true })
          .order('id', { ascending: true })
          .range(from, from + PAGE - 1)
        if (cursor) q = q.gt('server_updated_at', cursor)
        const { data, error } = await q
        if (error) throw error
        for (const row of data as (SessionRow & { server_updated_at: string })[]) {
          const session = fromRow(row)
          if (session) out.push({ session, serverUpdatedAt: row.server_updated_at })
        }
        if (data.length < PAGE) return out
      }
    },
    async push(records) {
      for (let i = 0; i < records.length; i += 500) {
        const rows = records.slice(i, i + 500).map((r) => ({ ...toRow(r), user_id: userId }))
        const { error } = await client.from('sessions').upsert(rows, { onConflict: 'user_id,id' })
        if (error) throw error
      }
    },
  }
}

export function supabaseProgressRemote(client: SupabaseClient, userId: string): ProgressRemote {
  return {
    async get() {
      const { data, error } = await client.from('progress').select('doc').eq('user_id', userId).maybeSingle()
      if (error) throw error
      return data ? parseProgressDoc(data.doc) : null
    },
    async put(doc) {
      const { error } = await client.from('progress').upsert({ user_id: userId, doc, updated_at: new Date().toISOString() })
      if (error) throw error
    },
  }
}
