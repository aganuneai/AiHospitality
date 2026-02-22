const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seed() {
    console.log('🌱 Iniciando seed do banco de dados...\n');

    try {
        // 1. Criar Property (Hotel)
        console.log('📍 Criando propriedade...');
        const property = await prisma.property.upsert({
            where: { id: 'hotel123' },
            update: {},
            create: {
                id: 'hotel123',
                name: 'Hotel Teste Brasil',
                code: 'HOTEL123',
                timeZone: 'America/Sao_Paulo',
                description: 'Hotel de testes para API'
            }
        });
        console.log(`✅ Propriedade criada: ${property.name} (${property.id})\n`);

        // 2. Criar Room Types
        console.log('🛏️  Criando tipos de quartos...');
        const roomTypeStandard = await prisma.roomType.upsert({
            where: {
                propertyId_code: {
                    propertyId: property.id,
                    code: 'STANDARD'
                }
            },
            update: {},
            create: {
                code: 'STANDARD',
                name: 'Quarto Standard',
                description: 'Quarto confortável com todas as comodidades básicas',
                propertyId: property.id,
                maxAdults: 2,
                maxChildren: 1
            }
        });

        const roomTypeDeluxe = await prisma.roomType.upsert({
            where: {
                propertyId_code: {
                    propertyId: property.id,
                    code: 'DELUXE'
                }
            },
            update: {},
            create: {
                code: 'DELUXE',
                name: 'Quarto Deluxe',
                description: 'Quarto espaçoso com vista panorâmica',
                propertyId: property.id,
                maxAdults: 2,
                maxChildren: 2
            }
        });
        console.log(`✅ Tipos de quarto criados: ${roomTypeStandard.name}, ${roomTypeDeluxe.name}\n`);

        // 3. Criar Rate Plans
        console.log('💰 Criando planos de tarifa...');
        const ratePlanStandard = await prisma.ratePlan.upsert({
            where: {
                propertyId_code: {
                    propertyId: property.id,
                    code: 'BAR'
                }
            },
            update: {},
            create: {
                code: 'BAR',
                name: 'Melhor Tarifa Disponível',
                description: 'Tarifa padrão sem restrições',
                propertyId: property.id
            }
        });
        console.log(`✅ Plano de tarifa criado: ${ratePlanStandard.name}\n`);

        // 4. Criar Inventory para os próximos 60 dias
        console.log('📦 Criando inventário (próximos 60 dias)...');
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = 0; i < 60; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);

            // Standard room inventory
            await prisma.inventory.upsert({
                where: {
                    propertyId_roomTypeId_date: {
                        propertyId: property.id,
                        roomTypeId: roomTypeStandard.id,
                        date: date
                    }
                },
                update: {},
                create: {
                    date: date,
                    propertyId: property.id,
                    roomTypeId: roomTypeStandard.id,
                    total: 10,
                    available: 10,
                    booked: 0,
                    price: 150.00
                }
            });

            // Deluxe room inventory
            await prisma.inventory.upsert({
                where: {
                    propertyId_roomTypeId_date: {
                        propertyId: property.id,
                        roomTypeId: roomTypeDeluxe.id,
                        date: date
                    }
                },
                update: {},
                create: {
                    date: date,
                    propertyId: property.id,
                    roomTypeId: roomTypeDeluxe.id,
                    total: 5,
                    available: 5,
                    booked: 0,
                    price: 250.00
                }
            });
        }
        console.log('✅ Inventário criado para 60 dias (Standard: 10 quartos, Deluxe: 5 quartos)\n');

        console.log('🎉 Seed completo! Banco de dados pronto para testes.\n');
        console.log('📊 Resumo:');
        console.log(`   - Propriedade: ${property.name} (ID: ${property.id})`);
        console.log(`   - Tipos de quarto: 2 (STANDARD, DELUXE)`);
        console.log(`   - Plano de tarifa: 1 (BAR)`);
        console.log(`   - Inventário: ${60 * 2} registros (60 dias × 2 tipos)`);

    } catch (error) {
        console.error('❌ Erro ao executar seed:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

seed()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    });
