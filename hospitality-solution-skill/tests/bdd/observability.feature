Feature: Observability requirements

  Scenario: Every request must produce logs with requestId and correlationId
    Given a valid context with requestId "REQ-OBS-001" and correlationId "CORR-OBS-001"
    When I execute any saga
    Then logs must include "REQ-OBS-001"
    And logs must include "CORR-OBS-001"
    And logs must not include secrets or raw payment data

  Scenario: Metrics must include latency, errors and retries
    Given a valid context with requestId "REQ-OBS-002"
    When I execute the Book saga
    Then metrics must record latency for "Book"
    And metrics must record error rate for "Book"
    And metrics must record retry count for "Book"

  Scenario: Idempotency hits must be observable for Book/Modify/Cancel
    Given a valid context with requestId "REQ-OBS-003"
    And an idempotencyKey "IDEMP-OBS-001" already exists for the Book saga
    When I execute the Book saga with idempotencyKey "IDEMP-OBS-001"
    Then metrics must record an "idempotency_hit" for "Book"
    And logs must include "IDEMP-OBS-001"
