export const MAX_LIVES = 3
export const INVULNERABLE_MS = 1200

const lives = {
  current: MAX_LIVES,

  reset() {
    this.current = MAX_LIVES
  },

  lose() {
    this.current = Math.max(0, this.current - 1)
    return this.current
  },

  get remaining() {
    return this.current
  },
}

export default lives