import type { StorageKeys } from '../data/progressStorage'
import type { KeyValueStore } from '../data/sessionRepository'
import { emptyProgress, mergeProgress, readLocalProgress, sameProgress, writeLocalProgress, type ProgressDoc } from './progressMerge'

export interface ProgressRemote {
  get(): Promise<ProgressDoc | null>
  put(doc: ProgressDoc): Promise<void>
}

/**
 * One round of progress sync: merge this device's progress with the cloud
 * copy, save the result on both sides, and report whether the device's copy
 * changed (so screens can reload).
 */
export async function syncProgress(store: KeyValueStore, keys: StorageKeys, remote: ProgressRemote): Promise<{ localChanged: boolean }> {
  const cloud = (await remote.get()) ?? emptyProgress()
  // Read the device's copy only after the network call, so a change made
  // meanwhile is part of the merge rather than overwritten.
  const local = readLocalProgress(store, keys)
  const merged = mergeProgress(local, cloud)
  const localChanged = !sameProgress(merged, local)
  if (localChanged) writeLocalProgress(store, keys, merged)
  if (!sameProgress(merged, cloud)) await remote.put(merged)
  return { localChanged }
}
