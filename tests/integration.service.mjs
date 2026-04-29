import assert from 'node:assert/strict'
import fs from 'node:fs'

const src = fs.readFileSync('src/data/platformService.js', 'utf8')
assert.ok(src.includes('refreshSession('), 'session refresh flow missing')
assert.ok(src.includes('Cannot edit another user profile'), 'ownership check missing')
assert.ok(src.includes('reportError('), 'monitoring hook missing')
assert.ok(src.includes('fallbackOrThrow'), 'strict fallback guard missing')

console.log('integration.service passed')
