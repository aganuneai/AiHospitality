# Package Bundles - BDD Feature Tests

Feature: Package Bundles
  As a hotel manager
  I want to create and offer package bundles
  So that I can increase revenue and provide value to guests

  Background:
    Given the following room types exist:
      | id      | name           | basePrice |
      | rt-001  | Standard Room  | 150       |
      | rt-002  | Deluxe Suite   | 250       |
    And the property "hotel-123" is active

  Scenario: Create a romantic getaway package
    Given I am a hotel manager for property "hotel-123"
    When I create a package with the following details:
      | field           | value                                    |
      | code            | ROMANTIC_GETAWAY                         |
      | name            | Romantic Getaway                         |
      | description     | Perfect for couples                      |
      | roomTypeId      | rt-002                                   |
      | bundleDiscount  | 20                                       |
      | validFrom       | 2026-02-01                               |
      | validUntil      | 2026-12-31                               |
    And I add the following add-ons:
      | type            | name                        | price | included |
      | BREAKFAST       | Champagne Breakfast         | 45    | true     |
      | SPA             | Couples Massage (60min)     | 150   | true     |
      | LATE_CHECKOUT   | Late Checkout (2pm)         | 25    | true     |
    Then the package should be created successfully
    And the base price should be $470
    And the bundle discount should be 20%
    And the final price should be $376
    And the savings should be $94

  Scenario: Calculate package price for multi-night stay
    Given a package "ROMANTIC_GETAWAY" exists with:
      | field           | value  |
      | basePrice       | 470    |
      | bundleDiscount  | 20     |
      | finalPrice      | 376    |
    When I calculate the price for a 3-night stay
      | checkIn   | checkOut   |
      | 2026-06-10 | 2026-06-13 |
    Then the total should be calculated as:
      | nights              | 3      |
      | baseTotal           | $1,410 |
      | bundleTotal         | $1,128 |
      | savings             | $282   |

  Scenario: Guest selects optional add-ons
    Given a package "BUSINESS_EXEC" exists with optional add-ons:
      | type            | name             | price | included |
      | LATE_CHECKOUT   | Late Checkout    | 25    | false    |
    When I calculate the price for a 2-night stay
      | checkIn   | checkOut   |
      | 2026-07-15 | 2026-07-17 |
    And I select optional add-on "LATE_CHECKOUT"
    Then the bundle total should be $600
    And the optional add-ons total should be $50
    And the final total should be $650

  Scenario: Package not available outside valid dates
    Given a package "SUMMER_SPECIAL" exists with:
      | validFrom  | validUntil |
      | 2026-06-01 | 2026-08-31 |
    When I search for available packages on:
      | checkIn    | checkOut   |
      | 2026-09-15 | 2026-09-18 |
    Then the package "SUMMER_SPECIAL" should not be available

  Scenario: Multiple packages sorted by price
    Given the following packages exist:
      | code              | finalPrice |
      | BASIC_PACKAGE     | 200        |
      | PREMIUM_PACKAGE   | 350        |
      | BUDGET_PACKAGE    | 150        |
    When I get available packages for property "hotel-123"
    Then packages should be returned in ascending price order:
      | code              |
      | BUDGET_PACKAGE    |
      | BASIC_PACKAGE     |
      | PREMIUM_PACKAGE   |

  Scenario: Cannot create package with invalid discount
    Given I am a hotel manager for property "hotel-123"
    When I attempt to create a package with bundleDiscount "150"
    Then the creation should fail with error "Bundle discount must be between 0 and 100"

  Scenario: Update package discount
    Given a package "WELLNESS_RETREAT" exists with:
      | basePrice       | 400  |
      | bundleDiscount  | 25   |
      | finalPrice      | 300  |
    When I update the bundle discount to 30%
    Then the final price should be recalculated to $280
    And the package should be updated successfully
