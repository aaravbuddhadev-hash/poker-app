/**
 * Draws the shareable Year in Review card (1080 x 1350 PNG) on a canvas.
 * Text comes from summaryLines(), which already leaves out money when the
 * privacy setting is on, so the image can only contain what the user chose.
 */
import { LINE_POINTS, SPADE_PATH } from '../components/Logo'
import type { Recap, SummaryLine } from './yearInReview'

const W = 1080
const H = 1350
const C = { charcoal: '#0F1412', felt: '#123D2D', emerald: '#1FA971', gold: '#D4B062', cream: '#EDE7D6', muted: '#A9B5AE' }
const DISPLAY = '"Fraunces", Georgia, serif'
const BODY = '"Manrope", system-ui, sans-serif'

function drawMark(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  // Build the mark on its own canvas so the cut-out line can erase the spade.
  const off = document.createElement('canvas')
  off.width = off.height = 240
  const o = off.getContext('2d')!
  o.scale(2, 2)
  const spade = new Path2D(SPADE_PATH)
  const line = new Path2D(`M${LINE_POINTS.split(' ').join(' L')}`)
  o.fillStyle = C.emerald
  o.fill(spade)
  o.lineWidth = 8
  o.lineCap = 'round'
  o.lineJoin = 'round'
  o.globalCompositeOperation = 'destination-out'
  o.stroke(line)
  o.globalCompositeOperation = 'source-over'
  // The part of the line outside the spade turns gold.
  o.save()
  const outside = new Path2D()
  outside.rect(0, 0, 120, 120)
  outside.addPath(spade)
  o.clip(outside, 'evenodd')
  o.strokeStyle = C.gold
  o.stroke(line)
  o.restore()
  o.fillStyle = C.gold
  o.beginPath()
  o.arc(97, 23, 8, 0, Math.PI * 2)
  o.fill()
  ctx.drawImage(off, x, y, size, size)
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, size: number, weight: number, family: string) {
  let s = size
  do ctx.font = `${weight} ${s}px ${family}`
  while (ctx.measureText(text).width > maxWidth && (s -= 2) > 18)
}

export async function renderRecapCard(r: Recap, lines: SummaryLine[], opts: { isDemo: boolean; hideAmounts: boolean }): Promise<Blob> {
  await Promise.all([document.fonts.load(`700 64px ${DISPLAY}`), document.fonts.load(`600 28px ${BODY}`)]).catch(() => undefined)
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  const bg = ctx.createLinearGradient(0, 0, W, H)
  bg.addColorStop(0, C.felt)
  bg.addColorStop(0.7, C.charcoal)
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)
  const glow = ctx.createRadialGradient(W * 0.2, H * 0.1, 0, W * 0.2, H * 0.1, W)
  glow.addColorStop(0, 'rgba(31,169,113,0.22)')
  glow.addColorStop(1, 'rgba(31,169,113,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, W, H)

  drawMark(ctx, 80, 74, 92)
  ctx.fillStyle = C.cream
  ctx.font = `700 52px ${DISPLAY}`
  ctx.textBaseline = 'alphabetic'
  ctx.fillText('Riverline', 186, 138)

  ctx.fillStyle = C.gold
  ctx.font = `600 28px ${BODY}`
  ctx.fillText(`YEAR IN REVIEW${r.isYearToDate ? ' · YEAR TO DATE' : ''}`.split('').join(String.fromCharCode(8202)), 84, 300)
  ctx.fillStyle = C.cream
  ctx.font = `700 230px ${DISPLAY}`
  ctx.fillText(String(r.year), 74, 520)

  // Two-column stat grid.
  const colW = (W - 84 * 2 - 40) / 2
  lines.slice(0, 10).forEach((l, i) => {
    const x = 84 + (i % 2) * (colW + 40)
    const y = 640 + Math.floor(i / 2) * 124
    ctx.fillStyle = C.muted
    ctx.font = `600 26px ${BODY}`
    ctx.fillText(l.label, x, y)
    ctx.fillStyle = C.cream
    fitText(ctx, l.value, colW, 48, 700, DISPLAY)
    ctx.fillText(l.value, x, y + 56)
  })

  ctx.fillStyle = C.muted
  ctx.font = `500 26px ${BODY}`
  const notes = ['Every session, one line.', opts.isDemo ? 'Demo data' : '', opts.hideAmounts ? 'Amounts hidden' : ''].filter(Boolean).join('  ·  ')
  ctx.fillText(notes, 84, H - 80)

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not create the image'))), 'image/png'))
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Share through the system share sheet when it supports images; otherwise download. */
export async function shareOrDownload(blob: Blob, filename: string, text: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const file = new File([blob], filename, { type: 'image/png' })
  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'My Riverline Year in Review', text })
      return 'shared'
    } catch {
      return 'cancelled'
    }
  }
  downloadBlob(blob, filename)
  return 'downloaded'
}
