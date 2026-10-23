// ─────────────────────────────────────────────────────────────────
// Logica de IA de enemigos del PROTOTIPO top-down (estilo Isaac).
//
// Este modulo es 100% PURO: no importa Phaser ni toca el DOM, por lo
// que se puede testear con `node --test` y modificar sin riesgo de
// romper el motor. La escena (TopDownTestScene) solo traduce las
// decisiones devueltas aca a velocidades de Arcade Physics y dibujo.
//
// Contrato: cada `step*` recibe un enemigo (con `x`, `y`, `from`,
// `dir`, `state`, etc.) y un contexto `{ now, px, py, isBlockedAt }`,
// y devuelve un objeto con, como minimo, `{ vx, vy }`. Puede ademas
// devolver `dir`, `state`, `stateUntil`, `chargeDir`, `nextFireAt` y
// `fire`. La escena persiste esos campos en el enemigo para el frame
// siguiente. Ninguna funcion muta el enemigo: todo es declarativo.
//
// Arquetipos:
//   pacer    patrulla de vaiven (base, "Pacer/Maggot")
//   chaser   persigue al jugador si lo ve; si no, patrulla ("Gaper")
//   charger  patrulla -> telegraph -> embestida -> cooldown ("Charger")
//   shooter  patrulla lenta y dispara si ve al jugador ("Horf/Clotty")
// ─────────────────────────────────────────────────────────────────

export const ARCHETYPES = {
  pacer: {
    behavior: 'patrol',
    speed: 80,
    hp: 1,
    losRange: 0,
    fill: 0xf472b6,
    stroke: 0x9d174d,
  },
  chaser: {
    behavior: 'chase',
    speed: 105,
    hp: 2,
    losRange: 560,
    fill: 0xfb7185,
    stroke: 0x9f1239,
  },
  charger: {
    behavior: 'charge',
    speed: 60,
    hp: 3,
    losRange: 460,
    windupMs: 420,
    chargeMs: 620,
    cooldownMs: 850,
    chargeSpeed: 300,
    fill: 0xf97316,
    chargeFill: 0xfef08a,
    stroke: 0x9a3412,
  },
  shooter: {
    behavior: 'shoot',
    speed: 45,
    hp: 2,
    losRange: 620,
    attackRateMs: 1600,
    projectileSpeed: 230,
    projectileFill: 0xc4b5fd,
    fill: 0xa78bfa,
    stroke: 0x6d28d9,
  },
}

export const ENEMY_TYPES = Object.keys(ARCHETYPES)

export function archetypeOf(type) {
  return ARCHETYPES[type] || ARCHETYPES.pacer
}

// Distancia minima para no "embestir desde encima" del jugador.
const CHARGE_MIN_DIST = 40
// Paso de muestreo de la linea de vista (px).
const LOS_STEP = 18

export function distance(ax, ay, bx, by) {
  return Math.hypot(bx - ax, by - ay)
}

// Linea de vista: recorre el segmento A->B y devuelve false si algun
// punto intermedio esta bloqueado. No evalua los extremos (el enemigo
// puede estar pegado a una pared y aun asi ver al jugador).
export function hasLineOfSight(from, to, isBlockedAt, step = LOS_STEP) {
  if (typeof isBlockedAt !== 'function') return true
  const dx = to.x - from.x
  const dy = to.y - from.y
  const dist = Math.hypot(dx, dy)
  if (dist === 0) return true
  const samples = Math.max(1, Math.ceil(dist / step))
  for (let i = 1; i < samples; i++) {
    const t = i / samples
    if (isBlockedAt(from.x + dx * t, from.y + dy * t)) return false
  }
  return true
}

// Vaiven entre los extremos `from` (x1,y1)-(x2,y2). Devuelve la
// velocidad y la direccion (posiblemente invertida al tocar un borde).
export function patrolStep(enemy) {
  const speed = typeof enemy.speed === 'number' ? enemy.speed : 80
  const from = enemy.from
  let dir = { x: enemy.dir?.x ?? 1, y: enemy.dir?.y ?? 0 }

  if (from) {
    if (dir.x > 0 && enemy.x >= from.x2) dir = { x: -1, y: 0 }
    else if (dir.x < 0 && enemy.x <= from.x1) dir = { x: 1, y: 0 }
    else if (dir.y > 0 && enemy.y >= from.y2) dir = { x: 0, y: -1 }
    else if (dir.y < 0 && enemy.y <= from.y1) dir = { x: 0, y: 1 }
  }

  return { vx: dir.x * speed, vy: dir.y * speed, dir, mode: 'patrol' }
}

// Se acerca al jugador por la ruta directa si lo ve; si no, patrulla.
export function chaseStep(enemy, ctx = {}) {
  const { px, py, isBlockedAt } = ctx
  const speed = enemy.speed
  const range = enemy.losRange ?? ARCHETYPES.chaser.losRange
  if (typeof px === 'number' && typeof py === 'number') {
    const dx = px - enemy.x
    const dy = py - enemy.y
    const dist = Math.hypot(dx, dy)
    if (dist > 0 && dist <= range) {
      const sees = hasLineOfSight(enemy, { x: px, y: py }, isBlockedAt)
      if (sees) {
        return {
          vx: (dx / dist) * speed,
          vy: (dy / dist) * speed,
          mode: 'chase',
        }
      }
    }
  }
  return patrolStep(enemy)
}

// Maquina de estados de la embestida:
//   patrol -> windup -> charge -> cooldown -> patrol
// El `windup` es el telegraph (la escena lo hace parpadear).
export function chargerStep(enemy, ctx = {}) {
  const a = ARCHETYPES.charger
  const now = ctx.now ?? 0
  const state = enemy.state || 'patrol'
  const stateUntil = enemy.stateUntil || 0
  const chargeSpeed = enemy.chargeSpeed ?? a.chargeSpeed
  const range = enemy.losRange ?? a.losRange

  if (state === 'patrol') {
    const { px, py, isBlockedAt } = ctx
    let sees = false
    let dist = Infinity
    if (typeof px === 'number' && typeof py === 'number') {
      dist = distance(enemy.x, enemy.y, px, py)
      if (dist >= CHARGE_MIN_DIST && dist <= range) {
        sees = hasLineOfSight(enemy, { x: px, y: py }, isBlockedAt)
      }
    }
    if (sees) {
      return {
        vx: 0,
        vy: 0,
        state: 'windup',
        stateUntil: now + a.windupMs,
        chargeDir: null,
        mode: 'windup',
      }
    }
    return { ...patrolStep(enemy), state: 'patrol', stateUntil: 0, chargeDir: null }
  }

  if (state === 'windup') {
    if (now >= stateUntil) {
      const dx = (ctx.px ?? enemy.x) - enemy.x
      const dy = (ctx.py ?? enemy.y) - enemy.y
      const d = Math.hypot(dx, dy) || 1
      const chargeDir = { x: dx / d, y: dy / d }
      return {
        vx: chargeDir.x * chargeSpeed,
        vy: chargeDir.y * chargeSpeed,
        state: 'charge',
        stateUntil: now + a.chargeMs,
        chargeDir,
        mode: 'charge',
      }
    }
    return { vx: 0, vy: 0, state: 'windup', stateUntil, chargeDir: null, mode: 'windup' }
  }

  if (state === 'charge') {
    if (now >= stateUntil) {
      return {
        vx: 0,
        vy: 0,
        state: 'cooldown',
        stateUntil: now + a.cooldownMs,
        chargeDir: null,
        mode: 'cooldown',
      }
    }
    const dir = enemy.chargeDir || { x: 0, y: 0 }
    return {
      vx: dir.x * chargeSpeed,
      vy: dir.y * chargeSpeed,
      state: 'charge',
      stateUntil,
      chargeDir: dir,
      mode: 'charge',
    }
  }

  // cooldown
  if (now >= stateUntil) {
    return { ...patrolStep(enemy), state: 'patrol', stateUntil: 0, chargeDir: null }
  }
  return { vx: 0, vy: 0, state: 'cooldown', stateUntil, chargeDir: null, mode: 'cooldown' }
}

// Se mueve lento y dispara al jugador si lo ve y le toca el turno.
export function shooterStep(enemy, ctx = {}) {
  const a = ARCHETYPES.shooter
  const now = ctx.now ?? 0
  const range = enemy.losRange ?? a.losRange
  const attackRate = enemy.attackRateMs ?? a.attackRateMs
  const base = patrolStep(enemy)

  let fire = false
  let nextFireAt = enemy.nextFireAt || 0
  const { px, py, isBlockedAt } = ctx
  if (typeof px === 'number' && typeof py === 'number') {
    const dist = distance(enemy.x, enemy.y, px, py)
    const sees =
      dist <= range && hasLineOfSight(enemy, { x: px, y: py }, isBlockedAt)
    if (sees && now >= nextFireAt) {
      fire = true
      nextFireAt = now + attackRate
    }
  }

  return { ...base, fire, nextFireAt, mode: 'shoot' }
}

// Despacha segun el arquetipo del enemigo.
export function stepEnemy(enemy, ctx = {}) {
  switch (enemy.type) {
    case 'chaser':
      return chaseStep(enemy, ctx)
    case 'charger':
      return chargerStep(enemy, ctx)
    case 'shooter':
      return shooterStep(enemy, ctx)
    default:
      return patrolStep(enemy)
  }
}

// Aplica dano a la vida. Devuelve la vida restante y si murio.
export function applyDamage(hp, dmg = 1) {
  const next = Math.max(0, (hp || 0) - (dmg || 0))
  return { hp: next, dead: next <= 0 }
}
