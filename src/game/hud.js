import Phaser from 'phaser'
import timer from './timer.js'
import lives, { MAX_LIVES } from './lives.js'

// Todo lo del HUD tiene que quedar anclado a la cámara. Al subir de piso la
// cámara panea 960px hacia arriba, y sin scrollFactor 0 el HUD entero se va
// de la pantalla: el jugador se queda sin vidas, sin timer y sin reiniciar.
function pin(obj) {
  obj.setScrollFactor(0)
  return obj
}

export function syncLives(scene) {
  for (let i = 0; i < scene.lifeDots.length; i++) {
    scene.lifeDots[i].setFillStyle(i < lives.remaining ? 0xef4444 : 0x3f3f46)
    scene.lifeDots[i].setStrokeStyle(2, i < lives.remaining ? 0x7f1d1d : 0x52525b)
  }
}

export function addFloorLabel(scene, floor) {
  scene.floorLabel = pin(
    scene.add
      .text(232, 29, `PISO ${floor}`, {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#a78bfa',
      })
      .setOrigin(0, 0.5)
  )

  return scene.floorLabel
}

export function updateFloorLabel(scene, floor) {
  if (scene.floorLabel) scene.floorLabel.setText(`PISO ${floor}`)
}

// Botón de DEBUG: saltea al siguiente piso sin resolver el puzzle.
// En RoomScene llama a ascend(), o sea que panea la cámara de verdad.
// SACAR ANTES DE ENTREGAR.
export function addDebugNext(scene, onNext, label = 'DEBUG: SUBIR') {
  // Arriba al centro: las plataformas siempre arrancan en y=406, asi que la
  // franja superior esta libre y el boton no tapa ninguna zona del piso.
  const x = 560
  const y = 29

  const button = pin(scene.add.rectangle(x, y, 190, 34, 0x166534))
  button.setStrokeStyle(2, 0x4ade80)
  button.setInteractive({ useHandCursor: true })

  pin(
    scene.add
      .text(x, y, label, {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#bbf7d0',
      })
      .setOrigin(0.5)
  )

  button.on('pointerover', () => button.setFillStyle(0x22c55e))
  button.on('pointerout', () => button.setFillStyle(0x166534))
  button.on('pointerdown', onNext)

  return button
}

export default function addRestartButton(scene) {
  const w = scene.scale.width
  const h = scene.scale.height

  // scene.restart() REUSA la misma instancia de escena, asi que modalOpen
  // quedaba en true para siempre y el boton REINICIAR se deadaba apenas
  // lo usabas una vez (el "SI" reinicia pero nunca limpiaba el flag).
  // Inicializarlo aca lo resuelve en un solo punto para todas las escenas,
  // porque create() se vuelve a ejecutar en cada reinicio.
  scene.modalOpen = false

  scene.lifeDots = []
  for (let i = 0; i < MAX_LIVES; i++) {
    scene.lifeDots.push(
      pin(scene.add.rectangle(150 + i * 24, 29, 18, 18, 0xef4444)).setStrokeStyle(2, 0x7f1d1d)
    )
  }

  const button = pin(scene.add.rectangle(12, 12, 120, 34, 0x3f3f46))
  button.setStrokeStyle(2, 0x71717a)
  button.setInteractive({ useHandCursor: true })
  button.setOrigin(0, 0)

  pin(
    scene.add
      .text(button.x + 60, button.y + 17, 'REINICIAR', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#efdffc',
      })
      .setOrigin(0.5)
  )

  button.on('pointerover', () => button.setFillStyle(0x52525b))
  button.on('pointerout', () => button.setFillStyle(0x3f3f46))
  button.on('pointerdown', () => {
    if (scene.modalOpen) return
    scene.modalOpen = true

    scene.physics.pause()
    timer.pause()
    scene.input.keyboard.enabled = false

    const overlay = pin(
      scene.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.7).setDepth(100).setInteractive()
    )

    const panel = pin(
      scene.add.rectangle(w / 2, h / 2 - 40, 420, 200, 0x27272a, 0.95).setStrokeStyle(2, 0x71717a).setDepth(101)
    )

    const question = pin(
      scene.add
        .text(w / 2, h / 2 - 60, '¿Reiniciar el nivel?', {
          fontFamily: 'monospace',
          fontSize: '22px',
          color: '#efdffc',
        })
        .setDepth(102)
        .setOrigin(0.5)
    )

    const yes = pin(scene.add.rectangle(w / 2 - 90, h / 2 + 30, 130, 54, 0x4ade80))
    yes.setStrokeStyle(2, 0xffffff)
    yes.setInteractive({ useHandCursor: true })
    yes.setDepth(103)

    const yesLabel = pin(
      scene.add
        .text(yes.x, yes.y, 'SÍ', {
          fontFamily: 'monospace',
          fontSize: '22px',
          color: '#052e16',
        })
        .setDepth(104)
        .setOrigin(0.5)
    )

    const no = pin(scene.add.rectangle(w / 2 + 90, h / 2 + 30, 130, 54, 0xef4444))
    no.setStrokeStyle(2, 0xffffff)
    no.setInteractive({ useHandCursor: true })
    no.setDepth(103)

    const noLabel = pin(
      scene.add
        .text(no.x, no.y, 'NO', {
          fontFamily: 'monospace',
          fontSize: '22px',
          color: '#ffffff',
        })
        .setDepth(104)
        .setOrigin(0.5)
    )

    yes.on('pointerover', () => yes.setFillStyle(0x86efac))
    yes.on('pointerout', () => yes.setFillStyle(0x4ade80))
    yes.on('pointerdown', () => {
      scene.physics.resume()
      timer.resume()
      scene.input.keyboard.enabled = true
      // El `restart: true` pisa el cache de settings.data de Phaser, para que la
      // escena pueda distinguir un reinicio de una entrada nueva.
      scene.scene.restart({ restart: true })
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