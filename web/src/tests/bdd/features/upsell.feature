# Upsell Engine - BDD Feature Tests

Feature: Upsell Engine
  As a revenue manager
  I want to show intelligent upgrade offers
  So that I can maximize revenue per booking

  Background:
    Given the following room types exist for property "hotel-123":
      | id      | name              | category      | basePrice |
      | rt-001  | Standard Room     | STANDARD      | 150       |
      | rt-002  | Deluxe Room       | DELUXE        | 220       |
      | rt-003  | Executive Suite   | EXECUTIVE     | 350       |
      | rt-004  | Presidential      | PRESIDENTIAL  | 650       |
    And the following packages exist:
      | id       | name                | roomTypeId | finalPrice | bundleDiscount |
      | pkg-001  | Romantic Getaway    | rt-002     | 380        | 20             |

  Scenario: Get room upgrade offers
    Given a guest is booking:
      | roomTypeId | rt-001        |
      | basePrice  | $150/night    |
      | checkIn    | 2026-06-10    |
      | checkOut   | 2026-06-12    |
      | nights     | 2             |
    When upsell offers are generated
    Then I should see the following room upgrade offers:
      | toRoom            | currentPrice | upgradedPrice | difference | priority |
      | Deluxe Room       | $300         | $440          | $140       | 90       |
      | Executive Suite   | $300         | $700          | $400       | 70       |
    And offers should be sorted by priority (highest first)

  Scenario: Package upgrade offer with savings
    Given a guest is booking:
      | roomTypeId | rt-002        |
      | basePrice  | $220/night    |
      | checkIn    | 2026-06-10    |
      | checkOut   | 2026-06-13    |
      | nights     | 3             |
    When upsell offers are generated
    Then I should see a package upgrade offer:
      | package          | Romantic Getaway |
      | currentPrice     | $660             |
      | upgradedPrice    | $1,140           |
      | difference       | $480             |
      | savings          | $420             |
      | priority         | 95               |

  Scenario: Add-on offers
    Given a guest is booking a standard room
    When upsell offers are generated
    Then I should see the following add-on offers:
      | addon           | pricePerNight | priority |
      | Daily Breakfast | $25           | 80       |
      | Valet Parking   | $30           | 70       |
      | Late Checkout   | $35           | 60       |

  Scenario: Limit to top 3 offers
    Given 10 potential upsell offers exist
    When upsell offers are generated
    Then exactly 3 offers should be returned
    And they should be the 3 highest priority offers

  Scenario: Room upgrade not shown if price difference too high
    Given a guest is booking:
      | roomTypeId | rt-001        |
      | basePrice  | $150/night    |
    And Presidential Suite costs $650/night
    When upsell offers are generated
    Then Presidential Suite upgrade should have priority 50 or lower
    And it may not appear in top 3 offers

  Scenario: Track upsell acceptance
    Given an upsell offer "room_upgrade_rt-002" was shown
    When the guest accepts the offer
    Then the acceptance should be tracked
    And conversion rate data should be updated

  Scenario: Historical conversion rates influence priority
    Given room upgrades have the following conversion rates:
      | priceDifference | conversionRate |
      | < $50           | 45%            |
      | $50-$100        | 30%            |
      | $100-$200       | 20%            |
      | > $200          | 10%            |
    When upsell offers are generated
    Then offers with higher conversion rates should be prioritized

  Scenario: Get upsell performance metrics
    Given the following upsell data for last 30 days:
      | totalOffers    | 1250 |
      | acceptedOffers | 387  |
      | revenue        | $45,780 |
    When I request upsell metrics for property "hotel-123"
    Then I should see:
      | metric          | value   |
      | conversionRate  | 31%     |
      | revenue         | $45,780 |
