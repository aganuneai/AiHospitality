Feature: ARI event processing

  Background:
    Given a valid context for domain "DISTRIBUTION" with requestId "REQ-6000"
    And the context has "hubId" = "HB-001"
    And the context has "channelCode" = "CH-ABC"
    And the context has "appKey" = "APP-KEY-123"

  Scenario: Duplicate ARI event must be applied only once
    Given an ARI event with eventId "EV-ARI-001" for roomType "DLX" ratePlan "BAR" date "2026-02-10"
    And the payload sets inventory to 5 and closed to false
    When I process the ARI event "EV-ARI-001"
    Then the update must be applied
    When I process the same ARI event "EV-ARI-001" again
    Then the system must deduplicate it
    And the update must not be applied a second time
    And an audit record must indicate deduplication

  Scenario: Out-of-order events must converge to the latest occurredAt
    Given an ARI event with eventId "EV-ARI-010" occurredAt "2026-02-01T10:00:00Z" sets inventory to 7
    And an ARI event with eventId "EV-ARI-011" occurredAt "2026-02-01T11:00:00Z" sets inventory to 3
    When I process event "EV-ARI-011" first
    And I process event "EV-ARI-010" second
    Then the final inventory state must be 3

  Scenario: Invalid ARI event must go to DLQ with validation error
    Given an ARI event with eventId "EV-ARI-999" missing required payload fields
    When I process the ARI event "EV-ARI-999"
    Then the processing must fail with error code "VALIDATION_ERROR"
    And the event must be routed to "DLQ"
