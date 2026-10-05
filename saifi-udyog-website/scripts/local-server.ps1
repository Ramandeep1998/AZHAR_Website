# Local-only static file server (no npm/npx/curl). Bound to 127.0.0.1 only.
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$port = 8080
$prefix = "http://127.0.0.1:$port/"

$mime = @{
  '.html' = 'text/html; charset=utf-8'
  '.css'  = 'text/css; charset=utf-8'
  '.js'   = 'application/javascript; charset=utf-8'
  '.json' = 'application/json'
  '.svg'  = 'image/svg+xml'
  '.png'  = 'image/png'
  '.jpg'  = 'image/jpeg'
  '.jpeg' = 'image/jpeg'
  '.webp' = 'image/webp'
  '.ico'  = 'image/x-icon'
  '.woff' = 'font/woff'
  '.woff2'= 'font/woff2'
  '.map'  = 'application/json'
}

function Resolve-LocalFile([string]$urlPath) {
  if ([string]::IsNullOrWhiteSpace($urlPath) -or $urlPath -eq '/') {
    $urlPath = '/index.html'
  }
  $rel = [Uri]::UnescapeDataString($urlPath).TrimStart('/').Replace('/', [IO.Path]::DirectorySeparatorChar)
  if ([string]::IsNullOrWhiteSpace($rel)) { $rel = 'index.html' }

  $candidate = [IO.Path]::GetFullPath((Join-Path $root $rel))
  if (-not $candidate.StartsWith($root, [StringComparison]::OrdinalIgnoreCase)) { return $null }

  if (Test-Path -LiteralPath $candidate -PathType Container) {
    $index = Join-Path $candidate 'index.html'
    if (Test-Path -LiteralPath $index -PathType Leaf) { return $index }
    return $null
  }

  if (Test-Path -LiteralPath $candidate -PathType Leaf) { return $candidate }

  $htmlTry = $candidate + '.html'
  if (Test-Path -LiteralPath $htmlTry -PathType Leaf) { return $htmlTry }

  return $null
}

$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add($prefix)
try {
  $listener.Start()
} catch {
  Write-Host "Could not bind $prefix - is another process using port $port?"
  throw
}

Write-Host "LISTENING $prefix"
Write-Host "Root: $root"
Write-Host ('Admin: ' + $prefix + 'admin/')

while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  try {
    $file = Resolve-LocalFile $ctx.Request.Url.AbsolutePath
    if (-not $file) {
      $ctx.Response.StatusCode = 404
      $bytes = [Text.Encoding]::UTF8.GetBytes('Not found')
      $ctx.Response.ContentType = 'text/plain; charset=utf-8'
      $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $ext = [IO.Path]::GetExtension($file).ToLowerInvariant()
      $ctx.Response.StatusCode = 200
      $ctx.Response.ContentType = $(if ($mime.ContainsKey($ext)) { $mime[$ext] } else { 'application/octet-stream' })
      $bytes = [IO.File]::ReadAllBytes($file)
      $ctx.Response.ContentLength64 = $bytes.Length
      $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    }
  } catch {
    try { $ctx.Response.StatusCode = 500 } catch { }
  } finally {
    try { $ctx.Response.Close() } catch { }
  }
}
