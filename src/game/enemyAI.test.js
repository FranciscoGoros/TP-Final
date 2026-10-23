import test from 'node:test'
import assert from 'node:assert/strict'

import {
  ARCHETYPES,
  ENEMY_TYPES,
  archetypeOf,
  hasLineOfSight,
  patrolStep,
  chaseStep,
  chargerStep,
  shooterStep,
  stepEnemy,
  applyDamage,
} from './enemyAI.js'

// Enemigo minimo con los campos que la IA asume.
function makeEnemy(over = {}) {
  return {
    type: 'pacer',
    x: 100,
    y: 100,
    speed: 80,
    dir: { x: 1, y: 0 },
    from: { x1: 100, y1: 100, x2: 200, y2: 100 },
    state: 'patrol',
    stateUntil: 0,
    chargeDir: null,
    nextFireAt: 0,
    alive: true,
    ...over,
  }
}

// Predicado de bloqueo trivial para aislar la IA de Phaser.
const open = () => false
const wallAt = (wx, wy) => wx >= 140 && wx <= 160

test('ARCHETYPES define los 4 arquetipos con stats validos', () => {
  assert.deepEqual(ENEMY_TYPES.sort(), ['charger', 'chaser', 'pacer', 'shooter'])
  for (const type of ENEMY_TYPES) {
    const a = ARCHETYPES[type]
    assert.ok(a.speed > 0, `${type} speed`)
    assert.ok(a.hp >= 1, `${type} hp`)
    assert.equal(typeof a.fill, 'number')
    assert.equal(typeof a.stroke, 'number')
  }
})

test('archetypeOf cae en pacer si el tipo no existe', () => {
  assert.equal(archetypeOf('nope'), ARCHETYPES.pacer)
  assert.equal(archetypeOf('charger'), ARCHETYPES.charger)
})

test('hasLineOfSight es true sin obstaculos y false con un muro en el medio', () => {
  const from = { x: 100, y: 100 }
  const to = { x: 200, y: 100 }
  assert.equal(hasLineOfSight(from, to, open), true)
  assert.equal(hasLineOfSight(from, to, wallAt), false)
})

test('patrolStep invierte la direccion al llegar al extremo', () => {
  const right = makeEnemy({ x: 200 })
  const out = patrolStep(right)
  assert.equal(out.dir.x, -1)
  assert.equal(out.vx, -80)

  const left = makeEnemy({ x: 100, dir: { x: -1, y: 0 } })
  const out2 = patrolStep(left)
  assert.equal(out2.dir.x, 1)
  assert.equal(out2.vx, 80)
})

test('chaseStep persigue al jugador si lo ve', () => {
  const enemy = makeEnemy({ type: 'chaser', x: 100, y: 100, speed: 100, losRange: 600 })
  const out = chaseStep(enemy, { px: 200, py: 100, isBlockedAt: open })
  assert.equal(out.mode, 'chase')
  assert.ok(out.vx > 0, 'deberia moverse hacia +x')
  assert.equal(out.vy, 0)
})

test('chaseStep patrulla si un muro corta la linea de vista', () => {
  const enemy = makeEnemy({ type: 'chaser', x: 100, y: 100, speed: 100, losRange: 600 })
  const out = chaseStep(enemy, { px: 200, py: 100, isBlockedAt: wallAt })
  assert.equal(out.mode, 'patrol')
})

test('chaseStep patrulla si el jugador esta fuera de rango', () => {
  const enemy = makeEnemy({ type: 'chaser', x: 100, y: 100, speed: 100, losRange: 50 })
  const out = chaseStep(enemy, { px: 900, py: 100, isBlockedAt: open })
  assert.equal(out.mode, 'patrol')
})

test('chargerStep respeta el orden patrol -> windup -> charge -> cooldown', () => {
  const enemy = makeEnemy({
    type: 'charger',
    x: 100,
    y: 100,
    speed: 60,
    losRange: 600,
  })
  const ctx = { px: 300, py: 100, isBlockedAt: open }

  const windup = chargerStep(enemy, { ...ctx, now: 1000 })
  assert.equal(windup.state, 'windup')
  assert.equal(windup.vx, 0)
  assert.equal(windup.stateUntil, 1000 + ARCHETYPES.charger.windupMs)

  const charging = chargerStep(
    { ...enemy, state: 'windup', stateUntil: windup.stateUntil },
    { ...ctx, now: windup.stateUntil }
  )
  assert.equal(charging.state, 'charge')
  assert.ok(charging.vx > 0, 'embiste hacia el jugador')
  assert.ok(charging.chargeDir.x > 0)

  const cooldown = chargerStep(
    { ...enemy, state: 'charge', stateUntil: charging.stateUntil, chargeDir: charging.chargeDir },
    { ...ctx, now: charging.stateUntil }
  )
  assert.equal(cooldown.state, 'cooldown')
  assert.equal(cooldown.vx, 0)
})

test('chargerStep no embiste si el jugador esta encima (distancia minima)', () => {
  const enemy = makeEnemy({ type: 'charger', x: 100, y: 100, losRange: 600 })
  const out = chargerStep(enemy, { px: 110, py: 100, isBlockedAt: open, now: 0 })
  assert.notEqual(out.state, 'windup')
})

test('chargerStep en cooldown se queda quieto hasta cumplir el tiempo', () => {
  const enemy = makeEnemy({ type: 'charger', state: 'cooldown', stateUntil: 5000 })
  const still = chargerStep(enemy, { now: 4000, px: 300, py: 100, isBlockedAt: open })
  assert.equal(still.vx, 0)
  assert.equal(still.state, 'cooldown')

  const resume = chargerStep(enemy, { now: 5000, px: 300, py: 100, isBlockedAt: open })
  assert.equal(resume.state, 'patrol')
})

test('shooterStep dispara respetando el cooldown', () => {
  const enemy = makeEnemy({ type: 'shooter', x: 100, y: 100, nextFireAt: 0 })
  const ctx = { px: 300, py: 100, isBlockedAt: open }

  const first = shooterStep(enemy, { ...ctx, now: 1000 })
  assert.equal(first.fire, true)
  assert.equal(first.nextFireAt, 1000 + ARCHETYPES.shooter.attackRateMs)

  const early = shooterStep(
    { ...enemy, nextFireAt: first.nextFireAt },
    { ...ctx, now: 1500 }
  )
  assert.equal(early.fire, false)

  const ready = shooterStep(
    { ...enemy, nextFireAt: first.nextFireAt },
    { ...ctx, now: first.nextFireAt }
  )
  assert.equal(ready.fire, true)
})

test('shooterStep no dispara sin linea de vista', () => {
  const enemy = makeEnemy({ type: 'shooter', x: 100, y: 100 })
  const out = shooterStep(enemy, { px: 300, py: 100, isBlockedAt: wallAt, now: 9999 })
  assert.equal(out.fire, false)
})

test('stepEnemy despacha segun el tipo', () => {
  assert.equal(stepEnemy(makeEnemy({ type: 'pacer' })).mode, 'patrol')
  assert.equal(
    stepEnemy(makeEnemy({ type: 'chaser', losRange: 600 }), { px: 200, py: 100, isBlockedAt: open }).mode,
    'chase'
  )
  assert.equal(
    stepEnemy(makeEnemy({ type: 'shooter' }), { px: 200, py: 100, isBlockedAt: open, now: 1 }).mode,
    'shoot'
  )
})

test('applyDamage resta vida y solo muere en cero', () => {
  assert.deepEqual(applyDamage(3, 1), { hp: 2, dead: false })
  assert.deepEqual(applyDamage(1, 1), { hp: 0, dead: true })
  assert.deepEqual(applyDamage(1, 5), { hp: 0, dead: true })
})
