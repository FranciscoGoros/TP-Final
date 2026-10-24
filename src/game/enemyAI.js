// ─────────────────────────────────────────────────────────────────
// Logica de IA de enemigos del PROTOTIPO top-down (estilo Isaac).
//
// Modulo 100% PURO: no importa Phaser ni toca el DOM.
// Contrato: cada step* recibe un enemigo y un contexto
//   { now, px, py, pvx, pvy, isBlockedAt }
// y devuelve { vx, vy, [dir, state, stateUntil, chargeDir,
//              nextFireAt, fire, fireAngle, mode] }.
// Ninguna funcion muta el enemigo.
//
// Arquetipos:
//   pacer    vaiven de patrulla. Simple, predecible.
//   chaser   persigue si ve al jugador; si no, patrulla. Rapido.
//   charger  telegraph -> embestida. Peligroso en pasillos.
//   shooter  apunta con prediccion de movimiento (tipo esqueleto).
//            Si pierde la LOS se reposiciona buscando angulo.
//   lurker   se queda quieto hasta que el jugador lo roza;
//            entonces persigue en rafaga breve y descansa.
//   warden   patrulla, y cuando ve al jugador le corta el paso
//            moviendose a su destino previsto en lugar de ir directo.
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
    speed: 118,
    hp: 2,
    losRange: 580,
    fill: 0xfb7185,
    stroke: 0x9f1239,
  },
  charger: {
    behavior: 'charge',
    speed: 60,
    hp: 3,
    losRange: 480,
    windupMs: 380,
    chargeMs: 580,
    cooldownMs: 900,
    chargeSpeed: 320,
    fill: 0xf97316,
    chargeFill: 0xfef08a,
    stroke: 0x9a3412,
  },
  shooter: {
    behavior: 'shoot',
    speed: 42,
    hp: 2,
    losRange: 640,
    attackRateMs: 1800,
    burstCount: 1,       // 1 = disparo simple; 2-3 = rafaga
    burstGapMs: 200,
    projectileSpeed: 240,
    projectileFill: 0xc4b5fd,
    fill: 0xa78bfa,
    stroke: 0x6d28d9,
    // Cuanto predice la posicion futura del jugador (0 = sin prediccion)
    leadFactor: 0.55,
  },
  lurker: {
    behavior: 'lurk',
    speed: 145,
    hp: 2,
    losRange: 0,
    activateRadius: 110,  // se activa si el jugador entra en este radio
    burstMs: 900,         // cuanto dura la persecucion
    restMs: 1400,         // cuanto descansa entre activaciones
    fill: 0x34d399,
    stroke: 0x065f46,
  },
  warden: {
    behavior: 'intercept',
    speed: 95,
    hp: 3,
    losRange: 500,
    interceptLeadMs: 700, // cuantos ms a futuro predice la posicion del jugador
    fill: 0xfbbf24,
    stroke: 0x92400e,
  },
}

export const ENEMY_TYPES = Object.keys(ARCHETYPES)

export function archetypeOf(type) {
  return ARCHETYPES[type] || ARCHETYPES.pacer
}

const CHARGE_MIN_DIST = 40
const LOS_STEP = 16

export function distance(ax, ay, bx, by) {
  return Math.hypot(bx - ax, by - ay)
}

// Linea de vista: muestrea el segmento A->B y devuelve false si algun
// punto intermedio esta bloqueado.
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

// Vaiven entre extremos from {x1,y1,x2,y2}.
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

// Chaser: persigue en linea recta si ve al jugador; patrulla si no.
// Cuando pierde la LOS no se detiene inmediatamente: mantiene la ultima
// direccion de persecucion durante un breve periodo de inercia.
export function chaseStep(enemy, ctx = {}) {
  const { px, py, isBlockedAt, now = 0 } = ctx
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
          chaseLastSeen: { x: px, y: py, t: now },
          mode: 'chase',
        }
      }
    }
    // Inercia: sigue la ultima posicion vista durante 600 ms mas.
    const last = enemy.chaseLastSeen
    if (last && now - last.t < 600) {
      const ldx = last.x - enemy.x
      const ldy = last.y - enemy.y
      const ldist = Math.hypot(ldx, ldy)
      if (ldist > 8) {
        return {
          vx: (ldx / ldist) * speed * 0.8,
          vy: (ldy / ldist) * speed * 0.8,
          chaseLastSeen: last,
          mode: 'chase',
        }
      }
    }
  }
  return patrolStep(enemy)
}

// Shooter: disparo predictivo (tipo esqueleto de Minecraft).
// Calcula donde ESTARA el jugador cuando el proyectil llegue, usando
// su velocidad actual (pvx, pvy). Si no tiene LOS intenta desplazarse
// lateralmente para encontrar angulo (strafe).
export function shooterStep(enemy, ctx = {}) {
  const a = ARCHETYPES.shooter
  const now = ctx.now ?? 0
  const range = enemy.losRange ?? a.losRange
  const attackRate = enemy.attackRateMs ?? a.attackRateMs
  const projSpeed = a.projectileSpeed
  const lead = a.leadFactor ?? 0.55
  const base = patrolStep(enemy)

  let fire = false
  let fireAngle = null
  let nextFireAt = enemy.nextFireAt ?? 0
  let shooterStrafe = enemy.shooterStrafe ?? null

  const { px, py, pvx = 0, pvy = 0, isBlockedAt } = ctx

  if (typeof px === 'number' && typeof py === 'number') {
    const dist = distance(enemy.x, enemy.y, px, py)
    const sees = dist <= range && hasLineOfSight(enemy, { x: px, y: py }, isBlockedAt)

    if (sees) {
      shooterStrafe = null
      // Prediccion lineal: tiempo de vuelo estimado * velocidad del jugador.
      const tof = dist / projSpeed
      const tx = px + pvx * tof * lead
      const ty = py + pvy * tof * lead
      const aimDx = tx - enemy.x
      const aimDy = ty - enemy.y
      fireAngle = Math.atan2(aimDy, aimDx)

      if (now >= nextFireAt) {
        fire = true
        nextFireAt = now + attackRate
      }

      // Mientras tiene LOS se queda quieto para apuntar mejor.
      return { vx: 0, vy: 0, fire, fireAngle, nextFireAt, shooterStrafe: null, mode: 'shoot' }
    }

    // Sin LOS: strafe lateral para buscar angulo.
    if (!shooterStrafe || now >= shooterStrafe.until) {
      const angle = Math.atan2(py - enemy.y, px - enemy.x)
      const sideAngle = angle + (Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2)
      shooterStrafe = {
        vx: Math.cos(sideAngle) * (enemy.speed ?? a.speed),
        vy: Math.sin(sideAngle) * (enemy.speed ?? a.speed),
        until: now + 700 + Math.random() * 400,
      }
    }

    return {
      vx: shooterStrafe.vx,
      vy: shooterStrafe.vy,
      fire: false,
      fireAngle: null,
      nextFireAt,
      shooterStrafe,
      mode: 'reposition',
    }
  }

  return { ...base, fire, fireAngle, nextFireAt, shooterStrafe, mode: 'shoot' }
}

// Charger: patrol -> windup (telegraph) -> charge -> cooldown -> patrol.
export function chargerStep(enemy, ctx = {}) {
  const a = ARCHETYPES.charger
  const now = ctx.now ?? 0
  const state = enemy.state || 'patrol'
  const stateUntil = enemy.stateUntil || 0
  const chargeSpeed = enemy.chargeSpeed ?? a.chargeSpeed
  const range = enemy.losRange ?? a.losRange

  if (state === 'patrol') {
    const { px, py, isBlockedAt } = ctx
    if (typeof px === 'number' && typeof py === 'number') {
      const dist = distance(enemy.x, enemy.y, px, py)
      if (dist >= CHARGE_MIN_DIST && dist <= range) {
        const sees = hasLineOfSight(enemy, { x: px, y: py }, isBlockedAt)
        if (sees) {
          return {
            vx: 0, vy: 0,
            state: 'windup',
            stateUntil: now + a.windupMs,
            chargeDir: null,
            mode: 'windup',
          }
        }
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
        vx: 0, vy: 0,
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
      state: 'charge', stateUntil, chargeDir: dir,
      mode: 'charge',
    }
  }

  // cooldown
  if (now >= stateUntil) {
    return { ...patrolStep(enemy), state: 'patrol', stateUntil: 0, chargeDir: null }
  }
  return { vx: 0, vy: 0, state: 'cooldown', stateUntil, chargeDir: null, mode: 'cooldown' }
}

// Lurker: duerme hasta que el jugador se acerca; entonces persigue en rafaga.
// Estados: sleep -> burst -> rest -> sleep
export function lurkerStep(enemy, ctx = {}) {
  const a = ARCHETYPES.lurker
  const now = ctx.now ?? 0
  const state = enemy.state || 'sleep'
  const stateUntil = enemy.stateUntil || 0
  const { px, py } = ctx
  const speed = enemy.speed ?? a.speed

  if (state === 'sleep') {
    const dist = (typeof px === 'number' && typeof py === 'number')
      ? distance(enemy.x, enemy.y, px, py) : Infinity
    if (dist <= (a.activateRadius)) {
      return {
        vx: 0, vy: 0,
        state: 'burst',
        stateUntil: now + a.burstMs,
        mode: 'burst',
      }
    }
    return { vx: 0, vy: 0, state: 'sleep', stateUntil: 0, mode: 'sleep' }
  }

  if (state === 'burst') {
    if (now >= stateUntil) {
      return { vx: 0, vy: 0, state: 'rest', stateUntil: now + a.restMs, mode: 'rest' }
    }
    if (typeof px === 'number' && typeof py === 'number') {
      const dx = px - enemy.x
      const dy = py - enemy.y
      const d = Math.hypot(dx, dy) || 1
      return {
        vx: (dx / d) * speed,
        vy: (dy / d) * speed,
        state: 'burst', stateUntil, mode: 'burst',
      }
    }
    return { vx: 0, vy: 0, state: 'burst', stateUntil, mode: 'burst' }
  }

  // rest
  if (now >= stateUntil) {
    return { vx: 0, vy: 0, state: 'sleep', stateUntil: 0, mode: 'sleep' }
  }
  return { vx: 0, vy: 0, state: 'rest', stateUntil, mode: 'rest' }
}

// Warden: intercepta al jugador moviendose a donde VA a estar,
// no a donde esta ahora. Mas inteligente que el chaser puro.
export function wardenStep(enemy, ctx = {}) {
  const a = ARCHETYPES.warden
  const { px, py, pvx = 0, pvy = 0, isBlockedAt, now = 0 } = ctx
  const speed = enemy.speed ?? a.speed
  const range = enemy.losRange ?? a.losRange
  const leadMs = a.interceptLeadMs

  if (typeof px === 'number' && typeof py === 'number') {
    const dist = distance(enemy.x, enemy.y, px, py)
    if (dist <= range) {
      const sees = hasLineOfSight(enemy, { x: px, y: py }, isBlockedAt)
      if (sees) {
        // Punto de intercepcion: posicion del jugador + su velocidad * tiempo de prediccion
        const tx = px + pvx * (leadMs / 1000)
        const ty = py + pvy * (leadMs / 1000)
        const dx = tx - enemy.x
        const dy = ty - enemy.y
        const d = Math.hypot(dx, dy) || 1
        return {
          vx: (dx / d) * speed,
          vy: (dy / d) * speed,
          mode: 'intercept',
        }
      }
    }
  }
  return patrolStep(enemy)
}

// Despacha segun el arquetipo.
export function stepEnemy(enemy, ctx = {}) {
  switch (enemy.type) {
    case 'chaser':  return chaseStep(enemy, ctx)
    case 'charger': return chargerStep(enemy, ctx)
    case 'shooter': return shooterStep(enemy, ctx)
    case 'lurker':  return lurkerStep(enemy, ctx)
    case 'warden':  return wardenStep(enemy, ctx)
    default:        return patrolStep(enemy)
  }
}

// Aplica dano a la vida. Devuelve la vida restante y si murio.
export function applyDamage(hp, dmg = 1) {
  const next = Math.max(0, (hp || 0) - (dmg || 0))
  return { hp: next, dead: next <= 0 }
}
