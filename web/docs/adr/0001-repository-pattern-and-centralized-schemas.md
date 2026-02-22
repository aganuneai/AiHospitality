# ADR-0001: Adoção de Repository Pattern e Centralização de Schemas Zod

## Status

Aceito

## Contexto

O projeto AiHospitality está crescendo e a lógica de monetização (Pacotes, Upsell, Split) introduziu complexidade adicional.
Identificamos os seguintes problemas na implementação inicial:
1. **Acoplamento Forte**: Os serviços (`PackageService`, etc.) usavam o `PrismaClient` diretamente, dificultando testes unitários e mocking.
2. **Validação Dispersa**: Os schemas Zod estavam definidos dentro dos arquivos de rota (`route.ts`), impedindo o reuso e violando o princípio de responsabilidade única.
3. **Dificuldade de Teste**: Para testar um serviço, era necessário mockar o Prisma profundamente, o que é frágil e trabalhoso.

## Decisão

Decidimos refatorar a arquitetura backend para:
1. **Adotar o Padrão Repository**: Criar uma camada de abstração entre os Serviços e o Banco de Dados (Prisma).
2. **Centralizar Schemas Zod**: Mover todas as definições de validação para `src/lib/schemas`.

## Racional

### Repository Pattern
- **Isolamento**: A lógica de negócio (Service) não precisa saber qual ORM ou banco de dados está sendo usado.
- **Testabilidade**: Facilita a criação de mocks para os repositórios nos testes de unidade dos serviços, sem depender da complexidade interna do Prisma.
- **Organização**: Separa a responsabilidade de *como* buscar os dados de *o que* fazer com eles.

### Centralização de Schemas
- **Reuso**: O mesmo schema pode ser usado no Backend (API), no Frontend (Forms) e em outros serviços.
- **Manutenibilidade**: Alterações nas regras de validação são feitas em um único lugar.
- **Clareza**: Os arquivos de rota ficam focados apenas em lidar com Request/Response HTTP.

## Consequências

### Positivas
- Testes unitários mais limpos e rápidos.
- Código mais organizado e aderente ao SOLID (Single Responsibility, Dependency Inversion).
- Facilidade para reutilizar tipos inferidos do Zod (`z.infer<typeof schema>`).

### Negativas
- Aumento no número de arquivos (arquivos separados para repo, schema, service).
- Necessidade de boilerplate para criar novos recursos (criar repo, interface, etc.).

## Notas de Implementação

- Os repositórios devem ser instanciados e injetados nos serviços (Injeção de Dependência).
- Os schemas devem ser exportados juntamente com seus tipos inferidos.
