import type { ReactNode } from 'react'
import { Link } from 'react-router'

/** Inline link from lesson text to a glossary entry. */
export function Term({ id, children }: { id: string; children: ReactNode }) {
  return (
    <Link to={`/learn/glossary?term=${id}`} className="font-semibold text-emerald underline decoration-emerald/40 underline-offset-2 hover:decoration-emerald">
      {children}
    </Link>
  )
}
