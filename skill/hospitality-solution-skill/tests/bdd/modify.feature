Feature: Modify workflow
  Scenario: Modify must be idempotent
    When I execute the Modify saga
    Then the Modify must succeed