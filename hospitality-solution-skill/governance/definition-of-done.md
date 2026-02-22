# Definition of Done (Hotelaria)

Um fluxo só é "Done" quando:
- possui saga/state machine definida
- possui schema canônico validável
- possui idempotência (writes)
- emite eventos e suporta dedupe/replay quando aplicável
- possui BDD mínimo automatizado
- possui observabilidade (logs, métricas, tracing)
- possui runbook/mitigação para incidentes típicos
