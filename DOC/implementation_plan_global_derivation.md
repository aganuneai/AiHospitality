# Plano de Implementação: Derivação Global de Ocupação e Tiers

Este plano detalha as alterações necessárias para que os planos tarifários derivados (Child Rate Plans) herdem e calculem automaticamente os valores de ocupação (Adultos) e os preços fixos de crianças (Child Tiers) a partir de seus planos pais.

## Objetivo
Atualmente, a derivação só se aplica ao valor base (Double). Se um plano pai tem descontos para Single ou preços específicos para crianças, o plano derivado não os herda automaticamente a menos que sejam preenchidos manualmente. O objetivo é que o plano derivado seja uma "cópia fiel" da estrutura do pai, aplicada pelo modificador global (porcentagem ou valor fixo).

## Mudanças Propostas

### 1. Serviço de ARI (Backend)
#### [MODIFY] [ari-service.ts](file:///d:/Antigravity/AiHospitality/web/src/lib/services/ari-service.ts)
- Transformar `calculateOccupancyRates` em uma função assíncrona.
- Se o `ratePlan` atual tiver um `parentRatePlanId`:
  - Buscar o `parentRatePlan` no banco de dados.
  - Para cada ocupação de Adulto (Single, Triple, Quad, Extra):
    - Se o valor no plano derivado for `0`, herdar o valor/lógica do pai.
    - O cálculo final deve ser: `PreçoFinal = Parent.PreçoFinal(Ocupação) * Modificador(Derivado)`.
    - **Regra de Adulto**: Valores para adultos nunca podem ser zero. Fallback para a tarifa base (Double) caso ocorra erro ou valor zerado.
  - Para as Crianças (Tiers):
    - Herdar a ativação e idades máximas do pai.
    - Calcular o preço derivado: `PreçoCriançaFinal = Parent.PreçoCriança * Modificador(Derivado)`.
    - **Regra do Zero Explícito**: Se o valor no plano pai for exatamente `0` (não paga), ele permanece `0` no derivado, ignorando modificadores.

### 2. API de Ocupação
#### [MODIFY] [route.ts (occupancy-rates)](file:///d:/Antigravity/AiHospitality/web/src/app/api/v1/admin/ari/occupancy-rates/route.ts)
- Atualizar a rota para aguardar (`await`) o resultado de `calculateOccupancyRates`.

## Plano de Verificação

### Testes Manuais
1. Criar um Plano Pai "BAR" com:
   - Base: $200
   - Individual (Single): -10% -> $180
   - Criança Tier 1: $100
2. Criar um Plano Derivado "PROMO" de "BAR" com:
   - Derivação: -10% PERCENTAGE
3. Abrir o "Conferência de Ocupantes" no Grid ARI para o plano "PROMO".
4. Validar se os valores mostrados são:
   - Base: $180 (Derivado de $200)
   - Individual: $162 (Derivado de $180 do pai).
   - Criança Tier 1: $90 (Derivado de $100 do pai).
