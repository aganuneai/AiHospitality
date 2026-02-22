Feature: Book workflow idempotency
  Scenario: Retry after timeout must not create a duplicate reservation
    When I execute the Book saga
    Then no additional reservation must be created