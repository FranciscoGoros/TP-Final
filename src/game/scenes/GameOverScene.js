import Phaser from 'phaser'
import timer from '../timer.js'
import lives from '../lives.js'

export default class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOver')
  }

  init(data) {
    this.level = data?.level ?? 'Game'
    this.floor = data?.floor ?? 1
  }

  create() {
    this.cameras.main.setBackgroundColor(0x2b1515)

    const { width, height } = this.scale
    const levelTime = timer.levelElapsed()

    this.add
      .text(width / 2, height * 0.28, 'GAME OVER', {
        fontFamily: 'monospace',
        fontSize: '56px',
        color: '#f87171',
      })
      .setOrigin(0.5)

    const isTopDown = this.level === 'TopDownTest'
    
    // Creamos los botones interactivos
    const restart = this.buildButton(width / 2, height * 0.5, isTopDown ? 'VOLVER AL INICIO' : 'REINTENTAR HABITACIÓN')
    const menu = this.buildButton(width / 2, height * 0.5 + 90, 'VOLVER AL MENÚ')

    // Usamos 'pointerdown' o 'pointerup' asegurándonos de limpiar cualquier escena previa correctamente
    restart.on('pointerdown', () => {
      restart.setFillStyle(0x6d28d9)
      lives.reset()
      if (isTopDown) {
        this.scene.start('TopDownTest')
        return
      }
      this.scene.start(this.level, { level: this.level, floor: this.floor, fresh: true })
    })

    menu.on('pointerdown', () => {
      menu.setFillStyle(0x6d28d9)
      this.scene.start('Menu')
    })

    this.add
      .text(width / 2, height * 0.5 + 165, isTopDown ? 'PROTOTIPO TOP-DOWN - SIN VIDAS' : `LLEGASTE A LA HABITACIÓN ${this.floor}`, {
        fontFamily: 'monospace',
        fontSize: '22px',
        color: '#a78bfa',
      })
      .setOrigin(0.5)

    this.add
      .text(width / 2, height * 0.5 + 210, `TIEMPO: ${timer.format(levelTime)}`, {
        fontFamily: 'monospace',
        fontSize: '20px',
        color: '#fbbf24',
      })
      .setOrigin(0.5)
  }

  buildButton(x, y, label) {
    // Creamos el contenedor del botón (rectángulo)
    const button = this.add.rectangle(x, y, 320, 64, 0x8b5cf6) // Aumenté un poco el ancho por si el texto es largo
    button.setStrokeStyle(2, 0xffffff)
    button.setInteractive({ useHandCursor: true })

    // Creamos el texto y LO ASOCIAMOS visualmente, pero SIN interactividad propia para que no bloquee al botón
    const btnText = this.add
      .text(x, y, label, {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#ffffff',
      })
      .setOrigin(0.5)

    // Efectos visuales de los eventos del botón
    button.on('pointerover', () => {
      button.setFillStyle(0xa78bfa)
    })
    
    button.on('pointerout', () => {
      button.setFillStyle(0x8b5cf6)
    })

    return button
  }
}