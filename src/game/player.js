import Phaser from 'phaser'

const SPEED = 390
const JUMP_VELOCITY = -550
const SIZE = 32

const ATTACK_COOLDOWN_MS = 320
const ATTACK_ACTIVE_MS = 130
const ATTACK_REACH = 48
const ATTACK_W = 46
const ATTACK_H = 40
const ATTACK_FILL = 0xfde68a
const ATTACK_STROKE = 0xf59e0b
const BLINK_MS = 80

// Empujón vertical: con C, estando al lado de una caja y sobre el suelo, el
// jugador la levanta y sube con ella. Solo alcanza un nivel de plataforma
// (el salto del jugador mide 168px y las plataformas están a 90-130px), así
// que rescata una caja caída SIN convertir el puzzle en "llevá la caja a
// donde quieras".
const HEAVE_VELOCITY = 540
const HEAVE_COOLDOWN_MS = 260
const HEAVE_MIN_DX = 4
const HEAVE_MAX_DX = 54
const HEAVE_VERTICAL_TOLERANCE = 42

export default class Player extends Phaser.GameObjects.Rectangle {
  constructor(scene, x, y) {
    super(scene, x, y, SIZE, SIZE, 0x7dd3fc)
    this.setStrokeStyle(2, 0x0ea5e9)
    scene.add.existing(this)
    scene.physics.add.existing(this)
    this.body.setCollideWorldBounds(true)

    this.facing = 1
    this.attackCooldownUntil = 0
    this.attackActiveUntil = 0
    this.invulnerableUntil = 0
    this.heaveCooldownUntil = 0

    // Mismo patron que LaserSystem: el cuerpo existe pero nace deshabilitado,
    // asi no frena al jugador hasta que se activa el golpe.
    this.attackRect = scene.add
      .rectangle(x + ATTACK_REACH, y, ATTACK_W, ATTACK_H, ATTACK_FILL, 0.25)
      .setStrokeStyle(2, ATTACK_STROKE)
      .setVisible(false)
    scene.physics.add.existing(this.attackRect, true)
    this.attackRect.body.enable = false
  }

  isVulnerable(now) {
    return now >= this.invulnerableUntil
  }

  setInvulnerable(now, ms) {
    this.invulnerableUntil = now + ms
  }

  update(cursors, keys, time) {
    this.body.setVelocityX(0)

    if (cursors.left.isDown) {
      this.body.setVelocityX(-SPEED)
      this.facing = -1
    } else if (cursors.right.isDown) {
      this.body.setVelocityX(SPEED)
      this.facing = 1
    }

    const grounded = this.body.blocked.down || this.body.touching.down

    // La C solo acts si hay una caja al lado; si no, no gasta el salto.
    this.tryHeave(keys, grounded, time)

    if (grounded && Phaser.Input.Keyboard.JustDown(cursors.space)) {
      this.body.setVelocityY(JUMP_VELOCITY)
    }

    this.updateAttack(keys && keys.attack, time)
    this.updateInvulnerability(time)
  }

  // Caja que el jugador tiene justo delante, a su misma altura.
  findAdjacentBox(boxes) {
    if (!boxes) return null

    for (const box of boxes) {
      const dx = (box.x - this.x) * this.facing
      if (dx < HEAVE_MIN_DX || dx > HEAVE_MAX_DX) continue
      if (Math.abs(box.y - this.y) > HEAVE_VERTICAL_TOLERANCE) continue
      return box
    }

    return null
  }

  tryHeave(keys, grounded, time) {
    if (!keys || !keys.heave) return
    if (!grounded) return
    if (time < this.heaveCooldownUntil) return
    if (!Phaser.Input.Keyboard.JustDown(keys.heave)) return

    const box = this.findAdjacentBox(keys.boxes)
    if (!box) return

    this.heaveCooldownUntil = time + HEAVE_COOLDOWN_MS
    this.body.setVelocityY(JUMP_VELOCITY)
    box.heaveUp(HEAVE_VELOCITY)
  }

  updateAttack(attackKey, time) {
    const pressed = attackKey && Phaser.Input.Keyboard.JustDown(attackKey)

    if (pressed && time >= this.attackCooldownUntil) {
      this.attackCooldownUntil = time + ATTACK_COOLDOWN_MS
      this.attackActiveUntil = time + ATTACK_ACTIVE_MS
    }

    const active = time < this.attackActiveUntil
    this.attacking = active
    this.attackRect.body.enable = active
    this.attackRect.setVisible(active)

    if (active) {
      // OJO: un cuerpo ESTATICO no sigue al GameObject. Mover attackRect.x/.y
      // solo mueve el rectangulo visible; el cuerpo fisico queda clavado donde
      // se creo. Hay que usar body.reset(), que ademas lo reinserta en el
      // staticTree (por eso el overlap nunca encontraba al enemigo).
      this.attackRect.body.reset(this.x + this.facing * ATTACK_REACH, this.y)
    }
  }

  updateInvulnerability(time) {
    if (time < this.invulnerableUntil) {
      this.setAlpha(Math.floor(time / BLINK_MS) % 2 === 0 ? 0.3 : 1)
    } else if (this.alpha !== 1) {
      this.setAlpha(1)
    }
  }
}