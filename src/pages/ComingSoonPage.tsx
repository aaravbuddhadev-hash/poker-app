import { PageHeader } from '../components/ui'

interface Props {
  title: string
  phase: string
  intro: string
  items: string[]
}

/** Honest placeholder for tabs whose features are scheduled for a later phase. */
export function ComingSoonPage({ title, phase, intro, items }: Props) {
  return (
    <div className="grid gap-6">
      <PageHeader title={title} />
      <section className="rounded-2xl border border-line bg-surface p-5 md:p-6 grid gap-4">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-gold">In development · {phase}</span>
        <p className="text-muted max-w-prose">{intro}</p>
        <ul className="grid gap-2">
          {items.map((item) => (
            <li key={item} className="flex gap-3 items-start">
              <span className="mt-2 size-1.5 rounded-full bg-emerald shrink-0" aria-hidden />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
