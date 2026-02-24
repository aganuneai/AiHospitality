# Evolução Final do Módulo de Hóspedes (CRM Premium 360º)

Este plano detalha a transição do módulo de hóspedes para uma experiência de CRM de tela cheia, incorporando campos avançados de inteligência e widgets analíticos, conforme a visão premium do BoutiqueHotel.

## User Review Required

> [!IMPORTANT]
> **Migração para Tela Cheia (Full-Page)**: O formulário de cadastro/edição não será mais um Modal (Dialog). Ele ocupará toda a área de conteúdo do admin, permitindo um layout de 3 colunas extremamente rico em dados.
> **Vantagens de UX**: Melhor aproveitamento de espaço para widgets analíticos (LTV, Gráficos de Relacionamento) e formulários complexos.

> [!WARNING]
> **Expansão do Schema**: Adicionaremos campos fundamentais como `dateOfBirth`, `language`, `nationality`, `marketCode` e flags de marketing ao banco de dados.

## Mudanças Propostas

### 1. Database (Schema)
- **[MODIFY] [schema.prisma](file:///d:/Antigravity/AiHospitality/web/prisma/schema.prisma)**:
    - Expandir `GuestProfile` com:
        - `dateOfBirth` (DateTime?)
        - `language` (String?)
        - `nationality` (String?)
        - `marketCode` (String?)
        - Flags: `active` (Boolean), `doNotDisturb` (Boolean), `noPost` (Boolean).
        - Loyalty: `loyaltyTier`, `loyaltyPoints`.

### 2. Frontend Layout & Estrutura
- **[MODIFY] [page.tsx](file:///d:/Antigravity/AiHospitality/web/src/app/admin/guests/page.tsx)**:
    - Adicionar estado `isRegistrationView` (Boolean).
    - Se `true`, renderizar o novo componente `GuestRegistrationView` e ocultar a listagem.
    - Implementar animação de transição suave.

- **[NEW] [GuestRegistrationView.tsx](file:///d:/Antigravity/AiHospitality/web/src/app/admin/guests/components/GuestRegistrationView.tsx)**:
    - Componente principal de tela cheia com layout de 3 colunas:
        - **Coluna Esquerda (Identidade)**: Avatar premium, Tier Badge, Contatos e Resumo de Endereço.
        - **Coluna Central (Formulário)**: Abas `Details`, `Preferences`, `Rates`, `Membership`.
        - **Coluna Direita (Insights AI)**: Widgets `Relationship Web`, `AI LTV (Predicted Spend)`, `Stay History Summary`.

- **[DELETE] [GuestEditDialog.tsx](file:///d:/Antigravity/AiHospitality/web/src/app/admin/guests/components/GuestEditDialog.tsx)**:
    - Remover componente antigo em favor da nova visão.

### 3. API & LOGIC
- **[MODIFY] [route.ts](file:///d:/Antigravity/AiHospitality/web/src/app/api/v1/admin/guests/route.ts)**:
    - Atualizar endpoints para suportar os novos campos de CRM.

## Plano de Verificação

### Automated Tests
- Executar `npx prisma db push` para validar as migrações.
- Testar POST/PUT com o novo payload de 100% dos campos.

### Manutenção de UX
- Validar a navegação de "Voltar para Lista" (`Back to Guest List`).
- Verificar a integridade dos dados ao transitar entre abas no formulário full-page.
- Audit de responsividade para garantir que as 3 colunas se comportem bem em diferentes resoluções.
