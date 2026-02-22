Feature: Cancel workflow
  Scenario: Retry Cancel must not duplicate refund
    When I execute the Cancel saga
    Then the refund must have been created exactly once