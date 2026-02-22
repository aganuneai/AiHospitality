# Versioning Policy

## APIs
- Versão em path: /v1, /v2
- Breaking changes apenas em major

## Schemas
- contracts/canonical/v1 é imutável (exceto adicionar campos opcionais)
- Remoções/renomes: apenas em v2

## Events
- Payload versionado
- Consumidores devem ignorar campos desconhecidos

## Backward compatibility rule
- Adicionar campo: OK (opcional)
- Tornar obrigatório: BREAKING
- Remover: BREAKING
