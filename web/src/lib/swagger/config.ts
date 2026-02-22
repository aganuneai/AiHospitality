export const swaggerSpec = {
    openapi: '3.0.0',
    info: {
        title: 'AiHospitality API',
        version: '1.0.0',
        description: 'API REST para gestão hoteleira e reservas online - 100% PT-BR',
        contact: {
            name: 'AiHospitality Support',
            email: 'support@aihospitality.com'
        }
    },
    servers: [
        {
            url: 'http://localhost:3000/api/v1',
            description: 'Desenvolvimento'
        },
        {
            url: 'https://api.aihospitality.com/v1',
            description: 'Produção'
        }
    ],
    tags: [
        { name: 'Quotes', description: 'Cotações de quartos' },
        { name: 'Bookings', description: 'Gestão de reservas' },
        { name: 'Availability', description: 'Consulta de disponibilidade' },
        { name: 'Health', description: 'Status da API' }
    ],
    components: {
        securitySchemes: {
            HotelId: {
                type: 'apiKey',
                in: 'header',
                name: 'x-hotel-id',
                description: 'ID do hotel (obrigatório para endpoints de propriedade)'
            },
            ChannelCode: {
                type: 'apiKey',
                in: 'header',
                name: 'x-channel-code',
                description: 'Código do Canal de Distribuição (ex: BOOKING_COM)'
            },
            AppKey: {
                type: 'apiKey',
                in: 'header',
                name: 'x-app-key',
                description: 'Chave de API do Canal'
            }
        },
        schemas: {
            AriEvent: {
                type: 'object',
                description: 'Evento de atualização ARI (Availability, Rates, Inventory)',
                required: ['eventType', 'roomTypeCode', 'dateRange', 'payload'],
                discriminator: { propertyName: 'eventType' },
                properties: {
                    eventType: { type: 'string', enum: ['AVAILABILITY', 'RATE', 'RESTRICTION'] },
                    roomTypeCode: { type: 'string', example: 'DLX' },
                    ratePlanCode: { type: 'string', description: 'Obrigatório para RATE', example: 'BAR' },
                    dateRange: {
                        type: 'object',
                        properties: {
                            from: { type: 'string', format: 'date', example: '2026-12-01' },
                            to: { type: 'string', format: 'date', example: '2026-12-05' }
                        }
                    },
                    payload: {
                        oneOf: [
                            { $ref: '#/components/schemas/AvailabilityPayload' },
                            { $ref: '#/components/schemas/RatePayload' },
                            { $ref: '#/components/schemas/RestrictionPayload' }
                        ]
                    }
                }
            },
            AvailabilityPayload: {
                type: 'object',
                properties: {
                    availability: { type: 'integer', example: 5 },
                    updateType: { type: 'string', enum: ['SET', 'INCREMENT', 'DECREMENT'], default: 'SET' }
                }
            },
            RatePayload: {
                type: 'object',
                properties: {
                    baseRate: { type: 'number', example: 150.00 },
                    currency: { type: 'string', example: 'USD' },
                    rates: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                date: { type: 'string', format: 'date' },
                                price: { type: 'number' }
                            }
                        }
                    }
                }
            },
            RestrictionPayload: {
                type: 'object',
                properties: {
                    minLOS: { type: 'integer' },
                    maxLOS: { type: 'integer' },
                    closedToArrival: { type: 'boolean' },
                    closedToDeparture: { type: 'boolean' },
                    closed: { type: 'boolean' }
                }
            },
            QuoteRequest: {
                type: 'object',
                required: ['stay'],
                properties: {
                    context: {
                        type: 'object',
                        properties: {
                            hotelId: { type: 'string' },
                            hubId: { type: 'string' }
                        }
                    },
                    stay: {
                        type: 'object',
                        required: ['checkIn', 'checkOut', 'adults'],
                        properties: {
                            checkIn: { type: 'string', format: 'date', example: '2026-06-01' },
                            checkOut: { type: 'string', format: 'date', example: '2026-06-03' },
                            adults: { type: 'integer', minimum: 1, example: 2 },
                            children: { type: 'integer', minimum: 0, example: 0 }
                        }
                    },
                    roomTypeCodes: {
                        type: 'array',
                        items: { type: 'string' },
                        example: ['STANDARD', 'DELUXE']
                    },
                    ratePlanCode: { type: 'string', example: 'BAR' }
                }
            },
            BookRequest: {
                type: 'object',
                required: ['checkIn', 'checkOut', 'holderName', 'holderPhone', 'rooms', 'guaranteeType'],
                properties: {
                    checkIn: { type: 'string', format: 'date', example: '2026-06-01' },
                    checkOut: { type: 'string', format: 'date', example: '2026-06-03' },

                    holderName: { type: 'string', example: 'João Silva' },
                    holderEmail: { type: 'string', format: 'email', example: 'joao@example.com' },
                    holderPhone: { type: 'string', example: '+5511999999999' },
                    holderDoc: { type: 'string', example: '12345678900' },

                    channel: { type: 'string', enum: ['DIRECT', 'OTA', 'OPERATOR', 'CORPORATE'], default: 'DIRECT' },
                    source: { type: 'string', enum: ['PHONE', 'WHATSAPP', 'WALK_IN', 'WEBSITE', 'EMAIL'], default: 'WEBSITE' },

                    rooms: {
                        type: 'array',
                        minItems: 1,
                        items: {
                            type: 'object',
                            required: ['roomTypeId', 'ratePlanId', 'adults'],
                            properties: {
                                roomTypeId: { type: 'string', format: 'uuid' },
                                ratePlanId: { type: 'string' },
                                adults: { type: 'integer', minimum: 1 },
                                children: { type: 'integer', minimum: 0, default: 0 },
                                guests: {
                                    type: 'array',
                                    items: {
                                        type: 'object',
                                        required: ['name', 'type'],
                                        properties: {
                                            name: { type: 'string', example: 'Maria Silva' },
                                            type: { type: 'string', enum: ['ADULT', 'CHILD'] },
                                            age: { type: 'integer', description: 'Obrigatório para crianças' },
                                            isRepresentative: { type: 'boolean', default: false }
                                        }
                                    }
                                }
                            }
                        }
                    },

                    guaranteeType: { type: 'string', enum: ['CC', 'PREPAID', 'COMPANY', 'NONE'] },
                    paymentToken: { type: 'string', description: 'Obrigatório se guaranteeType for CC' },
                    notes: { type: 'string' }
                }
            },
            Quote: {
                type: 'object',
                properties: {
                    quoteId: { type: 'string', example: 'quote-12345' },
                    pricingSignature: { type: 'string', example: 'SIG_abc123' },
                    roomTypeCode: { type: 'string', example: 'STANDARD' },
                    ratePlanCode: { type: 'string', example: 'BAR' },
                    currency: { type: 'string', example: 'USD' },
                    total: { type: 'number', example: 300 },
                    breakdown: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                date: { type: 'string', format: 'date', example: '2026-06-01' },
                                base: { type: 'number', example: 100 },
                                taxes: { type: 'number', example: 10 },
                                fees: { type: 'number', example: 5 },
                                total: { type: 'number', example: 115 }
                            }
                        }
                    }
                }
            },
            Booking: {
                type: 'object',
                properties: {
                    reservationId: { type: 'string', format: 'uuid' },
                    pnr: { type: 'string', example: 'A8FC8A' },
                    status: { type: 'string', enum: ['CONFIRMED', 'CANCELLED', 'CHECKED_IN', 'CHECKED_OUT'] },
                    total: { type: 'number', example: 300 },
                    currency: { type: 'string', example: 'USD' }
                }
            },
            HealthCheck: {
                type: 'object',
                properties: {
                    status: { type: 'string', enum: ['ok', 'error', 'degraded'] },
                    timestamp: { type: 'string', format: 'date-time' },
                    version: { type: 'string' },
                    checks: {
                        type: 'object',
                        properties: {
                            database: { type: 'object', properties: { status: { type: 'string' } } },
                            cache: { type: 'object', properties: { status: { type: 'string' } } }
                        }
                    }
                }
            },
            AuditLog: {
                type: 'object',
                properties: {
                    eventId: { type: 'string', format: 'uuid' },
                    eventType: { type: 'string' },
                    aggregateId: { type: 'string' },
                    aggregateType: { type: 'string' },
                    occurredAt: { type: 'string', format: 'date-time' },
                    payload: { type: 'object' }
                }
            },
            Error: {
                type: 'object',
                properties: {
                    code: { type: 'string', example: 'VALIDATION_ERROR' },
                    message: { type: 'string', example: 'Erro de validação' },
                    details: { type: 'object' }
                }
            },
            Package: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid' },
                    code: { type: 'string', example: 'ROMANTIC_PKG' },
                    name: { type: 'string', example: 'Pacote Romântico' },
                    finalPrice: { type: 'number', example: 450.00 },
                    items: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                name: { type: 'string' },
                                type: { type: 'string', enum: ['SERVICE', 'PRODUCT', 'EXPERIENCE'] }
                            }
                        }
                    }
                }
            },
            UpsellRule: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid' },
                    name: { type: 'string', example: 'Upgrade para Suite' },
                    priceValue: { type: 'number', example: 50.00 }
                }
            },
            UpsellOffer: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid' },
                    status: { type: 'string', enum: ['PENDING', 'ACCEPTED', 'REJECTED'] },
                    offerPrice: { type: 'number', example: 50.00 }
                }
            },
            PackageInput: {
                type: 'object',
                required: ['code', 'name', 'propertyId', 'roomTypeId', 'basePrice', 'discountPct', 'validFrom', 'validUntil'],
                properties: {
                    code: { type: 'string' },
                    name: { type: 'string' },
                    description: { type: 'string' },
                    propertyId: { type: 'string' },
                    roomTypeId: { type: 'string' },
                    basePrice: { type: 'number' },
                    discountPct: { type: 'number' },
                    validFrom: { type: 'string', format: 'date' },
                    validUntil: { type: 'string', format: 'date' },
                    minStayNights: { type: 'integer' },
                    items: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                name: { type: 'string' },
                                type: { type: 'string', enum: ['SERVICE', 'PRODUCT', 'EXPERIENCE'] },
                                unitPrice: { type: 'number' },
                                quantity: { type: 'integer' },
                                postingPattern: { type: 'string', enum: ['DAILY', 'ON_ARRIVAL', 'ON_DEPARTURE'] }
                            }
                        }
                    }
                }
            },
            UpsellRuleInput: {
                type: 'object',
                required: ['code', 'name', 'propertyId', 'priceType', 'priceValue'],
                properties: {
                    code: { type: 'string' },
                    name: { type: 'string' },
                    propertyId: { type: 'string' },
                    roomTypeFrom: { type: 'string' },
                    roomTypeTo: { type: 'string' },
                    serviceId: { type: 'string' },
                    priceType: { type: 'string', enum: ['FIXED_AMOUNT', 'PERCENTAGE_DIFF'] },
                    priceValue: { type: 'number' },
                    minStayNights: { type: 'integer' }
                }
            },
            PaymentSplitInput: {
                type: 'object',
                required: ['reservationId', 'method', 'payers'],
                properties: {
                    reservationId: { type: 'string' },
                    method: { type: 'string', enum: ['PERCENTAGE', 'FIXED_AMOUNT'] },
                    payers: {
                        type: 'array',
                        items: {
                            type: 'object',
                            required: ['name', 'email'],
                            properties: {
                                name: { type: 'string' },
                                email: { type: 'string', format: 'email' },
                                amount: { type: 'number' },
                                percentage: { type: 'number' }
                            }
                        }
                    }
                }
            }
        }
    },
    paths: {
        '/quotes': {
            post: {
                tags: ['Quotes'],
                summary: 'Gerar cotações',
                description: 'Retorna cotações disponíveis para o período solicitado',
                security: [{ HotelId: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/QuoteRequest' }
                        }
                    }
                },
                responses: {
                    '200': {
                        description: 'Cotações geradas com sucesso',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        quotes: {
                                            type: 'array',
                                            items: { $ref: '#/components/schemas/Quote' }
                                        },
                                        cached: { type: 'boolean', example: false }
                                    }
                                }
                            }
                        }
                    },
                    '400': { description: 'Dados inválidos', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
                    '500': { description: 'Erro interno', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
                }
            }
        },
        '/bookings': {
            get: {
                tags: ['Bookings'],
                summary: 'Listar reservas',
                description: 'Retorna lista de reservas com filtros opcionais',
                security: [{ HotelId: [] }],
                parameters: [
                    { name: 'status', in: 'query', schema: { type: 'string', enum: ['CONFIRMED', 'CANCELLED'] } },
                    { name: 'pnr', in: 'query', schema: { type: 'string' } },
                    { name: 'guestEmail', in: 'query', schema: { type: 'string' } },
                    { name: 'checkInFrom', in: 'query', schema: { type: 'string', format: 'date' } },
                    { name: 'checkInTo', in: 'query', schema: { type: 'string', format: 'date' } }
                ],
                responses: {
                    '200': {
                        description: 'Lista de reservas',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        bookings: { type: 'array', items: { $ref: '#/components/schemas/Booking' } }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            post: {
                tags: ['Bookings'],
                summary: 'Criar reserva',
                description: 'Cria uma nova reserva (idempotente)',
                security: [{ HotelId: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/BookRequest' }
                        }
                    }
                },
                responses: {
                    '201': {
                        description: 'Reserva criada',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        booking: { $ref: '#/components/schemas/Booking' }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        '/bookings/{id}/cancel': {
            patch: {
                tags: ['Bookings'],
                summary: 'Cancelar reserva',
                description: 'Cancela uma reserva e devolve inventário',
                security: [{ HotelId: [] }],
                parameters: [
                    { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
                ],
                responses: {
                    '200': {
                        description: 'Reserva cancelada com sucesso',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        message: { type: 'string', example: 'Reserva cancelada com sucesso' },
                                        reservation: { $ref: '#/components/schemas/Booking' }
                                    }
                                }
                            }
                        }
                    },
                    '404': { description: 'Reserva não encontrada' },
                    '400': { description: 'Não pode cancelar' }
                }
            }
        },
        '/ari': {
            post: {
                tags: ['Availability'],
                summary: 'Push ARI Updates',
                description: 'Recebe atualizações de Disponibilidade, Tarifas e Restrições de canais de distribuição (Push)',
                security: [
                    { ChannelCode: [], AppKey: [], HotelId: [] }
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/AriEvent' }
                        }
                    }
                },
                responses: {
                    '200': {
                        description: 'Evento processado com sucesso',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        status: { type: 'string', example: 'APPLIED' },
                                        message: { type: 'string' },
                                        eventId: { type: 'string' }
                                    }
                                }
                            }
                        }
                    },
                    '400': { description: 'Erro de validação ou contexto inválido' },
                    '422': { description: 'Evento não processável (ex: quarto não encontrado)' },
                    '500': { description: 'Erro interno no processamento' }
                }
            }
        },
        '/availability': {
            get: {
                tags: ['Availability'],
                summary: 'Consultar disponibilidade',
                description: 'Verifica disponibilidade de quartos por período',
                security: [{ HotelId: [] }],
                parameters: [
                    { name: 'checkIn', in: 'query', required: true, schema: { type: 'string', format: 'date' } },
                    { name: 'checkOut', in: 'query', required: true, schema: { type: 'string', format: 'date' } },
                    { name: 'adults', in: 'query', schema: { type: 'integer', default: 1 } }
                ],
                responses: {
                    '200': {
                        description: 'Disponibilidade consultada',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        checkIn: { type: 'string' },
                                        checkOut: { type: 'string' },
                                        nights: { type: 'integer' },
                                        adults: { type: 'integer' },
                                        availability: {
                                            type: 'array',
                                            items: {
                                                type: 'object',
                                                properties: {
                                                    roomTypeCode: { type: 'string' },
                                                    roomTypeName: { type: 'string' },
                                                    available: { type: 'boolean' },
                                                    roomsAvailable: { type: 'integer' },
                                                    totalPrice: { type: 'number' }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        '/health': {
            get: {
                tags: ['Health'],
                summary: 'Verificar status da API',
                description: 'Retorna o status de saúde dos serviços (banco de dados, cache, sistema)',
                responses: {
                    '200': {
                        description: 'API Saudável',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/HealthCheck' }
                            }
                        }
                    },
                    '503': {
                        description: 'Serviço Indisponível/Degradado',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/HealthCheck' }
                            }
                        }
                    }
                }
            }
        },
        '/audit-logs': {
            get: {
                tags: ['Health'],
                summary: 'Listar logs de auditoria',
                description: 'Consulta eventos de auditoria do sistema',
                security: [{ HotelId: [] }],
                parameters: [
                    { name: 'limit', in: 'query', schema: { type: 'integer', default: 100 } },
                    { name: 'from', in: 'query', schema: { type: 'string', format: 'date-time' } },
                    { name: 'to', in: 'query', schema: { type: 'string', format: 'date-time' } },
                    { name: 'eventType', in: 'query', schema: { type: 'string' } },
                    { name: 'aggregateId', in: 'query', schema: { type: 'string' } }
                ],
                responses: {
                    '200': {
                        description: 'Lista de eventos',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        events: {
                                            type: 'array',
                                            items: { $ref: '#/components/schemas/AuditLog' }
                                        },
                                        count: { type: 'integer' }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        '/packages': {
            get: {
                tags: ['Monetization'],
                summary: 'Listar pacotes',
                parameters: [
                    { name: 'propertyId', in: 'query', required: true, schema: { type: 'string' } },
                    { name: 'roomTypeId', in: 'query', required: true, schema: { type: 'string' } },
                    { name: 'checkIn', in: 'query', required: true, schema: { type: 'string', format: 'date' } },
                    { name: 'checkOut', in: 'query', required: true, schema: { type: 'string', format: 'date' } }
                ],
                responses: {
                    '200': {
                        description: 'Pacotes disponíveis',
                        content: { 'application/json': { schema: { properties: { packages: { type: 'array', items: { $ref: '#/components/schemas/Package' } } } } } }
                    }
                }
            },
            post: {
                tags: ['Monetization'],
                summary: 'Criar pacote',
                requestBody: {
                    required: true,
                    content: { 'application/json': { schema: { $ref: '#/components/schemas/PackageInput' } } }
                },
                responses: {
                    '201': { description: 'Pacote criado' }
                }
            }
        },
        '/upsell': {
            get: {
                tags: ['Monetization'],
                summary: 'Listar regras de upsell',
                parameters: [{ name: 'propertyId', in: 'query', required: true, schema: { type: 'string' } }],
                responses: {
                    '200': { description: 'Lista de regras', content: { 'application/json': { schema: { properties: { rules: { type: 'array', items: { $ref: '#/components/schemas/UpsellRule' } } } } } } }
                }
            },
            post: {
                tags: ['Monetization'],
                summary: 'Criar regra de upsell',
                requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/UpsellRuleInput' } } } },
                responses: { '201': { description: 'Regra criada' } }
            }
        },
        '/bookings/{id}/upsell': {
            get: {
                tags: ['Monetization'],
                summary: 'Obter ofertas de upsell para reserva',
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                responses: {
                    '200': { description: 'Ofertas geradas', content: { 'application/json': { schema: { properties: { offers: { type: 'array', items: { $ref: '#/components/schemas/UpsellOffer' } } } } } } }
                }
            },
            post: {
                tags: ['Monetization'],
                summary: 'Aceitar oferta de upsell',
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                requestBody: { content: { 'application/json': { schema: { properties: { offerId: { type: 'string' } } } } } },
                responses: { '200': { description: 'Oferta aceita' } }
            }
        },
        '/payments/split': {
            post: {
                tags: ['Monetization'],
                summary: 'Criar divisão de pagamento',
                requestBody: {
                    content: { 'application/json': { schema: { $ref: '#/components/schemas/PaymentSplitInput' } } }
                },
                responses: { '201': { description: 'Split criado' } }
            }
        }
    }
};
