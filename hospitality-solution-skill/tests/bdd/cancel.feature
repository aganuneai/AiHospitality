Feature: Cancel workflow

  Background:
    Given a valid context for domain "PROPERTY" with requestId "REQ-5000"
    And a confirmed reservation exists with reservationId "R-8001" and status "CONFIRMED"
    And the reservation has cancellation cutoff "2026-02-08T23:59:00-03:00"

  Scenario: Cancel succeeds before cutoff
    Given an idempotencyKey "IDEMP-CAN-001"
    And the current time is "2026-02-08T10:00:00-03:00"
    When I cancel the reservation "R-8001" with reason "Change of plans"
    And I execute the Cancel saga
    Then the Cancel must succeed
    And the reservation status must be "CANCELLED"
    And a domain event "ReservationCancelled" must be emitted

  Scenario: Retry Cancel must not duplicate refund
    Given an idempotencyKey "IDEMP-CAN-002"
    And the current time is "2026-02-08T10:00:00-03:00"
    And the reservation cancellation triggers a refund
    When I execute the Cancel saga for reservation "R-8001"
    Then the Cancel must succeed
    When I retry the Cancel saga with the same idempotencyKey "IDEMP-CAN-002"
    Then the Cancel must succeed
    And the reservation status must be "CANCELLED"
    And the refund must have been created exactly once

  Scenario: Cancel after cutoff must apply penalty details
    Given an idempotencyKey "IDEMP-CAN-003"
    And the current time is "2026-02-09T10:00:00-03:00"
    When I cancel the reservation "R-8001" with reason "Late cancellation"
    And I execute the Cancel saga
    Then the Cancel must fail with error code "POLICY_VIOLATION"
    And the response must include penalty details
