# Plano de Implementação: Matriz de Disponibilidade Pro Max 🚀

Este plano detalha a implementação da **Matriz de Disponibilidade de 30 Dias**, consolidando dados de inventário, ocupação e receita em uma visão única e acionável.

## 🎯 Objetivo
Transformar uma simples tabela de números em uma ferramenta de decisão estratégica (cockpit), permitindo que o hoteleiro identifique gargalos de ocupação e oportunidades de receita instantaneamente.

## 🚀 Diferenciais "Pro Max" (Surpresas)

- **Integração Realtime**: Dados extraídos diretamente do banco de dados (Prisma) cruzando `RoomType` e `Booking`.
- **ARI Context Layer**: Além da disponibilidade, exibiremos a **Tarifa Base** do dia em cada célula (Small text overlay).
- **Quick-Booking Trigger**: Clique em uma célula disponível inicia o fluxo de "Nova Reserva" com o tipo de quarto e data já selecionados.
- **Visual Heatmap**: Escala de cores inteligente baseada em percentual de ocupação (Emerald -> Amber -> Red).
- **Indicador de Limpeza**: Badge discreto mostrando quantos quartos estão "Prontos" vs "Sujeitos a Limpeza" para o dia.

---

## 🏗️ Mudanças Propostas

### 🟢 Backend (API)

#### [NEW] [inventory-service.ts](file:///d:/Antigravity/AiHospitality/web/src/services/inventory-service.ts)
- Criar serviço para calcular disponibilidade líquida.
- Lógica: `Disponibilidade = Inventário Total - (Reservas Ativas + Bloqueios de Manutenção)`.

#### [NEW] [/api/v1/inventory/matrix](file:///d:/Antigravity/AiHospitality/web/src/app/api/v1/inventory/matrix/route.ts)
- Endpoint que retorna o array de 30 dias com metadados para cada combinação de Data/TipoQuarto.

---

### 🔵 Frontend (UI/UX)

#### [NEW] [AvailabilityMatrix.tsx](file:///d:/Antigravity/AiHospitality/web/src/components/analytics/availability-matrix/AvailabilityMatrix.tsx)
- Componente container principal adaptado para o Design System Neo.

#### [NEW] [AvailabilityGrid.tsx](file:///d:/Antigravity/AiHospitality/web/src/components/analytics/availability-matrix/AvailabilityGrid.tsx)
- Grid de alta performance com suporte a `Sticky Columns` e `Tooltips`.

#### [MODIFY] [neo-sidebar.tsx](file:///d:/Antigravity/AiHospitality/web/src/components/neo/neo-sidebar.tsx)
- Adicionar o menu "Matriz de Disponibilidade" sob "Receita & Inventário".

---

## ✅ Plano de Verificação

### Testes Automatizados
- Validar se o cálculo de disponibilidade ignora reservas canceladas.
- Testar a performance da query para 30 dias em hotéis com +100 quartos.

### Verificação Manual
- Comparar os números da Matriz com a lista de reservas.
- Validar se o clique na célula abre corretamente o formulário de reserva.
- Checar se as cores do Heatmap mudam conforme novas reservas são inseridas.

---
— Orion, escalando a inteligência hoteleira 🎯
