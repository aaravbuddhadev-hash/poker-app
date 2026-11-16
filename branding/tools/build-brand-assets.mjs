// Generates the final Riverline brand assets: outlined SVGs + PNG renders,
// from one source of truth for the mark's geometry and the brand palette.
//
// Usage (from the project root; the tools are installed without saving):
//   npm install --no-save opentype.js@1.3.4 @resvg/resvg-js@2.6.2 @fontsource/fraunces@5.1.0 @fontsource/manrope@5.1.0
//   node branding/tools/build-brand-assets.mjs .
//
// Fraunces and Manrope are SIL Open Font License fonts; the wordmark is
// converted to outlines so the logo files need no font installed.
import fs from 'node:fs'
import path from 'node:path'
import opentype from 'opentype.js'
import { Resvg } from '@resvg/resvg-js'

const root = process.argv[2]
const outSvg = path.join(root, 'branding/final/svg')
const outPng = path.join(root, 'branding/final/png')
const pub = path.join(root, 'public')
for (const d of [outSvg, outPng]) fs.mkdirSync(d, { recursive: true })

const fonts = 'node_modules/@fontsource'
const toAB = (b) => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)
const fraunces = opentype.parse(toAB(fs.readFileSync(`${fonts}/fraunces/files/fraunces-latin-700-normal.woff`)))
const manrope = opentype.parse(toAB(fs.readFileSync(`${fonts}/manrope/files/manrope-latin-500-normal.woff`)))

// ---- Palette (Direction A) ----
const C = {
  charcoal: '#0F1412', felt: '#123D2D', emerald: '#1FA971', gold: '#D4B062', cream: '#EDE7D6',
  emeraldDeep: '#0F6B4A', goldDeep: '#A8832F', ink: '#0F1412',
}

// ---- Mark geometry (120 x 120 grid) ----
const SPADE = 'M60 14C44 34 22 44 22 64C22 80 40 86 52 76L48 100H72L68 76C80 86 98 80 98 64C98 44 76 34 60 14Z'
// Starts inside the spade, dips, then rises in one straight run that breaks out of it.
const LINE = '33,73 46,61 58,68 97,23'
const DOT = { cx: 97, cy: 23, r: 7.5 }

let uid = 0
/** The mark. The chart line is a true cut-out (mask), so it works on any background;
 *  where the line leaves the spade it turns gold and ends in the gold point. */
function mark({ spade, gold, stroke = 7, tx = 0, ty = 0, scale = 1 }) {
  const id = `m${++uid}`
  return `<g transform="translate(${tx} ${ty}) scale(${scale})">
  <defs>
    <mask id="${id}c" maskUnits="userSpaceOnUse" x="0" y="0" width="120" height="120"><rect width="120" height="120" fill="#fff"/><polyline points="${LINE}" fill="none" stroke="#000" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round"/></mask>
    <mask id="${id}o" maskUnits="userSpaceOnUse" x="0" y="0" width="120" height="120"><rect width="120" height="120" fill="#fff"/><path d="${SPADE}" fill="#000"/></mask>
  </defs>
  <path d="${SPADE}" fill="${spade}" mask="url(#${id}c)"/>
  <polyline points="${LINE}" fill="none" stroke="${gold}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" mask="url(#${id}o)"/>
  <circle cx="${DOT.cx}" cy="${DOT.cy}" r="${DOT.r}" fill="${gold}"/>
</g>`
}

function textPath(font, text, size, x, baseline, fill) {
  const p = font.getPath(text, x, baseline, size)
  return { bb: p.getBoundingBox(), svg: `<path d="${p.toPathData(2)}" fill="${fill}"/>` }
}

const svg = (w, h, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">\n${body}\n</svg>\n`
const writeSvg = (dir, name, content) => (fs.writeFileSync(path.join(dir, name), content), content)
function writePng(dir, name, svgText, width) {
  const png = new Resvg(svgText, { fitTo: { mode: 'width', value: width } }).render().asPng()
  fs.writeFileSync(path.join(dir, name), png)
}

// ---- 1. Mark alone ----
const markVariants = {
  'riverline-mark-dark': { spade: C.emerald, gold: C.gold }, // for dark backgrounds
  'riverline-mark-light': { spade: C.emeraldDeep, gold: C.goldDeep }, // for light backgrounds
  'riverline-mark-mono-white': { spade: '#FFFFFF', gold: '#FFFFFF' },
  'riverline-mark-mono-black': { spade: '#000000', gold: '#000000' },
}
for (const [name, v] of Object.entries(markVariants)) {
  writePng(outPng, `${name}-512.png`, writeSvg(outSvg, `${name}.svg`, svg(120, 120, mark(v))), 512)
}

// ---- 2. Horizontal lockup: mark + outlined wordmark ----
const WORD_SIZE = 78
const GAP = 22
const probe = textPath(fraunces, 'Riverline', WORD_SIZE, 0, 0, '#000').bb
const WORD_W = probe.x2 - probe.x1
const LOCK_W = Math.ceil(120 + GAP + WORD_W + 4)
function lockup(v, wordColor) {
  const textH = probe.y2 - probe.y1
  const baseline = 57 - probe.y1 - textH / 2 // center the ink on the spade body
  const word = textPath(fraunces, 'Riverline', WORD_SIZE, 120 + GAP - probe.x1, baseline, wordColor)
  return svg(LOCK_W, 120, `${mark(v)}\n${word.svg}`)
}
const lockups = {
  'riverline-logo-dark': lockup(markVariants['riverline-mark-dark'], C.cream),
  'riverline-logo-light': lockup(markVariants['riverline-mark-light'], C.ink),
  'riverline-logo-mono-white': lockup(markVariants['riverline-mark-mono-white'], '#FFFFFF'),
  'riverline-logo-mono-black': lockup(markVariants['riverline-mark-mono-black'], '#000000'),
}
for (const [name, s] of Object.entries(lockups)) {
  writeSvg(outSvg, `${name}.svg`, s)
  writePng(outPng, `${name}-1200.png`, s, 1200)
}

// ---- 3. App icon (square; iOS/Android apply their own corner mask) ----
function appIcon({ markScale = 0.62, rounded = 0 } = {}) {
  const S = 1024
  const m = S * markScale
  const off = (S - m) / 2
  return svg(S, S, `<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${C.felt}"/><stop offset="1" stop-color="${C.charcoal}"/></linearGradient>
  <radialGradient id="glow" cx="0.28" cy="0.2" r="0.75"><stop offset="0" stop-color="${C.emerald}" stop-opacity="0.22"/><stop offset="1" stop-color="${C.emerald}" stop-opacity="0"/></radialGradient>
</defs>
<rect width="${S}" height="${S}" rx="${rounded}" fill="url(#bg)"/>
<rect width="${S}" height="${S}" rx="${rounded}" fill="url(#glow)"/>
${mark({ spade: C.emerald, gold: C.gold, tx: off - m * 0.02, ty: off + m * 0.01, scale: m / 120 })}`)
}
const icon = writeSvg(outSvg, 'riverline-app-icon.svg', appIcon())
const iconMaskable = writeSvg(outSvg, 'riverline-app-icon-maskable.svg', appIcon({ markScale: 0.5 }))
const iconRounded = writeSvg(outSvg, 'riverline-app-icon-rounded.svg', appIcon({ rounded: 228 }))
writePng(outPng, 'riverline-app-icon-1024.png', icon, 1024)
writePng(outPng, 'riverline-app-icon-rounded-1024.png', iconRounded, 1024)

// ---- 4. Favicon (heavier cut so it survives 16px) ----
const favicon = svg(120, 120, `<rect width="120" height="120" rx="26" fill="${C.charcoal}"/>
${mark({ spade: C.emerald, gold: C.gold, stroke: 9, tx: 7, ty: 9, scale: 104 / 120 })}`)
writeSvg(outSvg, 'riverline-favicon.svg', favicon)

// ---- 5. Social card + portrait splash ----
function card(W, H) {
  const scale = (W * 0.56) / LOCK_W
  const lw = LOCK_W * scale, lh = 120 * scale
  const lx = (W - lw) / 2, ly = H / 2 - lh / 2 - H * 0.04
  const inner = lockups['riverline-logo-dark'].replace(/^<svg[^>]*>\n?|\n?<\/svg>\s*$/g, '')
  const tSize = W * 0.034
  const t = textPath(manrope, 'Every session, one line.', tSize, 0, 0, '#000').bb
  const tag = textPath(manrope, 'Every session, one line.', tSize, (W - (t.x2 - t.x1)) / 2 - t.x1, ly + lh + H * 0.1, '#A9B5AE')
  return svg(W, H, `<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${C.felt}"/><stop offset="0.65" stop-color="${C.charcoal}"/></linearGradient>
  <radialGradient id="glow" cx="0.2" cy="0.1" r="0.9"><stop offset="0" stop-color="${C.emerald}" stop-opacity="0.18"/><stop offset="1" stop-color="${C.emerald}" stop-opacity="0"/></radialGradient>
</defs>
<rect width="${W}" height="${H}" fill="url(#bg)"/><rect width="${W}" height="${H}" fill="url(#glow)"/>
<g transform="translate(${lx} ${ly}) scale(${scale})">${inner}</g>
${tag.svg}`)
}
const og = writeSvg(outSvg, 'riverline-social-card.svg', card(1200, 630))
writePng(outPng, 'riverline-social-card-1200x630.png', og, 1200)
const splash = writeSvg(outSvg, 'riverline-splash-portrait.svg', card(1290, 2796))
writePng(outPng, 'riverline-splash-portrait-1290x2796.png', splash, 1290)

// ---- 6. Web app files in /public ----
fs.writeFileSync(path.join(pub, 'favicon.svg'), favicon)
writePng(pub, 'favicon-32.png', favicon, 32)
writePng(pub, 'apple-touch-icon.png', icon, 180)
writePng(pub, 'icon-192.png', icon, 192)
writePng(pub, 'icon-512.png', icon, 512)
writePng(pub, 'icon-maskable-512.png', iconMaskable, 512)
writePng(pub, 'og-image.png', og, 1200)

console.log('done:', fs.readdirSync(outSvg).length, 'svg,', fs.readdirSync(outPng).length, 'png')
