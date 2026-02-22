Feature: Quote workflow
  Scenario: Quote should return pricingSignature and policies
    When I execute the Quote saga
    Then the Quote must succeed