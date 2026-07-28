param(
  [string]$EnvFile = ".env.production"
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

if (-not (Test-Path -LiteralPath $EnvFile)) {
  throw "Arquivo $EnvFile nao encontrado."
}

$directUrl = Get-DotenvValue -Path $EnvFile -Name "DIRECT_URL"

if (-not $directUrl -or $directUrl -match "usuario:senha|host\.neon") {
  throw "DIRECT_URL nao esta configurada corretamente em $EnvFile."
}

$env:DIRECT_URL = $directUrl

try {
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
} finally {
  Remove-Item Env:\DIRECT_URL -ErrorAction SilentlyContinue
}
