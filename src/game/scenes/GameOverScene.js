import Phaser from 'phaser'
import timer from '../timer.js'

export default class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOver')
  }

  init(data) {
    this.level = data?.level ?? 'Level1'
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

    const restart = this.buildButton(width / 2, height * 0.5, 'REINICIAR NIVEL')
    const menu = this.buildButton(width / 2, height * 0.5 + 90, 'VOLVER AL MENÚ')

    restart.on('pointerup', () => this.scene.start(this.level))
    menu.on('pointerup', () => this.scene.start('Menu'))

    this.add
      .text(width / 2, height * 0.5 + 185, `TIEMPO: ${timer.format(levelTime)}`, {
        fontFamily: 'monospace',
        fontSize: '20px',
        color: '#fbbf24',
      })
      .setOrigin(0.5)
  }

  buildButton(x, y, label) {
    const button = this.add.rectangle(x, y, 260, 64, 0x8b5cf6)
    button.setStrokeStyle(2, 0xffffff)
    button.setInteractive({ useHandCursor: true })

    this.add
      .text(x, y, label, {
        fontFamily: 'monospace',
        fontSize: '20px',
        color: '#ffffff',
      })
      .setOrigin(0.5)

    button.on('pointerover', () => button.setFillStyle(0xa78bfa))
    button.on('pointerout', () => button.setFillStyle(0x8b5cf6))
    button.on('pointerdown', () => button.setFillStyle(0x6d28d9))
    button.on('pointerup', () => button.setFillStyle(0x8b5cf6))

    return button
  }
}