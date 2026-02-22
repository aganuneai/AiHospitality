# E2E Tests - README

## 🎯 Testes End-to-End com Playwright

Os testes E2E validam fluxos completos de usuário na aplicação AiHospitality PMS.

## 📋 Arquivos de Teste

- `bookings.spec.ts` - Fluxo de reservas (navegação, filtros, criação)
- `ari-calendar.spec.ts` - Gestão ARI (calendário, bulk updates, event log)

## 🚀 Como Rodar

```bash
# Rodar todos E2E tests
npm run test:e2e

# Rodar com UI interativa
npm run test:e2e:ui

# Rodar apenas um arquivo
npx playwright test e2e/bookings.spec.ts

# Rodar em modo debug
npx playwright test --debug
```

## 📊 O que é testado

### Booking Flow
- ✅ Navegação para página de reservas
- ✅ Listagem de bookings
- ✅ Filtros por status
- ✅ Busca por PNR
- ✅ Criação via API

### ARI Calendar
- ✅ Carregamento do calendário
- ✅ Tabela de disponibilidade
- ✅ Navegação entre meses
- ✅ Bulk update dialog
- ✅ Event log viewer
- ✅ APIs de availability e rates

## 🛠️ Configuração

O Playwright está configurado para:
- Usar Chromium (Desktop Chrome)
- Iniciar servidor dev automaticamente
- Capturar screenshots em falhas
- Gerar relatório HTML

## 📝 Escrevendo Novos Testes

```typescript
import { test, expect } from '@playwright/test';

test('meu novo teste', async ({ page }) => {
  await page.goto('/minha-pagina');
  
  await expect(page.locator('h1')).toContainText('Meu Título');
});
```

## 🔍 Visualizando Resultados

Após rodar testes, veja o relatório:

```bash
npx playwright show-report
```
