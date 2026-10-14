const timer = {
  totalMs: 0,
  currentLevel: null,
  levelStart: null,
  levelAccum: 0,

  resetAll() {
    this.totalMs = 0
    this.currentLevel = null
    this.levelStart = null
    this.levelAccum = 0
  },

  startLevel(key) {
    if (this.currentLevel !== null && this.currentLevel !== key) {
      this.totalMs += this.levelElapsed()
    }
    this.currentLevel = key
    this.levelStart = performance.now()
    this.levelAccum = 0
  },

  levelElapsed() {
    if (this.levelStart === null) return this.levelAccum
    return this.levelAccum + (performance.now() - this.levelStart)
  },

  pause() {
    if (this.levelStart !== null) {
      this.levelAccum += performance.now() - this.levelStart
      this.levelStart = null
    }
  },

  resume() {
    if (this.levelStart === null && this.currentLevel !== null) {
      this.levelStart = performance.now()
    }
  },

  finish() {
    if (this.currentLevel !== null) {
      this.totalMs += this.levelElapsed()
      this.currentLevel = null
      this.levelStart = null
      this.levelAccum = 0
    }
    return this.totalMs
  },

  format(ms) {
    const totalSec = Math.floor(ms / 1000)
    const min = Math.floor(totalSec / 60)
    const sec = totalSec % 60
    const tenths = Math.floor((ms % 1000) / 100)
    return `${min}:${String(sec).padStart(2, '0')}.${tenths}`
  },
}

export default timer