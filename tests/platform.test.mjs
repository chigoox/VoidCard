import assert from 'node:assert/strict'
import { loadData } from '../src/data/platform.js'

global.localStorage = {
  store: {},
  getItem(k) { return this.store[k] ?? null },
  setItem(k, v) { this.store[k] = String(v) },
  removeItem(k) { delete this.store[k] },
}

const data = loadData()
assert.ok(data.profiles)
assert.ok(Array.isArray(data.cart))
assert.equal(typeof data.cards, 'object')
console.log('platform.test passed')
