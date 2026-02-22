$ErrorActionPreference = "Stop"

$root = Join-Path (Get-Location) "utf8-test"
New-Item -ItemType Directory -Path $root -Force | Out-Null

$utf8Bom = New-Object System.Text.UTF8Encoding($true)
$path = Join-Path $root "teste.txt"

# texto com acentos e cedilha
$content = "Acentuação: ação, coração, informação, São Paulo, maçã, açúcar, João, ç Ç ã Ã õ Õ ê Ê"

[System.IO.File]::WriteAllText($path, $content, $utf8Bom)

Write-Host "Arquivo criado em: $path"
Write-Host "Conteúdo lido:"
Get-Content $path
