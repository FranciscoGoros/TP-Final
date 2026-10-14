import Phaser from 'phaser'
import timer from '../timer.js'

export default class VictoryScene extends Phaser.Scene {
  constructor() {
    super('Victory')
  }

  create() {
    this.cameras.main.setBackgroundColor(0x14291c)

    const { width, height } = this.scale
    const total = timer.finish()

    this.add
      .text(width / 2, height * 0.3, '¡VICTORIA!', {
        fontFamily: 'monospace',
        fontSize: '56px',
        color: '#4ade80',
      })
      .setOrigin(0.5)

    this.add
      .text(width / 2, height * 0.42, 'Completaste los 5 niveles', {
        fontFamily: 'monospace',
        fontSize: '22px',
        color: '#d1fae5',
      })
      .setOrigin(0.5)

    this.add
      .text(width / 2, height * 0.51, `TIEMPO TOTAL: ${timer.format(total)}`, {
        fontFamily: 'monospace',
        fontSize: '26px',
        color: '#fbbf24',
      })
      .setOrigin(0.5)

    const button = this.add.rectangle(width / 2, height / 2, 260, 64, 0x8b5cf6)
    button.setStrokeStyle(2, 0xffffff)
    button.setInteractive({ useHandCursor: true })

    this.add
      .text(width / 2, height / 2, 'VOLVER AL MENÚ', {
        fontFamily: 'monospace',
        fontSize: '20px',
        color: '#ffffff',
      })
      .setOrigin(0.5)

    button.on('pointerover', () => button.setFillStyle(0xa78bfa))
    button.on('pointerout', () => button.setFillStyle(0x8b5cf6))
    button.on('pointerdown', () => button.setFillStyle(0x6d28d9))
    button.on('pointerup', () => {
      button.setFillStyle(0x8b5cf6)
      this.scene.start('Menu')
    })

    this.add
      .text(width / 2, height * 0.85, 'ESPACIO: volver al menú', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#6b6375',
      })
      .setOrigin(0.5)

    this.input.keyboard.once('keydown-SPACE', () => {
      this.scene.start('Menu')
    })
  }
}