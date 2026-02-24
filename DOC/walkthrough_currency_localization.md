# Walkthrough: Localização de Moeda (R$ vs US$) 💰

Este documento detalha as mudanças realizadas para garantir que o sistema exibe corretamente a moeda em **Real Brasileiro (R$)**, respeitando as configurações globais e eliminando o hardcode de dólar.

## 🛠️ Mudanças Realizadas

### 1. Utilidade Centralizada: `formatCurrency`
- **Arquivo**: `web/src/lib/utils.ts`
- **O que mudou**: Criamos e exportamos a função `formatCurrency`. Ela utiliza o `Intl.NumberFormat` nativo configurado para `pt-BR` e `BRL`.
- **Flexibilidade**: A função aceita opções extras como `notation: 'compact'`, essencial para labels de gráficos.

### 2. Dashboards de Analytics
- **KPIs**: O componente [KpiCard.tsx](file:///d:/Antigravity/AiHospitality/web/src/components/analytics/KpiCard.tsx) agora exibe o símbolo `R$` em todos os cartões financeiros.
- **Gráficos**: [RevenueChart.tsx](file:///d:/Antigravity/AiHospitality/web/src/components/analytics/RevenueChart.tsx), [RoomTypeChart.tsx](file:///d:/Antigravity/AiHospitality/web/src/components/analytics/RoomTypeChart.tsx) e [ChannelPieChart.tsx](file:///d:/Antigravity/AiHospitality/web/src/components/analytics/ChannelPieChart.tsx) foram atualizados. Os eixos e tooltips agora mostram valores localizados (ex: `R$ 10k` em vez de `USD 10k`).

### 3. Motor de Reservas e Cotação
- **QuoteService**: O serviço de cotação de backend agora transaciona em `BRL` por padrão.
- **Calculadora**: O componente [RateCalculatorBlock.tsx](file:///d:/Antigravity/AiHospitality/web/src/app/admin/bookings/new/components/rate-calculator-block.tsx) foi totalmente traduzido e localizado. Símbolos de `$` foram removidos e substituídos por `R$`.

## ✅ Verificação de Resultados

- **Dashboard de Receita**: Os valores de receita total e diária agora aparecem como `R$ 1.250,50`.
- **Criação de Reserva**: O resumo financeiro exibe "Total Estimado" em `R$` com a nota "Cotação em Reais".
- **API**: A resposta do `/api/v1/admin/analytics/revenue` agora é interpretada corretamente pelo frontend.

---
— Orion, garantindo que o sistema fale a língua financeira do seu negócio 🎯🦾
