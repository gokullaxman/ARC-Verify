import assert from 'node:assert';
import test from 'node:test';
import {
  SurveyNumberRule,
  AreaRule,
  AreaUnitRule,
  OwnerMatchRule,
  EncumbranceRule,
  fuzzyMatchOwner,
  normalizeName,
  levenshteinDistance,
  calculateStringSimilarity,
  soundex,
  ValidationEngine,
  HANDBOOK_VALIDATION_RULES,
} from '../services/validation';
import { calculateGeodesicPolygonArea } from '../lib/utils';
import { INITIAL_LAND_RECORDS } from '../lib/mock-data';

test('normalizeName cleans punctuation, diacritics, and extra whitespace', () => {
  assert.strictEqual(normalizeName('  Dr. Rámésh  KUMAR, IAS. '), 'dr ramesh kumar ias');
  assert.strictEqual(normalizeName('Ramesh Kumor'), 'ramesh kumor');
});

test('levenshteinDistance computes exact edit distance', () => {
  assert.strictEqual(levenshteinDistance('Ramesh', 'Ramesh'), 0);
  assert.strictEqual(levenshteinDistance('Ramesh Kumar', 'Ramesh Kumor'), 1);
  assert.strictEqual(levenshteinDistance('Patta', 'Chitta'), 3);
});

test('calculateStringSimilarity computes normalized similarity ratio', () => {
  const exact = calculateStringSimilarity('Ramesh Kumar', 'Ramesh Kumar');
  assert.strictEqual(exact, 1.0);

  const typo = calculateStringSimilarity('Ramesh Kumar', 'Ramesh Kumor');
  assert.ok(typo > 0.90, `Expected >0.90 but got ${typo}`);

  const diff = calculateStringSimilarity('Ramesh Kumar', 'Harish Tiwari');
  assert.ok(diff < 0.50, `Expected <0.50 but got ${diff}`);
});

test('soundex encodes phonetic representations correctly', () => {
  assert.strictEqual(soundex('Kumar'), soundex('Kumor'));
  assert.strictEqual(soundex('Sharma'), soundex('Sarma'));
});

test('fuzzyMatchOwner correctly identifies registered candidate', () => {
  const match1 = fuzzyMatchOwner('Ramesh Kumor');
  assert.strictEqual(match1.bestMatch, 'Ramesh Kumar');
  assert.ok(match1.similarity > 0.90);
  assert.strictEqual(match1.isPhoneticMatch, true);

  const match2 = fuzzyMatchOwner('Dattatreya Patil');
  assert.strictEqual(match2.bestMatch, 'Dattatray Bhaurao Patil');
});

test('SurveyNumberRule fails when identifier is empty or Unspecified', () => {
  const validRec = {
    ...INITIAL_LAND_RECORDS[0],
    surveyNumber: { ...INITIAL_LAND_RECORDS[0].surveyNumber, value: '145/2A' },
  };
  const result1 = SurveyNumberRule.evaluate(validRec as any);
  assert.strictEqual(result1.status, 'PASSED');
  assert.ok(result1.clause);
  assert.strictEqual(typeof result1.verified, 'boolean');

  const missingRec = {
    ...INITIAL_LAND_RECORDS[0],
    surveyNumber: { ...INITIAL_LAND_RECORDS[0].surveyNumber, value: 'Unspecified' },
  };
  assert.strictEqual(SurveyNumberRule.evaluate(missingRec as any).status, 'FAILED');

  const emptyRec = {
    ...INITIAL_LAND_RECORDS[0],
    surveyNumber: { ...INITIAL_LAND_RECORDS[0].surveyNumber, value: '' },
  };
  assert.strictEqual(SurveyNumberRule.evaluate(emptyRec as any).status, 'FAILED');
});

test('AreaRule requires strictly positive area extent and fails on missing/zero area', () => {
  const validArea = {
    ...INITIAL_LAND_RECORDS[0],
    landArea: { ...INITIAL_LAND_RECORDS[0].landArea, value: 2.45 },
  };
  assert.strictEqual(AreaRule.evaluate(validArea as any).status, 'PASSED');

  const zeroArea = {
    ...INITIAL_LAND_RECORDS[0],
    landArea: { ...INITIAL_LAND_RECORDS[0].landArea, value: 0 },
  };
  assert.strictEqual(AreaRule.evaluate(zeroArea as any).status, 'FAILED');
});

test('OwnerMatchRule fails when ownerName is empty or Unspecified in Document', () => {
  const missingOwner = {
    ...INITIAL_LAND_RECORDS[0],
    ownerName: { value: 'Unspecified in Document', confidence: 0 },
  };
  assert.strictEqual(OwnerMatchRule.evaluate(missingOwner as any).status, 'FAILED');
});

test('EncumbranceRule evaluates actual encumbrance evidence, NOT hardcoded doc-005', () => {
  const cleanDoc005 = {
    ...INITIAL_LAND_RECORDS[0],
    documentId: 'doc-005',
    ownershipType: { value: 'Trust/Institutional', confidence: 0.99, explanation: 'Clear institutional title' },
  };
  assert.strictEqual(
    EncumbranceRule.evaluate(cleanDoc005 as any).status,
    'PASSED',
    'doc-005 without encumbrance evidence must NOT be hardcoded to warn'
  );

  const caveatRec = {
    ...INITIAL_LAND_RECORDS[0],
    documentId: 'doc-999',
    ownershipType: { value: 'Individual', confidence: 0.9, explanation: 'Subject to civil court stay and mortgage caveat' },
  };
  assert.strictEqual(EncumbranceRule.evaluate(caveatRec as any).status, 'WARNING');
});

test('ValidationEngine exposes AICTE handbook rules with clause and verified flag', () => {
  assert.ok(HANDBOOK_VALIDATION_RULES.length >= 12);
  for (const r of HANDBOOK_VALIDATION_RULES) {
    assert.ok(r.clause && r.clause.length > 0, `Rule ${r.code} must have a clause`);
    assert.strictEqual(typeof r.verified, 'boolean', `Rule ${r.code} must have a boolean verified flag`);
  }

  const rec001 = INITIAL_LAND_RECORDS[0];
  const result = ValidationEngine.validateRecord(rec001);
  assert.strictEqual(result.rulesTotal, 10);
  assert.ok(result.rules.every(r => Boolean(r.clause) && typeof r.verified === 'boolean'));
});
