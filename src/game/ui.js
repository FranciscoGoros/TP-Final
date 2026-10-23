// ─────────────────────────────────────────────────────────────────
// Piezas de UI compartidas con la estética del menú (estilo Balatro):
// botones con labio 3D, paneles oscuros, cintas rojas, keycaps,
// corazones, fondo "pintura" y viñeta. Todo dibujado por código.
// ─────────────────────────────────────────────────────────────────

export const FONT = '"Courier New", monospace'

export const COLORS = {
  ink: 0x0b1114,
  panel: 0x1e2b31,
  panelLine: 0x3b4f58,
  red: 0xdc2626,
  redLip: 0x7f1d1d,
}

export const BTN = {
  blue: { main: 0x2b8cf0, hover: 0x5aa8ff, down: 0x2478d4, lip: 0x1b4f96 },
  orange: { main: 0xf59a1c, hover: 0xffb347, down: 0xd98310, lip: 0xa8590a },
  red: { main: 0xe5484d, hover: 0xf26a6e, down: 0xcc383d, lip: 0x962227 },
}

// ── texturas ──────────────────────────────────────────────────────
export function ensureGlow(scene, key, stops) {
  if (scene.textures.exists(key)) return
  const size = 256
  const tex = scene.textures.createCanvas(key, size, size)
  const ctx = tex.getContext()
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  stops.forEach(([o, c]) => grad.addColorStop(o, c))
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)
  tex.refresh()
}

// Fondo oscuro con manchas de color muy tenues (estático, barato).
export function addPaintBackground(scene, width, height, depth = -20) {
  ensureGlow(scene, 'ui_glow_red', [
    [0, 'rgba(239,68,68,0.95)'],
    [0.45, 'rgba(190,30,45,0.4)'],
    [1, 'rgba(190,30,45,0)'],
  ])
  ensureGlow(scene, 'ui_glow_teal', [
    [0, 'rgba(20,184,166,0.9)'],
    [0.45, 'rgba(13,120,130,0.4)'],
    [1, 'rgba(13,120,130,0)'],
  ])
  ensureGlow(scene, 'ui_glow_violet', [
    [0, 'rgba(124,58,237,0.8)'],
    [0.5, 'rgba(76,29,149,0.35)'],
    [1, 'rgba(76,29,149,0)'],
  ])

  scene.add.rectangle(width / 2, height / 2, width, height, 0x0a1418).setDepth(depth)
  const blobs = [
    { key: 'ui_glow_red', x: width * 0.15, y: height * 0.18, s: 4.6, a: 0.38 },
    { key: 'ui_glow_teal', x: width * 0.88, y: height * 0.45, s: 5.0, a: 0.4 },
    { key: 'ui_glow_violet', x: width * 0.35, y: height * 0.85, s: 4.4, a: 0.35 },
    { key: 'ui_glow_red', x: width * 0.92, y: height * 0.95, s: 3.4, a: 0.28 },
  ]
  blobs.forEach((b) => {
    scene.add.image(b.x, b.y, b.key).setScale(b.s).setAlpha(b.a).setDepth(depth + 1)
  })
}

// Viñeta + scanlines tipo CRT, ancladas a la cámara.
export function addVignette(scene, width, height, depth = 15) {
  const key = `ui_vignette_${width}x${height}`
  if (!scene.textures.exists(key)) {
    const tex = scene.textures.createCanvas(key, width, height)
    const ctx = tex.getContext()
    const inner = Math.min(width, height) * 0.3
    const outer = Math.hypot(width, height) * 0.55
    const grad = ctx.createRadialGradient(width / 2, height / 2, inner, width / 2, height / 2, outer)
    grad.addColorStop(0, 'rgba(0,0,0,0)')
    grad.addColorStop(1, 'rgba(0,0,0,0.7)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, width, height)
    tex.refresh()
  }
  scene.add.image(width / 2, height / 2, key).setDepth(depth).setScrollFactor(0)

  const lines = scene.add.graphics().setDepth(depth + 1).setScrollFactor(0)
  lines.fillStyle(0x000000, 0.08)
  for (let y = 0; y < height; y += 3) lines.fillRect(0, y, width, 1)
}

// ── formas ────────────────────────────────────────────────────────
// Rectángulo con "labio" inferior y un brillo arriba (look de botón).
export function lipRect(g, x, y, w, h, r, face, lip, lipH = 5, alpha = 1) {
  g.fillStyle(lip, alpha)
  g.fillRoundedRect(x, y + lipH, w, h, r)
  g.fillStyle(face, alpha)
  g.fillRoundedRect(x, y, w, h, r)
  g.fillStyle(0xffffff, 0.16 * alpha)
  g.fillRoundedRect(x + 8, y + 5, w - 16, 5, 2.5)
}

// Panel oscuro centrado en (0,0), igual que los modales del menú.
export function drawPanel(scene, w, h) {
  const g = scene.add.graphics()
  g.fillStyle(0x000000, 0.5)
  g.fillRoundedRect(-w / 2, -h / 2 + 16, w, h, 28)
  g.fillStyle(COLORS.ink, 1)
  g.fillRoundedRect(-w / 2 - 6, -h / 2 - 6, w + 12, h + 12, 32)
  g.fillStyle(COLORS.panel, 1)
  g.fillRoundedRect(-w / 2, -h / 2, w, h, 26)
  g.lineStyle(3, COLORS.panelLine, 1)
  g.strokeRoundedRect(-w / 2 + 12, -h / 2 + 12, w - 24, h - 24, 18)
  return g
}

// Cinta con texto, centrada en (0,0). Por defecto roja.
export function makeRibbon(scene, label, w = 300, fontSize = 24, h = 54, pal = null) {
  const face = pal ? pal.main : COLORS.red
  const lip = pal ? pal.lip : COLORS.redLip
  const g = scene.add.graphics()
  g.fillStyle(0x000000, 0.4)
  g.fillRoundedRect(-w / 2, -h / 2 + 12, w, h, 16)
  g.fillStyle(lip, 1)
  g.fillRoundedRect(-w / 2, -h / 2 + 6, w, h, 16)
  g.fillStyle(face, 1)
  g.fillRoundedRect(-w / 2, -h / 2, w, h, 16)
  g.fillStyle(0xffffff, 0.18)
  g.fillRoundedRect(-w / 2 + 10, -h / 2 + 6, w - 20, 8, 4)
  const t = scene.add
    .text(0, 0, label, {
      fontFamily: FONT,
      fontStyle: 'bold',
      fontSize: `${fontSize}px`,
      color: '#ffffff',
    })
    .setOrigin(0.5)
  t.setShadow(0, 3, 'rgba(0,0,0,0.5)', 0, false, true)
  return scene.add.container(0, 0, [g, t])
}

export function keycap(scene, x, y, label, size = 44) {
  const r = Math.round(size * 0.2)
  const half = size / 2
  const g = scene.add.graphics()
  g.fillStyle(COLORS.ink, 1)
  g.fillRoundedRect(-half, -half + 6, size, size, r)
  g.fillStyle(0xe5e7eb, 1)
  g.fillRoundedRect(-half, -half, size, size, r)
  g.fillStyle(0xffffff, 0.7)
  g.fillRoundedRect(-half + 5, -half + 4, size - 10, 6, 3)
  const t = scene.add
    .text(0, -1, label, {
      fontFamily: FONT,
      fontStyle: 'bold',
      fontSize: `${Math.round(size * 0.5)}px`,
      color: '#1f2937',
    })
    .setOrigin(0.5)
  return scene.add.container(x, y, [g, t])
}

// Corazón de vida. g.setOn(true/false) lo redibuja; al perder una vida "salta".
export function makeHeart(scene, x, y, size = 24) {
  const g = scene.add.graphics({ x, y })
  g._on = null

  const shape = (ox, oy, grow) => {
    const r = size * 0.29 + grow
    g.fillCircle(ox - size * 0.25, oy - size * 0.12, r)
    g.fillCircle(ox + size * 0.25, oy - size * 0.12, r)
    g.fillTriangle(
      ox - size * 0.5 - grow * 0.9,
      oy - size * 0.02,
      ox + size * 0.5 + grow * 0.9,
      oy - size * 0.02,
      ox,
      oy + size * 0.62 + grow * 1.6
    )
  }

  g.setOn = (on) => {
    const prev = g._on
    g._on = on
    g.clear()
    g.fillStyle(COLORS.ink, 1)
    shape(0, 3, 2.5)
    g.fillStyle(on ? 0x8f1d24 : 0x232b2f, 1)
    shape(0, 3, 0)
    g.fillStyle(on ? 0xef4444 : 0x3f4a50, 1)
    shape(0, 0, 0)
    if (on) {
      g.fillStyle(0xffffff, 0.55)
      g.fillCircle(-size * 0.3, -size * 0.2, size * 0.07)
    }
    if (prev === true && !on) {
      scene.tweens.add({
        targets: g,
        scale: { from: 1.7, to: 1 },
        angle: { from: -14, to: 0 },
        duration: 320,
        ease: 'Back.easeOut',
      })
    }
    return g
  }

  g.setOn(true)
  return g
}

// Botón con labio 3D: se hunde al apretar y se menea al pasar el mouse.
export function makeButton(scene, x, y, w, h, label, pal, fontSize, onClick) {
  const LIP = h >= 70 ? 9 : h >= 54 ? 7 : 5
  const R = Math.min(18, Math.round(h * 0.3))

  const shadow = scene.add.graphics()
  shadow.fillStyle(0x000000, 0.4)
  shadow.fillRoundedRect(-w / 2, -h / 2 + LIP + 6, w, h, R)

  const face = scene.add.graphics()
  const txt = scene.add
    .text(0, 0, label, {
      fontFamily: FONT,
      fontStyle: 'bold',
      fontSize: `${fontSize}px`,
      color: '#ffffff',
    })
    .setOrigin(0.5)
  txt.setShadow(0, 3, 'rgba(0,0,0,0.45)', 0, false, true)

  const draw = (state) => {
    const color = state === 'hover' ? pal.hover : state === 'down' ? pal.down : pal.main
    const off = state === 'down' ? LIP - 3 : 0
    face.clear()
    face.fillStyle(pal.lip, 1)
    face.fillRoundedRect(-w / 2, -h / 2 + LIP, w, h, R)
    face.fillStyle(color, 1)
    face.fillRoundedRect(-w / 2, -h / 2 + off, w, h, R)
    face.fillStyle(0xffffff, 0.2)
    face.fillRoundedRect(-w / 2 + 12, -h / 2 + off + 5, w - 24, Math.max(4, Math.round(h * 0.09)), 4)
    face.lineStyle(2, COLORS.ink, 0.55)
    face.strokeRoundedRect(-w / 2, -h / 2 + off, w, h, R)
    txt.y = off
  }
  draw('idle')

  const c = scene.add.container(x, y, [shadow, face, txt])
  c.setSize(w, h + LIP)
  c.setInteractive({ useHandCursor: true })

  let down = false
  let over = false
  c.on('pointerover', () => {
    over = true
    if (down) return
    draw('hover')
    scene.tweens.killTweensOf(c)
    scene.tweens.add({ targets: c, scale: 1.05, duration: 120, ease: 'Back.easeOut' })
    scene.tweens.add({
      targets: c,
      angle: { from: -2.5, to: 2.5 },
      duration: 90,
      yoyo: true,
      repeat: 1,
      onComplete: () => c.setAngle(0),
    })
  })
  c.on('pointerout', () => {
    over = false
    down = false
    draw('idle')
    scene.tweens.killTweensOf(c)
    scene.tweens.add({ targets: c, scale: 1, angle: 0, duration: 120, ease: 'Cubic.easeOut' })
  })
  c.on('pointerdown', () => {
    down = true
    draw('down')
  })
  c.on('pointerup', () => {
    if (!down) return
    down = false
    draw(over ? 'hover' : 'idle')
    onClick()
  })

  return c
}
