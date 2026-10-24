import test from 'node:test'
import assert from 'node:assert/strict'

import lives, { MAX_LIVES } from './lives.js'

test('gain restores one life without exceeding the maximum', () => {
  lives.reset()
  lives.lose()
  lives.lose()

  assert.equal(lives.gain(), 2)
  assert.equal(lives.gain(), MAX_LIVES)
  assert.equal(lives.gain(), MAX_LIVES)

  lives.reset()
})
