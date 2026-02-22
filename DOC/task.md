# ARI & Revenue Management Roadmap

## Atividades Concluídas 
- [x] Backend: Atualizar GET `/api/v1/ari/events` (Filtros avançados).
- [x] Frontend: `EventLogViewer.tsx` com filtros e Badges de payload.
- [x] DB Schema: Expansão de `RatePlan` (parentRatePlanId, derivedType, derivedValue).
- [x] Backend Service: Lógica inicial de derivação no `updateBulk`.
- [x] Proteção Contra Overbooking (Hard Cap Físico em Bulk e Single Update).
- [x] Frontend: Feedback Visual (Alertas de limite no Bulk Update Modal).
- [x] Integridade: Auditoria atômica com `_originalRequested` e `_appliedCap`.
- [x] **RM - Tarifas Derivadas (Expert Treatment)**
  - [x] Implementar regras de arredondamento (.99, .90, múltiplos de 5) no `RatePlan`.
  - [x] Adicionar suporte a `isManualOverride` no model `Rate`.
  - [x] Refatorar `ari-service.ts` para respeitar overrides e aplicar arredondamento.
  - [x] Criar interface de configuração de derivação em `RatePlansPage`.
  - [x] Mostrar visualmente o "gap" e as travas no grid (Lock & Sparkles icons).
  - [x] Log de auditoria detalhando o cálculo RM (ex: `200 - 10% = 180`).
  - [x] Validar cenários de derivação em cascata.

## Fase 5: Evolução Estratégica (PM/PO Context)
- [x] Brainstorming de melhorias para o Grid ARI.
- [x] Criação do PRD de evolução (`ari_evolution_prd.md`).
- [x] Implementação da Linha de Sumário de Ocupação Total.
- [x] Implementação do Overlay de Calendário de Eventos (Feriados 2026-2028).
- [x] Implementação do Registro Manual de Eventos e Sistema de Undo.
- [x] Gestão de Eventos (Edição e Exclusão):
    - [x] Atualizar API para suportar PATCH/PUT.
    - [x] Criar interface de edição no cabeçalho do Grid.
    - [x] Correção de visibilidade do gatilho modal no controlado.
- [x] Limpeza de Overrides Manuais:
    - [x] Implementar menu de contexto (right-click) em AriGridRateCell.
    - [x] Adicionar diálogo de confirmação para limpeza.
    - [x] Atualizar API single-update para campo 'clear_price'.
    - [x] Corrigir conflitos de UI e propagação de eventos usando Portals.
- [x] Sincronização e Governança Git:
    - [x] Mover repositório da subpasta 'web' para a raiz.
    - [x] Consolidar .gitignore unificado.
    - [x] Organizar documentação em PT-BR na pasta 'DOC'.
    - [x] Realizar commit inicial unificado.
    - [x] Configurar remote origin e realizar push para o GitHub.

## Próximas Fases
- [ ] Dashboards Avançados de Performance por Rate Plan.
- [ ] Integração com Channel Manager (Sincronização de Overrides).
