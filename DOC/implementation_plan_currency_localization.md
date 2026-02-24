# Plano de Implementação: Localização de Moeda (R$ vs US$) 💰

O sistema está configurado para **Real Brasileiro (R$)**, mas diversos componentes de analytics e serviços de cálculo estão exibindo valores em dólares (USD). Este plano visa centralizar a lógica de formatação de moeda e corrigir as ocorrências hardcoded.

## Mudanças Propostas

### 🛠️ Core / Utils

#### [MODIFY] [utils.ts](file:///d:/Antigravity/AiHospitality/web/src/lib/utils.ts)
- Adicionar função `formatCurrency(value: number, currency?: string)` que utiliza `Intl.NumberFormat` com `pt-BR` e padrão `BRL`.

---

### 📊 Analytics & UI Components

#### [MODIFY] [KpiCard.tsx](file:///d:/Antigravity/AiHospitality/web/src/components/analytics/KpiCard.tsx)
- Substituir a formatação local por `formatCurrency`.

#### [MODIFY] [RevenueChart.tsx](file:///d:/Antigravity/AiHospitality/web/src/components/analytics/RevenueChart.tsx)
- Atualizar o `tooltip` e o `YAxis` para usar a utilidade centralizada.

#### [MODIFY] [RoomTypeChart.tsx](file:///d:/Antigravity/AiHospitality/web/src/components/analytics/RoomTypeChart.tsx)
- Atualizar tooltips.

#### [MODIFY] [ChannelPieChart.tsx](file:///d:/Antigravity/AiHospitality/web/src/components/analytics/ChannelPieChart.tsx)
- Atualizar tooltips.

---

### ⚙️ Serviços & Business Logic

#### [MODIFY] [quote-service.ts](file:///d:/Antigravity/AiHospitality/web/src/lib/services/quote-service.ts)
- Garantir que as citações de preço usem a moeda correta (BRL por padrão).

#### [MODIFY] [rate-calculator-block.tsx](file:///d:/Antigravity/AiHospitality/web/src/app/admin/bookings/new/components/rate-calculator-block.tsx)
- Corrigir a exibição de totais na criação de reserva.

## Plano de Verificação

### Testes Manuais
- Acessar o Dashboard de Receita e verificar se os KPIs exibem `R$`.
- Verificar se os gráficos de receita mostram `R$` nos tooltips e eixos.
- Criar uma nova reserva e verificar se o resumo de preços exibe `R$`.
