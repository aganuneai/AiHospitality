# Payment Authorization - BDD Feature Tests

Feature: Payment Authorization (Auth/Capture)
  As a hotel operator
  I want to authorize payments at booking and capture at check-in
  So that I can hold funds securely and comply with PCI-DSS

  Background:
    Given a reservation "res-001" exists with total $450
    And the guest has a tokenized card "tok_visa_1234"

  Scenario: Authorize payment at booking
    Given I am processing a new booking
    When I authorize payment with:
      | reservationId | res-001           |
      | amount        | $450              |
      | currency      | USD               |
      | cardToken     | tok_visa_1234     |
    Then the authorization should succeed
    And the status should be "AUTHORIZED"
    And an authorization code should be generated
    And the authorization should expire in 7 days
    And funds of $450 should be held on the card

  Scenario: Capture full payment at check-in
    Given a payment of $450 is authorized
    And the authorization status is "AUTHORIZED"
    When I capture the full amount at check-in
    Then the capture should succeed
    And the status should change to "CAPTURED"
    And $450 should be charged to the card
    And captured timestamp should be recorded

  Scenario: Partial capture for early checkout
    Given a payment of $600 is authorized for 3 nights
    And the guest checks out after 2 nights
    When I capture $400 (partial amount)
    Then the capture should succeed
    And $400 should be charged
    And $200 authorization should be released

  Scenario: Capture amount cannot exceed authorized amount
    Given a payment of $450 is authorized
    When I attempt to capture $500
    Then the capture should fail with error "Capture amount ($500) exceeds authorized amount ($450)"

  Scenario: Void authorization on booking cancellation
    Given a payment of $450 is authorized
    And the guest cancels before check-in
    When I void the authorization
    Then the void should succeed
    And the status should change to "VOIDED"
    And the hold on $450 should be released

  Scenario: Cannot capture after voiding
    Given a payment of $450 is authorized
    And the authorization is voided
    When I attempt to capture the payment
    Then the capture should fail with error "Cannot capture payment with status VOIDED"

  Scenario: Refund full captured payment
    Given a payment of $450 is captured
    When I issue a full refund
    Then the refund should succeed
    And $450 should be returned to the card
    And the status should change to "REFUNDED"

  Scenario: Partial refund for service issues
    Given a payment of $450 is captured
    When I issue a partial refund of $100 for service recovery
    Then the refund should succeed
    And $100 should be returned to the card
    And the status should remain "CAPTURED"
    And remaining refundable amount should be $350

  Scenario: Cannot refund more than captured
    Given a payment of $450 is captured
    When I attempt to refund $500
    Then the refund should fail with error "Refund amount ($500) exceeds available amount ($450)"

  Scenario: Multiple partial refunds
    Given a payment of $450 is captured
    When I refund $100 for room issue
    And I refund $50 for late checkout compensation
    Then total refunded should be $150
    And refundable balance should be $300
    And the status should remain "CAPTURED"

  Scenario: Authorization expires after 7 days
    Given a payment is authorized on 2026-06-01
    And today is 2026-06-09
    When I attempt to capture the payment
    Then the capture should fail with error "Authorization has expired"

  Scenario: Failed authorization due to insufficient funds
    Given the card has insufficient funds
    When I attempt to authorize $450
    Then the authorization should fail
    And the status should be "FAILED"
    And the failure reason should be "Insufficient funds"
    And no transaction ID should be recorded

  Scenario: Get authorization details
    Given a payment is authorized with ID "auth-123"
    When I retrieve the authorization details
    Then I should see:
      | field              | value            |
      | id                 | auth-123         |
      | status             | AUTHORIZED       |
      | amount             | $450             |
      | cardLast4          | 1234             |
      | cardBrand          | VISA             |
      | authorizationCode  | AUTH12ABC        |

  Scenario: View all authorizations for a reservation
    Given reservation "res-001" has the following payment history:
      | type        | amount | status    | date       |
      | authorize   | $450   | VOIDED    | 2026-06-01 |
      | authorize   | $450   | CAPTURED  | 2026-06-02 |
    When I retrieve authorizations for "res-001"
    Then I should see 2 authorization records
    And they should be sorted by date (newest first)

  Scenario: PCI-DSS compliance - card data never stored
    When I authorize a payment
    Then only the card token should be stored
    And the card last 4 digits should be stored
    And full card number should never be stored
    And CVV should never be stored

  Scenario: Immediate capture for no-show policy
    Given a payment of $150 (no-show fee) is authorized
    And the guest doesn't check in
    When I capture $150 as no-show fee
    Then the capture should succeed immediately
    And a no-show note should be recorded
