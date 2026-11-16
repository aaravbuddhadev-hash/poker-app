#!/usr/bin/env node
/**
 * Publish the app to GitHub Pages: `npm run deploy`.
 *
 * Runs the tests, builds, and pushes the built site to the `gh-pages` branch,
 * which GitHub Pages serves at https://aaravbuddhadev-hash.github.io/poker-app/.
 * The build reads Supabase settings from .env.local; without them the live
 * site runs with accounts switched off, so this stops and says so unless you
 * pass --no-accounts.
 */
import { execFileSync } from 'node:child_process'
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const run = (cmd, args, cwd = root) => execFileSync(cmd, args, { cwd, stdio: 'inherit' })
const out = (cmd, args, cwd = root) => execFileSync(cmd, args, { cwd, encoding: 'utf8' }).trim()

function fail(msg) {
  console.error(`\n✗ ${msg}`)
  process.exit(1)
}

// 1. Accounts need the Supabase settings at build time.
const env = existsSync(join(root, '.env.local')) ? readFileSync(join(root, '.env.local'), 'utf8') : ''
const hasSupabase = /^VITE_SUPABASE_URL=\S+/m.test(env) && /^VITE_SUPABASE_PUBLISHABLE_KEY=\S+/m.test(env)
if (!hasSupabase && !process.argv.includes('--no-accounts')) {
  fail('.env.local has no Supabase settings, so the live site would have accounts switched off.\n  Add them (see .env.example), or run `npm run deploy -- --no-accounts`.')
}

// 2. Test and build. Node is called directly so a broken npm cache can't get in the way.
const node = process.execPath
console.log('→ Running tests')
run(node, ['node_modules/vitest/vitest.mjs', 'run'])
console.log('→ Type-checking and building')
run(node, ['node_modules/typescript/bin/tsc', '-b'])
run(node, ['node_modules/vite/bin/vite.js', 'build'])

// 3. Commit the build on top of the current gh-pages branch, so its history is kept.
const remote = out('git', ['remote', 'get-url', 'origin'])
const source = out('git', ['rev-parse', '--short', 'HEAD'])
const dirty = out('git', ['status', '--porcelain', '--untracked-files=no']) !== ''
const dir = mkdtempSync(join(tmpdir(), 'riverline-deploy-'))
try {
  cpSync(join(root, 'dist'), dir, { recursive: true })
  writeFileSync(join(dir, '.nojekyll'), '') // serve files as-is
  run('git', ['init', '-q', '-b', 'gh-pages'], dir)
  run('git', ['add', '-A'], dir)
  try {
    run('git', ['fetch', '-q', remote, 'gh-pages'], dir)
    run('git', ['reset', '-q', '--soft', 'FETCH_HEAD'], dir)
  } catch {
    console.log('→ No gh-pages branch yet; creating it')
  }
  const name = out('git', ['config', 'user.name'])
  const email = out('git', ['config', 'user.email'])
  const message = `Publish build of ${source}${dirty ? ' (with uncommitted changes)' : ''}`
  run('git', ['-c', `user.name=${name}`, '-c', `user.email=${email}`, 'commit', '-q', '-m', message], dir)
  console.log('→ Publishing to gh-pages')
  run('git', ['push', '-q', remote, 'HEAD:gh-pages'], dir)
} finally {
  rmSync(dir, { recursive: true, force: true })
}

console.log('\n✓ Published. GitHub Pages usually updates within a minute or two:')
console.log('  https://aaravbuddhadev-hash.github.io/poker-app/')
