Feature: Quote workflow with restrictions

  Background:
    Given a valid context for domain "DISTRIBUTION" with requestId "REQ-2000"
    And the context has "hubId" = "HB-001"
    And the context has "channelCode" = "CH-ABC"
    And the context has "appKey" = "APP-KEY-123"

  Scenario: Quote should fail when Min LOS is violated
    Given the hotel has restriction "minLos" = 3 for roomType "DLX" and ratePlan "BAR"
    And I request a quote for roomType "DLX" and ratePlan "BAR"
    And the stay is from "2026-02-10" to "2026-02-12" with 2 adults
    When I call POST /api/v1/quotes
    Then the response status should be 400
    And the response error code should be "MIN_LOS_VIOLATION"
    And the response message should contain "Minimum 3 nights required"

  Scenario: Quote should pass when Min LOS is met
    Given the hotel has restriction "minLos" = 2 for roomType "DLX" and ratePlan "BAR"
    And I request a quote for roomType "DLX" and ratePlan "BAR"
    And the stay is from "2026-02-10" to "2026-02-13" with 2 adults
    When I call POST /api/v1/quotes
    Then the response status should be 200
    And the response should contain at least 1 quote
    And the quote should have roomTypeCode "DLX"

  Scenario: Quote should fail when Max LOS is exceeded
    Given the hotel has restriction "maxLos" = 7 for roomType "STD" and ratePlan "PROMO"
    And I request a quote for roomType "STD" and ratePlan "PROMO"
    And the stay is from "2026-03-01" to "2026-03-15" with 2 adults
    When I call POST /api/v1/quotes
    Then the response status should be 400
    And the response error code should be "MAX_LOS_VIOLATION"
    And the response message should contain "Maximum 7 nights allowed"

  Scenario: Quote should fail when room is closed to arrival
    Given the hotel has restriction "closedToArrival" = true on "2026-04-15"
    And I request a quote for roomType "DLX" and ratePlan "BAR"
    And the stay is from "2026-04-15" to "2026-04-17" with 2 adults
    When I call POST /api/v1/quotes
    Then the response status should be 400
    And the response error code should be "CTA_VIOLATION"
    And the response message should contain "Check-in not allowed"

  Scenario: Quote should fail when room is closed to departure
    Given the hotel has restriction "closedToDeparture" = true on "2026-05-  20"
    And I request a quote for roomType "DLX" and ratePlan "BAR"
    And the stay is from "2026-05-18" to "2026-05-20" with 2 adults
    When I call POST /api/v1/quotes
    Then the response status should be 400
    And the response error code should be "CTD_VIOLATION"
    And the response message should contain "Check-out not allowed"

  Scenario: Quote should fail when stop-sell is active
    Given the hotel has restriction "stopSell" = true on "2026-06-10"
    And I request a quote for roomType "DLX" and ratePlan "BAR"
    And the stay is from "2026-06-10" to "2026-06-12" with 2 adults
    When I call POST /api/v1/quotes
    Then the response status should be 400
    And the response error code should be "STOP_SELL"
    And the response message should contain "Sales stopped"

  Scenario: Quote should fail when room is fully closed
    Given the hotel has restriction "closed" = true on "2026-07-15"
    And I request a quote for roomType "DLX" and ratePlan "BAR"
    And the stay is from "2026-07-14" to "2026-07-16" with 2 adults
    When I call POST /api/v1/quotes
    Then the response status should be 400
    And the response error code should be "ROOM_CLOSED"
    And the response message should contain "Room type closed"

  Scenario: Quote should use highest Min LOS from multiple dates
    Given the hotel has restriction "minLos" = 2 on "2026-08-10"
    And the hotel has restriction "minLos" = 5 on "2026-08-11"
    And I request a quote for roomType "DLX" and ratePlan "BAR"
    And the stay is from "2026-08-10" to "2026-08-13" with 2 adults
    When I call POST /api/v1/quotes
    Then the response status should be 400
    And the response error code should be "MIN_LOS_VIOLATION"
    And the response message should contain "Minimum 5 nights required"

  Scenario: Quote should use lowest Max LOS from multiple dates
    Given the hotel has restriction "maxLos" = 10 on "2026-09-10"
    And the hotel has restriction "maxLos" = 3 on "2026-09-11"
    And I request a quote for roomType "DLX" and ratePlan "BAR"
    And the stay is from "2026-09-10" to "2026-09-15" with 2 adults
    When I call POST /api/v1/quotes
    Then the response status should be 400
    And the response error code should be "MAX_LOS_VIOLATION"
    And the response message should contain "Maximum 3 nights allowed"

  Scenario: Quote should pass when all restrictions are met
    Given the hotel has restriction "minLos" = 2 on "2026-10-10"
    And the hotel has restriction "maxLos" = 7 on "2026-10-10"
    And I request a quote for roomType "DLX" and ratePlan "BAR"
    And the stay is from "2026-10-10" to "2026-10-13" with 2 adults
    When I call POST /api/v1/quotes
    Then the response status should be 200
    And the response should contain at least 1 quote
    And the quote should have roomTypeCode "DLX"
    And the quote should have a valid pricingSignature
