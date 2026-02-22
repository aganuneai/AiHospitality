# Hospitality Solution Skill — Repo Package

Este repositório contém:
- Skill operacional (persona) para guiar projeto de hotelaria enterprise
- Modelo canônico v1 (JSON Schemas)
- Sagas (máquinas de estado) formais por fluxo
- Testes BDD (Gherkin) executáveis
- Runbooks/Playbooks de produção
- Políticas de governança e Definition of Done

## Como usar
1. Publique/importe `skills/hospitality-solution-architect.md` no seu catálogo de skills.
2. Use `contracts/canonical/v1` como fonte de verdade para validação (contract tests).
3. Implemente fluxos seguindo `workflows/sagas/*.saga.md`.
4. Automatize `tests/bdd/*.feature` em CI (Cucumber/Behave/SpecFlow).
5. Use `ops/runbooks` como base de operação e suporte.

## Gates mínimos (CI/CD)
- Validar schemas (JSON Schema)
- Rodar contract tests (headers/context)
- Rodar BDD mínimo: book idempotency, cancel refund dedupe, ari dedupe, observability
