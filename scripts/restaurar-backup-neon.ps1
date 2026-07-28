param(
  [string]$EnvFile = ".env.production",
  [string]$BackupFile = "backups/app_db_local.dump",
  [switch]$ConfirmRestore
)

$ErrorActionPreference = "Stop"

function Get-DotenvValue {
  param(
    [string]$Path,
    [string]$Name
  )

  $line = Get-Content -LiteralPath $Path |
    Where-Object { $_ -match "^\s*$Name\s*=" } |
    Select-Object -First 1

  if (-not $line) {
    return $null
  }

  $value = ($line -replace "^\s*$Name\s*=", "").Trim()

  if (
    ($value.StartsWith('"') -and $value.EndsWith('"')) -or
    ($value.StartsWith("'") -and $value.EndsWith("'"))
  ) {
    $value = $value.Substring(1, $value.Length - 2)
  }

  return $value
}

if (-not $ConfirmRestore) {
  throw "Use -ConfirmRestore para confirmar a restauracao. Isso substitui objetos existentes no banco Neon informado em DIRECT_URL."
}

if (-not (Test-Path -LiteralPath $EnvFile)) {
  throw "Arquivo $EnvFile nao encontrado."
}

if (-not (Test-Path -LiteralPath $BackupFile)) {
  throw "Backup $BackupFile nao encontrado."
}

$directUrl = Get-DotenvValue -Path $EnvFile -Name "DIRECT_URL"

if (-not $directUrl -or $directUrl -match "usuario:senha|host\.neon") {
  throw "DIRECT_URL nao esta configurada corretamente em $EnvFile."
}

$backupPath = Resolve-Path -LiteralPath $BackupFile
$backupDir = Split-Path -Parent $backupPath.Path
$backupName = Split-Path -Leaf $backupPath.Path

$env:DIRECT_URL = $directUrl

try {
  Write-Host "Restaurando backup no Neon..."

  $restoreCommand = "pg_restore --clean --if-exists --no-owner --no-acl --dbname=`"`$DIRECT_URL`" /backups/$backupName"

  docker run --rm `
    -e DIRECT_URL `
    -v "${backupDir}:/backups" `
    postgres:17 `
    sh -c $restoreCommand

  Write-Host "Conferindo totais restaurados..."

  $countSql = @"
SELECT 'empresas' AS tabela, count(*) FROM empresas
UNION ALL SELECT 'usuarios', count(*) FROM usuarios
UNION ALL SELECT 'clientes', count(*) FROM clientes
UNION ALL SELECT 'servicos', count(*) FROM servicos
UNION ALL SELECT 'notas_servico', count(*) FROM notas_servico
UNION ALL SELECT 'eventos_fiscais', count(*) FROM notas_servico_eventos_fiscais
UNION ALL SELECT 'configuracoes_fiscais', count(*) FROM configuracoes_fiscais_empresas
ORDER BY tabela;
"@

  docker run --rm `
    -e DIRECT_URL `
    postgres:17 `
    psql $env:DIRECT_URL -c $countSql

  Write-Host "Restauracao concluida."
} finally {
  Remove-Item Env:\DIRECT_URL -ErrorAction SilentlyContinue
}
