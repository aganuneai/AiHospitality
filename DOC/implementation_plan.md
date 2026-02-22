# Plano de Implementação: Limpar Overrides de Tarifa

Implementar a capacidade de remover overrides manuais (locks) no Grid ARI através de um menu de contexto (botão direito) nas células de tarifa, conforme solicitado pelo usuário.

## Mudanças Propostas

### 🟢 Backend (API)

#### [MODIFICAR] [route.ts](file:///d:/Antigravity/AiHospitality/web/src/app/api/v1/admin/ari/single-update/route.ts)
- Adicionar suporte ao campo `field: 'clear_price'`.
- Na lógica de `clear_price`:
    - Deletar o registro de `Rate` correspondente.
    - Se houver planos derivados, forçar a atualização dos mesmos para garantir que voltem a refletir o valor do pai (ou fiquem nulos se o pai foi limpo).
    - Registrar um evento `RATE` no log de auditoria indicando a remoção do override.

### 🔵 Frontend (Componentes)

#### [MODIFICAR] [AriGridRateCell.tsx](file:///d:/Antigravity/AiHospitality/web/src/app/admin/ari/components/AriGridRateCell.tsx)
- Adicionar handler `onContextMenu` para abrir um menu de contexto customizado.
- Implementar o menu com a opção "Limpar Override Manual".
- Adicionar diálogo de confirmação ("Deseja realmente remover o override manual desta tarifa?").
- Chamar a API com `field: 'clear_price'`.
- Toast de sucesso/erro.

## Plano de Verificação

### Testes Manuais
1. Criar um override manual (lock) em uma tarifa.
2. Clicar com o botão direito na célula.
3. Selecionar "Limpar Override".
4. Confirmar o diálogo.
5. Verificar se o ícone de cadeado sumiu e se a tarifa voltou ao valor derivado (ou ficou vazia se era base).
6. Verificar o log de auditoria.
