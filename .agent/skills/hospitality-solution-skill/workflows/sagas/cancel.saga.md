# Saga — Cancel Reservation

## Objective
Cancelar reserva uma única vez, aplicando políticas (cutoff/no-show/penalty) e evitando refund duplicado.

## States
INIT → CONTEXT_VALIDATED → IDEMPOTENCY_CHECKED → RESERVATION_LOADED → CUTOFF_VALIDATED → CANCELLED → CONFIRMED (terminal)

## Transitions
### INIT → CONTEXT_VALIDATED
- Validar Context Envelope (hotel XOR hub, domínio correto, timezone)

### CONTEXT_VALIDATED → IDEMPOTENCY_CHECKED
- Checar idempotencyKey
- Se existe: retornar resultado existente (terminal)

### IDEMPOTENCY_CHECKED → RESERVATION_LOADED
- Carregar reserva
- Se não encontrar: NOT_FOUND

### RESERVATION_LOADED → CUTOFF_VALIDATED
- Validar política de cancelamento (cutoff/timezone)
- Se após cutoff: POLICY_VIOLATION (com penalty)

### CUTOFF_VALIDATED → CANCELLED
- Cancelar no PMS
- Se houver refund: executar refund idempotente (externalReference única)
- Persistir mapping idempotencyKey → resultado

### CANCELLED → CONFIRMED
- Emitir ReservationCancelled
- Retornar status CANCELLED e detalhes financeiros (penalty/refund se aplicável)

## Invariants
- Cancel repetido retorna CANCELLED (sem duplicar refund)
- Cancel nunca cria nova reserva

## Observability
- Métricas: cancel success rate, refund created, refund dedupe hits
- Logs: requestId + reservationId + idempotencyKey
