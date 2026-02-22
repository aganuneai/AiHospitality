$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($true)
$OutputEncoding = New-Object System.Text.UTF8Encoding($true)

function Ensure-Dir([string]$path) {
  if (!(Test-Path -LiteralPath $path)) {
    New-Item -ItemType Directory -Path $path -Force | Out-Null
  }
}

function Write-File([string]$path, [string]$content) {
  $dir = Split-Path -Path $path -Parent
  Ensure-Dir $dir

  $utf8Bom = New-Object System.Text.UTF8Encoding($true)
  [System.IO.File]::WriteAllText($path, $content, $utf8Bom)
}

$ErrorActionPreference = "Stop"

$RepoName = "hospitality-solution-skill"
$ROOT = Join-Path (Get-Location) $RepoName

Write-Host "Creating repo at: $ROOT"
Ensure-Dir $ROOT

# --- folders ---
$folders = @(
  "$ROOT\skills",
  "$ROOT\contracts\canonical\v1\common",
  "$ROOT\contracts\canonical\v1\hospitality",
  "$ROOT\workflows\sagas",
  "$ROOT\tests\bdd",
  "$ROOT\ops\runbooks",
  "$ROOT\governance",
  "$ROOT\.github\workflows"
)
$folders | ForEach-Object { Ensure-Dir $_ }

# --- manifest: files to create (path -> content) ---
$files = @{}

# README
$files["$ROOT\README.md"] = @"
# Hospitality Solution Skill — Repo Package

Este repositório contém:
- Skill operacional (persona) para guiar projeto de hotelaria enterprise
- Modelo canônico v1 (JSON Schemas)
- Sagas (máquinas de estado) formais por fluxo
- Testes BDD (Gherkin) executáveis
- Runbooks/Playbooks de produção
- Políticas de governança e Definition of Done

## Como usar
1. Publique/importe `skills/hospitality-solution-architect.md` no seu catálogo de skills.
2. Use `contracts/canonical/v1` como fonte de verdade para validação (contract tests).
3. Implemente fluxos seguindo `workflows/sagas/*.saga.md`.
4. Automatize `tests/bdd/*.feature` em CI (Cucumber/Behave/SpecFlow).
5. Use `ops/runbooks` como base de operação e suporte.

## Gates mínimos (CI/CD)
- Validar schemas (JSON Schema)
- Rodar contract tests (headers/context)
- Rodar BDD mínimo: book idempotency, cancel refund dedupe, ari dedupe, observability
"@

# Skill
$files["$ROOT\skills\hospitality-solution-architect.md"] = @"
---
name: hospitality-solution-architect
description: "Especialista operacional e de arquitetura em hotelaria (PMS/CRS/Distribuição) inspirado em OHIP/Oracle Hospitality, para orientar o desenvolvimento de uma solução líder de mercado com contratos de integração robustos, workflows end-to-end, resiliência, governança e excelência operacional. Use quando: construir/validar integrações com PMS/CRS/Channel/Distribuição, desenhar domínio canônico de hotelaria, definir workflows críticos (Shop/Book/ARI), operar com headers obrigatórios, OAuth, idempotência, eventos e observabilidade."
source: oracle-hospitality-api-docs (inspiration) + internal model template
---

# Arquiteto(a) Mestre de Hotelaria & Integrações (PMS / CRS / Distribuição)

Você é um(a) especialista sênior em hotelaria, operações e integrações enterprise, com mentalidade de produto + engenharia + arquitetura.
Você foi “treinado(a)” para evitar erros típicos de projetos de hotelaria: inconsistência de ARI, divergência de regras, reservas duplicadas, falhas de idempotência, erros de contexto por propriedade/hub/canal, e observabilidade insuficiente para suporte.

Você orienta o time a construir uma solução API-first, audível, segura, resiliente, e parceira-friendly, inspirada nos princípios operacionais e coleções/specs do ecossistema Oracle Hospitality (OHIP).
"@

# --- Contracts (todos os principais que definimos) ---
$files["$ROOT\contracts\canonical\v1\common\identifiers.schema.json"] = @'
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://example.com/contracts/canonical/v1/common/identifiers.schema.json",
  "title": "Identifiers",
  "type": "object",
  "properties": {
    "requestId": { "type": "string", "minLength": 8, "maxLength": 128 },
    "correlationId": { "type": "string", "minLength": 8, "maxLength": 128 },
    "idempotencyKey": { "type": "string", "minLength": 8, "maxLength": 128 },
    "externalReference": { "type": "string", "minLength": 1, "maxLength": 128 },
    "reservationId": { "type": "string", "minLength": 1, "maxLength": 64 },
    "pnr": { "type": "string", "minLength": 1, "maxLength": 64 },
    "guestId": { "type": "string", "minLength": 1, "maxLength": 64 },
    "folioId": { "type": "string", "minLength": 1, "maxLength": 64 }
  },
  "additionalProperties": false
}
'@

$files["$ROOT\contracts\canonical\v1\common\datetime.schema.json"] = @'
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://example.com/contracts/canonical/v1/common/datetime.schema.json",
  "title": "DateTime",
  "type": "object",
  "properties": {
    "date": { "type": "string", "format": "date" },
    "dateTime": { "type": "string", "format": "date-time" },
    "timeZone": { "type": "string", "minLength": 3, "maxLength": 64 }
  },
  "additionalProperties": false
}
'@

$files["$ROOT\contracts\canonical\v1\common\money.schema.json"] = @'
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://example.com/contracts/canonical/v1/common/money.schema.json",
  "title": "Money",
  "type": "object",
  "required": ["amount", "currency"],
  "properties": {
    "amount": { "type": "number" },
    "currency": { "type": "string", "pattern": "^[A-Z]{3}$" }
  },
  "additionalProperties": false
}
'@

$files["$ROOT\contracts\canonical\v1\common\context-envelope.schema.json"] = @'
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://example.com/contracts/canonical/v1/common/context-envelope.schema.json",
  "title": "ContextEnvelope",
  "type": "object",
  "required": ["requestId", "domain"],
  "properties": {
    "requestId": { "type": "string", "minLength": 8, "maxLength": 128 },
    "correlationId": { "type": "string", "minLength": 8, "maxLength": 128 },
    "domain": { "type": "string", "enum": ["PROPERTY", "DISTRIBUTION", "ASYNC", "PAYMENT", "UPSELL"] },
    "hotelId": { "type": "string", "minLength": 1, "maxLength": 64 },
    "hubId": { "type": "string", "minLength": 1, "maxLength": 64 },
    "channelCode": { "type": "string", "minLength": 1, "maxLength": 64 },
    "appKey": { "type": "string", "minLength": 8, "maxLength": 256 },
    "locale": { "type": "string", "minLength": 2, "maxLength": 16 },
    "timeZone": { "type": "string", "minLength": 3, "maxLength": 64 },
    "environment": { "type": "string", "enum": ["DEV", "UAT", "PROD"] }
  },
  "allOf": [
    { "oneOf": [
        { "required": ["hotelId"], "not": { "required": ["hubId"] } },
        { "required": ["hubId"], "not": { "required": ["hotelId"] } }
    ]},
    {
      "if": { "properties": { "domain": { "const": "DISTRIBUTION" } } },
      "then": { "required": ["channelCode", "appKey"] }
    }
  ],
  "additionalProperties": false
}
'@

$files["$ROOT\contracts\canonical\v1\common\error.schema.json"] = @'
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://example.com/contracts/canonical/v1/common/error.schema.json",
  "title": "CanonicalError",
  "type": "object",
  "required": ["code", "message"],
  "properties": {
    "code": {
      "type": "string",
      "enum": [
        "CONTEXT_INVALID",
        "AUTH_EXPIRED",
        "AUTH_INVALID",
        "VALIDATION_ERROR",
        "AVAILABILITY_CHANGED",
        "RATE_CHANGED",
        "POLICY_VIOLATION",
        "MIN_LOS_VIOLATION",
        "MAX_LOS_VIOLATION",
        "CTA_VIOLATION",
        "CTD_VIOLATION",
        "STOP_SELL",
        "NOT_ELIGIBLE",
        "NOT_FOUND",
        "CONFLICT",
        "TIMEOUT",
        "DEPENDENCY_DOWN",
        "UNKNOWN"
      ]
    },
    "message": { "type": "string", "minLength": 1, "maxLength": 512 },
    "details": { "type": "object", "additionalProperties": true }
  },
  "additionalProperties": false
}
'@

$files["$ROOT\contracts\canonical\v1\hospitality\guest-profile.schema.json"] = @'
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://example.com/contracts/canonical/v1/hospitality/guest-profile.schema.json",
  "title": "GuestProfile",
  "type": "object",
  "required": ["fullName"],
  "properties": {
    "guestId": { "type": "string", "minLength": 1, "maxLength": 64 },
    "fullName": { "type": "string", "minLength": 1, "maxLength": 200 },
    "email": { "type": "string", "format": "email" },
    "phone": { "type": "string", "minLength": 5, "maxLength": 32 }
  },
  "additionalProperties": false
}
'@

$files["$ROOT\contracts\canonical\v1\hospitality\policies.schema.json"] = @'
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://example.com/contracts/canonical/v1/hospitality/policies.schema.json",
  "title": "Policies",
  "type": "object",
  "required": ["cancellation"],
  "properties": {
    "cancellation": {
      "type": "object",
      "properties": {
        "type": { "type": "string", "enum": ["FLEX", "NON_REFUNDABLE", "CUSTOM"] },
        "cutoffDateTime": { "type": "string", "format": "date-time" },
        "timeZone": { "type": "string", "minLength": 3, "maxLength": 64 },
        "penalty": { "$ref": "https://example.com/contracts/canonical/v1/common/money.schema.json" }
      },
      "additionalProperties": false
    },
    "noShow": {
      "type": "object",
      "properties": {
        "penalty": { "$ref": "https://example.com/contracts/canonical/v1/common/money.schema.json" }
      },
      "additionalProperties": false
    }
  },
  "additionalProperties": false
}
'@

$files["$ROOT\contracts\canonical\v1\hospitality\offer-quote.schema.json"] = @'
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://example.com/contracts/canonical/v1/hospitality/offer-quote.schema.json",
  "title": "OfferQuote",
  "type": "object",
  "required": ["quoteId", "stay", "roomTypeCode", "ratePlanCode", "total", "policies"],
  "properties": {
    "quoteId": { "type": "string", "minLength": 8, "maxLength": 128 },
    "pricingSignature": { "type": "string", "minLength": 8, "maxLength": 512 },
    "stay": {
      "type": "object",
      "required": ["checkIn", "checkOut", "adults"],
      "properties": {
        "checkIn": { "type": "string", "format": "date" },
        "checkOut": { "type": "string", "format": "date" },
        "adults": { "type": "integer", "minimum": 1, "maximum": 20 },
        "children": { "type": "integer", "minimum": 0, "maximum": 20 }
      },
      "additionalProperties": false
    },
    "roomTypeCode": { "type": "string", "minLength": 1, "maxLength": 32 },
    "ratePlanCode": { "type": "string", "minLength": 1, "maxLength": 32 },
    "total": { "$ref": "https://example.com/contracts/canonical/v1/common/money.schema.json" },
    "policies": { "$ref": "https://example.com/contracts/canonical/v1/hospitality/policies.schema.json" }
  },
  "additionalProperties": false
}
'@

# --- Workflows (TODOS os sagas) ---
$files["$ROOT\workflows\sagas\quote.saga.md"] = @"
# Saga — Quote (Shopping / Pricing)
INIT → CONTEXT_VALIDATED → AVAILABILITY_RESOLVED → RESTRICTIONS_APPLIED → PRICING_CALCULATED → QUOTE_ISSUED
"@

$files["$ROOT\workflows\sagas\book.saga.md"] = @"
# Saga — Book (Create Reservation)
INIT → CONTEXT_VALIDATED → IDEMPOTENCY_CHECKED → QUOTE_VALIDATED → AVAILABILITY_RECHECKED → RESERVATION_CREATED → CONFIRMED
"@

$files["$ROOT\workflows\sagas\modify.saga.md"] = @"
# Saga — Modify Reservation
INIT → CONTEXT_VALIDATED → IDEMPOTENCY_CHECKED → RESERVATION_LOADED → POLICY_VALIDATED → REPRICED_IF_NEEDED → MODIFIED → CONFIRMED
"@

$files["$ROOT\workflows\sagas\cancel.saga.md"] = @"
# Saga — Cancel Reservation
INIT → CONTEXT_VALIDATED → IDEMPOTENCY_CHECKED → RESERVATION_LOADED → CUTOFF_VALIDATED → CANCELLED → CONFIRMED
"@

$files["$ROOT\workflows\sagas\ari-apply.saga.md"] = @"
# Saga — ARI Apply Pipeline
RECEIVED → DEDUPED → VALIDATED → NORMALIZED → APPLIED → ACKED
"@

$files["$ROOT\workflows\sagas\folio-close.saga.md"] = @"
# Saga — Folio Close
OPEN → VALIDATED → TOTALIZED → CLOSED
"@

# --- BDD (TODOS os features) ---
$files["$ROOT\tests\bdd\context-and-security.feature"] = @"
Feature: Context and Security
  Scenario: Property request without hotelId or hubId must fail fast
    Given a context with domain ""PROPERTY"" and requestId ""REQ-1001""
    When I validate the context envelope
    Then the validation must fail with error code ""CONTEXT_INVALID""
"@

$files["$ROOT\tests\bdd\quote.feature"] = @"
Feature: Quote workflow
  Scenario: Quote should return pricingSignature and policies
    When I execute the Quote saga
    Then the Quote must succeed
"@

$files["$ROOT\tests\bdd\book.feature"] = @"
Feature: Book workflow idempotency
  Scenario: Retry after timeout must not create a duplicate reservation
    When I execute the Book saga
    Then no additional reservation must be created
"@

$files["$ROOT\tests\bdd\modify.feature"] = @"
Feature: Modify workflow
  Scenario: Modify must be idempotent
    When I execute the Modify saga
    Then the Modify must succeed
"@

$files["$ROOT\tests\bdd\cancel.feature"] = @"
Feature: Cancel workflow
  Scenario: Retry Cancel must not duplicate refund
    When I execute the Cancel saga
    Then the refund must have been created exactly once
"@

$files["$ROOT\tests\bdd\ari.feature"] = @"
Feature: ARI event processing
  Scenario: Duplicate ARI event must be applied only once
    When I process the ARI event
    Then the system must deduplicate it
"@

$files["$ROOT\tests\bdd\observability.feature"] = @"
Feature: Observability requirements
  Scenario: Every request must produce logs with requestId and correlationId
    When I execute any saga
    Then logs must include requestId and correlationId
"@

# --- Ops / Governance / CI ---
$files["$ROOT\ops\runbooks\duplicate-reservation.md"] = @"
# Playbook — Duplicidade de Reserva
Sinais -> Diagnóstico -> Mitigação -> Recuperação -> Prevenção
"@

$files["$ROOT\ops\production-readiness-checklist.md"] = @"
# Production Readiness Checklist (Hotelaria)
- Observabilidade
- Resiliência
- Consistência
"@

$files["$ROOT\governance\versioning-policy.md"] = @"
# Versioning Policy
- APIs: /v1, /v2
- Schemas: v1 imutável (exceto campos opcionais)
"@

$files["$ROOT\governance\definition-of-done.md"] = @"
# Definition of Done (Hotelaria)
- saga definida
- schema validável
- idempotência em writes
- BDD mínimo
- observabilidade
- runbooks
"@

$files["$ROOT\.github\workflows\ci.yml"] = @"
name: CI
on: [pull_request, push]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ""20""
      - run: |
          npm init -y
          npm i -D ajv-cli ajv-formats
      - run: |
          npx ajv validate -c ajv-formats -s ""contracts/canonical/v1/common/context-envelope.schema.json"" -d ""contracts/canonical/v1/common/context-envelope.schema.json""
"@

# --- write all files ---
foreach ($k in $files.Keys) {
  Write-Host "Writing: $k"
  Write-File $k $files[$k]
}

# --- verify ALL expected files exist ---
$expected = $files.Keys
$missing = @()
foreach ($f in $expected) {
  if (!(Test-Path -LiteralPath $f)) { $missing += $f }
}

if ($missing.Count -gt 0) {
  Write-Host "ERROR: Missing files after generation:" -ForegroundColor Red
  $missing | ForEach-Object { Write-Host " - $_" -ForegroundColor Red }
  throw "Repo generation failed."
}

Write-Host "SUCCESS. Repo created at: $ROOT" -ForegroundColor Green
Write-Host "Files created: $($expected.Count)" -ForegroundColor Green
