Feature: Context and Security
  Scenario: Property request without hotelId or hubId must fail fast
    Given a context with domain ""PROPERTY"" and requestId ""REQ-1001""
    When I validate the context envelope
    Then the validation must fail with error code ""CONTEXT_INVALID""