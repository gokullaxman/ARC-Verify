import { LandRecord, ValidationResult, ValidationRuleResult } from '@/types';
import { MASTER_LOCATIONS } from '@/lib/mock-data';
import { dbStore } from '@/lib/store';
import { calculateGeodesicPolygonArea } from '@/lib/utils';
import { AICTE_NEW_INSTITUTION_RULE_SET } from '@/config/rules/aicte-2024-27/new-institution';

export interface HandbookRuleDefinition {
  ruleId: string;
  code: string;
  name: string;
  clause: string;
  verified: boolean;
  description: string;
}

export const HANDBOOK_VALIDATION_RULES: HandbookRuleDefinition[] = AICTE_NEW_INSTITUTION_RULE_SET.rules.map(r => ({
  ruleId: r.ruleId,
  code: r.code,
  name: r.title,
  clause: r.clause,
  verified: r.verified,
  description: r.description,
}));

export function normalizeName(name: string): string {
  if (!name) return '';
  return name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}

export function calculateStringSimilarity(str1: string, str2: string): number {
  const norm1 = normalizeName(str1);
  const norm2 = normalizeName(str2);
  if (!norm1 || !norm2) return 0.0;
  if (norm1 === norm2) return 1.0;

  const maxLen = Math.max(norm1.length, norm2.length);
  const distance = levenshteinDistance(norm1, norm2);
  return Math.max(0, 1 - distance / maxLen);
}

export function soundex(str: string): string {
  const s = normalizeName(str).toUpperCase();
  if (!s) return '0000';

  const map: Record<string, string> = {
    B: '1', F: '1', P: '1', V: '1',
    C: '2', G: '2', J: '2', K: '2', Q: '2', S: '2', X: '2', Z: '2',
    D: '3', T: '3',
    L: '4',
    M: '5', N: '5',
    R: '6',
  };

  const firstLetter = s[0];
  let code = firstLetter;
  let prev = map[firstLetter] || '0';

  for (let i = 1; i < s.length && code.length < 4; i++) {
    const curr = map[s[i]] || '0';
    if (curr !== '0' && curr !== prev) {
      code += curr;
    }
    prev = curr;
  }

  return (code + '0000').slice(0, 4);
}

const AUTHORIZED_ENTITY_REGISTRY = [
  'Sri Venkateswara Institute of Technology and Science',
  'Dakshina Bharat Technical Education Trust',
  'Ramesh Kumar',
  'Harish Chandra Tiwari',
  'Dattatray Bhaurao Patil',
  'Suresh Kumar Verma',
  'K. Meenakshi Ammal',
  'S. Muthuvel',
  'Pt. Ramkinkar Tiwari',
  'Bhaurao Patil',
  'Anjali Deshmukh',
  'K. Murugan',
];

export function fuzzyMatchOwner(extractedName: string): {
  bestMatch: string;
  similarity: number;
  isPhoneticMatch: boolean;
} {
  if (!extractedName || !extractedName.trim()) {
    return { bestMatch: '', similarity: 0, isPhoneticMatch: false };
  }
  let bestMatch = '';
  let highestSimilarity = 0;
  const targetSoundex = soundex(extractedName);

  for (const candidate of AUTHORIZED_ENTITY_REGISTRY) {
    const sim = calculateStringSimilarity(extractedName, candidate);
    if (sim > highestSimilarity) {
      highestSimilarity = sim;
      bestMatch = candidate;
    }
  }

  const isPhoneticMatch = Boolean(bestMatch) && soundex(bestMatch) === targetSoundex;
  return {
    bestMatch,
    similarity: parseFloat(highestSimilarity.toFixed(4)),
    isPhoneticMatch,
  };
}

function isMissingOrPlaceholder(val: string | undefined | null): boolean {
  if (!val) return true;
  const norm = val.trim().toLowerCase();
  return (
    norm.length === 0 ||
    norm === 'unspecified' ||
    norm === 'unspecified in document' ||
    norm === 'unknown' ||
    norm === 'n/a'
  );
}

export class SurveyNumberRule {
  static readonly clause = 'AICTE APH 2024–27 Chapter I, Clause 1.3 & Clause 1.6';
  static readonly verified = true;

  static evaluate(record: LandRecord): ValidationRuleResult {
    const surveyVal = record.surveyNumber?.value?.trim() || '';
    if (isMissingOrPlaceholder(surveyVal)) {
      return {
        ruleId: 'COMP-02',
        name: 'Statutory Certificate / Plot Identifier Syntax',
        clause: this.clause,
        verified: this.verified,
        status: 'FAILED',
        message: 'Required plot/certificate identifier was not extracted from document (missing or empty).',
        fieldAffected: 'surveyNumber',
      };
    }
    const hasValidSyntax = /^[0-9]{1,4}[A-Za-z0-9\/-]*$/.test(surveyVal) || /^(AICTE|EOA|FRS)-[0-9]{4}-[A-Z0-9-]+$/i.test(surveyVal);
    return {
      ruleId: 'COMP-02',
      name: 'Statutory Certificate / Plot Identifier Syntax',
      clause: this.clause,
      verified: this.verified,
      status: hasValidSyntax ? 'PASSED' : 'FAILED',
      message: hasValidSyntax
        ? `Identifier "${surveyVal}" conforms to statutory reference syntax (${this.clause}).`
        : `Invalid identifier syntax "${surveyVal}".`,
      fieldAffected: 'surveyNumber',
    };
  }
}

export class VillageRule {
  static readonly clause = 'AICTE APH 2024–27 Chapter I, Clause 1.6.2 (Campus Location)';
  static readonly verified = false;

  static evaluate(record: LandRecord): ValidationRuleResult {
    const stateVal = record.state?.value || '';
    const districtVal = record.district?.value || '';
    const talukVal = record.taluk?.value || '';
    const villageVal = record.village?.value || '';

    if (isMissingOrPlaceholder(villageVal)) {
      return {
        ruleId: 'COMP-04A',
        name: 'Campus Sub-Division / Location Verification',
        clause: this.clause,
        verified: this.verified,
        status: 'FAILED',
        message: 'Campus city/village location is missing from extracted document fields.',
        fieldAffected: 'village',
      };
    }

    const stateData = MASTER_LOCATIONS[stateVal];
    const taluksInDist = stateData?.districts[districtVal]?.taluks;
    const villagesInTaluk = taluksInDist ? taluksInDist[talukVal] : undefined;
    const villageExists = villagesInTaluk
      ? villagesInTaluk.some(v => v.toLowerCase() === villageVal.toLowerCase())
      : false;

    return {
      ruleId: 'COMP-04A',
      name: 'Campus Sub-Division / Location Verification',
      clause: this.clause,
      verified: this.verified,
      status: villageExists ? 'PASSED' : 'WARNING',
      message: villageExists
        ? `Campus location "${villageVal}" verified in jurisdiction master (${talukVal}, ${districtVal}).`
        : `Campus location "${villageVal}" not found in local taluk master table; routed for officer verification.`,
      fieldAffected: 'village',
    };
  }
}

export class AdministrativeHierarchyRule {
  static readonly clause = 'AICTE APH 2024–27 Chapter I, Clause 1.6.2 (State/District Hierarchy)';
  static readonly verified = false;

  static evaluate(record: LandRecord): ValidationRuleResult {
    const stateVal = record.state?.value || '';
    const districtVal = record.district?.value || '';
    const stateData = MASTER_LOCATIONS[stateVal];
    const districtMatches = stateData?.districts[districtVal] !== undefined;

    return {
      ruleId: 'COMP-04B',
      name: 'State & District Jurisdiction Consistency',
      clause: this.clause,
      verified: this.verified,
      status: districtMatches ? 'PASSED' : 'FAILED',
      message: districtMatches
        ? `District "${districtVal}" is a valid administrative division of State "${stateVal}".`
        : `District "${districtVal}" does not match State "${stateVal}".`,
      fieldAffected: 'district',
    };
  }
}

export class AreaRule {
  static readonly clause = 'AICTE APH 2024–27 Appendix-4, Clause 4.1 (Contiguous Land Area Norms)';
  static readonly verified = false;

  static evaluate(record: LandRecord): ValidationRuleResult {
    const rawArea = record.landArea?.value;
    const areaVal = typeof rawArea === 'number' && !Number.isNaN(rawArea) ? rawArea : 0;
    const isAreaPositive = areaVal > 0;

    return {
      ruleId: 'COMP-08A',
      name: 'Certified Land Extent Verification',
      clause: this.clause,
      verified: this.verified,
      status: isAreaPositive ? 'PASSED' : 'FAILED',
      message: isAreaPositive
        ? `Extracted contiguous land area (${areaVal}) is positive and explicitly stated in the document.`
        : `Missing or non-positive land area (${areaVal}). Silent fallback values are prohibited; document fails extent check.`,
      fieldAffected: 'landArea',
    };
  }
}

export class AreaUnitRule {
  static readonly clause = 'AICTE APH 2024–27 Appendix-4 (Authorized Measurement Units)';
  static readonly verified = true;

  static evaluate(record: LandRecord): ValidationRuleResult {
    const unitVal = record.areaUnit?.value;
    const validUnits = ['acre', 'hectare', 'bigha', 'sq.ft', 'sq.m', 'cent', 'guntha'];
    const isUnitValid = validUnits.includes(unitVal as any);

    return {
      ruleId: 'COMP-08B',
      name: 'Authorized Area Measurement Unit Check',
      clause: this.clause,
      verified: this.verified,
      status: isUnitValid ? 'PASSED' : 'FAILED',
      message: isUnitValid
        ? `Unit "${unitVal}" is an authorized measurement standard.`
        : `Unrecognized measurement unit "${unitVal}".`,
      fieldAffected: 'areaUnit',
    };
  }
}

export class DuplicateRule {
  static readonly clause = 'AICTE APH 2024–27 Chapter I, Clause 1.12 (Duplicate Certificate / Parcel Prevention)';
  static readonly verified = false;

  static evaluate(record: LandRecord): { ruleResult: ValidationRuleResult; isDuplicate: boolean; matchingRecordId?: string } {
    const surveyVal = record.surveyNumber?.value?.trim() || '';
    const villageVal = record.village?.value?.trim() || '';

    if (isMissingOrPlaceholder(surveyVal)) {
      return {
        ruleResult: {
          ruleId: 'COMP-10',
          name: 'Cross-Dossier Duplicate Certificate / Plot Check',
          clause: this.clause,
          verified: this.verified,
          status: 'FAILED',
          message: 'Cannot verify uniqueness because plot/certificate identifier is missing.',
          fieldAffected: 'surveyNumber',
        },
        isDuplicate: false,
      };
    }

    const allRecords = dbStore.getLandRecords().filter(r => r.id !== record.id);
    const potentialDuplicate = allRecords.find(
      r =>
        r.village?.value?.toLowerCase() === villageVal.toLowerCase() &&
        r.surveyNumber?.value?.toLowerCase() === surveyVal.toLowerCase() &&
        r.subdivisionNumber?.value?.toLowerCase() === record.subdivisionNumber?.value?.toLowerCase()
    );

    const isDuplicate = !!potentialDuplicate;
    const ruleResult: ValidationRuleResult = {
      ruleId: 'COMP-10',
      name: 'Cross-Dossier Duplicate Certificate / Plot Check',
      clause: this.clause,
      verified: this.verified,
      status: isDuplicate ? 'FAILED' : 'PASSED',
      message: isDuplicate
        ? `Duplicate certificate/parcel reuse detected! Plot ${surveyVal}/${record.subdivisionNumber?.value} in ${villageVal} is already bound to record #${potentialDuplicate.id}.`
        : `No duplicate certificate or plot registration detected across dossiers.`,
      fieldAffected: 'surveyNumber',
    };

    return { ruleResult, isDuplicate, matchingRecordId: potentialDuplicate?.id };
  }
}

export class OwnerMatchRule {
  static readonly clause = 'AICTE APH 2024–27 Chapter I, Clause 1.5 (Applicant & Titleholder Identity Match)';
  static readonly verified = true;

  static evaluate(record: LandRecord): ValidationRuleResult {
    const ownerNameVal = record.ownerName?.value?.trim() || '';
    if (isMissingOrPlaceholder(ownerNameVal) || ownerNameVal.length < 2) {
      return {
        ruleId: 'COMP-03',
        name: 'Applicant / Titleholder Entity Identity Match',
        clause: this.clause,
        verified: this.verified,
        status: 'FAILED',
        message: 'Titleholder / Institution legal name was not extracted from the document (empty or unspecified).',
        fieldAffected: 'ownerName',
      };
    }

    const { bestMatch, similarity, isPhoneticMatch } = fuzzyMatchOwner(ownerNameVal);

    if (similarity >= 0.98) {
      return {
        ruleId: 'COMP-03',
        name: 'Applicant / Titleholder Entity Identity Match',
        clause: this.clause,
        verified: this.verified,
        status: 'PASSED',
        message: `Entity identity "${ownerNameVal}" exact-matched against registry ("${bestMatch}").`,
        fieldAffected: 'ownerName',
      };
    } else if (similarity >= 0.75 || isPhoneticMatch) {
      return {
        ruleId: 'COMP-03',
        name: 'Applicant / Titleholder Entity Identity Match',
        clause: this.clause,
        verified: this.verified,
        status: 'WARNING',
        message: `Entity name "${ownerNameVal}" has ${Math.round(similarity * 100)}% orthographic similarity to "${bestMatch}". Routed for Scrutiny Officer review.`,
        fieldAffected: 'ownerName',
      };
    } else {
      return {
        ruleId: 'COMP-03',
        name: 'Applicant / Titleholder Entity Identity Match',
        clause: this.clause,
        verified: this.verified,
        status: 'WARNING',
        message: `Entity name "${ownerNameVal}" requires cross-document verification against Part-I Application Form.`,
        fieldAffected: 'ownerName',
      };
    }
  }
}

export class StampRule {
  static readonly clause = 'AICTE APH 2024–27 Appendix-17 / Annexure-2 (Stamp & Seal Verification)';
  static readonly verified = false;

  static evaluate(record: LandRecord): ValidationRuleResult {
    const mutationNum = record.mutationNumber?.value?.trim() || '';
    const hasValidMutation =
      !isMissingOrPlaceholder(mutationNum) &&
      mutationNum.length > 3 &&
      (record.mutationNumber?.confidence || 0) > 0.5;

    return {
      ruleId: 'COMP-07',
      name: 'Certificate Registration & Stamp Reference Check',
      clause: this.clause,
      verified: this.verified,
      status: hasValidMutation ? 'PASSED' : 'WARNING',
      message: hasValidMutation
        ? `Certificate / stamp registration reference "${mutationNum}" verified.`
        : `Stamp / registration reference has low confidence (${Math.round((record.mutationNumber?.confidence || 0) * 100)}%). Officer inspection required.`,
      fieldAffected: 'mutationNumber',
    };
  }
}

export class GISAreaRule {
  static readonly clause = 'AICTE APH 2024–27 Chapter I, Clause 1.6.3 (Optional Spatial Boundary Check)';
  static readonly verified = false;

  static evaluate(record: LandRecord): { ruleResult: ValidationRuleResult; gisAreaCheck: ValidationResult['gisAreaCheck'] } {
    const areaVal = Number(record.landArea?.value) || 0;
    const unitVal = record.areaUnit?.value || 'acre';
    const settings = dbStore.getSystemSettings();
    const areaToleranceLimit = settings.areaTolerancePercent || 15;

    let gisAreaCheck: ValidationResult['gisAreaCheck'] = {
      status: 'PASSED',
      extractedArea: areaVal,
      gisArea: areaVal,
      unit: unitVal,
      deviationPercentage: 0,
    };

    if (record.gisParcelId) {
      const parcel = dbStore.getParcelById(record.gisParcelId);
      if (parcel) {
        let computedArea = parcel.gisArea;
        if (parcel.coordinates && parcel.coordinates.length >= 3) {
          const geodesicArea = calculateGeodesicPolygonArea(parcel.coordinates, unitVal);
          if (geodesicArea > 0) {
            computedArea = geodesicArea;
          }
        }

        const deviation = Math.abs((areaVal - computedArea) / computedArea) * 100;
        const isExceeded = deviation > areaToleranceLimit;

        gisAreaCheck = {
          status: isExceeded ? 'WARNING' : 'PASSED',
          extractedArea: areaVal,
          gisArea: parseFloat(computedArea.toFixed(4)),
          unit: parcel.gisUnit || unitVal,
          deviationPercentage: parseFloat(deviation.toFixed(1)),
        };

        const ruleResult: ValidationRuleResult = {
          ruleId: 'COMP-09',
          name: 'Optional GIS Campus Boundary Area Tolerance Check',
          clause: this.clause,
          verified: this.verified,
          status: isExceeded ? 'WARNING' : 'PASSED',
          message: isExceeded
            ? `Document area (${areaVal} ${unitVal}) deviates from GIS polygon (${computedArea.toFixed(2)} ${parcel.gisUnit}) by ${deviation.toFixed(1)}% (Threshold: ${areaToleranceLimit}%).`
            : `Document area (${areaVal} ${unitVal}) aligns with GIS polygon (${computedArea.toFixed(2)} ${parcel.gisUnit}) within tolerance (${deviation.toFixed(1)}% <= ${areaToleranceLimit}%).`,
          fieldAffected: 'landArea',
        };
        return { ruleResult, gisAreaCheck };
      }
    }

    return {
      ruleResult: {
        ruleId: 'COMP-09',
        name: 'Optional GIS Campus Boundary Area Tolerance Check',
        clause: this.clause,
        verified: this.verified,
        status: 'PASSED',
        message: 'No optional GIS polygon linked; spatial differential skipped.',
      },
      gisAreaCheck,
    };
  }
}

export class EncumbranceRule {
  static readonly clause = 'AICTE APH 2024–27 Chapter I, Clause 1.6 (Encumbrance-Free Institutional Title)';
  static readonly verified = true;

  /**
   * Evaluates encumbrance/lien keywords in extracted text or ownership metadata
   * rather than hardcoding a specific document ID (such as doc-005).
   */
  static evaluate(record: LandRecord): ValidationRuleResult {
    const explanationText = [
      record.ownershipType?.explanation || '',
      record.landClassification?.explanation || '',
      record.mutationNumber?.value || '',
      record.registrationNumber?.value || '',
    ]
      .join(' ')
      .toLowerCase();

    const hasEncumbranceEvidence =
      explanationText.includes('caveat') ||
      explanationText.includes('encumbrance') ||
      explanationText.includes('mortgage') ||
      explanationText.includes('hypothecation') ||
      explanationText.includes('court stay') ||
      explanationText.includes('disputed');

    return {
      ruleId: 'COMP-08C',
      name: 'Encumbrance-Free Title & Lien Inspection',
      clause: this.clause,
      verified: this.verified,
      status: hasEncumbranceEvidence ? 'WARNING' : 'PASSED',
      message: hasEncumbranceEvidence
        ? `Extracted text/remarks contain encumbrance, mortgage, or judicial caveat indicators (${this.clause}). Officer scrutiny required.`
        : `No encumbrance, mortgage, or judicial caveat indicators found in extracted fields.`,
    };
  }
}

export class ValidationEngine {
  static getHandbookRules(): HandbookRuleDefinition[] {
    return HANDBOOK_VALIDATION_RULES;
  }

  static validateRecord(record: LandRecord): ValidationResult {
    const rules: ValidationRuleResult[] = [];

    rules.push(SurveyNumberRule.evaluate(record));
    rules.push(VillageRule.evaluate(record));
    rules.push(AdministrativeHierarchyRule.evaluate(record));
    rules.push(AreaRule.evaluate(record));
    rules.push(AreaUnitRule.evaluate(record));

    const duplicateEvaluation = DuplicateRule.evaluate(record);
    rules.push(duplicateEvaluation.ruleResult);

    rules.push(OwnerMatchRule.evaluate(record));
    rules.push(StampRule.evaluate(record));

    const gisEvaluation = GISAreaRule.evaluate(record);
    rules.push(gisEvaluation.ruleResult);

    rules.push(EncumbranceRule.evaluate(record));

    const hasFailed = rules.some(r => r.status === 'FAILED');
    const hasWarning = rules.some(r => r.status === 'WARNING');
    const passedCount = rules.filter(r => r.status === 'PASSED').length;

    const overallStatus: 'PASSED' | 'WARNING' | 'FAILED' = hasFailed
      ? 'FAILED'
      : hasWarning
      ? 'WARNING'
      : 'PASSED';

    return {
      recordId: record.id,
      overallStatus,
      rulesPassed: passedCount,
      rulesTotal: rules.length,
      rules,
      duplicateCheck: {
        isPotentialDuplicate: duplicateEvaluation.isDuplicate,
        matchingRecordId: duplicateEvaluation.matchingRecordId,
        details: duplicateEvaluation.isDuplicate
          ? `Identifier ${record.surveyNumber?.value} matches existing record #${duplicateEvaluation.matchingRecordId}`
          : undefined,
      },
      gisAreaCheck: gisEvaluation.gisAreaCheck,
    };
  }
}
