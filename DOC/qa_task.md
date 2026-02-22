# QA Checklist: ARI & Overbooking Protection

## Fase 1: Auditoria de Código (Static Analysis)
- [x] Validar lógica de `Math.min` em todos os repositórios (`InventoryRepository`).
- [x] Verificar redundância de `prisma.room.count` em transações em lote para evitar race conditions.
- [x] Analisar tipagem TypeScript no `BulkUpdateModal` e `ari-service`.

## Fase 2: Validação Funcional (Dynamic Testing)
- [x] Testar `single-update` com valores acima do teto (Vínculo físico).
- [x] Testar `updateBulk` com múltiplos tipos de quarto e limites variados.
- [x] Verificar acurácia das mensagens de `warnings` retornadas no Frontend.

## Fase 4: Revenue Management Audit & Strategy
- [x] Testar derivação em cascata (Ex: BAR -> Superior +10% -> VIP +5% sobre Superior).
- [x] Validar todas as regras de arredondamento (`ENDING_99`, `ENDING_90`, `MULTIPLE_5`, `MULTIPLE_10`).
- [x] Validar auditoria de derivação no `AriEvent` (campos `_autoDerivedFrom` e `_rmCalculation` em `payload`).
- [x] Verificar se "Manual Override" (🔒) bloqueia corretamente atualizações automáticas de derivação.
