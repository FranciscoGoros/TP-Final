import timer from './timer.js'
import lives, { MAX_LIVES } from './lives.js'
import { FONT, BTN, COLORS, lipRect, makeButton, makeRibbon, drawPanel, makeHeart } from './ui.js'

// Todo lo del HUD tiene que quedar anclado a la cámara. Al subir de piso la
// cámara panea 960px hacia arriba, y sin scrollFactor 0 el HUD entero se va
// de la pantalla: el jugador se queda sin vidas, sin timer y sin reiniciar.
function pin(obj) {
  obj.setScrollFactor(0)
  return obj
}

// Las vidas ahora son corazones (Graphics con setOn), no rectángulos.
export function syncLives(scene) {
  for (let i = 0; i < scene.lifeDots.length; i++) {
    scene.lifeDots[i].setOn(i < lives.remaining)
  }
}

function drawFloorPill(scene) {
  const text = scene.floorLabel
  const g = scene.floorLabelBg
  if (!text || !g || !g.scene) return
  const w = text.width + 40
  const h = 28
  g.clear()
  lipRect(g, text.x - 20, text.y - h / 2, w, h, 12, COLORS.red, COLORS.redLip, 4)
}

export function addFloorLabel(scene, floor) {
  scene.floorLabelBg = pin(scene.add.graphics()).setDepth(20)
  scene.floorLabel = pin(
    scene.add
      .text(274, 29, `HABITACIÓN ${floor}/5`, {
        fontFamily: FONT,
        fontStyle: 'bold',
        fontSize: '14px',
        color: '#ffffff',
      })
      .setOrigin(0, 0.5)
  ).setDepth(21)
  scene.floorLabel.setShadow(0, 2, 'rgba(0,0,0,0.5)', 0, false, true)
  drawFloorPill(scene)

  return scene.floorLabel
}

export function updateFloorLabel(scene, floor) {
  if (!scene.floorLabel) return
  scene.floorLabel.setText(`HABITACIÓN ${floor}/5`)
  drawFloorPill(scene)
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

  // Barra superior oscura.
  const bar = pin(scene.add.graphics()).setDepth(19)
  bar.fillStyle(0x000000, 0.4)
  bar.fillRoundedRect(8, 14, w - 16, 62, 20)
  bar.fillStyle(COLORS.ink, 0.95)
  bar.fillRoundedRect(6, 4, w - 12, 64, 20)
  bar.fillStyle(COLORS.panel, 0.92)
  bar.fillRoundedRect(10, 8, w - 20, 56, 16)
  bar.lineStyle(2, COLORS.panelLine, 0.9)
  bar.strokeRoundedRect(14, 12, w - 28, 48, 12)

  scene.lifeDots = []
  for (let i = 0; i < MAX_LIVES; i++) {
    scene.lifeDots.push(pin(makeHeart(scene, 168 + i * 34, 33, 24)).setDepth(21))
  }
  syncLives(scene)

  function openConfirm() {
    if (scene.modalOpen) return
    scene.modalOpen = true

    scene.physics.pause()
    timer.pause()
    scene.input.keyboard.enabled = false

    const overlay = pin(
      scene.add.rectangle(w / 2, h / 2, w, h, 0x000000).setAlpha(0).setDepth(100).setInteractive()
    )

    const panel = pin(scene.add.container(w / 2, h / 2 - 40).setDepth(101))
    panel.add(drawPanel(scene, 460, 260))

    const ribbon = makeRibbon(scene, 'REINICIAR', 280, 24, 50)
    ribbon.y = -130

    const question = scene.add
      .text(0, -30, '¿Reiniciar el nivel?', {
        fontFamily: FONT,
        fontStyle: 'bold',
        fontSize: '24px',
        color: '#e5e7eb',
      })
      .setOrigin(0.5)

    const yes = makeButton(scene, -100, 60, 170, 60, 'SÍ', BTN.blue, 28, () => {
      scene.physics.resume()
      timer.resume()
      scene.input.keyboard.enabled = true
      // El `restart: true` pisa el cache de settings.data de Phaser, para que la
      // escena pueda distinguir un reinicio de una entrada nueva.
      scene.scene.restart({ restart: true })
    })

    const no = makeButton(scene, 100, 60, 170, 60, 'NO', BTN.red, 28, () => {
      scene.modalOpen = false
      scene.physics.resume()
      timer.resume()
      scene.input.keyboard.enabled = true
      scene.tweens.killTweensOf([overlay, panel, yes, no])
      overlay.destroy()
      panel.destroy()
    })

    panel.add([ribbon, question, yes, no])

    panel.setScale(0.85).setAlpha(0)
    scene.tweens.add({ targets: overlay, alpha: 0.75, duration: 180 })
    scene.tweens.add({ targets: panel, scale: 1, alpha: 1, duration: 280, ease: 'Back.easeOut' })
  }

  const button = pin(makeButton(scene, 76, 34, 124, 40, 'REINICIAR', BTN.orange, 14, openConfirm))
  button.setDepth(21)
}