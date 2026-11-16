import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { SearchIcon } from '../../components/icons'
import { inputCls, PageHeader, cx } from '../../components/ui'
import { GLOSSARY, searchGlossary } from '../../learn/glossary'

const byId = new Map(GLOSSARY.map((g) => [g.id, g]))

export function GlossaryPage() {
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const focus = params.get('term')
  const results = useMemo(() => searchGlossary(query), [query])
  const sorted = query ? results : [...results].sort((a, b) => a.term.localeCompare(b.term))
  const letters = [...new Set(GLOSSARY.map((g) => letterOf(g.term)))].sort()

  // Jump to ?term=... (links from lessons and related-term chips).
  // Runs after a tick: the app shell scrolls to the top on page change, and
  // its effect runs after this page's, so an immediate scroll would be undone.
  // Arriving from another page jumps instantly (a smooth scroll started during
  // the page change can stall); related-term clicks within the page glide.
  const arrived = useRef(false)
  useEffect(() => {
    if (!focus) return
    const t = window.setTimeout(() => {
      const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      const behavior: ScrollBehavior = arrived.current && !reduce ? 'smooth' : 'auto'
      // Set only once a scroll has really happened (dev mode runs effects twice).
      arrived.current = true
      document.getElementById(`term-${focus}`)?.scrollIntoView({ behavior, block: 'center' })
    }, 60)
    return () => window.clearTimeout(t)
  }, [focus])

  const goTo = (id: string) => {
    setQuery('')
    setParams({ term: id }, { replace: true })
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-2">
        <Link to="/learn" className="text-sm font-semibold text-emerald hover:underline">
          ← Learn
        </Link>
        <PageHeader title="Glossary" subtitle={`${GLOSSARY.length} poker terms in plain English.`} />
      </div>

      <div className="sticky top-[env(safe-area-inset-top)] z-20 -mx-4 grid gap-3 bg-bg/95 px-4 py-2 backdrop-blur md:-mx-8 md:px-8">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" width={18} height={18} />
          <input
            type="search"
            aria-label="Search the glossary"
            placeholder="Search terms, like “kicker” or “UTG”"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={`${inputCls} pl-10`}
          />
        </div>
        {!query && (
          <nav aria-label="Jump to letter" className="flex flex-wrap gap-1">
            {letters.map((l) => (
              <a key={l} href={`#letter-${l}`} onClick={(e) => { e.preventDefault(); document.getElementById(`letter-${l}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }} className="grid size-8 place-items-center rounded-lg text-xs font-bold text-muted hover:bg-surface-2 hover:text-fg">
                {l}
              </a>
            ))}
          </nav>
        )}
      </div>

      {query && (
        <p className="text-sm text-muted" aria-live="polite">
          {sorted.length === 0 ? `No terms match “${query}”.` : `${sorted.length} term${sorted.length === 1 ? '' : 's'} match “${query}”.`}
        </p>
      )}

      <dl className="grid gap-3">
        {sorted.map((g, i) => {
          const letter = letterOf(g.term)
          const firstOfLetter = !query && (i === 0 || letterOf(sorted[i - 1].term) !== letter)
          return (
            <div key={g.id} className="grid gap-3">
              {firstOfLetter && (
                <h2 id={`letter-${letter}`} className="scroll-mt-40 pt-2 font-display text-2xl font-bold text-gold">
                  {letter}
                </h2>
              )}
              <div
                id={`term-${g.id}`}
                className={cx('scroll-mt-40 rounded-2xl border bg-surface p-4 transition-colors', focus === g.id ? 'border-gold ring-2 ring-gold/40' : 'border-line')}
              >
                <dt className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-display text-lg font-bold">{g.term}</span>
                  {g.aliases && <span className="text-xs text-muted">also: {g.aliases.join(', ')}</span>}
                </dt>
                <dd className="mt-1 grid gap-2">
                  <p className="text-sm">{g.definition}</p>
                  {g.example && <p className="text-sm text-muted">Example: {g.example}</p>}
                  {g.related.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs text-muted">Related:</span>
                      {g.related.map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => goTo(r)}
                          className="rounded-full border border-line bg-surface-2 px-2.5 py-0.5 text-xs font-semibold hover:border-emerald/60 hover:text-emerald"
                        >
                          {byId.get(r)?.term}
                        </button>
                      ))}
                    </div>
                  )}
                </dd>
              </div>
            </div>
          )
        })}
      </dl>
    </div>
  )
}

function letterOf(term: string): string {
  const c = term[0].toUpperCase()
  return /[A-Z]/.test(c) ? c : '#'
}
