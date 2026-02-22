# Hospitality Solution Skill â€” Repo Package

Este repositÃ³rio contÃ©m:
- Skill operacional (persona) para guiar projeto de hotelaria enterprise
- Modelo canÃ´nico v1 (JSON Schemas)
- Sagas (mÃ¡quinas de estado) formais por fluxo
- Testes BDD (Gherkin) executÃ¡veis
- Runbooks/Playbooks de produÃ§Ã£o
- PolÃ­ticas de governanÃ§a e Definition of Done

## Como usar
1. Publique/importe skills/hospitality-solution-architect.md no seu catÃ¡logo de skills.
2. Use contracts/canonical/v1 como fonte de verdade para validaÃ§Ã£o (contract tests).
3. Implemente fluxos seguindo workflows/sagas/*.saga.md.
4. Automatize 	ests/bdd/*.feature em CI (Cucumber/Behave/SpecFlow).
5. Use ops/runbooks como base de operaÃ§Ã£o e suporte.

## Gates mÃ­nimos (CI/CD)
- Validar schemas (JSON Schema)
- Rodar contract tests (headers/context)
- Rodar BDD mÃ­nimo: book idempotency, cancel refund dedupe, ari dedupe, observability