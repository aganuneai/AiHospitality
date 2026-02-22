Feature: Modify workflow

  Background:
    Given a valid context for domain "PROPERTY" with requestId "REQ-4000"
    And a confirmed reservation exists with reservationId "R-7001" and status "CONFIRMED"
    And the reservation stay is from "2026-02-10" to "2026-02-13"
    And the reservation has cancellation cutoff "2026-02-08T23:59:00-03:00"

  Scenario: Modify must be idempotent
    Given an idempotencyKey "IDEMP-MOD-000"
    When I request to modify the reservation "R-7001" to checkOut "2026-02-14"
    And I execute the Modify saga
    Then the Modify must succeed
    When I retry the Modify saga with the same idempotencyKey "IDEMP-MOD-000"
    Then the Modify must succeed
    And the reservation must reflect the same final state
    And no duplicate downstream modification must be executed

  Scenario: Modify must fail after cutoff
    Given an idempotencyKey "IDEMP-MOD-001"
    And the current time is "2026-02-09T10:00:00-03:00"
    When I request to modify the reservation "R-7001" to checkOut "2026-02-14"
    And I execute the Modify saga
    Then the Modify must fail with error code "POLICY_VIOLATION"
    And the reservation must remain unchanged

  Scenario: Modify must succeed before cutoff and return updated totals
    Given an idempotencyKey "IDEMP-MOD-002"
    And the current time is "2026-02-08T10:00:00-03:00"
    When I request to modify the reservation "R-7001" to checkOut "2026-02-14"
    And I execute the Modify saga
    Then the Modify must succeed
    And the reservation stay must now be from "2026-02-10" to "2026-02-14"
    And the reservation total must be explicitly returned
    And a domain event "ReservationModified" must be emitted
