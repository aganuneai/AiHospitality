# Script de Testes da API - PT-BR
# Testa todos os endpoints com mensagens em português

Write-Host "`n🧪 INICIANDO TESTES DA API - PT-BR`n" -ForegroundColor Cyan

# Teste 1: Health Check
Write-Host "📍 Teste 1: Health Check" -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/health" -Method GET -UseBasicParsing
    Write-Host "✅ Health: $($health.status)" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "❌ Erro: $($_.Exception.Message)" -ForegroundColor Red
}

# Teste 2: GET Bookings (sem header - deve dar erro PT-BR)
Write-Host "📍 Teste 2: GET Bookings sem header (espera-se erro PT-BR)" -ForegroundColor Yellow
try {
    Invoke-RestMethod -Uri "http://localhost:3000/api/v1/bookings" -Method GET -UseBasicParsing
} catch {
    $errorMsg = $_.ErrorDetails.Message | ConvertFrom-Json
    Write-Host "✅ Erro capturado: $($errorMsg.message)" -ForegroundColor Green
    Write-Host ""
}

# Teste 3: GET Bookings (com header - deve funcionar)
Write-Host "📍 Teste 3: GET Bookings com header válido" -ForegroundColor Yellow
try {
    $bookings = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/bookings" -Headers @{"x-hotel-id"="hotel123"} -Method GET -UseBasicParsing
    Write-Host "✅ Quantidade de reservas: $($bookings.bookings.Count)" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "❌ Erro: $($_.Exception.Message)" -ForegroundColor Red
}

# Teste 4: POST Quotes (cotação)
Write-Host "📍 Teste 4: POST Quotes (solicitar cotação)" -ForegroundColor Yellow
try {
    $quoteBody = @{
        stay = @{
            checkIn = "2026-03-15"
            checkOut = "2026-03-18"
            adults = 2
            children = 0
        }
        roomTypes = @("STANDARD", "DELUXE")
    } | ConvertTo-Json -Compress

    $quotes = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/quotes" `
        -Headers @{"x-hotel-id"="hotel123"; "Content-Type"="application/json"} `
        -Method POST -Body $quoteBody -UseBasicParsing
    
    Write-Host "✅ Cotações recebidas: $($quotes.quotes.Count)" -ForegroundColor Green
    
    if ($quotes.quotes.Count -gt 0) {
        $quote = $quotes.quotes[0]
        Write-Host "   📦 Quote ID: $($quote.quoteId)" -ForegroundColor Cyan
        Write-Host "   🛏️  Quarto: $($quote.roomTypeCode)" -ForegroundColor Cyan
        Write-Host "   💰 Total: R$ $($quote.totalPrice)" -ForegroundColor Cyan
        
        # Salvar quote para usar no booking
        $global:savedQuote = $quote
    }
    Write-Host ""
} catch {
    Write-Host "❌ Erro: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        $err = $_.ErrorDetails.Message | ConvertFrom-Json
        Write-Host "   Mensagem: $($err.message)" -ForegroundColor Red
    }
}

# Teste 5: POST Bookings (criar reserva)
Write-Host "📍 Teste 5: POST Bookings (criar reserva)" -ForegroundColor Yellow
try {
    $idempotencyKey = "booking-$(Get-Date -Format 'yyyyMMddHHmmss')-$((Get-Random -Maximum 9999))"
    
    $bookingBody = @{
        idempotencyKey = $idempotencyKey
        quoteId = if ($global:savedQuote) { $global:savedQuote.quoteId } else { "quote-manual-123" }
        pricingSignature = if ($global:savedQuote) { $global:savedQuote.pricingSignature } else { "sig-manual-123" }
        stay = @{
            checkIn = "2026-03-15"
            checkOut = "2026-03-18"
            adults = 2
            children = 0
        }
        roomTypeCode = "STANDARD"
        ratePlanCode = "BAR"
        primaryGuest = @{
            firstName = "Maria"
            lastName = "Santos"
            email = "maria.santos@exemplo.com.br"
            phone = "+5511987654321"
        }
    } | ConvertTo-Json -Depth 10 -Compress

    $booking = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/bookings" `
        -Headers @{"x-hotel-id"="hotel123"; "Content-Type"="application/json"} `
        -Method POST -Body $bookingBody -UseBasicParsing
    
    Write-Host "✅ Reserva criada com sucesso!" -ForegroundColor Green
    Write-Host "   🎫 PNR: $($booking.booking.pnr)" -ForegroundColor Cyan
    Write-Host "   🆔 ID: $($booking.booking.reservationId)" -ForegroundColor Cyan
    Write-Host "   ✅ Status: $($booking.booking.status)" -ForegroundColor Cyan
    Write-Host "   💵 Total: $($booking.booking.currency) $($booking.booking.total)" -ForegroundColor Cyan
    Write-Host ""
} catch {
    Write-Host "❌ Erro ao criar reserva" -ForegroundColor Red
    Write-Host "   Status Code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    
    if ($_.ErrorDetails.Message) {
        try {
            $err = $_.ErrorDetails.Message | ConvertFrom-Json
            Write-Host "   📝 Código: $($err.code)" -ForegroundColor Yellow
            Write-Host "   💬 Mensagem: $($err.message)" -ForegroundColor Yellow
            
            if ($err.details) {
                Write-Host "   🔍 Detalhes: $($err.details)" -ForegroundColor Yellow
            }
            
            if ($err.errors) {
                Write-Host "   ⚠️  Erros de validação:" -ForegroundColor Yellow
                $err.errors | ConvertTo-Json -Depth 5
            }
        } catch {
            Write-Host "   Raw: $($_.ErrorDetails.Message)" -ForegroundColor Yellow
        }
    }
}

# Teste 6: GET Bookings novamente (verificar se criou)
Write-Host "📍 Teste 6: GET Bookings (verificar reservas criadas)" -ForegroundColor Yellow
try {
    $bookings = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/bookings" `
        -Headers @{"x-hotel-id"="hotel123"} `
        -Method GET -UseBasicParsing
    
    Write-Host "✅ Total de reservas: $($bookings.bookings.Count)" -ForegroundColor Green
    
    if ($bookings.bookings.Count -gt 0) {
        foreach ($b in $bookings.bookings) {
            Write-Host "   📋 PNR: $($b.pnr) | Status: $($b.status) | Hóspede: $($b.guest.fullName)" -ForegroundColor Cyan
        }
    }
    Write-Host ""
} catch {
    Write-Host "❌ Erro: $($_.Exception.Message)" -ForegroundColor Red
}

# Teste 7: Teste de Idempotência
Write-Host "📍 Teste 7: Idempotência (repetir mesma requisição)" -ForegroundColor Yellow
try {
    $idempotencyKey2 = "booking-idempotent-test-12345"
    
    $bookingBody2 = @{
        idempotencyKey = $idempotencyKey2
        quoteId = "quote-idem-123"
        pricingSignature = "sig-idem-123"
        stay = @{
            checkIn = "2026-03-20"
            checkOut = "2026-03-22"
            adults = 1
            children = 0
        }
        roomTypeCode = "DELUXE"
        ratePlanCode = "BAR"
        primaryGuest = @{
            firstName = "Pedro"
            lastName = "Oliveira"
            email = "pedro@exemplo.com.br"
            phone = "+5511999887766"
        }
    } | ConvertTo-Json -Depth 10 -Compress

    # Primeira chamada
    Write-Host "   🔄 Primeira chamada..." -ForegroundColor Cyan
    $booking1 = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/bookings" `
        -Headers @{"x-hotel-id"="hotel123"; "Content-Type"="application/json"} `
        -Method POST -Body $bookingBody2 -UseBasicParsing
    
    Start-Sleep -Seconds 1
    
    # Segunda chamada (mesma idempotency key)
    Write-Host "   🔄 Segunda chamada (mesma chave)..." -ForegroundColor Cyan
    $booking2 = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/bookings" `
        -Headers @{"x-hotel-id"="hotel123"; "Content-Type"="application/json"} `
        -Method POST -Body $bookingBody2 -UseBasicParsing
    
    if ($booking1.booking.reservationId -eq $booking2.booking.reservationId) {
        Write-Host "✅ Idempotência funcionando! Mesmo ID retornado: $($booking1.booking.reservationId)" -ForegroundColor Green
    } else {
        Write-Host "⚠️  IDs diferentes - idempotência pode não estar funcionando" -ForegroundColor Yellow
    }
    Write-Host ""
} catch {
    Write-Host "⚠️  Erro no teste de idempotência: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host "`n🎉 TESTES CONCLUÍDOS!`n" -ForegroundColor Cyan
