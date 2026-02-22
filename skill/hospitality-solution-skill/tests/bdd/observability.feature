Feature: Observability requirements
  Scenario: Every request must produce logs with requestId and correlationId
    When I execute any saga
    Then logs must include requestId and correlationId