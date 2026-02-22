# Saga — ARI Apply Pipeline

## Objective
Processar eventos ARI com dedupe, validação, normalização, aplicação e ACK, suportando replay seguro e out-of-order.

## States
RECEIVED → DEDUPED → VALIDATED → NORMALIZED → APPLIED → ACKED (terminal)

## Transitions
### RECEIVED → DEDUPED
- Checar eventId em store de dedupe
- Se já visto: registrar dedupe e finalizar (terminal "ACKED" com no-op)

### DEDUPED → VALIDATED
- Validar schema e campos obrigatórios
- Validar contexto (domínio DISTRIBUTION, channelCode/appKey)
- Se inválido: VALIDATION_ERROR (rotear para DLQ se necessário)

### VALIDATED → NORMALIZED
- Converter payload para modelo canônico interno
- Ajustar timezone e arredondamento se aplicável

### NORMALIZED → APPLIED
- Aplicar no cache/store de ARI (system-of-truth do canal) OU encaminhar ao system-of-record, conforme estratégia
- Resolver out-of-order: "último occurredAt vence"

### APPLIED → ACKED
- Emitir ARIUpdated (evento interno)
- Confirmar processamento

## Invariants
- Um evento nunca é aplicado duas vezes
- Replay do mesmo eventId é no-op
- Out-of-order converge para o estado mais recente

## Observability
- Métricas: ARI lag, dedupe rate, DLQ count, apply latency
- Logs: requestId + eventId + roomTypeCode + ratePlanCode + date
