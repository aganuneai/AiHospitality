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

## Fase 12: Evolução das Reservas (Dashboard & B2B) [x]
- [x] Dashboards de Operação (Arrivals/Departures/In-House).
- [x] Painel lateral de detalhes na listagem.
- [x] Suporte Corporativo (Empresa/Agência) no formulário de reserva.
- [x] Lógica de Faturamento Diferenciado (Bill To).

## Fase 13: Dashboards de Performance por Rate Plan [x]
- [x] Implementar `AnalyticsService.getRatePlanPerformance`.
- [x] Criar API Route `/api/v1/admin/analytics/rate-plans`.
- [x] Desenvolver Componente `RatePlanPerformanceView`.
- [x] Integrar nova visão ao Dashboard de Analytics.

## Fase 14: Matriz de Disponibilidade Pro Max [x]
- [x] Analisar código base e requisitos de "nível Pro".
- [x] Criar plano de implementação detalhado (`implementation_plan_availability_matrix.md`).
- [x] Implementar `InventoryService` com lógica de disponibilidade real.
- [x] Desenvolver API `/api/v1/inventory/matrix`.
- [x] Criar componentes de UI `AvailabilityMatrix` e `AvailabilityGrid`.
- [x] Integrar ações rápidas (Quick Booking) na matriz.
- [x] Corrigir erro de build: Criar componente `Tooltip` ausente em `ui/`.
- [x] Resolver Hydration Mismatch na Matriz Cockpit (Mounted State Pattern).
- [x] Validar heatmap e visual premium no Dashboard.

## Fase 17: Evolução Cockpit Pro Max (Benchmark) [x]
- [x] Criar página exclusiva `/admin/inventory/matrix`.
- [x] Adicionar menu "Matriz Cockpit" no sidebar.
- [x] Corrigir `hotelId` padrão para `HOTEL_001`.
- [x] Remover aba redundante no Dashboard de Revenue.
- [x] Debug e validação de carregamento de dados.
- [x] Implementar linhas sticky (fixas) para sumários de ocupação e disponibilidade.
- [x] Refinar Heatmap com cores premium e indicadores de criticidade.
- [x] Adicionar codificação visual (color strip) por tipo de quarto.
- [x] Implementar toggle de visão (Quantidade vs Porcentagem).
- [x] Adicionar destaque dinâmico para a coluna do dia atual ("Hoje").

## Atividades Concluídas
- [x] Fase 11: Cadastro Full-Page e Expansão 100% CRM.
- [x] Fase 10: Evolução do Módulo de Hóspedes (CRM Premium).
- [x] Fase 12 e 13: dashboards de performance e reservas.
- [x] Brainstorming e Planejamento da Matriz de Disponibilidade.
- [x] Implementação da Matriz Cockpit Exclusiva.
## Fase 16: Localização de Moeda e Formatação Financeira [x]
- [x] Implementar utilidade centralizada `formatCurrency` em `utils.ts`.
- [x] Refatorar componentes de Analytics (`KpiCard`, `Charts`) para usar a nova utilidade.
- [x] Corrigir serviços de cálculo (`QuoteService`, `PaymentSplit`) para respeitar a moeda configurada.
- [x] Validar exibição de `R$` em todo o sistema.

## Fase 18: Governança de Exclusão de Tipo de Quarto [x]
- [x] Implementar validação pré-exclusão para Quartos vinculados.
- [x] Implementar validação pré-exclusão para Reservas vinculadas.
- [x] Retornar mensagens de erro amigáveis (400 Bad Request).
- [x] Testar cenários de exclusão com dependências.

## Fase 19: Estabilização de Ambiente & Tipagem [x]
- [x] Corrigir resolução de módulo do Tooltip (Radix UI).
- [x] Resolver conflitos de `zodResolver` no cadastro de Hóspedes.
- [x] Sincronizar contrato `AriCalendarDay` em todas as rotas de API.
- [x] Validar build de produção (`npm run build`).
