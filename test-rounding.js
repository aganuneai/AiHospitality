
const { AriService } = require('./web/src/lib/services/ari-service');

const ariService = new AriService();

const testRounding = () => {
    const cases = [
        { value: 100.12, rule: 'NEAREST_WHOLE', expected: 100 },
        { value: 100.56, rule: 'NEAREST_WHOLE', expected: 101 },
        { value: 100.12, rule: 'ENDING_99', expected: 100.99 },
        { value: 100.12, rule: 'ENDING_90', expected: 100.90 },
        { value: 102.3, rule: 'MULTIPLE_5', expected: 100 }, // Math.round(102.3 / 5) = 20 -> 20 * 5 = 100
        { value: 103.5, rule: 'MULTIPLE_5', expected: 105 }, // Math.round(103.5 / 5) = 21 -> 21 * 5 = 105
        { value: 104.9, rule: 'MULTIPLE_10', expected: 100 },
        { value: 105.1, rule: 'MULTIPLE_10', expected: 110 },
    ];

    console.log("=== Testing Rounding Rules ===");
    cases.forEach(c => {
        const result = ariService['applyRounding'](c.value, c.rule);
        const pass = result === c.expected;
        console.log(`Rule: ${c.rule.padEnd(15)} | In: ${c.value} | Out: ${result} | Expected: ${c.expected} | ${pass ? 'PASSED ✅' : 'FAILED ❌'}`);
    });
};

testRounding();
