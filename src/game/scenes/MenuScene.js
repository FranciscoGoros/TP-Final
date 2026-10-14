import Phaser from 'phaser'
import timer from '../timer.js'

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu')
  }

  create() {
    const { width, height } = this.scale

    this.add
      .text(width / 2, height * 0.3, 'ESCARABOX', {
        fontFamily: 'monospace',
        fontSize: '56px',
        color: '#efdffc',
      })
      .setOrigin(0.5)

    const button = this.add.rectangle(width / 2, height / 2, 220, 64, 0x8b5cf6)
    button.setStrokeStyle(2, 0xffffff)
    button.setInteractive({ useHandCursor: true })

    this.add
      .text(width / 2, height / 2, 'JUGAR', {
        fontFamily: 'monospace',
        fontSize: '28px',
        color: '#ffffff',
      })
      .setOrigin(0.5)

    button.on('pointerover', () => button.setFillStyle(0xa78bfa))
    button.on('pointerout', () => button.setFillStyle(0x8b5cf6))
    button.on('pointerdown', () => button.setFillStyle(0x6d28d9))
    button.on('pointerup', () => {
      button.setFillStyle(0x8b5cf6)
      this.onPlay()
    })

    this.add
      .text(width / 2, height * 0.9, 'Flechas: mover  |  ESPACIO: saltar', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#6b6375',
      })
      .setOrigin(0.5)
  }

  onPlay() {
    timer.resetAll()
    this.scene.start('Level1')
  }
}