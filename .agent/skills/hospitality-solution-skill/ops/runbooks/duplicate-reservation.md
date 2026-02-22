# Playbook — Duplicidade de Reserva (Book) por retry/timeout

## Sinais
- Reclamação de cliente: “duas reservas”
- Criação de reservas/min sobe sem aumento de tráfego
- PMS mostra múltiplos PNRs para mesmo hóspede/datas

## Diagnóstico
1) Localizar correlationId/requestId
2) Verificar idempotencyKey presente
3) Identificar se timeout ocorreu pós-criação

## Mitigação
- Bloquear criação sem idempotencyKey (hard gate)
- Ativar enforcement de idempotência
- Cancelar duplicada com procedimento seguro

## Recuperação
- Job de reconciliação e fila de revisão
- Auditar refunds

## Prevenção
- Idempotência obrigatória
- Teste caos “timeout pós-criação + retry”
