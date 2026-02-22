# Saga — Modify Reservation

## Objective
Modificar reserva com respeito a políticas (cutoff/timezone), reprice quando necessário, e garantir idempotência.

## States
INIT → CONTEXT_VALIDATED → IDEMPOTENCY_CHECKED → RESERVATION_LOADED → POLICY_VALIDATED → REPRICED_IF_NEEDED → MODIFIED → CONFIRMED (terminal)

## Transitions
### INIT → CONTEXT_VALIDATED
- Validar Context Envelope (hotel XOR hub, domínio correto, timezone)

### CONTEXT_VALIDATED → IDEMPOTENCY_CHECKED
- Checar idempotencyKey
- Se existe: retornar resultado existente (terminal)

### IDEMPOTENCY_CHECKED → RESERVATION_LOADED
- Carregar reserva do system-of-record (PMS/CRS conforme design)
- Se não encontrar: NOT_FOUND

### RESERVATION_LOADED → POLICY_VALIDATED
- Validar cutoff e regras para alteração
- Se violação: POLICY_VIOLATION (com detalhes)

### POLICY_VALIDATED → REPRICED_IF_NEEDED
- Se alteração impacta preço (datas/ocupação/ratePlan), reprecificar explicitamente
- Se preço muda e assinatura anterior não é válida, devolver RATE_CHANGED (ou retornar quote nova, conforme produto)

### REPRICED_IF_NEEDED → MODIFIED
- Aplicar alteração no PMS
- Persistir checkpoint e mapping idempotencyKey → resultado

### MODIFIED → CONFIRMED
- Emitir ReservationModified
- Retornar reserva atualizada (totais explícitos)

## Invariants
- Sem alterações parciais
- Qualquer alteração que mude valor deve retornar total explícito

## Observability
- Métricas: sucesso/falha por POLICY_VIOLATION, RATE_CHANGED
- Logs: requestId + reservationId + idempotencyKey + before/after (sem PII sensível)
