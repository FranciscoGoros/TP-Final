import Phaser from 'phaser'
import timer from '../timer.js'
import lives from '../lives.js'

// ─────────────────────────────────────────────────────────────────
// Menú principal con distribución estilo Balatro:
//   · fondo "pintura" en remolino (rojo / verde azulado) + viñeta
//   · abanico de cartas arriba, logo con letras que rebotan
//   · fila de 3 botones con "labio" 3D: azul / naranja / rojo
//   · modales (CONTROLES / AYUDA) con título en cinta y botón ATRÁS
// Todo se dibuja por código: no necesita assets externos.
// ─────────────────────────────────────────────────────────────────

const FONT = '"Courier New", monospace'

const BTN = {
  blue: { main: 0x2b8cf0, hover: 0x5aa8ff, down: 0x2478d4, lip: 0x1b4f96 },
  orange: { main: 0xf59a1c, hover: 0xffb347, down: 0xd98310, lip: 0xa8590a },
  red: { main: 0xe5484d, hover: 0xf26a6e, down: 0xcc383d, lip: 0x962227 },
}

const CONTROLS = [
  { keys: ['W', 'A', 'S', 'D', '/', '←', '↑', '↓', '→'], action: 'Mover' },
  { keys: ['X'], action: 'Atacar' },
  { keys: ['C'], action: 'Empujar cajas' },
]

const HELP = [
  'Limpiá la habitación para abrir las puertas.',
  'Matá enemigos o colocá las cajas en sus zonas.',
  'Las puertas se cierran hasta completar la tarea.',
  'Cuidado con los disparos y los cargadores.',
  'Usá la zona de detección para evitarlos.',
  'Completá la sala GOAL para ganar.',
]

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu')
  }

  create() {
    const { width, height } = this.scale

    // La instancia se reutiliza entre start/restart: todo el estado se resetea acá.
    this.openModal = null
    this.starting = false
    this.modals = {}
    this.dimmer = null
    this.keyHandler = null

    this.cameras.main.resetFX()
    this.cameras.main.fadeIn(350, 0, 0, 0)

    this.buildBackground(width, height)
    this.buildLogoGlow(width)
    this.buildLogo(width)
    this.buildButtons(width)
    this.buildFooter(width, height)
    this.buildVignette(width, height)
    this.buildModals(width, height)
    this.bindKeys()
  }

  // ── texturas generadas por código ───────────────────────────────
  makeGlow(key, stops) {
    if (this.textures.exists(key)) return
    const size = 256
    const tex = this.textures.createCanvas(key, size, size)
    const ctx = tex.getContext()
    const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    stops.forEach(([o, c]) => grad.addColorStop(o, c))
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, size, size)
    tex.refresh()
  }

  // ── fondo ───────────────────────────────────────────────────────
  buildBackground(width, height) {
    this.add.rectangle(width / 2, height / 2, width, height, 0x0a1418).setDepth(0)

    this.makeGlow('mn_glow_red', [
      [0, 'rgba(239,68,68,0.95)'],
      [0.45, 'rgba(190,30,45,0.4)'],
      [1, 'rgba(190,30,45,0)'],
    ])
    this.makeGlow('mn_glow_teal', [
      [0, 'rgba(20,184,166,0.9)'],
      [0.45, 'rgba(13,120,130,0.4)'],
      [1, 'rgba(13,120,130,0)'],
    ])
    this.makeGlow('mn_glow_violet', [
      [0, 'rgba(124,58,237,0.8)'],
      [0.5, 'rgba(76,29,149,0.35)'],
      [1, 'rgba(76,29,149,0)'],
    ])
    this.makeGlow('mn_glow_gold', [
      [0, 'rgba(251,191,36,0.9)'],
      [0.5, 'rgba(245,158,11,0.3)'],
      [1, 'rgba(245,158,11,0)'],
    ])
    this.makeGlow('mn_glow_blue', [
      [0, 'rgba(56,160,255,0.95)'],
      [0.5, 'rgba(37,99,235,0.35)'],
      [1, 'rgba(37,99,235,0)'],
    ])

    // Manchas de color que orbitan lentamente (efecto pintura en remolino).
    const swirl = this.add.container(width / 2, height / 2).setDepth(1)
    const blobs = [
      { key: 'mn_glow_red', x: -230, y: -170, s: 5.2 },
      { key: 'mn_glow_teal', x: 250, y: -80, s: 5.6 },
      { key: 'mn_glow_violet', x: -70, y: 270, s: 4.8 },
      { key: 'mn_glow_teal', x: -270, y: 310, s: 4.0 },
      { key: 'mn_glow_red', x: 270, y: 350, s: 4.4 },
    ]
    blobs.forEach((b, i) => {
      const img = this.add.image(b.x, b.y, b.key).setScale(b.s).setAlpha(0.5)
      swirl.add(img)
      this.tweens.add({
        targets: img,
        x: b.x + Phaser.Math.Between(-110, 110),
        y: b.y + Phaser.Math.Between(-110, 110),
        duration: 9000 + i * 1700,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      })
    })
    this.tweens.add({ targets: swirl, angle: 360, duration: 70000, repeat: -1 })

    // Brazos de espiral muy tenues que giran en sentido contrario.
    const sp = this.add.graphics({ x: width / 2, y: height / 2 }).setDepth(2).setAlpha(0.07)
    sp.lineStyle(4, 0xffffff, 1)
    const arms = 7
    for (let k = 0; k < arms; k++) {
      sp.beginPath()
      for (let s = 0; s <= 120; s++) {
        const t = s / 120
        const th = t * 6.5 + (k * Math.PI * 2) / arms
        const r = 40 + t * 780
        const px = Math.cos(th) * r
        const py = Math.sin(th) * r
        if (s === 0) sp.moveTo(px, py)
        else sp.lineTo(px, py)
      }
      sp.strokePath()
    }
    this.tweens.add({ targets: sp, angle: -360, duration: 90000, repeat: -1 })
  }

  buildVignette(width, height) {
    const key = `mn_vignette_${width}x${height}`
    if (!this.textures.exists(key)) {
      const tex = this.textures.createCanvas(key, width, height)
      const ctx = tex.getContext()
      const inner = Math.min(width, height) * 0.3
      const outer = Math.hypot(width, height) * 0.55
      const grad = ctx.createRadialGradient(width / 2, height / 2, inner, width / 2, height / 2, outer)
      grad.addColorStop(0, 'rgba(0,0,0,0)')
      grad.addColorStop(1, 'rgba(0,0,0,0.78)')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, width, height)
      tex.refresh()
    }
    this.add.image(width / 2, height / 2, key).setDepth(40)

    // Líneas de scanline tipo CRT.
    const lines = this.add.graphics().setDepth(41)
    lines.fillStyle(0x000000, 0.1)
    for (let y = 0; y < height; y += 3) lines.fillRect(0, y, width, 1)
  }

  // Resplandor dorado suave detrás del logo.
  buildLogoGlow(width) {
    const glow = this.add.image(width / 2, 400, 'mn_glow_gold').setScale(4).setAlpha(0).setDepth(9)
    this.tweens.add({ targets: glow, alpha: 0.28, duration: 900, delay: 300 })
    this.tweens.add({
      targets: glow,
      scale: 4.4,
      duration: 2400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })
  }

  // ── logo ────────────────────────────────────────────────────────
  buildLogo(width) {
    const word = 'ESCARABOX'
    const spacing = 66
    const startX = width / 2 - ((word.length - 1) * spacing) / 2
    const restY = 370

    word.split('').forEach((ch, i) => {
      const isBox = i >= 6
      const t = this.add
        .text(startX + i * spacing, -120, ch, {
          fontFamily: FONT,
          fontStyle: 'bold',
          fontSize: '104px',
          color: isBox ? '#fbbf24' : '#ffffff',
          stroke: '#2a0a0a',
          strokeThickness: 12,
        })
        .setOrigin(0.5)
        .setDepth(20)
      t.setShadow(0, 9, '#7f1d1d', 0, true, true)

      this.tweens.add({
        targets: t,
        y: restY,
        duration: 700,
        delay: 300 + i * 70,
        ease: 'Bounce.easeOut',
        onComplete: () => {
          this.tweens.add({
            targets: t,
            y: restY - 9,
            duration: 950,
            delay: i * 110,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
          })
          this.tweens.add({
            targets: t,
            angle: { from: -3, to: 3 },
            duration: 1300,
            delay: i * 90,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
          })
        },
      })
    })

    // Cinta con el subtítulo.
    const rw = 330
    const rh = 38
    const rg = this.add.graphics()
    rg.fillStyle(0x000000, 0.4)
    rg.fillRoundedRect(-rw / 2, -rh / 2 + 10, rw, rh, 12)
    rg.fillStyle(0x7f1d1d, 1)
    rg.fillRoundedRect(-rw / 2, -rh / 2 + 5, rw, rh, 12)
    rg.fillStyle(0xdc2626, 1)
    rg.fillRoundedRect(-rw / 2, -rh / 2, rw, rh, 12)
    rg.fillStyle(0xffffff, 0.18)
    rg.fillRoundedRect(-rw / 2 + 8, -rh / 2 + 5, rw - 16, 6, 3)
    const rt = this.add
      .text(0, 0, 'TOP-DOWN · PUZZLE ARENA', {
        fontFamily: FONT,
        fontStyle: 'bold',
        fontSize: '18px',
        color: '#ffffff',
      })
      .setOrigin(0.5)
    rt.setShadow(0, 2, 'rgba(0,0,0,0.5)', 0, false, true)
    const ribbon = this.add.container(width / 2, 470, [rg, rt]).setDepth(21).setAngle(-2).setAlpha(0).setScale(0.6)
    this.tweens.add({
      targets: ribbon,
      alpha: 1,
      scale: 1,
      duration: 500,
      delay: 1000,
      ease: 'Back.easeOut',
    })
    this.tweens.add({
      targets: ribbon,
      angle: { from: -2.5, to: 1.5 },
      duration: 2400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      delay: 1600,
    })
  }

  // ── botones ─────────────────────────────────────────────────────
  // Botón con "labio" 3D como los de Balatro: se hunde al apretarlo y
  // se menea al pasarle el mouse por encima.
  makeButton(x, y, w, h, label, pal, fontSize, onClick) {
    const LIP = 9
    const R = 18

    const shadow = this.add.graphics()
    shadow.fillStyle(0x000000, 0.4)
    shadow.fillRoundedRect(-w / 2, -h / 2 + 15, w, h, R)

    const face = this.add.graphics()
    const txt = this.add
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
      face.fillRoundedRect(-w / 2 + 12, -h / 2 + off + 7, w - 24, 8, 4)
      face.lineStyle(2, 0x0b1114, 0.55)
      face.strokeRoundedRect(-w / 2, -h / 2 + off, w, h, R)
      txt.y = off
    }
    draw('idle')

    const c = this.add.container(x, y, [shadow, face, txt])
    c.setSize(w, h + LIP)
    c.setInteractive({ useHandCursor: true })

    let down = false
    let over = false
    c.on('pointerover', () => {
      over = true
      if (down) return
      draw('hover')
      this.tweens.killTweensOf(c)
      this.tweens.add({ targets: c, scale: 1.05, duration: 120, ease: 'Back.easeOut' })
      this.tweens.add({
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
      this.tweens.killTweensOf(c)
      this.tweens.add({ targets: c, scale: 1, angle: 0, duration: 120, ease: 'Cubic.easeOut' })
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

  buildButtons(width) {
    const y = 650
    const w = 236
    const h = 92
    const gap = 18
    const left = width / 2 - (w + gap)
    const right = width / 2 + (w + gap)

    // Fondo oscuro detrás de la fila de botones.
    const bar = this.add.graphics().setDepth(28)
    bar.fillStyle(0x000000, 0.38)
    bar.fillRoundedRect(width / 2 - 390, y - 78, 780, 175, 30)
    bar.lineStyle(3, 0xffffff, 0.08)
    bar.strokeRoundedRect(width / 2 - 390, y - 78, 780, 175, 30)

    // Brillo pulsante detrás de JUGAR.
    const glow = this.add.image(left, y, 'mn_glow_blue').setScale(1.9).setAlpha(0.3).setDepth(29)
    this.tweens.add({
      targets: glow,
      alpha: 0.6,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })

    const specs = [
      { x: left, label: 'JUGAR', pal: BTN.blue, fs: 36, fn: () => this.onPlay() },
      { x: width / 2, label: 'CONTROLES', pal: BTN.orange, fs: 24, fn: () => this.showModal('controls') },
      { x: right, label: 'AYUDA', pal: BTN.red, fs: 28, fn: () => this.showModal('help') },
    ]

    specs.forEach((s, i) => {
      const btn = this.makeButton(s.x, y + 130, w, h, s.label, s.pal, s.fs, s.fn)
      btn.setDepth(30).setAlpha(0)
      btn.input.enabled = false
      this.tweens.add({
        targets: btn,
        y,
        alpha: 1,
        duration: 550,
        delay: 1100 + i * 120,
        ease: 'Back.easeOut',
        onComplete: () => {
          if (btn.input) btn.input.enabled = true
        },
      })
    })
  }

  buildFooter(width, height) {
    const hint = this.add
      .text(width / 2, height - 78, 'PRESIONÁ ENTER PARA JUGAR', {
        fontFamily: FONT,
        fontStyle: 'bold',
        fontSize: '16px',
        color: '#cbd5e1',
      })
      .setOrigin(0.5)
      .setDepth(30)
    this.tweens.add({
      targets: hint,
      alpha: 0.3,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })

    this.add
      .text(width / 2, height - 46, 'ESCARABOX · PROTOTIPO', {
        fontFamily: FONT,
        fontSize: '12px',
        color: '#6b7280',
      })
      .setOrigin(0.5)
      .setDepth(30)
  }

  // ── modales ─────────────────────────────────────────────────────
  keycap(parent, x, y, label) {
    const g = this.add.graphics()
    g.fillStyle(0x0b1114, 1)
    g.fillRoundedRect(-22, -16, 44, 44, 9)
    g.fillStyle(0xe5e7eb, 1)
    g.fillRoundedRect(-22, -22, 44, 44, 9)
    g.fillStyle(0xffffff, 0.7)
    g.fillRoundedRect(-17, -18, 34, 6, 3)
    const t = this.add
      .text(0, -1, label, {
        fontFamily: FONT,
        fontStyle: 'bold',
        fontSize: '22px',
        color: '#1f2937',
      })
      .setOrigin(0.5)
    parent.add(this.add.container(x, y, [g, t]))
  }

  buildModal(title, h, fill) {
    const w = 640
    const c = this.add.container(this.scale.width / 2, this.scale.height / 2).setDepth(61).setVisible(false)

    const g = this.add.graphics()
    g.fillStyle(0x000000, 0.5)
    g.fillRoundedRect(-w / 2, -h / 2 + 16, w, h, 28)
    g.fillStyle(0x0b1114, 1)
    g.fillRoundedRect(-w / 2 - 6, -h / 2 - 6, w + 12, h + 12, 32)
    g.fillStyle(0x1e2b31, 1)
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 26)
    g.lineStyle(3, 0x3b4f58, 1)
    g.strokeRoundedRect(-w / 2 + 12, -h / 2 + 12, w - 24, h - 24, 18)
    c.add(g)

    // Título en cinta roja.
    const pw = 320
    const ph = 58
    const pg = this.add.graphics()
    pg.fillStyle(0x000000, 0.4)
    pg.fillRoundedRect(-pw / 2, -h / 2 - ph / 2 + 12, pw, ph, 16)
    pg.fillStyle(0x7f1d1d, 1)
    pg.fillRoundedRect(-pw / 2, -h / 2 - ph / 2 + 6, pw, ph, 16)
    pg.fillStyle(0xdc2626, 1)
    pg.fillRoundedRect(-pw / 2, -h / 2 - ph / 2, pw, ph, 16)
    pg.fillStyle(0xffffff, 0.18)
    pg.fillRoundedRect(-pw / 2 + 10, -h / 2 - ph / 2 + 6, pw - 20, 8, 4)
    const pt = this.add
      .text(0, -h / 2, title, {
        fontFamily: FONT,
        fontStyle: 'bold',
        fontSize: '28px',
        color: '#ffffff',
      })
      .setOrigin(0.5)
    pt.setShadow(0, 3, 'rgba(0,0,0,0.5)', 0, false, true)
    c.add([pg, pt])

    fill(c, w, h)

    const back = this.makeButton(0, h / 2 - 62, 260, 64, 'ATRÁS', BTN.orange, 26, () => this.closeModal())
    c.add(back)

    return c
  }

  buildModals(width, height) {
    // El dimmer va por encima del menú y absorbe los clics mientras hay un modal abierto.
    this.dimmer = this.add
      .rectangle(width / 2, height / 2, width, height, 0x000000)
      .setDepth(60)
      .setAlpha(0)
      .setVisible(false)
      .setInteractive()

    this.modals.controls = this.buildModal('CONTROLES', 470, (c, w, h) => {
      const g = this.add.graphics()
      g.lineStyle(2, 0x3b4f58, 0.9)
      CONTROLS.forEach(({ keys, action }, i) => {
        const y = -h / 2 + 125 + i * 90

        let kx = -270
        keys.forEach((k) => {
          if (k === '/') {
            c.add(
              this.add
                .text(kx + 10, y, '/', { fontFamily: FONT, fontSize: '24px', color: '#94a3b8' })
                .setOrigin(0.5)
            )
            kx += 28
            return
          }
          this.keycap(c, kx + 22, y, k)
          kx += 52
        })

        c.add(
          this.add
            .text(w / 2 - 50, y, action, {
              fontFamily: FONT,
              fontStyle: 'bold',
              fontSize: '22px',
              color: '#fbbf24',
            })
            .setOrigin(1, 0.5)
        )

        if (i < CONTROLS.length - 1) {
          g.lineBetween(-w / 2 + 40, y + 45, w / 2 - 40, y + 45)
        }
      })
      c.add(g)
    })

    this.modals.help = this.buildModal('AYUDA', 650, (c, w, h) => {
      HELP.forEach((line, i) => {
        const y = -h / 2 + 125 + i * 70

        const badge = this.add.graphics()
        badge.fillStyle(0x7f1d1d, 1)
        badge.fillCircle(-270, y + 3, 19)
        badge.fillStyle(0xdc2626, 1)
        badge.fillCircle(-270, y, 19)
        badge.lineStyle(2, 0x0b1114, 1)
        badge.strokeCircle(-270, y, 19)
        c.add(badge)
        c.add(
          this.add
            .text(-270, y - 1, String(i + 1), {
              fontFamily: FONT,
              fontStyle: 'bold',
              fontSize: '20px',
              color: '#ffffff',
            })
            .setOrigin(0.5)
        )
        c.add(
          this.add
            .text(-235, y, line, {
              fontFamily: FONT,
              fontSize: '18px',
              color: '#e5e7eb',
              wordWrap: { width: 510 },
              lineSpacing: 3,
            })
            .setOrigin(0, 0.5)
        )
      })
    })
  }

  showModal(which) {
    if (this.openModal || this.starting) return
    const m = this.modals[which]
    if (!m) return
    this.openModal = which

    this.tweens.killTweensOf(this.dimmer)
    this.tweens.killTweensOf(m)

    this.dimmer.setVisible(true).setAlpha(0)
    m.setVisible(true).setScale(0.85).setAlpha(0)
    this.tweens.add({ targets: this.dimmer, alpha: 0.75, duration: 180 })
    this.tweens.add({ targets: m, scale: 1, alpha: 1, duration: 280, ease: 'Back.easeOut' })
  }

  closeModal() {
    const which = this.openModal
    if (!which) return
    const m = this.modals[which]
    this.openModal = null

    this.tweens.killTweensOf(this.dimmer)
    this.tweens.killTweensOf(m)

    this.tweens.add({
      targets: m,
      scale: 0.9,
      alpha: 0,
      duration: 140,
      onComplete: () => {
        if (this.openModal !== which) m.setVisible(false)
      },
    })
    this.tweens.add({
      targets: this.dimmer,
      alpha: 0,
      duration: 140,
      onComplete: () => {
        if (!this.openModal) this.dimmer.setVisible(false)
      },
    })
  }

  // ── teclado ─────────────────────────────────────────────────────
  bindKeys() {
    this.keyHandler = (event) => {
      if (event.code === 'Escape' && this.openModal) {
        this.closeModal()
        return
      }
      if ((event.code === 'Enter' || event.code === 'Space') && !this.openModal) {
        this.onPlay()
      }
    }
    this.input.keyboard.on('keydown', this.keyHandler)

    // Sacar el listener al cerrar la escena (la instancia se reutiliza).
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.input && this.input.keyboard && this.keyHandler) {
        this.input.keyboard.off('keydown', this.keyHandler)
      }
      this.keyHandler = null
    })
  }

  onPlay() {
    if (this.starting) return
    this.starting = true
    timer.resetAll()
    lives.reset()
    this.cameras.main.fadeOut(300, 0, 0, 0)
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('TopDownTest')
    })
  }
}