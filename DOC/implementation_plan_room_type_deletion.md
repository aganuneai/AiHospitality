# Plano de Implementação: Governança de Exclusão de Tipo de Quarto 🛡️

Este plano visa implementar uma trava de segurança na API de exclusão de Tipo de Quarto (`RoomType`), permitindo a remoção apenas se não houverem dependências ativas que possam causar erros de integridade ou perda de histórico.

## Mudanças Propostas

### 🛠️ API de Administração

#### [MODIFY] [route.ts](file:///d:/Antigravity/AiHospitality/web/src/app/api/v1/admin/room-types/%5Bid%5D/route.ts)
- Implementar verificação prévia usando `prisma.room.count` e `prisma.reservation.count`.
- Retornar erro `400 Bad Request` com mensagem clara se dependências forem encontradas.
- Manter a exclusão via Prisma se a validação passar.

## Regras de Negócio
- **Bloquear** se `rooms > 0`.
- **Bloquear** se `reservations > 0`.
- **Opcional**: Verificar `Inventory` e `Rate`. (Se houverem muitos registros históricos, podemos decidir se limpamos ou se bloqueamos. Para este estágio, vamos focar em Quartos e Reservas como solicitado pelo usuário).

## Plano de Verificação

### Testes Manuais
1. Tentar excluir um Tipo de Quarto que possui quartos físicos cadastrados. (Deve falhar)
2. Tentar excluir um Tipo de Quarto que possui reservas (mesmo canceladas, por histórico). (Deve falhar)
3. Criar um Tipo de Quarto novo, sem nada vinculado, e excluir. (Deve funcionar)
