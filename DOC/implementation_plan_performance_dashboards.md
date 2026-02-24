# Plano de Implementação: Dashboards de Performance por Rate Plan (Fase 13)

Este plano detalha a implementação de dashboards analíticos avançados focados na performance de cada plano tarifário (Rate Plan). O objetivo é fornecer insights sobre Receita, ADR, Noites Vendidas e Market Share por tarifa.

## 🎯 Objetivos
1. Criar métricas agregadas por Rate Plan no `AnalyticsService`.
2. Implementar endpoint de API para consumo desses dados.
3. Desenvolver interface visual com gráficos e tabelas comparativas.

## 🛠️ Mudanças Propostas

### 🟢 Backend (Serviços e API)

#### [MODIFICAR] [analytics-service.ts](file:///d:/Antigravity/AiHospitality/web/src/lib/services/analytics-service.ts)
- Adicionar o método `getRatePlanPerformance(from: Date, to: Date, hotelId: string)`.
- Lógica:
    - Buscar reservas `CONFIRMED` ou `CHECKED_OUT` no período.
    - Agrupar por `ratePlanId`.
    - Calcular: `Revenue` (via Folio), `Room Nights`, `ADR` e `% de Share`.

#### [NOVO] [route.ts](file:///d:/Antigravity/AiHospitality/web/src/app/api/v1/admin/analytics/rate-plans/route.ts)
- Endpoint `GET` que recebe `from`, `to` e `hotelId`.
- Chama o novo método do `AnalyticsService`.

### 🔵 Frontend (Interface)

#### [NOVO] [rate-plan-performance-view.tsx](file:///d:/Antigravity/AiHospitality/web/src/app/admin/analytics/components/rate-plan-performance-view.tsx)
- Componente principal de visualização.
- Gráfico de pizza/rosca para distribuição de receita por plano.
- Tabela de performance detalhada com indicadores de tendência.

#### [MODIFICAR] [page.tsx](file:///d:/Antigravity/AiHospitality/web/src/app/admin/analytics/page.tsx)
- Integrar a nova visão de performance por Rate Plan como uma aba ou seção dedicada.

## 🧪 Plano de Verificação

### Testes Manuais
- [ ] Verificar se as reservas criadas na Fase 12 aparecem corretamente no agrupamento por Rate Plan.
- [ ] Validar o cálculo do ADR comparando com os valores manuais da reserva.
- [ ] Testar a responsividade do gráfico em diferentes tamanhos de tela.

### Automação (Opcional)
- Script de teste para verificar o formato do payload de retorno da API de Analytics.
