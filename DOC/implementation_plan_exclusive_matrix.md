# Plano: Matriz Cockpit Exclusiva e Debug de Dados

O usuário solicitou que a Matriz de Disponibilidade seja uma tela de destaque com acesso direto pelo menu e reportou que a tela está vazia.

## Alterações Propostas

### 🟢 Interface & Navegação
- [NEW] **Página Exclusiva**: Criar `web/src/app/admin/inventory/matrix/page.tsx` para servir como o cockpit de destaque.
- [MODIFY] **Sidebar**: Adicionar item "Matriz de Disponibilidade" no grupo "Receita & Inventário".
- [MODIFY] **Dashboard de Revenue**: Remover a aba de inventário para manter a exclusividade da nova tela (conforme solicitado).

### 🔴 Debug & Estabilidade
- **Check de Dados**: Verificar se existem `RoomType` cadastrados e se o `InventoryService` está retornando array vazio.
- **API Fix**: Ajustar a rota de API caso falte algum parâmetro obrigatório (como `hotel-id` padrão).
- **Fallback UI**: Adicionar estado de "Empty State" amigável caso não haja tipos de quarto.

## Plano de Verificação
- [ ] Acessar via novo menu lateral.
- [ ] Validar carregamento de dados reais do Prisma.
- [ ] Testar navegação de datas.
