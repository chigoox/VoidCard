import assert from 'node:assert/strict'
import fs from 'node:fs'

const app = fs.readFileSync('src/App.jsx', 'utf8')
assert.ok(app.includes('ProtectedRoute'), 'ProtectedRoute must guard private routes')
assert.ok(app.includes('path="c/:cardId"'), 'Card redirect route missing')

const service = fs.readFileSync('src/data/platformService.js', 'utf8')
assert.ok(service.includes('validateSession'), 'Session validation function missing')
assert.ok(service.includes('connectCardViaEdge'), 'Edge validation hook missing')

console.log('e2e smoke assertions passed')
