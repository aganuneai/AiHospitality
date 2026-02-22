# Saga — Quote (Shopping / Pricing)

## Objective
Resolver oferta com regras reais (restrições + políticas + impostos/taxas) e gerar quoteId + pricingSignature para consistência Quote→Book.

## States
INIT → CONTEXT_VALIDATED → AVAILABILITY_RESOLVED → RESTRICTIONS_APPLIED → PRICING_CALCULATED → QUOTE_ISSUED (terminal)

## Transitions
### INIT → CONTEXT_VALIDATED
- Validar Context Envelope (hotel XOR hub, domínio correto, timezone)

### CONTEXT_VALIDATED → AVAILABILITY_RESOLVED
- Consultar disponibilidade real (inventário, allotments, blocks quando aplicável)

### AVAILABILITY_RESOLVED → RESTRICTIONS_APPLIED
- Aplicar restrições: CLOSED/STOP_SELL, CTA, CTD, Min/Max LOS
- Se violação: retornar erro específico (MIN_LOS_VIOLATION, CTA_VIOLATION etc.)

### RESTRICTIONS_APPLIED → PRICING_CALCULATED
- Calcular base + impostos + taxas + total
- Garantir moeda e arredondamento
- Gerar pricingSignature (hash determinístico dos elementos que impactam preço/política)

### PRICING_CALCULATED → QUOTE_ISSUED
- Emitir QuoteIssued (evento de domínio)
- Retornar quoteId + pricingSignature + policies + totais

## Invariants
- Quote é side-effect free: nunca cria reserva e nunca segura inventário
- Quote deve retornar políticas e regras explícitas

## Observability
- Métricas: p95/p99 Quote, error rate por motivo (minLos/cta/stop-sell)
- Logs com requestId + roomTypeCode + ratePlanCode + datas
