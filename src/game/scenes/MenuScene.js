import Phaser from 'phaser'
import timer from '../timer.js'
import lives from '../lives.js'

// ─────────────────────────────────────────────────────────────
// Editar el menu: cambiá TITLE, CONTROLS y HELP.
// No hace falta tocar nada mas abajo.
// ─────────────────────────────────────────────────────────────
const TITLE = 'ESCARABOX'

const CONTROLS = [
  { key: '← →', action: 'Mover' },
  { key: 'ESPACIO', action: 'Saltar' },
  { key: 'X', action: 'Atacar' },
  { key: 'C', action: 'Subir caja' },
]

const HELP = [
  'Empuja las cajas hasta las zonas del mismo color.',
  'Cuando cada zona tenga su caja, la puerta se abre.',
  'Entrá por la puerta para pasar al siguiente nivel.',
  'Las púas, los láseres y los centinelas te quitan vidas.',
  'Si una caja se cae, ponete al lado y apretá C para subirla.',
  'Tenés 3 vidas. Al llegar a 0, se reinicia el nivel.',
]

const TITLE_Y = 96

// Botones: ~52% del ancho de la pantalla (840), separados por 38-56px
const PLAY_BTN_W = 440
const PLAY_BTN_H = 80
const MENU_BTN_W = 440
const MENU_BTN_H = 72

const PLAY_Y = 228
const CONTROLS_BTN_Y = 360
const HELP_BTN_Y = 470

const PANEL_HEAD_Y = 590
const PANEL_ROW_Y = 640
const PANEL_ROW_GAP = 42
const PANEL_LINE_GAP = 35
const PANEL_W = 620

const PRIMARY = 0x8b5cf6
const PRIMARY_HOVER = 0xa78bfa
const PRIMARY_DOWN = 0x6d28d9
const SECONDARY = 0x3f3f46
const SECONDARY_HOVER = 0x52525b
const SECONDARY_DOWN = 0x27272a
const SECONDARY_STROKE = 0x71717a

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu')
  }

  create() {
    const { width } = this.scale

    this.openPanel = null

    this.add
      .text(width / 2, TITLE_Y, TITLE, {
        fontFamily: 'monospace',
        fontSize: '52px',
        color: '#efdffc',
      })
      .setOrigin(0.5)

    this.makeButton(width / 2, PLAY_Y, PLAY_BTN_W, PLAY_BTN_H, 'JUGAR', {
      fill: PRIMARY,
      hover: PRIMARY_HOVER,
      down: PRIMARY_DOWN,
      stroke: 0xffffff,
      fontSize: '34px',
      onClick: () => this.onPlay(),
    })

    this.makeButton(width / 2, CONTROLS_BTN_Y, MENU_BTN_W, MENU_BTN_H, 'CONTROLES', {
      fill: SECONDARY,
      hover: SECONDARY_HOVER,
      down: SECONDARY_DOWN,
      stroke: SECONDARY_STROKE,
      fontSize: '26px',
      onClick: () => this.togglePanel('controls'),
    })

    this.makeButton(width / 2, HELP_BTN_Y, MENU_BTN_W, MENU_BTN_H, 'AYUDA', {
      fill: SECONDARY,
      hover: SECONDARY_HOVER,
      down: SECONDARY_DOWN,
      stroke: SECONDARY_STROKE,
      fontSize: '26px',
      onClick: () => this.togglePanel('help'),
    })

    this.controlsPanel = this.buildControlsPanel(width)
    this.helpPanel = this.buildHelpPanel(width)
    this.setPanels(null)
  }

  makeButton(x, y, w, h, label, { fill, hover, down, stroke, fontSize, onClick }) {
    const button = this.add.rectangle(x, y, w, h, fill)
    button.setStrokeStyle(2, stroke)
    button.setInteractive({ useHandCursor: true })

    this.add
      .text(x, y, label, {
        fontFamily: 'monospace',
        fontSize: `${fontSize}px`,
        color: '#ffffff',
      })
      .setOrigin(0.5)

    button.on('pointerover', () => button.setFillStyle(hover))
    button.on('pointerout', () => button.setFillStyle(fill))
    button.on('pointerdown', () => button.setFillStyle(down))
    button.on('pointerup', () => {
      button.setFillStyle(fill)
      onClick()
    })

    return button
  }

  // El panel se mide a partir de su contenido, asi sigue cerrando bien
  // aunque despues agregues o saques lineas del array.
  panelShell(width, heading, rowCount, rowGap, firstRowY) {
    const objects = []
    const lastY = firstRowY + rowGap * (rowCount - 1)
    const top = PANEL_HEAD_Y - 34
    const bottom = lastY + 30

    objects.push(
      this.add
        .rectangle(width / 2, (top + bottom) / 2, PANEL_W, bottom - top, 0x1b1b22, 0.75)
        .setStrokeStyle(2, 0x3f3f46)
    )

    objects.push(
      this.add
        .text(width / 2, PANEL_HEAD_Y, heading, {
          fontFamily: 'monospace',
          fontSize: '22px',
          color: '#a78bfa',
        })
        .setOrigin(0.5)
    )

    return objects
  }

  buildControlsPanel(width) {
    const objects = this.panelShell(width, 'CONTROLES', CONTROLS.length, PANEL_ROW_GAP, PANEL_ROW_Y)

    CONTROLS.forEach(({ key, action }, i) => {
      const y = PANEL_ROW_Y + PANEL_ROW_GAP * i

      objects.push(
        this.add
          .text(width / 2 - 220, y, key, {
            fontFamily: 'monospace',
            fontSize: '18px',
            color: '#fbbf24',
          })
          .setOrigin(0, 0.5)
      )

      objects.push(
        this.add
          .text(width / 2 + 60, y, action, {
            fontFamily: 'monospace',
            fontSize: '18px',
            color: '#d1d5db',
          })
          .setOrigin(0, 0.5)
      )
    })

    return objects
  }

  buildHelpPanel(width) {
    const objects = this.panelShell(width, 'AYUDA', HELP.length, PANEL_LINE_GAP, PANEL_ROW_Y)

    HELP.forEach((line, i) => {
      objects.push(
        this.add
          .text(width / 2, PANEL_ROW_Y + PANEL_LINE_GAP * i, line, {
            fontFamily: 'monospace',
            fontSize: '16px',
            color: '#cbd5e1',
          })
          .setOrigin(0.5)
      )
    })

    return objects
  }

  // Solo un panel abierto a la vez; volver a apretar el mismo lo cierra.
  togglePanel(which) {
    this.setPanels(this.openPanel === which ? null : which)
  }

  setPanels(which) {
    this.openPanel = which
    this.controlsPanel.forEach((o) => o.setVisible(which === 'controls'))
    this.helpPanel.forEach((o) => o.setVisible(which === 'help'))
  }

  onPlay() {
    timer.resetAll()
    lives.reset()
    this.scene.start('Level1')
  }
}