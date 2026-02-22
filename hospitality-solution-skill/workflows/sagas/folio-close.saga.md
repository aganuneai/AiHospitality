# Saga — Folio Close

## Objective
Fechar folio com totalização correta, validação de pendências e trilha auditável.

## States
OPEN → VALIDATED → TOTALIZED → CLOSED (terminal)

## Transitions
### OPEN → VALIDATED
- Validar que folio existe e está OPEN
- Validar que não há itens pendentes de posting/reversals
- Se inválido: CONFLICT ou VALIDATION_ERROR

### VALIDATED → TOTALIZED
- Recalcular totais (base/taxes/fees/total) e comparar com itens
- Se mismatch: CONFLICT (com detalhes)

### TOTALIZED → CLOSED
- Fechar folio no system-of-record (se aplicável)
- Emitir FolioClosed
- Retornar folio com status CLOSED

## Invariants
- CLOSED é imutável
- Totais devem bater com itens

## Observability
- Métricas: folio close success/fail, mismatch rate
- Logs: requestId + folioId + reservationId
