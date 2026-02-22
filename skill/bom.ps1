$ErrorActionPreference = "Stop"

$root = Join-Path (Get-Location) "hospitality-solution-skill"
if (!(Test-Path $root)) { throw "Não achei a pasta: $root" }

$backupRoot = Join-Path (Get-Location) "hospitality-solution-skill_backup_detect_fix"
New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null

$utf8Bom = New-Object System.Text.UTF8Encoding($true)

# Encodings candidates
$encUtf8   = [System.Text.Encoding]::UTF8
$enc1252   = [System.Text.Encoding]::GetEncoding(1252)      # Windows-1252
$encLatin1 = [System.Text.Encoding]::GetEncoding("iso-8859-1")

# Patterns típicos de mojibake (pode ajustar)
$badPatterns = @(
  "Ã", "Â", "â€™", "â€œ", "â€\x9d", "â€“", "â€”", "â€¦", "â€", "�"
)

function Count-BadTokens([string]$s) {
  $c = 0
  foreach ($p in $badPatterns) {
    $matches = [regex]::Matches($s, $p)
    $c += $matches.Count
  }
  return $c
}

function Count-AccentChars([string]$s) {
  # Conta caracteres que queremos preservar (aprox)
  # inclui letras com diacríticos e cedilha (maiúsculas e minúsculas)
  $m = [regex]::Matches($s, "[\u00C0-\u00FF]")
  return $m.Count
}

function Score-Text([string]$s) {
  # score menor é melhor
  # penaliza tokens ruins e replacement char
  # dá um pequeno "bônus" se existir acentuação normal (para evitar “corrigir” e perder)
  $bad = Count-BadTokens $s
  $acc = Count-AccentChars $s
  # Quanto mais acento real, melhor (reduz score um pouco)
  return ($bad * 10) - [Math]::Min($acc, 200)
}

function Try-Fix([string]$text, [System.Text.Encoding]$fromEnc, [System.Text.Encoding]$toEnc) {
  # Interpreta $text como se estivesse em $fromEnc e converte para $toEnc
  # Exemplo clássico:
  #   text contém "aÃ§Ã£o"
  #   tratar como bytes CP1252 e ler como UTF-8 -> "ação"
  $bytes = $fromEnc.GetBytes($text)
  return $toEnc.GetString($bytes)
}

# Estratégias (candidatas) para tentar por arquivo
# Cada item: Name, FixFn
$strategies = @(
  @{ Name = "cp1252->utf8";   Fn = { param($t) Try-Fix $t $enc1252 $encUtf8 } },
  @{ Name = "latin1->utf8";   Fn = { param($t) Try-Fix $t $encLatin1 $encUtf8 } },

  # Alguns casos: smart quotes e travessões viram sequências â€™ etc.
  # geralmente resolvem com cp1252->utf8, mas mantemos variações

  # Double-pass (às vezes o arquivo foi “quebrado” duas vezes)
  @{ Name = "cp1252->utf8 x2"; Fn = { param($t)
      $x = Try-Fix $t $enc1252 $encUtf8
      Try-Fix $x $enc1252 $encUtf8
    }
  },
  @{ Name = "latin1->utf8 x2"; Fn = { param($t)
      $x = Try-Fix $t $encLatin1 $encUtf8
      Try-Fix $x $encLatin1 $encUtf8
    }
  }
)

# Arquivos alvo
$files = Get-ChildItem -Path $root -Recurse -File |
  Where-Object { $_.Extension -in ".md",".feature",".yml",".yaml",".json",".txt" }

$report = New-Object System.Collections.Generic.List[object]
$changed = 0

foreach ($f in $files) {
  $path = $f.FullName

  # Lê texto com detecção de BOM
  $original = [System.IO.File]::ReadAllText($path)

  $origScore = Score-Text $original

  # se não tem nenhum sinal, pula
  if ($original -notmatch "Ã|Â|â|�") {
    $report.Add([pscustomobject]@{
      File = $path
      Action = "skip"
      OriginalScore = $origScore
      BestScore = $origScore
      Strategy = ""
      Notes = "no obvious mojibake markers"
    })
    continue
  }

  $bestText = $original
  $bestScore = $origScore
  $bestName = ""

  foreach ($s in $strategies) {
    try {
      $candidate = & $s.Fn $original
      $candScore = Score-Text $candidate

      # aceita se melhora de forma significativa
      if ($candScore -lt $bestScore) {
        $bestScore = $candScore
        $bestText = $candidate
        $bestName = $s.Name
      }
    } catch {
      # ignora falhas
    }
  }

  if ($bestName -ne "" -and $bestText -ne $original) {
    # Backup com estrutura
    $rel = $path.Substring($root.Length).TrimStart('\')
    $backupPath = Join-Path $backupRoot $rel
    $backupDir = Split-Path $backupPath -Parent
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
    Copy-Item -LiteralPath $path -Destination $backupPath -Force

    # Grava UTF-8 BOM
    [System.IO.File]::WriteAllText($path, $bestText, $utf8Bom)
    $changed++

    $report.Add([pscustomobject]@{
      File = $path
      Action = "fixed"
      OriginalScore = $origScore
      BestScore = $bestScore
      Strategy = $bestName
      Notes = "backup saved"
    })
  } else {
    $report.Add([pscustomobject]@{
      File = $path
      Action = "no_change"
      OriginalScore = $origScore
      BestScore = $bestScore
      Strategy = ""
      Notes = "no strategy improved score"
    })
  }
}

# Salva relatório CSV
$csvPath = Join-Path (Get-Location) "encoding_fix_report.csv"
$report | Export-Csv -Path $csvPath -NoTypeInformation -Encoding UTF8

Write-Host "Concluído."
Write-Host "Arquivos corrigidos: $changed"
Write-Host "Backup em: $backupRoot"
Write-Host "Relatório: $csvPath"

# Pós-verificação rápida: mostra arquivos ainda com padrões ruins
Write-Host "`nArquivos que ainda contêm padrões suspeitos (Ã/Â/â/�):"
Select-String -Path (Join-Path $root "**\*.*") -Pattern "Ã|Â|â|�" -List -ErrorAction SilentlyContinue |
  ForEach-Object { $_.Path } |
  Select-Object -Unique
