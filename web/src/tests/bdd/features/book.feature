Feature: Book workflow idempotency

  Background:
    Given a valid context for domain "DISTRIBUTION" with requestId "REQ-3000"
    And a successful Quote exists with quoteId "Q-9001" and pricingSignature "SIG-1"
    And the quote is for roomType "DLX" and ratePlan "BAR"
    And the stay is from "2026-02-10" to "2026-02-13" with 2 adults
    And the primary guest is "Ana Silva" with email "ana@example.com"

  Scenario: Retry after timeout must not create a duplicate reservation
    Given an idempotencyKey "IDEMP-BOOK-002"
    And the downstream PMS creates the reservation but the network times out
    When I execute the Book saga using quoteId "Q-9001" and pricingSignature "SIG-1"
    Then the client receives a timeout error code "TIMEOUT"
    When the client retries the Book saga with the same idempotencyKey "IDEMP-BOOK-002"
    Then the Book must succeed
    And the same "reservationId" must be returned
    And no additional reservation must be created
