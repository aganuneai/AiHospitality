# Plano de Implementação: Configurações Globais (/admin/settings)

Este plano descreve a criação da página de configurações centrais do hotel, baseada na referência do BoutiqueHotel, adaptada para o design system `neo` (Jakarta/Outfit fonts, Slate palette).

## Objetivo
Centralizar a configuração de identidade do hotel, políticas de cancelamento e preferências de pagamento em uma interface moderna e funcional.

## Mudanças Propostas

### 1. Banco de Dados (Prisma)
#### [MODIFY] [schema.prisma](file:///d:/Antigravity/AiHospitality/web/prisma/schema.prisma)
Adicionar campos de contato e metadados ao modelo `Property`:
- `email` (String?)
- `phone` (String?)
- `address` (String?)
- `metadata` (Json?) - Para armazenar políticas de cancelamento, taxas de impostos e métodos de pagamento.

### 2. Backend (API)
#### [NEW] [route.ts (settings)](file:///d:/Antigravity/AiHospitality/web/src/app/api/v1/admin/settings/route.ts)
- `GET`: Retorna os dados da propriedade atual.
- `POST`: Atualiza os dados (identidade, políticas e financeiro).

### 3. Frontend (UI)
#### [NEW] [page.tsx (admin/settings)](file:///d:/Antigravity/AiHospitality/web/src/app/admin/settings/page.tsx)
- Implementar interface com abas: **Geral**, **Políticas** e **Pagamento**.
- **Geral**: Nome, descrição, logo, endereço e contatos.
- **Políticas**: Construtor visual de regras de cancelamento (prazo e multa).
- **Pagamento**: Moeda, taxa de imposto e métodos aceitos.
- Utilizar componentes `NeoCard`, `NeoInput`, `NeoButton` e ícones `Lucide`.

## Plano de Verificação

### Automatizado
- Testar a rota de API com um script `curl` ou `node` para garantir que o `metadata` JSON seja salvo e recuperado corretamente.

### Manual
- Acessar `/admin/settings`.
- Alterar o nome do hotel e salvar.
- Configurar uma política de cancelamento e verificar se o JSON de metadados reflete a mudança.
- Trocar a moeda do sistema.
