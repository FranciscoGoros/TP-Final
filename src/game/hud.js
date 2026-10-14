import Phaser from 'phaser'
import timer from './timer.js'

export default function addRestartButton(scene) {
  const w = scene.scale.width
  const h = scene.scale.height

  const button = scene.add.rectangle(12, 12, 120, 34, 0x3f3f46)
  button.setStrokeStyle(2, 0x71717a)
  button.setInteractive({ useHandCursor: true })
  button.setOrigin(0, 0)

  scene.add
    .text(button.x + 60, button.y + 17, 'REINICIAR', {
      fontFamily: 'monospace',
      fontSize: '13px',
      color: '#efdffc',
    })
    .setOrigin(0.5)

  button.on('pointerover', () => button.setFillStyle(0x52525b))
  button.on('pointerout', () => button.setFillStyle(0x3f3f46))
  button.on('pointerdown', () => {
    if (scene.modalOpen) return
    scene.modalOpen = true

    scene.physics.pause()
    timer.pause()
    scene.input.keyboard.enabled = false

    const overlay = scene.add
      .rectangle(w / 2, h / 2, w, h, 0x000000, 0.7)
      .setDepth(100)
      .setInteractive()

    const panel = scene.add
      .rectangle(w / 2, h / 2 - 40, 420, 200, 0x27272a, 0.95)
      .setStrokeStyle(2, 0x71717a)
      .setDepth(101)

    const question = scene.add
      .text(w / 2, h / 2 - 60, '¿Reiniciar el nivel?', {
        fontFamily: 'monospace',
        fontSize: '22px',
        color: '#efdffc',
      })
      .setDepth(102)
      .setOrigin(0.5)

    const yes = scene.add.rectangle(w / 2 - 90, h / 2 + 30, 130, 54, 0x4ade80)
    yes.setStrokeStyle(2, 0xffffff)
    yes.setInteractive({ useHandCursor: true })
    yes.setDepth(103)

    const yesLabel = scene.add
      .text(yes.x, yes.y, 'SÍ', {
        fontFamily: 'monospace',
        fontSize: '22px',
        color: '#052e16',
      })
      .setDepth(104)
      .setOrigin(0.5)

    const no = scene.add.rectangle(w / 2 + 90, h / 2 + 30, 130, 54, 0xef4444)
    no.setStrokeStyle(2, 0xffffff)
    no.setInteractive({ useHandCursor: true })
    no.setDepth(103)

    const noLabel = scene.add
      .text(no.x, no.y, 'NO', {
        fontFamily: 'monospace',
        fontSize: '22px',
        color: '#ffffff',
      })
      .setDepth(104)
      .setOrigin(0.5)

    yes.on('pointerover', () => yes.setFillStyle(0x86efac))
    yes.on('pointerout', () => yes.setFillStyle(0x4ade80))
    yes.on('pointerdown', () => {
      scene.physics.resume()
      timer.resume()
      scene.input.keyboard.enabled = true
      scene.scene.restart()
    })

    no.on('pointerover', () => no.setFillStyle(0xf87171))
    no.on('pointerout', () => no.setFillStyle(0xef4444))
    no.on('pointerdown', () => {
      scene.modalOpen = false
      scene.physics.resume()
      timer.resume()
      scene.input.keyboard.enabled = true
      overlay.destroy()
      panel.destroy()
      question.destroy()
      yes.destroy()
      yesLabel.destroy()
      no.destroy()
      noLabel.destroy()
    })
  })
}