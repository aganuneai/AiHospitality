## Passo 1 — Modelo Canônico (JSON Schemas) v1

A seguir está um **Modelo Canônico Mínimo Viável (MVM)** em **JSON Schema (draft 2020-12)** para sustentar os workflows críticos: **Shop/Quote → Book → Modify/Cancel → ARI Events → Folio**.

> Objetivo: padronizar contratos internos/externos (adapters) e permitir validação automática (contract tests) + evolução com compatibilidade.

---

### Estrutura recomendada no repositório

```
/contracts/canonical/v1/
  common/
    context-envelope.schema.json
    money.schema.json
    datetime.schema.json
    identifiers.schema.json
    error.schema.json
  hospitality/
    guest-profile.schema.json
    offer-quote.schema.json
    reservation.schema.json
    ari-event.schema.json
    folio.schema.json
```

---

## 1) Common Schemas

### 'common/identifiers.schema.json'

```json
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
```

### 'common/datetime.schema.json'

```json
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
```

### 'common/money.schema.json'

```json
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
```

### 'common/context-envelope.schema.json'

> **Regra:** 'hotelId' XOR 'hubId' (mutuamente exclusivos).
> 'channelCode'/'appKey' obrigatórios quando o contexto for distribuição.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://example.com/contracts/canonical/v1/common/context-envelope.schema.json",
  "title": "ContextEnvelope",
  "type": "object",
  "required": ["requestId", "domain"],
  "properties": {
    "requestId": { "type": "string", "minLength": 8, "maxLength": 128 },
    "correlationId": { "type": "string", "minLength": 8, "maxLength": 128 },
    "domain": {
      "type": "string",
      "enum": ["PROPERTY", "DISTRIBUTION", "ASYNC", "PAYMENT", "UPSELL"]
    },
    "hotelId": { "type": "string", "minLength": 1, "maxLength": 64 },
    "hubId": { "type": "string", "minLength": 1, "maxLength": 64 },
    "channelCode": { "type": "string", "minLength": 1, "maxLength": 64 },
    "appKey": { "type": "string", "minLength": 8, "maxLength": 256 },
    "locale": { "type": "string", "minLength": 2, "maxLength": 16 },
    "timeZone": { "type": "string", "minLength": 3, "maxLength": 64 },
    "environment": { "type": "string", "enum": ["DEV", "UAT", "PROD"] }
  },
  "allOf": [
    {
      "oneOf": [
        { "required": ["hotelId"], "not": { "required": ["hubId"] } },
        { "required": ["hubId"], "not": { "required": ["hotelId"] } }
      ]
    },
    {
      "if": { "properties": { "domain": { "const": "DISTRIBUTION" } } },
      "then": { "required": ["channelCode", "appKey"] }
    }
  ],
  "additionalProperties": false
}
```

### 'common/error.schema.json'

```json
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
```

---

## 2) Hospitality Schemas

### 'hospitality/guest-profile.schema.json'

```json
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
    "phone": { "type": "string", "minLength": 5, "maxLength": 32 },
    "document": {
      "type": "object",
      "properties": {
        "type": { "type": "string", "minLength": 1, "maxLength": 32 },
        "number": { "type": "string", "minLength": 1, "maxLength": 64 },
        "country": { "type": "string", "pattern": "^[A-Z]{2}$" }
      },
      "required": ["type", "number"],
      "additionalProperties": false
    },
    "preferences": {
      "type": "object",
      "properties": {
        "language": { "type": "string", "minLength": 2, "maxLength": 16 },
        "smoking": { "type": "boolean" },
        "bedType": { "type": "string", "minLength": 1, "maxLength": 32 }
      },
      "additionalProperties": true
    }
  },
  "additionalProperties": false
}
```

---

### 'hospitality/offer-quote.schema.json'

> Usado em **Shopping/Quote**. Mantém coerência "quote→book" via 'quoteId' e 'pricingSignature'.

```json
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
    "dailyRates": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["date", "base", "taxes", "fees", "total"],
        "properties": {
          "date": { "type": "string", "format": "date" },
          "base": { "$ref": "https://example.com/contracts/canonical/v1/common/money.schema.json" },
          "taxes": { "$ref": "https://example.com/contracts/canonical/v1/common/money.schema.json" },
          "fees": { "$ref": "https://example.com/contracts/canonical/v1/common/money.schema.json" },
          "total": { "$ref": "https://example.com/contracts/canonical/v1/common/money.schema.json" }
        },
        "additionalProperties": false
      }
    },
    "total": { "$ref": "https://example.com/contracts/canonical/v1/common/money.schema.json" },
    "policies": {
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
  },
  "additionalProperties": false
}
```

---

### 'hospitality/reservation.schema.json'

> Um único schema com **requests/responses** para Book/Modify/Cancel, mantendo padrões de idempotência.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://example.com/contracts/canonical/v1/hospitality/reservation.schema.json",
  "title": "Reservation Contracts",
  "type": "object",
  "oneOf": [
    { "$ref": "#/$defs/ReservationCreateRequest" },
    { "$ref": "#/$defs/ReservationCreateResponse" },
    { "$ref": "#/$defs/ReservationModifyRequest" },
    { "$ref": "#/$defs/ReservationCancelRequest" },
    { "$ref": "#/$defs/ReservationView" }
  ],
  "$defs": {
    "ReservationStatus": {
      "type": "string",
      "enum": ["PENDING", "CONFIRMED", "IN_HOUSE", "CHECKED_OUT", "CANCELLED", "NO_SHOW"]
    },

    "ReservationView": {
      "type": "object",
      "required": ["reservationId", "status", "stay", "roomTypeCode", "ratePlanCode", "total"],
      "properties": {
        "reservationId": { "type": "string", "minLength": 1, "maxLength": 64 },
        "pnr": { "type": "string", "minLength": 1, "maxLength": 64 },
        "status": { "$ref": "#/$defs/ReservationStatus" },
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
        "primaryGuest": { "$ref": "https://example.com/contracts/canonical/v1/hospitality/guest-profile.schema.json" },
        "roomTypeCode": { "type": "string", "minLength": 1, "maxLength": 32 },
        "ratePlanCode": { "type": "string", "minLength": 1, "maxLength": 32 },
        "total": { "$ref": "https://example.com/contracts/canonical/v1/common/money.schema.json" },
        "policies": { "$ref": "https://example.com/contracts/canonical/v1/hospitality/offer-quote.schema.json#/$defs/OfferPolicies" }
      },
      "additionalProperties": true
    },

    "ReservationCreateRequest": {
      "type": "object",
      "required": ["context", "idempotencyKey", "quoteId", "pricingSignature", "primaryGuest"],
      "properties": {
        "context": { "$ref": "https://example.com/contracts/canonical/v1/common/context-envelope.schema.json" },
        "idempotencyKey": { "type": "string", "minLength": 8, "maxLength": 128 },
        "quoteId": { "type": "string", "minLength": 8, "maxLength": 128 },
        "pricingSignature": { "type": "string", "minLength": 8, "maxLength": 512 },
        "primaryGuest": { "$ref": "https://example.com/contracts/canonical/v1/hospitality/guest-profile.schema.json" },
        "specialRequests": { "type": "string", "maxLength": 2000 },
        "payment": {
          "type": "object",
          "properties": {
            "guaranteeType": { "type": "string", "enum": ["NONE", "CARD", "DEPOSIT"] },
            "token": { "type": "string", "minLength": 8, "maxLength": 512 }
          },
          "additionalProperties": false
        }
      },
      "additionalProperties": false
    },

    "ReservationCreateResponse": {
      "type": "object",
      "required": ["context", "reservation"],
      "properties": {
        "context": { "$ref": "https://example.com/contracts/canonical/v1/common/context-envelope.schema.json" },
        "reservation": { "$ref": "#/$defs/ReservationView" },
        "warnings": {
          "type": "array",
          "items": { "type": "string", "maxLength": 256 }
        }
      },
      "additionalProperties": false
    },

    "ReservationModifyRequest": {
      "type": "object",
      "required": ["context", "idempotencyKey", "reservationId", "changes"],
      "properties": {
        "context": { "$ref": "https://example.com/contracts/canonical/v1/common/context-envelope.schema.json" },
        "idempotencyKey": { "type": "string", "minLength": 8, "maxLength": 128 },
        "reservationId": { "type": "string", "minLength": 1, "maxLength": 64 },
        "changes": {
          "type": "object",
          "properties": {
            "stay": {
              "type": "object",
              "properties": {
                "checkIn": { "type": "string", "format": "date" },
                "checkOut": { "type": "string", "format": "date" }
              },
              "additionalProperties": false
            },
            "guests": {
              "type": "object",
              "properties": {
                "adults": { "type": "integer", "minimum": 1, "maximum": 20 },
                "children": { "type": "integer", "minimum": 0, "maximum": 20 }
              },
              "additionalProperties": false
            },
            "specialRequests": { "type": "string", "maxLength": 2000 }
          },
          "additionalProperties": false
        }
      },
      "additionalProperties": false
    },

    "ReservationCancelRequest": {
      "type": "object",
      "required": ["context", "idempotencyKey", "reservationId", "reason"],
      "properties": {
        "context": { "$ref": "https://example.com/contracts/canonical/v1/common/context-envelope.schema.json" },
        "idempotencyKey": { "type": "string", "minLength": 8, "maxLength": 128 },
        "reservationId": { "type": "string", "minLength": 1, "maxLength": 64 },
        "reason": { "type": "string", "minLength": 2, "maxLength": 256 }
      },
      "additionalProperties": false
    }
  }
}
```

> Nota: eu referenciei 'OfferPolicies' no exemplo acima; se você quiser manter tudo 100% resolvido, no próximo passo eu "fatoro" 'policies' em 'hospitality/policies.schema.json' e fecho as referências.

---

### 'hospitality/ari-event.schema.json'

> Evento canônico para **ARI** (rates/inventory/restrictions). Projetado para **dedupe** e **replay**.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://example.com/contracts/canonical/v1/hospitality/ari-event.schema.json",
  "title": "ARIEvent",
  "type": "object",
  "required": ["context", "eventId", "eventType", "occurredAt", "payload"],
  "properties": {
    "context": { "$ref": "https://example.com/contracts/canonical/v1/common/context-envelope.schema.json" },
    "eventId": { "type": "string", "minLength": 8, "maxLength": 128 },
    "eventType": { "type": "string", "enum": ["ARI_UPDATE"] },
    "occurredAt": { "type": "string", "format": "date-time" },
    "payload": {
      "type": "object",
      "required": ["roomTypeCode", "ratePlanCode", "date", "inventory", "restrictions"],
      "properties": {
        "roomTypeCode": { "type": "string", "minLength": 1, "maxLength": 32 },
        "ratePlanCode": { "type": "string", "minLength": 1, "maxLength": 32 },
        "date": { "type": "string", "format": "date" },
        "inventory": { "type": "integer", "minimum": 0, "maximum": 9999 },
        "price": { "$ref": "https://example.com/contracts/canonical/v1/common/money.schema.json" },
        "restrictions": {
          "type": "object",
          "properties": {
            "closed": { "type": "boolean" },
            "cta": { "type": "boolean" },
            "ctd": { "type": "boolean" },
            "minLos": { "type": "integer", "minimum": 1, "maximum": 365 },
            "maxLos": { "type": "integer", "minimum": 1, "maximum": 365 }
          },
          "additionalProperties": false
        }
      },
      "additionalProperties": false
    }
  },
  "additionalProperties": false
}
```

---

### 'hospitality/folio.schema.json'

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://example.com/contracts/canonical/v1/hospitality/folio.schema.json",
  "title": "Folio",
  "type": "object",
  "required": ["context", "folioId", "reservationId", "status", "totals"],
  "properties": {
    "context": { "$ref": "https://example.com/contracts/canonical/v1/common/context-envelope.schema.json" },
    "folioId": { "type": "string", "minLength": 1, "maxLength": 64 },
    "reservationId": { "type": "string", "minLength": 1, "maxLength": 64 },
    "status": { "type": "string", "enum": ["OPEN", "CLOSED", "VOID"] },
    "items": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["code", "description", "amount", "postedAt"],
        "properties": {
          "code": { "type": "string", "minLength": 1, "maxLength": 32 },
          "description": { "type": "string", "minLength": 1, "maxLength": 200 },
          "amount": { "$ref": "https://example.com/contracts/canonical/v1/common/money.schema.json" },
          "postedAt": { "type": "string", "format": "date-time" }
        },
        "additionalProperties": false
      }
    },
    "totals": {
      "type": "object",
      "required": ["base", "taxes", "fees", "total"],
      "properties": {
        "base": { "$ref": "https://example.com/contracts/canonical/v1/common/money.schema.json" },
        "taxes": { "$ref": "https://example.com/contracts/canonical/v1/common/money.schema.json" },
        "fees": { "$ref": "https://example.com/contracts/canonical/v1/common/money.schema.json" },
        "total": { "$ref": "https://example.com/contracts/canonical/v1/common/money.schema.json" }
      },
      "additionalProperties": false
    }
  },
  "additionalProperties": false
}
```

---

## Regras de ouro (já embutidas no modelo)

* **Contexto obrigatório** em tudo ('context').
* **Mutual exclusivity**: 'hotelId' XOR 'hubId'.
* **Distribuição exige** 'channelCode' + 'appKey'.
* **Idempotência** obrigatória em *write operations* ('idempotencyKey').
* **Quote→Book** coerente via 'quoteId' + 'pricingSignature'.
* **Eventos** deduplicáveis por 'eventId'.

---

## Passo 2 — **State Machines (Sagas) Formais v1**

Este passo transforma o **Modelo Canônico** em **comportamento executável**, com **máquinas de estado**, **transições**, **compensações**, **invariantes** e **pontos de observabilidade**.
Tudo aqui é **determinístico**, **testável** e **alinhado à operação real**.

---

# Convenções Gerais (aplicáveis a todas as Sagas)

### Estados

* Estados são **imutáveis**; transições geram novos estados.
* Estados intermediários **nunca** são expostos como sucesso ao cliente.

### Eventos

* Todo estado terminal emite **evento de domínio**.
* Eventos têm 'eventId' (dedupe) + 'occurredAt'.

### Escritas

* **Idempotência obrigatória** ('idempotencyKey') em qualquer transição que persista estado.

### Falhas

* Falha **antes** de persistir → retry seguro.
* Falha **após** persistir → responder com estado final existente.

### Observabilidade (hard rule)

Cada transição gera:

* log estruturado
* métrica de latência
* correlação por 'requestId'

---

# Saga A — **Shopping / Quote**

### Objetivo

Resolver oferta **com regras reais** e garantir consistência com Book.

---

### Estados

```
INIT
 └─▶ CONTEXT_VALIDATED
      └─▶ AVAILABILITY_RESOLVED
           └─▶ RESTRICTIONS_APPLIED
                └─▶ PRICING_CALCULATED
                     └─▶ QUOTE_ISSUED (terminal)
```

---

### Transições & Regras

#### INIT → CONTEXT_VALIDATED

**Valida**

* Context Envelope (hotel XOR hub)
* timezone explícito
* domínio correto (PROPERTY ou DISTRIBUTION)

❌ Falha → 'CONTEXT_INVALID'

---

#### CONTEXT_VALIDATED → AVAILABILITY_RESOLVED

**Ações**

* Consulta inventário real
* Considera allotments, grupos, overbooking rules

❌ Falha → 'DEPENDENCY_DOWN' ou 'STOP_SELL'

---

#### AVAILABILITY_RESOLVED → RESTRICTIONS_APPLIED

**Aplica**

* CTA / CTD
* Min/Max LOS
* Closed / Stop-sell
* Regras por canal

❌ Violação → erro específico ('MIN_LOS_VIOLATION', etc.)

---

#### RESTRICTIONS_APPLIED → PRICING_CALCULATED

**Calcula**

* base
* impostos
* taxas
* moeda
* arredondamento

**Gera**

* 'pricingSignature' (hash das regras + valores)

---

#### PRICING_CALCULATED → QUOTE_ISSUED

**Entrega**

* 'quoteId'
* 'pricingSignature'
* políticas e totais

✅ **Estado terminal**

---

### Invariantes

* Quote **não** altera estado do PMS
* Quote **não** reserva inventário
* Quote **sempre** pode falhar sem efeitos colaterais

---

# Saga B — **Book (Criar Reserva)**

### Objetivo

Criar reserva **uma única vez**, mesmo com retries, timeouts e falhas parciais.

---

### Estados

```
INIT
 └─▶ CONTEXT_VALIDATED
      └─▶ IDEMPOTENCY_CHECKED
           └─▶ QUOTE_VALIDATED
                └─▶ AVAILABILITY_RECHECKED
                     └─▶ RESERVATION_CREATED
                          └─▶ CONFIRMED (terminal)
```

---

### Transições & Regras

#### INIT → CONTEXT_VALIDATED

Mesmas regras do Quote.

---

#### CONTEXT_VALIDATED → IDEMPOTENCY_CHECKED

**Valida**

* 'idempotencyKey'

**Se já processada**

* retorna reserva existente
* **não** cria nova

---

#### IDEMPOTENCY_CHECKED → QUOTE_VALIDATED

**Valida**

* 'quoteId' existe
* 'pricingSignature' igual à atual

❌ Divergência → 'RATE_CHANGED'

---

#### QUOTE_VALIDATED → AVAILABILITY_RECHECKED

**Revalida**

* inventário
* overbooking
* lock lógico (se suportado)

❌ Falha → 'AVAILABILITY_CHANGED'

---

#### AVAILABILITY_RECHECKED → RESERVATION_CREATED

**Ações**

* cria reserva no PMS
* persiste 'reservationId' + 'pnr'

⚠️ Se timeout após criação → idempotência cobre retry

---

#### RESERVATION_CREATED → CONFIRMED

**Ações**

* emite evento 'ReservationCreated'
* libera resposta ao cliente

✅ **Estado terminal**

---

### Compensações

* Nenhuma automática (hotelaria **não** desfaz reserva sem intenção explícita)
* Cancel é saga separada

---

### Invariantes

* Nunca existirão duas reservas para o mesmo 'idempotencyKey'
* Retry **sempre** retorna a mesma reserva

---

# Saga C — **Modify Reservation**

### Objetivo

Alterar reserva respeitando políticas, com consistência financeira.

---

### Estados

```
INIT
 └─▶ CONTEXT_VALIDATED
      └─▶ IDEMPOTENCY_CHECKED
           └─▶ RESERVATION_LOADED
                └─▶ POLICY_VALIDATED
                     └─▶ REPRICED_IF_NEEDED
                          └─▶ MODIFIED
                               └─▶ CONFIRMED (terminal)
```

---

### Regras-chave

* Cutoff por timezone
* Penalidades explícitas
* Alterações podem mudar preço **ou não**

❌ Violação → 'POLICY_VIOLATION'

---

### Invariantes

* Nenhuma alteração parcial
* Preço final sempre explícito

---

# Saga D — **Cancel Reservation**

### Objetivo

Cancelar **uma única vez**, com penalidade correta e sem refund duplicado.

---

### Estados

```
INIT
 └─▶ CONTEXT_VALIDATED
      └─▶ IDEMPOTENCY_CHECKED
           └─▶ RESERVATION_LOADED
                └─▶ CUTOFF_VALIDATED
                     └─▶ CANCELLED
                          └─▶ CONFIRMED (terminal)
```

---

### Regras

* Cutoff + timezone
* Penalidade/no-show conforme política
* Refund (se aplicável) **idempotente**

---

### Invariantes

* Cancel repetido retorna estado CANCELLED
* Nenhum refund duplicado

---

# Saga E — **ARI Apply Pipeline**

### Objetivo

Aplicar ARI com **consistência**, **dedupe** e **replay seguro**.

---

### Estados

```
RECEIVED
 └─▶ DEDUPED
      └─▶ VALIDATED
           └─▶ NORMALIZED
                └─▶ APPLIED
                     └─▶ ACKED (terminal)
```

---

### Regras críticas

* 'eventId' dedupe obrigatório
* Ordem **não garantida**
* Último evento válido vence

---

### Invariantes

* Evento nunca aplicado duas vezes
* Replay não altera estado final

---

# Saga F — **Folio Close**

### Objetivo

Fechar conta com total correto e auditável.

---

### Estados

```
OPEN
 └─▶ VALIDATED
      └─▶ TOTALIZED
           └─▶ CLOSED (terminal)
```

---

### Regras

* Nenhum item pendente
* Totais batem com lançamentos
* Estado fechado é imutável

---

# Tabela de Mapeamento (State → Teste)

| Saga   | Estado Crítico         | Teste Obrigatório  |
| ------ | ---------------------- | ------------------ |
| Quote  | RESTRICTIONS_APPLIED   | Violação LOS / CTA |
| Book   | IDEMPOTENCY_CHECKED    | Retry seguro       |
| Book   | AVAILABILITY_RECHECKED | Race condition     |
| Modify | POLICY_VALIDATED       | Cutoff             |
| Cancel | CUTOFF_VALIDATED       | Penalidade         |
| ARI    | DEDUPED                | Evento duplicado   |
| Folio  | TOTALIZED              | Soma correta       |

---

## Definition of Done (Passo 2)

✔ Estados definidos
✔ Transições explícitas
✔ Invariantes documentadas
✔ Compensações claras
✔ Pronto para BDD / automação

---

## Passo 3 — **Testes BDD (Gherkin) + Casos Automatizáveis v1**

Abaixo está uma suíte **BDD completa** (pronta para Cucumber/Behave/SpecFlow) diretamente derivada das **Sagas do Passo 2**, cobrindo: **happy paths, invariantes, idempotência, retries, timeout, dedupe e regras de hotelaria**.

> Convenção: os passos usam objetos do **Modelo Canônico v1** (context, quoteId, pricingSignature, idempotencyKey, etc.).
> Os cenários foram escritos para serem **executáveis** e também servirem como **contratos comportamentais**.

---

# Feature Set 1 — Context Envelope & Segurança

### Feature: Context Envelope must be valid for all domains

```gherkin
Feature: Context Envelope validation

  Scenario: Property request without hotelId or hubId must fail fast
    Given a context with domain "PROPERTY" and requestId "REQ-1001"
    And the context has no "hotelId"
    And the context has no "hubId"
    When I validate the context envelope
    Then the validation must fail with error code "CONTEXT_INVALID"
    And no downstream PMS calls must be made

  Scenario: Property request with both hotelId and hubId must fail fast
    Given a context with domain "PROPERTY" and requestId "REQ-1002"
    And the context has "hotelId" = "H-001"
    And the context has "hubId" = "HB-001"
    When I validate the context envelope
    Then the validation must fail with error code "CONTEXT_INVALID"
    And no downstream PMS calls must be made

  Scenario: Distribution request must require channelCode and appKey
    Given a context with domain "DISTRIBUTION" and requestId "REQ-1003"
    And the context has "hubId" = "HB-001"
    And the context has no "channelCode"
    And the context has no "appKey"
    When I validate the context envelope
    Then the validation must fail with error code "CONTEXT_INVALID"
    And no downstream Distribution calls must be made
```

### Feature: OAuth lifecycle behavior

```gherkin
Feature: OAuth lifecycle

  Scenario: Expired token must return AUTH_EXPIRED and not retry blindly
    Given a valid context for domain "PROPERTY" with requestId "REQ-1101"
    And the OAuth token is expired
    When I call any protected API
    Then the response must be an error with code "AUTH_EXPIRED"
    And the client must not retry the same call without refreshing the token

  Scenario: Invalid token must return AUTH_INVALID
    Given a valid context for domain "DISTRIBUTION" with requestId "REQ-1102"
    And the OAuth token is invalid
    When I call any protected API
    Then the response must be an error with code "AUTH_INVALID"
```

---

# Feature Set 2 — Shopping / Quote

### Feature: Quote applies restrictions and returns consistent pricing signature

```gherkin
Feature: Quote workflow

  Background:
    Given a valid context for domain "DISTRIBUTION" with requestId "REQ-2000"
    And the context has "hubId" = "HB-001"
    And the context has "channelCode" = "CH-ABC"
    And the context has "appKey" = "APP-KEY-123"

  Scenario: Quote should fail when Min LOS is violated
    Given the hotel has restriction "minLos" = 3 for roomType "DLX" and ratePlan "BAR"
    And I request a quote for roomType "DLX" and ratePlan "BAR"
    And the stay is from "2026-02-10" to "2026-02-12" with 2 adults
    When I execute the Quote saga
    Then the Quote must fail with error code "MIN_LOS_VIOLATION"
    And no reservation must be created

  Scenario: Quote should return pricingSignature and policies
    Given the hotel allows the requested stay for roomType "DLX" and ratePlan "BAR"
    And I request a quote for roomType "DLX" and ratePlan "BAR"
    And the stay is from "2026-02-10" to "2026-02-13" with 2 adults
    When I execute the Quote saga
    Then the Quote must succeed
    And the response must contain a "quoteId"
    And the response must contain a "pricingSignature"
    And the response must contain cancellation and no-show policies
    And the response must contain total price including taxes and fees
```

### Feature: Quote must be side-effect free

```gherkin
Feature: Quote has no side effects

  Scenario: Quote must not change inventory or create reservations
    Given a valid context for domain "PROPERTY" with requestId "REQ-2101"
    And I request a quote for roomType "STD" and ratePlan "BAR"
    And the stay is from "2026-03-01" to "2026-03-03" with 1 adult
    When I execute the Quote saga
    Then no reservation must be created
    And no inventory holds must be persisted
```

---

# Feature Set 3 — Book (Create Reservation)

### Feature: Book must be idempotent and safe under retry

```gherkin
Feature: Book workflow idempotency

  Background:
    Given a valid context for domain "DISTRIBUTION" with requestId "REQ-3000"
    And a successful Quote exists with quoteId "Q-9001" and pricingSignature "SIG-1"
    And the quote is for roomType "DLX" and ratePlan "BAR"
    And the stay is from "2026-02-10" to "2026-02-13" with 2 adults
    And the primary guest is "Ana Silva" with email "ana@example.com"

  Scenario: Book succeeds and returns a confirmed reservation
    Given an idempotencyKey "IDEMP-BOOK-001"
    When I execute the Book saga using quoteId "Q-9001" and pricingSignature "SIG-1"
    Then the Book must succeed
    And the reservation status must be "CONFIRMED"
    And the response must include "reservationId" and "pnr"
    And a domain event "ReservationCreated" must be emitted

  Scenario: Retry after timeout must not create a duplicate reservation
    Given an idempotencyKey "IDEMP-BOOK-002"
    And the downstream PMS creates the reservation but the network times out
    When I execute the Book saga using quoteId "Q-9001" and pricingSignature "SIG-1"
    Then the client receives a timeout error code "TIMEOUT"
    When the client retries the Book saga with the same idempotencyKey "IDEMP-BOOK-002"
    Then the Book must succeed
    And the same "reservationId" must be returned
    And no additional reservation must be created

  Scenario: Book must fail if pricingSignature differs (rate changed)
    Given an idempotencyKey "IDEMP-BOOK-003"
    And the current system pricing signature for quoteId "Q-9001" is "SIG-CHANGED"
    When I execute the Book saga using quoteId "Q-9001" and pricingSignature "SIG-1"
    Then the Book must fail with error code "RATE_CHANGED"
    And no reservation must be created

  Scenario: Book must fail if availability changed between quote and book
    Given an idempotencyKey "IDEMP-BOOK-004"
    And availability for roomType "DLX" is now exhausted for the stay dates
    When I execute the Book saga using quoteId "Q-9001" and pricingSignature "SIG-1"
    Then the Book must fail with error code "AVAILABILITY_CHANGED"
    And no reservation must be created
```

---

# Feature Set 4 — Modify Reservation

### Feature: Modify must enforce policy cutoffs and reprice when needed

```gherkin
Feature: Modify workflow

  Background:
    Given a valid context for domain "PROPERTY" with requestId "REQ-4000"
    And a confirmed reservation exists with reservationId "R-7001" and status "CONFIRMED"
    And the reservation stay is from "2026-02-10" to "2026-02-13"
    And the reservation has cancellation cutoff "2026-02-08T23:59:00-03:00"

  Scenario: Modify must fail after cutoff
    Given an idempotencyKey "IDEMP-MOD-001"
    And the current time is "2026-02-09T10:00:00-03:00"
    When I request to modify the reservation "R-7001" to checkOut "2026-02-14"
    And I execute the Modify saga
    Then the Modify must fail with error code "POLICY_VIOLATION"
    And the reservation must remain unchanged

  Scenario: Modify must succeed before cutoff and return updated totals
    Given an idempotencyKey "IDEMP-MOD-002"
    And the current time is "2026-02-08T10:00:00-03:00"
    When I request to modify the reservation "R-7001" to checkOut "2026-02-14"
    And I execute the Modify saga
    Then the Modify must succeed
    And the reservation stay must now be from "2026-02-10" to "2026-02-14"
    And the reservation total must be explicitly returned
    And a domain event "ReservationModified" must be emitted
```

---

# Feature Set 5 — Cancel Reservation

### Feature: Cancel must be idempotent and must not duplicate refunds

```gherkin
Feature: Cancel workflow

  Background:
    Given a valid context for domain "PROPERTY" with requestId "REQ-5000"
    And a confirmed reservation exists with reservationId "R-8001" and status "CONFIRMED"
    And the reservation has cancellation cutoff "2026-02-08T23:59:00-03:00"

  Scenario: Cancel succeeds before cutoff
    Given an idempotencyKey "IDEMP-CAN-001"
    And the current time is "2026-02-08T10:00:00-03:00"
    When I cancel the reservation "R-8001" with reason "Change of plans"
    And I execute the Cancel saga
    Then the Cancel must succeed
    And the reservation status must be "CANCELLED"
    And a domain event "ReservationCancelled" must be emitted

  Scenario: Retry Cancel must not duplicate refund
    Given an idempotencyKey "IDEMP-CAN-002"
    And the current time is "2026-02-08T10:00:00-03:00"
    And the reservation cancellation triggers a refund
    When I execute the Cancel saga for reservation "R-8001"
    Then the Cancel must succeed
    When I retry the Cancel saga with the same idempotencyKey "IDEMP-CAN-002"
    Then the Cancel must succeed
    And the reservation status must be "CANCELLED"
    And the refund must have been created exactly once

  Scenario: Cancel after cutoff must apply penalty
    Given an idempotencyKey "IDEMP-CAN-003"
    And the current time is "2026-02-09T10:00:00-03:00"
    When I cancel the reservation "R-8001" with reason "Late cancellation"
    And I execute the Cancel saga
    Then the Cancel must fail with error code "POLICY_VIOLATION"
    And the response must include penalty details
```

---

# Feature Set 6 — ARI Events (Dedupe + Replay)

### Feature: ARI updates must be deduplicated and replay-safe

```gherkin
Feature: ARI event processing

  Background:
    Given a valid context for domain "DISTRIBUTION" with requestId "REQ-6000"
    And the context has "hubId" = "HB-001"
    And the context has "channelCode" = "CH-ABC"
    And the context has "appKey" = "APP-KEY-123"

  Scenario: Duplicate ARI event must be applied only once
    Given an ARI event with eventId "EV-ARI-001" for roomType "DLX" ratePlan "BAR" date "2026-02-10"
    And the payload sets inventory to 5 and closed to false
    When I process the ARI event "EV-ARI-001"
    Then the update must be applied
    When I process the same ARI event "EV-ARI-001" again
    Then the system must deduplicate it
    And the update must not be applied a second time
    And an audit record must indicate deduplication

  Scenario: Out-of-order events must converge to the latest state
    Given an ARI event with eventId "EV-ARI-010" occurredAt "2026-02-01T10:00:00Z" sets inventory to 7
    And an ARI event with eventId "EV-ARI-011" occurredAt "2026-02-01T11:00:00Z" sets inventory to 3
    When I process event "EV-ARI-011" first
    And I process event "EV-ARI-010" second
    Then the final inventory state must be 3
```

---

# Feature Set 7 — Observability & Supportability

### Feature: All flows must be traceable and supportable

```gherkin
Feature: Observability requirements

  Scenario: Every request must produce logs with requestId and correlationId
    Given a valid context with requestId "REQ-OBS-001" and correlationId "CORR-OBS-001"
    When I execute any saga
    Then logs must include "REQ-OBS-001"
    And logs must include "CORR-OBS-001"
    And logs must not include secrets or raw payment data

  Scenario: Metrics must include latency, errors and retries
    Given a valid context with requestId "REQ-OBS-002"
    When I execute the Book saga
    Then metrics must record latency for "Book"
    And metrics must record error rate for "Book"
    And metrics must record retry count for "Book"
```

---

# “Tabela de Prioridade” (o que automatizar primeiro)

1. **Book idempotency + timeout retry** (maior risco operacional)
2. **Quote restrictions (MinLOS/CTA/Stop-sell)** (maior volume e impacto de receita)
3. **Cancel idempotency + refund dedupe** (risco financeiro)
4. **ARI dedupe + out-of-order convergence** (paridade e reputação)
5. **Observability gates** (suporte e SLAs)

---

## Próximo passo — **Passo 4**

👉 **Arquitetura de referência (camadas + responsabilidades)** + **contratos de integração** (adapters, normalização, orquestração, eventos, DLQ, governança de versão).



## Passo 4 — **Arquitetura de Referência (Camadas, Responsabilidades & Contratos)**

Este passo define **como tudo se conecta em produção**, garantindo que:

* regras de hotelaria **não vazem** para UI ou adapters,
* integrações sejam **substituíveis**,
* falhas sejam **contidas**,
* e evolução de versão **não quebre parceiros**.

O resultado é uma arquitetura **enterprise-grade**, inspirada em projetos OHIP/Oracle Hospitality, mas **agnóstica de fornecedor**.

---

# Visão Geral (Princípios Arquiteturais)

### Princípios não negociáveis

1. **API ≠ Orquestração**
   Controllers/APIs apenas validam e delegam.
2. **Domínio manda**
   Regras vivem no domínio, não nos adapters.
3. **Integrações são impuras**
   Tudo que chama PMS/CRS é isolado.
4. **Eventos são 1ª classe**
   Tudo relevante vira evento.
5. **Falha é estado esperado**
   Toda dependência pode falhar.

---

# Diagrama Lógico (camadas)

```
┌───────────────────────────────────────────────┐
│               Experience Layer                │
│  (Web / Mobile / BFF / Partner APIs)          │
└───────────────▲───────────────────────────────┘
                │
┌───────────────┴───────────────────────────────┐
│                API Layer                       │
│  - REST / GraphQL                              │
│  - Auth & Context Validation                   │
│  - Contract Validation (JSON Schema)           │
└───────────────▲───────────────────────────────┘
                │
┌───────────────┴───────────────────────────────┐
│          Orchestration Layer (Sagas)           │
│  - Quote / Book / Modify / Cancel              │
│  - State Machines                              │
│  - Idempotency                                 │
│  - Compensations                               │
└───────────────▲───────────────────────────────┘
                │
┌───────────────┴───────────────────────────────┐
│            Domain Layer (Pure)                 │
│  - Hotel Rules                                 │
│  - Policies / Pricing / Restrictions           │
│  - Canonical Models                            │
│  - Invariants                                  │
└───────────────▲───────────────────────────────┘
                │
┌───────────────┴───────────────────────────────┐
│          Integration Layer (Adapters)          │
│  - PMS Adapter                                 │
│  - CRS / Distribution Adapter                  │
│  - Payments Adapter                            │
│  - Content / ARI Feeds                         │
└───────────────▲───────────────────────────────┘
                │
┌───────────────┴───────────────────────────────┐
│        Infrastructure & Eventing               │
│  - Message Broker                              │
│  - DLQ                                        │
│  - Observability                               │
│  - Secrets / Config                            │
└───────────────────────────────────────────────┘
```

---

# Camada por Camada (com regras claras)

## 1. Experience Layer (UI / BFF / Partners)

### Responsabilidades

* UX
* Agregação de dados (quando necessário)
* Nenhuma regra de hotelaria

### Proibições

❌ Não calcula preço
❌ Não valida política
❌ Não decide se pode cancelar

> Se uma regra mudar, **nenhuma UI deve ser alterada**.

---

## 2. API Layer (Contracts First)

### Responsabilidades

* Autenticação (OAuth)
* Validação de **Context Envelope**
* Validação de schema (JSON Schema)
* Rate limit / throttling
* Tradução HTTP ⇄ Command

### Exemplo

* `/quote` → `QuoteCommand`
* `/book` → `BookCommand`

### Anti-pattern

❌ lógica condicional baseada em canal/hotel

---

## 3. Orchestration Layer (Coração do Sistema)

### Responsabilidades

* Executar **Sagas (Passo 2)**
* Controlar transições de estado
* Gerenciar idempotência
* Publicar eventos de domínio

### Artefatos

* State machine por workflow
* Storage de estado (event store ou saga store)
* Registro de idempotency keys

### Regra de ouro

> **Uma saga = um fluxo de negócio**
> Nunca misturar Book + Cancel + Modify.

---

## 4. Domain Layer (Puro & Testável)

### Responsabilidades

* Regras de hotelaria
* Cálculo de preço
* Validação de políticas
* Invariantes (ex.: quote ≠ book)

### Características

* Zero dependências externas
* Testável em memória
* Determinístico

### Exemplo de invariantes

* Quote nunca reserva inventário
* Cancel nunca cria nova reserva
* ARI nunca altera reservas existentes

---

## 5. Integration Layer (Adapters)

### Responsabilidades

* Traduzir **modelo canônico ⇄ fornecedor**
* Tratar peculiaridades do PMS/CRS
* Normalizar erros
* Aplicar timeouts e retries técnicos

### Um adapter por fornecedor

```
/adapters
  /opera-cloud
  /outro-pms
  /channel-x
```

### Regra crítica

> Adapter **não** contém regra de negócio
> Só tradução + resiliência técnica.

---

## 6. Infrastructure & Eventing

### Componentes

* Message broker (Kafka / SNS / PubSub)
* DLQ (por saga)
* Metrics (latência, erro, retry)
* Logs estruturados
* Secrets manager

### Eventos obrigatórios

* ReservationCreated
* ReservationModified
* ReservationCancelled
* QuoteIssued
* ARIUpdated
* FolioClosed

---

# Contratos de Integração (Adapter Contracts)

## Adapter Interface (exemplo)

```ts
interface PMSAdapter {
  checkAvailability(input): AvailabilityResult
  createReservation(input): ReservationRef
  modifyReservation(input): ReservationRef
  cancelReservation(input): CancellationResult
  getFolio(input): Folio
}
```

### Regras

* Input e output **sempre canônicos**
* Adapter nunca retorna modelo nativo
* Adapter nunca lança exceção sem mapear erro

---

# Estratégia de Resiliência (por camada)

| Camada       | Estratégia                          |
| ------------ | ----------------------------------- |
| API          | timeout curto + fail-fast           |
| Orquestração | retry consciente + idempotência     |
| Adapter      | timeout agressivo + circuit breaker |
| Eventos      | retry assíncrono + DLQ              |
| UI           | fallback + mensagens claras         |

---

# Versionamento & Governança

### APIs

* `/v1`, `/v2`
* backward compatibility obrigatória

### Schemas

* `contracts/canonical/v1`
* novos campos = opcionais
* remoção só em major version

### Eventos

* versionados no payload
* consumidores devem ignorar campos desconhecidos

---

# Checkpoints Arquiteturais (Gates)

❌ Projeto bloqueado se:

* regra no adapter
* regra na API
* ausência de saga
* ausência de idempotência
* ausência de eventos

✅ Projeto avança se:

* domínio testável isolado
* adapters substituíveis
* workflows rastreáveis
* falhas previsíveis

---

## Onde estamos agora

✔ Modelo Canônico
✔ State Machines
✔ Testes BDD
✔ Arquitetura de Referência

---

## Passo 5 — **Playbooks de Incidente + Operação em Produção (Runbooks) v1**

Este passo fecha o ciclo “não podemos errar” com **procedimentos operacionais**: como detectar, diagnosticar, mitigar e prevenir os incidentes mais comuns (e mais caros) em hotelaria e integrações PMS/CRS/Distribuição.

> Regras: todo playbook tem **Sinais → Diagnóstico → Mitigação → Recuperação → Prevenção** e referencia invariantes dos Passos 1–4 (idempotência, dedupe, context envelope, sagas, observabilidade).

---

# 0) Padrões operacionais obrigatórios

### 0.1 Taxonomia de severidade

* **SEV1**: reservas/faturamento indisponíveis ou corrupção/duplicidade em escala
* **SEV2**: degradação relevante (picos de erro/latência), impacto parcial por hotel/canal
* **SEV3**: erro localizado ou funcionalidade não crítica

### 0.2 “Golden Signals” (painel padrão)

* **Latency** (p95/p99) por fluxo: Quote, Book, Modify, Cancel, ARI ingest, Folio
* **Error rate** por fluxo + por fornecedor (PMS/Distribuição)
* **Retry rate** e **circuit breaker open**
* **Idempotency hit rate** (quantas vezes retornou resultado existente)
* **Duplicate detection rate** (eventId / idempotencyKey)
* **Mismatch counters** (quote→book signature mismatch; ARI parity mismatch)

### 0.3 Log mínimo por request

* `requestId`, `correlationId`, `domain`, `hotelId|hubId`, `channelCode` (se houver)
* `idempotencyKey` (em writes)
* `reservationId/pnr` quando existir
* **Nunca**: token OAuth, dados de cartão, PII sensível sem redaction

---

# 1) Playbook — **Token OAuth expirado / falha de autenticação em cascata**

## Sinais

* Aumento súbito de **401/403**
* Queda brusca de sucesso em múltiplos endpoints
* Logs com erro `AUTH_EXPIRED` ou `AUTH_INVALID`

## Diagnóstico

1. Filtrar por **domínio** (PROPERTY vs DISTRIBUTION)
2. Verificar se falha ocorre em **todas** as propriedades ou em subset
3. Checar métricas: “token refresh failures”, “auth error rate”
4. Confirmar se há rotação/expiração de credenciais no secrets manager

## Mitigação imediata

* Forçar **refresh** do token (sem loops)
* Ativar modo **fail-fast** para evitar sobrecarregar o provedor
* Se for distribuição, validar `x-app-key`/`x-channelCode` (mudanças de provisionamento)

## Recuperação

* Reprocessar filas/DLQ de comandos que falharam por auth (somente os *safe-to-retry*)
* Validar que **writes idempotentes** retornam resultados existentes

## Prevenção

* Alarme de “token expiring soon”
* Métrica de “refresh success rate”
* Circuit breaker para auth upstream
* Rotina automatizada de verificação de credenciais em UAT/PROD

---

# 2) Playbook — **Duplicidade de Reserva (Book) por retry/timeout**

## Sinais

* Reclamação de cliente: “duas reservas”
* Métrica de “reservations created/min” sobe sem aumento de tráfego
* Divergência entre “idempotency hits” e “creates”
* PMS mostra múltiplos PNRs para mesmo hóspede/datas

## Diagnóstico

1. Selecionar um caso com `correlationId`
2. Verificar se dois `reservationId/pnr` foram criados com **mesma intenção**
3. Confirmar presença/ausência de `idempotencyKey` no comando
4. Verificar se timeout ocorreu após “RESERVATION_CREATED” e antes de “CONFIRMED”

## Mitigação imediata

* **Bloquear** novas criações sem `idempotencyKey` (hard gate)
* Ativar “idempotency enforcement mode” (rejeitar sem chave)
* Se duplicidade já ocorreu, **não apagar** “na mão” sem procedimento:

  * manter a primeira (mais antiga) como source
  * cancelar a duplicada seguindo política (com motivo interno), evitando penalizar hóspede

## Recuperação

* Job de reconciliação:

  * agrupar por (hotel, datas, guest, createdAt janela curta)
  * marcar suspeitas
  * gerar fila de revisão e cancelamento seguro
* Auditar refunds (garantir que nenhum foi duplicado)

## Prevenção

* Idempotência obrigatória em Book
* Persistir “idempotencyKey → reservationId” antes de responder
* Teste caos: “timeout pós-criação” + retry obrigatório (Passo 3)

---

# 3) Playbook — **Divergência Quote → Book (rate/policy mismatch)**

## Sinais

* Erros `RATE_CHANGED` sobem
* Reclamações: “valor mudou na confirmação”
* Aumento de abandonos no funil

## Diagnóstico

1. Avaliar percentual de mismatch por hotel/ratePlan/channel
2. Identificar se ARI mudou entre quote e book (janela curta)
3. Verificar se `pricingSignature` inclui todos os componentes (taxas, políticas, moeda, timezone)

## Mitigação imediata

* Implementar estratégia de **reprice explícito**:

  * retornar nova quote com motivo claro
* Ajustar cache (reduzir TTL) quando em Shop/Book
* Se em ARI Push, validar se há atraso/perda de eventos

## Recuperação

* Reprocessar eventos ARI pendentes
* Revalidar paridade com snapshots

## Prevenção

* `pricingSignature` deve hash:

  * datas, occup, roomType, ratePlan
  * regras e políticas
  * impostos/taxas e moeda
* Alarmes para “mismatch spike”
* Separar SLA de quote e de book por canal

---

# 4) Playbook — **ARI inconsistente (paridade quebrada / inventário divergente)**

## Sinais

* Canais vendendo quando hotel está fechado (ou vice-versa)
* Inventário negativo ou “stop-sell” ignorado
* Aumento de “walk/relocation” operacional
* Métrica de “ARI parity mismatch” sobe

## Diagnóstico

1. Confirmar **modo do canal**: Shop/Book OU ARI Push (nunca ambos)
2. Verificar lag do pipeline ARI:

   * ingest → dedupe → apply → ack
3. Checar out-of-order:

   * eventos com `occurredAt` chegando fora da ordem
4. Validar dedupe por `eventId`

## Mitigação imediata

* Se ARI Push com lag:

  * aumentar consumo/throughput
  * aplicar backpressure + DLQ
* Se inconsistência grave:

  * forçar “closed” temporário no canal (fail-safe)
  * trocar canal para Shop/Book (se suportado) **ou** pausar vendas

## Recuperação

* Replay de eventos ARI a partir do último checkpoint
* Reconciliar com snapshot de referência (inventário atual do system-of-record)

## Prevenção

* Deduplicação obrigatória por `eventId`
* Regra: “último por occurredAt vence”
* Dashboards por canal/hotel:

  * lag (min/avg/max)
  * eventos descartados
  * divergências detectadas

---

# 5) Playbook — **PMS/Fornecedor lento ou fora (timeouts e 5xx)**

## Sinais

* p95/p99 latência explode
* taxa de TIMEOUT/DEPENDENCY_DOWN sobe
* circuit breaker abre frequentemente
* filas/DLQ crescem

## Diagnóstico

1. Identificar qual dependência (PMS, Distribuição, Pagamento)
2. Separar read vs write:

   * Quote é degradável
   * Book/Modify/Cancel exigem maior cuidado
3. Avaliar se problema é regional/hotel específico

## Mitigação imediata

* Ativar circuit breaker + fallback:

  * Quote: fallback para “indisponível, tente novamente” (sem inventar preço)
  * Book/Modify/Cancel: **não** fazer retry cego; manter idempotência
* Reduzir concorrência (bulkhead)
* Se houver fila assíncrona segura para writes:

  * enfileirar com confirmação “pendente” apenas se o produto suportar esse estado

## Recuperação

* Reprocessar DLQ com regras:

  * writes idempotentes podem ser reexecutados
  * reads podem ser descartados após janela

## Prevenção

* Timeouts agressivos no adapter
* Orçamento de retries
* Teste caos “PMS down 30min” com metas:

  * zero duplicidade
  * consistência de estados

---

# 6) Playbook — **Cancelamento com refund duplicado (risco financeiro)**

## Sinais

* Chargeback/auditoria aponta duplicidade
* Métrica “refund created” sobe anormalmente
* Reclamações de estorno em dobro

## Diagnóstico

1. Selecionar `reservationId` e localizar transações
2. Verificar se `idempotencyKey` foi reaproveitado corretamente
3. Confirmar se refund é uma operação separada e idempotente

## Mitigação imediata

* Congelar refunds automáticos se necessário (feature flag)
* Ativar “refund dedupe by externalReference”
* Isolar canal/fluxo que está disparando duplicidade

## Recuperação

* Reconciliação financeira:

  * identificar duplicados
  * reverter/refazer conforme política e legislação

## Prevenção

* Refund sempre com chave idempotente e referência externa única
* Teste BDD “Cancel retry must not duplicate refund”

---

# 7) Playbook — **Contexto errado (hotel/hub/canal) causando 403/400 intermitente**

## Sinais

* Muitos 400/403 “intermitentes”
* Só alguns hotéis/canais falham
* Suporte relata “funciona para hotel X, falha para Y”

## Diagnóstico

1. Inspecionar logs: `domain`, `hotelId/hubId`, `channelCode`
2. Identificar se houve mistura `hotelId` + `hubId`
3. Confirmar provisionamento (canais/hotéis habilitados)

## Mitigação imediata

* Middleware de validação de headers (hard fail-fast)
* Bloquear requests sem contexto completo
* Corrigir mapeamento de tenancy (hotel↔hub)

## Recuperação

* Reprocessar somente comandos que falharam antes de persistir estado

## Prevenção

* Contract tests obrigatórios (Passo 3)
* “Context lint” no gateway

---

# 8) Playbook — **Falhas de Consistência de Estado (Saga presa / estado órfão)**

## Sinais

* Comandos ficam em “PENDING” por muito tempo
* Cresce “in-flight sagas”
* Tickets: “reserva criada mas app diz pendente” (ou vice-versa)

## Diagnóstico

1. Verificar store de saga:

   * qual estado ficou travado
2. Conferir se evento de confirmação foi emitido/consumido
3. Identificar se a falha foi:

   * antes da criação
   * após criação e antes de confirmar

## Mitigação imediata

* “Saga recovery job”:

  * reconsultar system-of-record (PMS)
  * avançar estado local para refletir realidade
* Pausar consumidores específicos se estiverem corrompendo estado

## Recuperação

* Replay de eventos
* Reprocessamento controlado de DLQ

## Prevenção

* Garantir que cada transição:

  * seja idempotente
  * registre checkpoint
* SLO de “saga completion time”
* Alarmes para “stuck sagas”

---

# 9) Runbook de Suporte — **Como atender um caso (script padrão)**

1. Peça/recupere **um** identificador:

   * `requestId` **ou** `reservationId/pnr`
2. Colete contexto:

   * hotel/hub, canal, datas
3. Verifique:

   * idempotencyKey (se write)
   * status da saga
4. Classifique:

   * auth / contexto / fornecedor / regra / duplicidade / ARI
5. Aplique playbook correspondente
6. Registre:

   * causa raiz
   * ação corretiva
   * ação preventiva (teste/alarme/flag)

---

# 10) Checklist final de “Pronto para Produção” (Operação)

* [ ] Painéis com Golden Signals
* [ ] Alarmes por: auth, timeout, 5xx, mismatch quote→book, duplicidade, ARI lag
* [ ] DLQ por saga + ferramenta de reprocessamento
* [ ] Jobs: saga recovery, ARI replay, reconciliação de duplicidade/refund
* [ ] Feature flags: pausar Book, pausar Refund, pausar ARI apply, fail-safe close
* [ ] Treinamento do suporte: runbook + exemplos reais

---

