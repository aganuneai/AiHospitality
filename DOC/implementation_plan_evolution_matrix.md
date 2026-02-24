# Plano de Evolução: Matriz Cockpit (Benchmark Boutique Hotel) 🚀

Após análise do componente de referência no projeto `BoutiqueHotel`, identificamos oportunidades de elevar a **Matriz Cockpit** para um nível "Pro Max", melhorando a legibilidade tática e a fluidez da interface.

## Mudanças Propostas

### 🎨 Visual & Heatmap (UX)

#### [MODIFY] [AvailabilityGrid.tsx](file:///d:/Antigravity/AiHospitality/web/src/components/analytics/availability-matrix/AvailabilityGrid.tsx)
- **Heatmap Gradiente**: Evoluir o `getHeatmapColor` para usar gradientes e sombras internas em estados críticos (ex: Sold Out com brilho sutil).
- **Indicador de Tipo de Quarto**: Adicionar uma borda colorida dinâmica à esquerda de cada linha de Tipo de Quarto para facilitar o rastreamento visual horizontal.
- **Scroll Infinito Tático**: Garantir que as linhas de "Ocupação %" e "Total Disponível" sejam **sticky** (fixas) no rodapé da tabela ao realizar o scroll vertical.

### ⚙️ Funcionalidades Pro

- **Toggle de Visão**: Adicionar suporte a um `viewMode` que permita alternar no cabeçalho entre visualizar a disponibilidade em **Quantidade** ou **Porcentagem**.
- **Destaque de "Hoje"**: Aplicar um fundo sutil (ex: `rose-500/5`) na coluna correspondente à data atual para orientação imediata.

## Plano de Verificação

### Testes Visuais (Browser)
- Verificar se as linhas de sumário permanecem fixas ao rolar uma lista longa de tipos de quarto.
- Validar se o heatmap reflete corretamente os novos níveis de criticidade.
- Testar a responsividade do scroll lateral em telas menores.

### Testes de Integração
- Garantir que a alternância entre Quantidade e Porcentagem não gere re-renders pesados que afetem a performance.
