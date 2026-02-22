Feature: Quote workflow

  Background:
    Given a valid context for domain "DISTRIBUTION" with requestId "REQ-2000"
    And the context has "hubId" = "HB-001"
    And the context has "channelCode" = "CH-ABC"
    And the context has "appKey" = "APP-KEY-123"

  Scenario: Quote should fail when Min LOS is violated
    Given the hotel has restriction "minLos" = 3 for roomType "DLX" and ratePlan "BAR"
    And I request a quote for roomType "DLX" and ratePlan "BAR"
    And the stay is from "2026-02-10" to "2026-02-12" with 2 adults
    When I execute the Quote saga
    Then the Quote must fail with error code "MIN_LOS_VIOLATION"
    And no reservation must be created

  Scenario: Quote should fail when CTA is enabled on check-in date
    Given the hotel has restriction "cta" = true for roomType "DLX" and ratePlan "BAR" on date "2026-02-10"
    And I request a quote for roomType "DLX" and ratePlan "BAR"
    And the stay is from "2026-02-10" to "2026-02-13" with 2 adults
    When I execute the Quote saga
    Then the Quote must fail with error code "CTA_VIOLATION"

  Scenario: Quote should fail when closed or stop-sell applies
    Given the hotel has restriction "closed" = true for roomType "DLX" and ratePlan "BAR" on date "2026-02-10"
    And I request a quote for roomType "DLX" and ratePlan "BAR"
    And the stay is from "2026-02-10" to "2026-02-13" with 2 adults
    When I execute the Quote saga
    Then the Quote must fail with error code "STOP_SELL"

  Scenario: Quote should return pricingSignature and policies
    Given the hotel allows the requested stay for roomType "DLX" and ratePlan "BAR"
    And I request a quote for roomType "DLX" and ratePlan "BAR"
    And the stay is from "2026-02-10" to "2026-02-13" with 2 adults
    When I execute the Quote saga
    Then the Quote must succeed
    And the response must contain a "quoteId"
    And the response must contain a "pricingSignature"
    And the response must contain cancellation and no-show policies
    And the response must contain total price including taxes and fees

  Scenario: Quote must be side-effect free
    Given the hotel allows the requested stay for roomType "STD" and ratePlan "BAR"
    And I request a quote for roomType "STD" and ratePlan "BAR"
    And the stay is from "2026-03-01" to "2026-03-03" with 1 adult
    When I execute the Quote saga
    Then no reservation must be created
    And no inventory holds must be persisted
