# Saga — Book (Create Reservation)

## Objective
Criar reserva uma única vez, mesmo com retries, timeouts e falhas parciais.

## States
INIT → CONTEXT_VALIDATED → IDEMPOTENCY_CHECKED → QUOTE_VALIDATED → AVAILABILITY_RECHECKED → RESERVATION_CREATED → CONFIRMED (terminal)

## Transitions
### INIT → CONTEXT_VALIDATED
- Validar Context Envelope (hotel XOR hub, domínio correto, timezone)

### CONTEXT_VALIDATED → IDEMPOTENCY_CHECKED
- Checar idempotencyKey
- Se existe: retornar resultado existente (terminal)

### IDEMPOTENCY_CHECKED → QUOTE_VALIDATED
- quoteId existe
- pricingSignature consistente
- Se mismatch: RATE_CHANGED

### QUOTE_VALIDATED → AVAILABILITY_RECHECKED
- Revalidar inventário/regra
- Se mudou: AVAILABILITY_CHANGED

### AVAILABILITY_RECHECKED → RESERVATION_CREATED
- Criar reserva no PMS
- Persistir mapping idempotencyKey → reservationId/pnr

### RESERVATION_CREATED → CONFIRMED
- Emitir ReservationCreated
- Responder CONFIRMED

## Invariants
- Nunca criar duas reservas para a mesma idempotencyKey
- Retry retorna sempre a mesma reserva

## Observability
- Log por transição com requestId + idempotencyKey + reservationId
- Métricas: p95/p99, error rate, retry count, idempotency-hit
