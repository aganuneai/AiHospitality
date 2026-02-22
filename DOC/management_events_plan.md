# Plano de Implementação: Gestão de Eventos (Corrigir/Excluir)

O usuário deseja corrigir eventos inseridos incorretamente. Atualmente, os eventos são exibidos apenas no cabeçalho. Vamos implementar uma interface para gerenciar esses eventos.

## Proposed Changes

### 1. Backend: API de Eventos
- **[MODIFY]** `events/route.ts`: Adicionar suporte ao método `PATCH` ou `PUT` para edição de eventos.
- Garantir que o fallback Raw SQL também suporte a atualização.

### 2. Frontend: Componentes de UI
- **[NEW]** `EventManagerModal.tsx`: Um novo modal ou expansão do existente para listar eventos do período e permitir exclusão/edição.
- **[MODIFY]** `AriGridView.tsx`: Adicionar um ícone ou link no cabeçalho onde os eventos aparecem para abrir o gerenciador.

### 3. Workflow de Correção
- O usuário clica no nome do evento no cabeçalho atau no botão "Adicionar Evento" (que agora pode ser "Gerenciar Eventos").
- Uma lista de eventos para aquele dia (ou período) é exibida.
- O usuário escolhe "Excluir" ou "Editar".

## Verification Plan

### Manual Verification
1. Criar um evento.
2. Clicar no evento no grid ou acessar o gerenciador.
3. Editar o título/cor e salvar.
4. Excluir o evento e verificar se ele desaparece do grid.
