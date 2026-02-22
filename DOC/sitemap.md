# Information Architecture & Sitemap

Com base na auditoria das rotas existentes no backend (`src/app/api/v1`), este é o novo mapa do sistema que guiará a construção da Sidebar principal. Cada item terá sua própria tela no novo design premium.

---

## 📅 Recepção & Reservas (Front Desk)
- **Dashboard:** Visão geral diária (Ocupação hoje, Chegadas, Partidas).
- **Nova Reserva (Booking Engine):** Interface moderna para gerar cotações e criar novas reservas.
- **Lista de Reservas:** Tabela de listagem e pesquisa de reservas ativas, canceladas e concluídas (`/api/v1/admin/bookings`).
- **Hóspedes:** Base de dados de clientes e histórico (`/api/v1/admin/guests` e `/api/v1/admin/grid`).

## 📊 Receita & Inventário (Revenue Management)
- **Mapa ARI (Matrix):** Grade tática moderna de disponibilidade, tarifas e restrições (`/api/v1/admin/ari/grid`).
- **Atualização em Massa (Bulk Update):** Ferramenta acoplada ao mapa ARI (`/api/v1/admin/ari/bulk`).
- **Analytics de Ocupação:** Gráficos interativos e métricas de desempenho (`/api/v1/admin/analytics/occupancy`).
- **Auditoria de Receitas:** Detalhamento financeiro, folios e transações (`/api/v1/admin/analytics/revenue/audit`).
- **Log de Eventos (ARI):** Log técnico de alterações de preços/inventário (`/api/v1/ari/events`).

## 🏨 Produtos & Monetização (Catalog)
- **Tipos de Quartos:** Gerenciamento dos quartos base (`/api/v1/admin/room-types`).
- **Pacotes (Packages):** Combos de hospedagem + extras (`/api/v1/admin/packages`).
- **Upsells:** Motor de ofertas de upgrade (`/api/v1/admin/upsell`).

## ⚙️ Configurações (Settings)
- **Pagamentos & Integrações:** Logs de pagamentos e splits (`/api/v1/payments/split`).
- **Segurança & Auditoria Global:** Logs de sistema (`/api/v1/audit-logs`).
- **Saúde do Sistema:** Status dos microsserviços do backend (`/api/v1/health`, `/api/v1/metrics`).

---

**Objetivo de Design:** A Sidebar deve agrupar essas 4 sessões em menus colapsáveis (Accordion) ou com cabeçalhos distintos de categorias, utilizando ícones modernos (Lucide Icons) e estados de "Hover" e "Active" elegantes.
