Feature: ARI event processing
  Scenario: Duplicate ARI event must be applied only once
    When I process the ARI event
    Then the system must deduplicate it