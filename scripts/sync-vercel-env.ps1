#!/usr/bin/env pwsh
# Syncs missing env vars from apps/web/.env.local to Vercel production.
# Also pushes OPENAI_API_KEY from IconMaker-Agent if not present.
# Skips: any key already set in Vercel, NEXT_PUBLIC_BUNNY_CDN_ENABLED toggles,
# Vercel-injected runtime vars, and test-only credentials.

$ErrorActionPreference = "Stop"

$existing = @(
  "E2E_PUBLIC_USERNAME","VERCEL_TEAM_ID","VERCEL_PROJECT_ID","EMAIL_FROM","RESEND_FROM",
  "STRIPE_WEBHOOK_SECRET","STRIPE_SECRET_KEY","SUPABASE_COOKIE_DOMAIN","SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_BUNNY_CDN_HOST","NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY","NEXT_PUBLIC_COOKIE_DOMAIN",
  "NEXT_PUBLIC_SHORT_DOMAIN","NEXT_PUBLIC_SITE_URL","NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SUPABASE_URL"
)
# These are set automatically by Vercel; never push.
$blocked = @(
  "VERCEL","VERCEL_ENV","VERCEL_URL","VERCEL_OIDC_TOKEN","VERCEL_TARGET_ENV",
  "NX_DAEMON","TURBO_CACHE","TURBO_DOWNLOAD_LOCAL_ENABLED","TURBO_REMOTE_ONLY","TURBO_RUN_SUMMARY",
  # Test-only — not needed in production runtime
  "SUPABASE_TEST_EMAIL","SUPABASE_TEST_PASSWORD","E2E_API_KEY"
)

function Parse-EnvFile($path) {
  $map = @{}
  Get-Content $path | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#")) { return }
    $eq = $line.IndexOf("=")
    if ($eq -lt 1) { return }
    $key = $line.Substring(0, $eq).Trim()
    $val = $line.Substring($eq + 1).Trim()
    # Strip surrounding quotes
    if (($val.StartsWith('"') -and $val.EndsWith('"')) -or
        ($val.StartsWith("'") -and $val.EndsWith("'"))) {
      $val = $val.Substring(1, $val.Length - 2)
    }
    $map[$key] = $val
  }
  return $map
}

$envLocal = Parse-EnvFile "apps/web/.env.local"

# Pull OpenAI key from IconMaker-Agent
$iconMaker = Parse-EnvFile "C:\Users\Billions\Documents\GitHub\IconMaker-Agent\.env.local"
if ($iconMaker.ContainsKey("OPENAI_API_KEY")) {
  $envLocal["OPENAI_API_KEY"] = $iconMaker["OPENAI_API_KEY"]
}
# Default model for our code
if (-not $envLocal.ContainsKey("OPENAI_IMAGE_MODEL")) {
  $envLocal["OPENAI_IMAGE_MODEL"] = "gpt-image-1"
}

$pushed = @()
$skipped = @()
foreach ($key in ($envLocal.Keys | Sort-Object)) {
  if ($existing -contains $key) { $skipped += "$key (already set)"; continue }
  if ($blocked -contains $key) { $skipped += "$key (blocked)"; continue }
  $value = $envLocal[$key]
  if (-not $value) { $skipped += "$key (empty)"; continue }
  Write-Host "→ Adding $key" -ForegroundColor Cyan
  $tmpFile = [System.IO.Path]::GetTempFileName()
  try {
    [System.IO.File]::WriteAllText($tmpFile, $value)
    Push-Location "apps/web"
    Get-Content $tmpFile -Raw | vercel env add $key production 2>&1 | Out-Null
    Pop-Location
    $pushed += $key
  } catch {
    Write-Host "  ✗ Failed: $_" -ForegroundColor Red
  } finally {
    Remove-Item $tmpFile -ErrorAction SilentlyContinue
  }
}

Write-Host ""
Write-Host "=== SUMMARY ===" -ForegroundColor Green
Write-Host "Pushed ($($pushed.Count)): $($pushed -join ', ')"
Write-Host "Skipped ($($skipped.Count)):"
$skipped | ForEach-Object { Write-Host "  $_" }
