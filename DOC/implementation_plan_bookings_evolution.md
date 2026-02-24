# Planejamento: Evolução do Módulo de Reservas (CRM & Corporativo)

Este plano descreve a evolução do módulo de reservas para alinhar o **AiHospitality** com os padrões premium do **BoutiqueHotel**, focando em inteligência de dados, suporte corporativo e UX avançada.

## Mudanças Propostas

### 🛠️ [Listagem de Reservas] (admin/bookings/page.tsx)
Transformar a tabela simples em um Dashboard de Operações.
- **KPIs de Operação**: Adicionar cards de Chegadas, Partidas, In House e Ocupação.
- **Filtragem por Status**: Links rápidos para filtrar a visão operacional.
- **Painel de Detalhes (Side Panel)**: Implementar a visão expandida à direita ao selecionar uma reserva, permitindo check-in rápido e visualização de notas sem sair da tela.
- **Accompanying Guests**: Ajustar a tabela para mostrar hóspedes acompanhantes relacionados à reserva principal (estilo sub-row).

### 🏛️ [Nova Reserva - Arquitura Corporativa] (admin/bookings/new/...)
Evoluir o `BookingFormBlock` para suportar cenários B2B.
- **Entidades Comerciais**: Integrar seleção de Empresa e Agência na reserva.
- **Responsabilidade Financeira (Bill To)**: Implementar a lógica de "Quem Paga" (Hóspede, Empresa ou Agência).
- **Layout em 3 Colunas**: Reestruturar o formulário para seguir o grid lógico: [Contatos/Hóspede] | [Entidades Comerciais] | [Faturamento].
- **Rooming List**: Refinar a gestão de múltiplos quartos em uma única reserva (PNR único).

## Plano de Verificação

### Testes Manuais
1. Criar uma reserva corporativa associada a uma empresa.
2. Validar se a responsabilidade de faturamento (Bill To Company) reflete no Folio.
3. Verificar na listagem se os KPIs atualizam em tempo real após uma nova reserva.
4. Testar a responsabilidade responsiva do novo layout de 3 colunas.
