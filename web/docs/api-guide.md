# 📚 Guia da API - AiHospitality

## 🌐 Base URL

**Desenvolvimento:** `http://localhost:3000/api/v1`  
**Produção:** `https://api.aihospitality.com/v1`

## 🔑 Autenticação

Todas as requisições requerem o header:

```
x-hotel-id: hotel123
```

---

## 📋 Endpoints

### 1. POST /quotes - Gerar Cotações

Retorna cotações disponíveis para o período solicitado.

**Request:**
```http
POST /api/v1/quotes
Headers:
  x-hotel-id: hotel123
  Content-Type: application/json

Body:
{
  "stay": {
    "checkIn": "2026-06-01",
    "checkOut": "2026-06-03",
    "adults": 2,
    "children": 0
  },
  "roomTypes": ["STANDARD", "DELUXE"]  // Opcional
}
```

**Response (200):**
```json
{
  "quotes": [
    {
      "quoteId": "quote-abc123",
      "pricingSignature": "SIG_xyz789",
      "roomTypeCode": "STANDARD",
      "ratePlanCode": "BAR",
      "currency": "USD",
      "total": 300,
      "breakdown": [
        {
          "date": "2026-05-31",
          "base": 100,
          "taxes": 10,
          "fees": 5,
          "total": 115
        }
      ],
      "policies": {
        "cancellation": { "type": "FLEX", "penalty": 0 }
      }
    }
  ],
  "cached": false
}
```

**Cache:** 5 minutos TTL

---

### 2. POST /bookings - Criar Reserva

Cria uma nova reserva (idempotente).

**Request:**
```http
POST /api/v1/bookings
Headers:
  x-hotel-id: hotel123
  Content-Type: application/json

Body:
{
  "idempotencyKey": "unique-key-12345678",  // Min 8 chars
  "quoteId": "quote-abc123",
  "pricingSignature": "SIG_xyz789",
  "stay": {
    "checkIn": "2026-06-01",
    "checkOut": "2026-06-03",
    "adults": 2,
    "children": 0
  },
  "roomTypeCode": "STANDARD",
  "ratePlanCode": "BAR",
  "primaryGuest": {
    "firstName": "João",
    "lastName": "Silva",
    "email": "joao@example.com",
    "phone": "+5511999999999"  // Opcional
  }
}
```

**Response (201):**
```json
{
  "booking": {
    "reservationId": "uuid-v4",
    "pnr": "A8FC8A",
    "status": "CONFIRMED",
    "total": 300,
    "currency": "USD"
  }
}
```

**Erros Comuns:**
- `400` - Validação falhou ou inventário insuficiente
- `409` - Idempotency key já usada (retorna booking existente)

---

### 3. GET /bookings - Listar Reservas

Lista reservas com filtros opcionais.

**Request:**
```http
GET /api/v1/bookings?status=CONFIRMED&pnr=A8FC8A
Headers:
  x-hotel-id: hotel123
```

**Query Params:**
- `status` - CONFIRMED, CANCELLED, CHECKED_IN, CHECKED_OUT
- `pnr` - Busca parcial (case-insensitive)
- `guestEmail` - Busca parcial por email
- `checkInFrom` - Data início (YYYY-MM-DD)
- `checkInTo` - Data fim (YYYY-MM-DD)

**Response (200):**
```json
{
  "bookings": [
    {
      "id": "uuid",
      "pnr": "A8FC8A",
      "status": "CONFIRMED",
      "guest": {
        "fullName": "João Silva",
        "email": "joao@example.com"
      },
      "roomType": {
        "code": "STANDARD",
        "name": "Quarto Standard"
      },
      "checkIn": "2026-06-01T00:00:00.000Z",
      "checkOut": "2026-06-03T00:00:00.000Z",
      "total": { "amount": 300, "currency": "USD" },
      "createdAt": "2026-05-25T10:30:00.000Z"
    }
  ]
}
```

---

### 4. PATCH /bookings/:id/cancel - Cancelar Reserva

Cancela uma reserva e devolve inventário.

**Request:**
```http
PATCH /api/v1/bookings/uuid-v4/cancel
Headers:
  x-hotel-id: hotel123
```

**Response (200):**
```json
{
  "message": "Reserva cancelada com sucesso",
  "reservation": {
    "id": "uuid-v4",
    "pnr": "A8FC8A",
    "status": "CANCELLED"
  }
}
```

**Erros:**
- `404` - Reserva não encontrada
- `400` - Já cancelada ou check-out realizado

---

### 5. GET /availability - Consultar Disponibilidade

Verifica disponibilidade de quartos por período.

**Request:**
```http
GET /api/v1/availability?checkIn=2026-06-01&checkOut=2026-06-03&adults=2
Headers:
  x-hotel-id: hotel123
```

**Query Params (obrigatórios):**
- `checkIn` - YYYY-MM-DD
- `checkOut` - YYYY-MM-DD
- `adults` - Número de adultos (default: 1)

**Response (200):**
```json
{
  "checkIn": "2026-06-01",
  "checkOut": "2026-06-03",
  "nights": 2,
  "adults": 2,
  "availability": [
    {
      "roomTypeCode": "STANDARD",
      "roomTypeName": "Quarto Standard",
      "available": true,
      "roomsAvailable": 10,
      "pricePerNight": 150,
      "totalPrice": 300,
      "breakdown": [
        {
          "date": "2026-06-01",
          "price": 150,
          "available": 10
        }
      ]
    }
  ]
}
```

---

### 6. GET /health - Health Check

Verifica status da API.

**Request:**
```http
GET /api/v1/health
```

**Response (200):**
```json
{
  "status": "healthy",
  "timestamp": "2026-05-25T10:30:00.000Z"
}
```

---

## 🆕 ARI Management (Availability-Rate-Inventory)

A API ARI permite gestão enterprise de disponibilidade, tarifas e restrições. Ideal para integrações com Channel Managers e PMSs.

### 7. POST /ari/availability - Atualizar Disponibilidade

Atualiza disponibilidade em massa para um tipo de quarto em um intervalo de datas.

**Request:**
```http
POST /api/v1/ari/availability
Headers:
  x-hotel-id: hotel123
  x-request-id: unique-request-id
  Content-Type: application/json

Body:
{
  "roomTypeCode": "DELUXE",
  "dateRange": {
    "from": "2026-08-01",
    "to": "2026-08-05"
  },
  "availability": 15,
  "updateType": "SET"  // SET, INCREMENT, DECREMENT
}
```

**Response (200):**
```json
{
  "updated": 5,
  "roomTypeCode": "DELUXE",
  "dateRange": {
    "from": "2026-08-01",
    "to": "2026-08-05"
  },
  "availability": 15
}
```

---

### 8. POST /ari/rates - Atualizar Tarifas

Atualiza tarifas em massa para um tipo de quarto.

**Request:**
```http
POST /api/v1/ari/rates
Headers:
  x-hotel-id: hotel123
  x-request-id: unique-request-id
  Content-Type: application/json

Body:
{
  "roomTypeCode": "DELUXE",
  "ratePlanCode": "BAR",  // Opcional
  "dateRange": {
    "from": "2026-08-01",
    "to": "2026-08-05"
  },
  "baseRate": 200.00  // Tarifa única para todo período
}
```

**Ou com tarifas por data:**
```json
{
  "roomTypeCode": "DELUXE",
  "dateRange": {
    "from": "2026-08-01",
    "to": "2026-08-03"
  },
  "rates": [
    { "date": "2026-08-01", "price": 200 },
    { "date": "2026-08-02", "price": 220 },
    { "date": "2026-08-03", "price": 250 }
  ]
}
```

**Response (200):**
```json
{
  "updated": 5,
  "roomTypeCode": "DELUXE",
  "dateRange": {
    "from": "2026-08-01",
    "to": "2026-08-05"
  },
  "avgRate": 200.00
}
```

---

### 9. POST /ari/restrictions - Atualizar Restrições

Configura restrições de venda (MinLOS, CTA/CTD, Stop-Sell).

**Request:**
```http
POST /api/v1/ari/restrictions
Headers:
  x-hotel-id: hotel123
  x-request-id: unique-request-id
  Content-Type: application/json

Body:
{
  "roomTypeCode": "DELUXE",
  "dateRange": {
    "from": "2026-12-24",
    "to": "2026-12-26"
  },
  "restrictions": {
    "minLOS": 3,                  // Minimum Length of Stay
    "maxLOS": 7,                  // Maximum Length of Stay (opcional)
    "closedToArrival": false,     // Closed to Arrival
    "closedToDeparture": false,   // Closed to Departure
    "closed": false               // Stop-Sell completo
  }
}
```

**Response (200):**
```json
{
  "updated": 3,
  "roomTypeCode": "DELUXE",
  "dateRange": {
    "from": "2026-12-24",
    "to": "2026-12-26"
  },
  "restrictions": {
    "minLOS": 3,
    "closedToArrival": false
  }
}
```

---

### 10. GET /ari/calendar - Visualizar Calendário ARI

Retorna visão consolidada de disponibilidade, tarifas e restrições.

**Request:**
```http
GET /api/v1/ari/calendar?roomType=DELUXE&from=2026-08-01&to=2026-08-05
Headers:
  x-hotel-id: hotel123
  x-request-id: unique-request-id
```

**Query Params:**
- `roomType` (obrigatório) - Código do tipo de quarto
- `from` (obrigatório) - Data inicial (YYYY-MM-DD)
- `to` (obrigatório) - Data final (YYYY-MM-DD)

**Response (200):**
```json
{
  "roomTypeCode": "DELUXE",
  "dateRange": {
    "from": "2026-08-01",
    "to": "2026-08-05"
  },
  "days": [
    {
      "date": "2026-08-01",
      "available": 15,
      "total": 15,
      "rate": 200.00,
      "restrictions": {
        "minLOS": null,
        "maxLOS": null,
        "closedToArrival": false,
        "closedToDeparture": false,
        "closed": false
      }
    },
    {
      "date": "2026-08-02",
      "available": 15,
      "total": 15,
      "rate": 200.00,
      "restrictions": {
        "minLOS": null,
        "maxLOS": null,
        "closedToArrival": false,
        "closedToDeparture": false,
        "closed": false
      }
    }
  ]
}
```

---

### 11. POST /ari/events - Ingestão Assíncrona de Eventos ARI

Aceita eventos ARI para processamento assíncrono (ideal para integração com Channel Managers).

**Request:**
```http
POST /api/v1/ari/events
Headers:
  x-hotel-id: hotel123
  x-request-id: unique-request-id
  x-channel-code: BOOKING_COM  // Opcional
  Content-Type: application/json

Body:
{
  "eventType": "AVAILABILITY",
  "roomTypeCode": "DELUXE",
  "dateRange": {
    "from": "2026-09-01",
    "to": "2026-09-05"
  },
  "payload": {
    "availability": 20
  }
}
```

**Response (202 Accepted):**
```json
{
  "eventId": "ari_availability_deluxe_1733432100000",
  "status": "APPLIED",
  "message": "Event queued for processing"
}
```

**Erros:**
- `409` - Evento duplicado (já processado)
- `422` - Validação falhou (room type inválido, etc)

**Event Types:**
- `AVAILABILITY` - Atualização de disponibilidade
- `RATE` - Atualização de tarifas
- `RESTRICTION` - Atualização de restrições

**Saga de Processamento:**
```
RECEIVED → DEDUPED → VALIDATED → NORMALIZED → APPLIED → ACKED
```

---

## 🚨 Códigos de Erro

| Código | Mensagem | Descrição |
|--------|----------|-----------|
| `CONTEXT_INVALID` | ID do hotel não fornecido | Header x-hotel-id ausente |
| `INVALID_JSON` | Erro ao processar JSON | Body malformado |
| `VALIDATION_ERROR` | Erro de validação | Dados inválidos (detalhes no campo `details`) |
| `NOT_FOUND` | Reserva não encontrada | ID não existe |
| `ALREADY_CANCELLED` | Já cancelada | Reserva já foi cancelada |
| `CANNOT_CANCEL` | Não pode cancelar | Status não permite cancelamento |
| `INTERNAL_ERROR` | Erro interno | Erro inesperado do servidor |

**Exemplo de Erro:**
```json
{
  "code": "VALIDATION_ERROR",
  "message": "Erro de validação",
  "details": {
    "stay": {
      "checkIn": {
        "_errors": ["Data inválida"]
      }
    }
  }
}
```

---

## ⚡ Rate Limiting

- **Limite:** 100 requisições/minuto por IP
- **Headers de resposta:**
  - `X-RateLimit-Limit: 100`
  - `X-RateLimit-Remaining: 95`
  - `X-RateLimit-Reset: 1682435400`

**Erro (429):**
```json
{
  "code": "RATE_LIMIT_EXCEEDED",
  "message": "Muitas requisições. Tente novamente em 30 segundos."
}
```

---

## 💡 Exemplos de Uso

### PowerShell

```powershell
# Cotação
$body = @{
  stay = @{
    checkIn = "2026-06-01"
    checkOut = "2026-06-03"
    adults = 2
    children = 0
  }
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/v1/quotes" `
  -Headers @{"x-hotel-id"="hotel123";"Content-Type"="application/json"} `
  -Method POST -Body $body
```

### cURL

```bash
# Criar reserva
curl -X POST http://localhost:3000/api/v1/bookings \
  -H "x-hotel-id: hotel123" \
  -H "Content-Type: application/json" \
  -d '{
    "idempotencyKey": "unique-key-12345678",
    "quoteId": "quote-abc123",
    "pricingSignature": "SIG_xyz789",
    "stay": {
      "checkIn": "2026-06-01",
      "checkOut": "2026-06-03",
      "adults": 2,
      "children": 0
    },
    "roomTypeCode": "STANDARD",
    "ratePlanCode": "BAR",
    "primaryGuest": {
      "firstName": "João",
      "lastName": "Silva",
      "email": "joao@example.com"
    }
  }'
```

### JavaScript (Fetch)

```javascript
const response = await fetch('http://localhost:3000/api/v1/quotes', {
  method: 'POST',
  headers: {
    'x-hotel-id': 'hotel123',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    stay: {
      checkIn: '2026-06-01',
      checkOut: '2026-06-03',
      adults: 2,
      children: 0
    }
  })
});

const data = await response.json();
console.log(data.quotes);
```

---

## 📖 Documentação Interativa

Acesse **http://localhost:3000/api-docs** para explorar a API com Swagger UI.

---

## 🔗 Links Úteis

- [README](../README.md)
- [Deployment Guide](./deployment.md)
- [Implementation Plan](./implementation_plan.md)
