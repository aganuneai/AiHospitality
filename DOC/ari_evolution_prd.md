# PRD: Evolução Estratégica do Grid ARI

## 🎯 Objetivo
Transformar o Grid ARI de uma ferramenta de inserção de dados em um monitor de **Inteligência de Receita**, aumentando a velocidade de tomada de decisão e reduzindo erros operacionais.

## 👤 Personas
- **Revenue Manager (RM)**: Precisa de contexto (eventos, concorrência) para precificar.
- **Gerente de Reservas**: Precisa ver a disponibilidade total para fechar grupos.
- **Operador de Front Desk**: Precisa de uma visão rápida e à prova de erros.

---

## 🚀 Propostas de Melhoria (Roadmap Sprints 5 & 6)

### 1. Inteligência de Contexto (Contextual Awareness)
- **[MUST] Event Calendar Overlay**: Adicionar um subtítulo nas datas do grid indicando feriados e eventos locais cadastrados.
- **[SHOULD] Occupancy Summary Row**: Uma linha fixa no topo que mostra a ocupação **total** da propriedade (Soma de todos os Room Types).

### 2. Segurança e Controle (Ops & Safety)
- **[MUST] Transactional Undo**: Botão de "Desfazer" para os últimos Bulk Updates via Audit Logs.
- **[SHOULD] Bulk Update Templates**: Salvar configurações comuns (Ex: "Promoção Fim de Semana") para aplicar com um clique.

### 3. Analytics Inline (Actionable Insights)
- **[COULD] RevPAR/ADR Daily View**: Mostrar os indicadores financeiros projetados para o dia no cabeçalho da coluna.
- **[COULD] Pace Indicator**: Pequena seta (up/down) comparando a ocupação atual com o dia anterior ou semana anterior.

### 4. Excelência Técnica (Aesthetics & Performance)
- **Virtual Scrolling**: Implementação de virtualização para grids com +50 linhas.
- **Smooth Cell Transitions**: Micro-animações ao salvar valores para confirmação visual premium.

---

## 📊 Plano de Execução Sugerido

### Fase 1: Visibilidade (Quick Wins)
- Implementar a **Linha de Sumário de Ocupação Total**.
- Adicionar o **Calendário de Feriados/Eventos** no cabeçalho.

### Fase 2: Segurança (Core)
- Implementar a lógica de **Undo** baseada nos `AriEvent` já registrados.

---

## 🛑 Socratic Gate for Stakeholder
1. Para a **Linha de Sumário**, você prefere que ela mostre apenas a disponibilidade absoluta ou a porcentagem média da propriedade?
2. Para o **Calendário de Eventos**, devemos permitir que você cadastre os eventos manualmente ou prefere uma integração externa (Ex: Google Calendar/API de Feriados)?
