import test from 'node:test'
import assert from 'node:assert/strict'

import { ROOMS, isWall } from './topDownRooms.js'

test('health pickups appear once every three rooms on walkable tiles', () => {
  const pickupRooms = ROOMS.filter((room) => room.healthPickup)

  assert.deepEqual(
    pickupRooms.map((room) => room.order),
    [2, 5, 8]
  )

  for (const room of pickupRooms) {
    const { col, row } = room.healthPickup
    assert.ok(!isWall(room.map[row][col]), `${room.id} pickup tile must be walkable`)
  }
})
