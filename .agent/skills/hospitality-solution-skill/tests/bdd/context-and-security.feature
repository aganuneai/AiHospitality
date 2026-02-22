Feature: Context and Security

  Scenario: Property request without hotelId or hubId must fail fast
    Given a context with domain "PROPERTY" and requestId "REQ-1001"
    And the context has no "hotelId"
    And the context has no "hubId"
    When I validate the context envelope
    Then the validation must fail with error code "CONTEXT_INVALID"
    And no downstream PMS calls must be made

  Scenario: Property request with both hotelId and hubId must fail fast
    Given a context with domain "PROPERTY" and requestId "REQ-1002"
    And the context has "hotelId" = "H-001"
    And the context has "hubId" = "HB-001"
    When I validate the context envelope
    Then the validation must fail with error code "CONTEXT_INVALID"
    And no downstream PMS calls must be made

  Scenario: Distribution request must require channelCode and appKey
    Given a context with domain "DISTRIBUTION" and requestId "REQ-1003"
    And the context has "hubId" = "HB-001"
    And the context has no "channelCode"
    And the context has no "appKey"
    When I validate the context envelope
    Then the validation must fail with error code "CONTEXT_INVALID"
    And no downstream Distribution calls must be made

  Scenario: Expired token must return AUTH_EXPIRED and not retry blindly
    Given a valid context for domain "PROPERTY" with requestId "REQ-1101"
    And the OAuth token is expired
    When I call any protected API
    Then the response must be an error with code "AUTH_EXPIRED"
    And the client must not retry the same call without refreshing the token

  Scenario: Invalid token must return AUTH_INVALID
    Given a valid context for domain "DISTRIBUTION" with requestId "REQ-1102"
    And the OAuth token is invalid
    When I call any protected API
    Then the response must be an error with code "AUTH_INVALID"
