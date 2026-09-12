$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$distPath = Join-Path $projectRoot 'dist'
$zipPath = Join-Path $projectRoot 'mercenary-defense-itch.zip'

& node (Join-Path $PSScriptRoot 'build-itch.js')
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

if (Test-Path -LiteralPath $zipPath) {
  Remove-Item -LiteralPath $zipPath -Force
}

Compress-Archive -Path (Join-Path $distPath '*') -DestinationPath $zipPath -CompressionLevel Optimal
$fileCount = (Get-ChildItem -LiteralPath $distPath -Recurse -File).Count
$size = (Get-Item -LiteralPath $zipPath).Length
Write-Output "Created $zipPath ($fileCount files, $size bytes)"
