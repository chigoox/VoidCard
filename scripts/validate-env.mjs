const required = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_REQUIRE_SUPABASE',
]

const missing = required.filter((key) => !process.env[key])
if (missing.length) {
  console.error('Missing required env vars:', missing.join(', '))
  process.exit(1)
}

if (process.env.VITE_REQUIRE_SUPABASE !== 'true') {
  console.error('VITE_REQUIRE_SUPABASE must be true for production launch readiness.')
  process.exit(1)
}

console.log('env validation passed')
