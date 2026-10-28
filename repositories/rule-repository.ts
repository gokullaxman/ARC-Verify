import {
  ComplianceRuleSet,
  ComplianceRule,
  AnnexureChecklistItem,
  RuleSourceStatus,
  RuleSeverity,
  RuleFamily,
} from '../domain/compliance-rule';
import {
  ApplicationProfileType,
  InstitutionCategory,
} from '../domain/application-dossier';

const ALL_INSTITUTION_CATEGORIES: InstitutionCategory[] = [
  'ENGINEERING_AND_TECHNOLOGY',
  'MANAGEMENT',
  'PHARMACY',
  'ARCHITECTURE',
  'APPLIED_ARTS_AND_CRAFTS',
  'HOTEL_MANAGEMENT',
  'MCA',
  'POLYTECHNIC',
];

function buildRule(params: {
  ruleId: string;
  code: string;
  version?: string;
  title: string;
  description: string;
  family: RuleFamily;
  sourceTitle?: string;
  sourceUrl?: string;
  clause: string;
  chapterClauseAnnexure?: string;
  verified: boolean;
  sourceStatus: RuleSourceStatus;
  severity: RuleSeverity;
  applicableApplicationTypes?: ApplicationProfileType[];
  applicableInstitutionCategories?: InstitutionCategory[];
  mandatory?: boolean;
  requiredInputs?: string[];
  evaluationMethod?: string;
  guardrailNote?: string;
  enabled?: boolean;
}): ComplianceRule {
  return {
    ruleId: params.ruleId,
    code: params.code,
    version: params.version || '2026.1',
    title: params.title,
    description: params.description,
    family: params.family,
    sourceTitle: params.sourceTitle || 'AICTE Approval Process Handbook (APH) 2024-25 to 2026-27',
    sourceUrl: params.sourceUrl || 'https://www.aicte.gov.in/sites/default/files/APH%20Final.pdf',
    clause: params.clause,
    chapterClauseAnnexure: params.chapterClauseAnnexure || params.clause,
    verified: params.verified,
    sourceStatus: params.sourceStatus,
    severity: params.severity,
    effectiveFrom: '2024-04-01T00:00:00Z',
    effectiveTo: '2027-03-31T23:59:59Z',
    applicableApplicationTypes: params.applicableApplicationTypes || [
      'AICTE_NEW_INSTITUTION',
      'AICTE_EXTENSION_OF_APPROVAL',
      'AICTE_CLOSURE',
      'GENERIC_DOCUMENT_BUNDLE',
    ],
    applicableInstitutionCategories: params.applicableInstitutionCategories || ALL_INSTITUTION_CATEGORIES,
    applicableAcademicYears: ['2024-25', '2025-26', '2026-27'],
    mandatory: params.mandatory !== undefined ? params.mandatory : true,
    requiredInputs: params.requiredInputs || ['uploadedDocuments'],
    evaluationMethod: params.evaluationMethod || 'Deterministic Assurance Engine',
    guardrailNote: params.guardrailNote || 'Evaluated deterministically against statutory guidelines.',
    enabled: params.enabled !== undefined ? params.enabled : true,
    lastVerifiedAt: '2026-10-28T00:00:00Z',
  };
}

function createBaseRules(): ComplianceRule[] {
  return [
    buildRule({
      ruleId: 'rule-comp-01',
      code: 'COMP-01',
      title: 'Mandatory Annexure Completeness & Category Check',
      description: 'Verifies that all statutory annexures required for the application profile are present and correctly classified.',
      family: 'DOSSIER_COMPLETENESS',
      clause: 'Chapter I, Clause 1.4 & Annexure-1 Checklist',
      verified: true,
      sourceStatus: 'VERIFIED_SOURCE',
      severity: 'CRITICAL',
      guardrailNote: 'Missing or misclassified files report FAIL deficiency; never assert fraud.',
    }),
    buildRule({
      ruleId: 'rule-comp-02',
      code: 'COMP-02',
      title: 'Application Reference & Statutory Identifier Syntax',
      description: 'Validates structure and formatting of AICTE application reference number, permanent ID, and trust registration numbers.',
      family: 'REFERENCE_AND_IDENTIFIER',
      clause: 'Chapter I, Clause 1.3 (Portal Application Identification)',
      verified: true,
      sourceStatus: 'VERIFIED_SOURCE',
      severity: 'HIGH',
      guardrailNote: 'Syntax pass does not imply live portal registration.',
    }),
    buildRule({
      ruleId: 'rule-comp-03',
      code: 'COMP-03',
      title: 'Cross-Document Institution & Trust Identity Match',
      description: 'Cross-checks institution name and sponsoring trust/society name across all uploaded annexures and declared form data.',
      family: 'CROSS_DOCUMENT_CONSISTENCY',
      clause: 'Chapter I, Clause 1.5 (Applicant Legal Entity Consistency)',
      verified: true,
      sourceStatus: 'VERIFIED_SOURCE',
      severity: 'CRITICAL',
      guardrailNote: 'Exact mismatch = FAIL; fuzzy orthographic match (0.78–0.98) = WARNING for officer review.',
    }),
    buildRule({
      ruleId: 'rule-comp-04',
      code: 'COMP-04',
      title: 'State, District & Campus Jurisdiction Hierarchy',
      description: 'Cross-references declared state, district, taluk, and campus address against Land Ownership Certificate.',
      family: 'CROSS_DOCUMENT_CONSISTENCY',
      clause: 'Chapter I, Clause 1.6.2 (Location & Jurisdiction Classification)',
      verified: false,
      sourceStatus: 'NEEDS_REVIEW',
      severity: 'MEDIUM',
      guardrailNote: 'Cross-references declared campus location against Land Certificate.',
    }),
    buildRule({
      ruleId: 'rule-comp-05',
      code: 'COMP-05',
      title: 'SHA-256 Byte Integrity & PDF Metadata Audit',
      description: 'Validates immutable SHA-256 hash at ingestion and inspects PDF metadata for third-party modification tools.',
      family: 'DOCUMENT_INTEGRITY',
      clause: 'Annexure-1 Digital Submission Integrity Controls',
      verified: true,
      sourceStatus: 'VERIFIED_SOURCE',
      severity: 'HIGH',
      guardrailNote: 'Consumer PDF editor metadata produces WARNING only, never auto-rejection (TC-10).',
    }),
    buildRule({
      ruleId: 'rule-comp-06',
      code: 'COMP-06',
      title: 'Experimental Visual Anomaly & Sharpness Heuristics',
      description: 'Analyzes scan sharpness, Laplacian edge gradients, and Error Level Analysis (ELA) for image quality.',
      family: 'FORENSIC_QUALITY_INDICATOR',
      clause: 'ARC-Verify Blueprint Section 9.4 & 9.5',
      verified: true,
      sourceStatus: 'VERIFIED_SOURCE',
      severity: 'LOW',
      guardrailNote: 'Strictly labelled EXPERIMENTAL_HEURISTIC_SIGNAL_ONLY; routes to INCONCLUSIVE, never auto-rejects (TC-11).',
    }),
    buildRule({
      ruleId: 'rule-comp-07',
      code: 'COMP-07',
      title: 'Affidavit Stamp Denomination & PDF Signature',
      description: 'Verifies non-judicial stamp paper denomination threshold (>= Rs. 100) and embedded PKCS#7 digital signature validity.',
      family: 'STAMP_SEAL_SIGNATURE',
      clause: 'Appendix-17 / Annexure-2 Affidavit & Digital Signature Norms',
      verified: false,
      sourceStatus: 'NEEDS_REVIEW',
      severity: 'HIGH',
      guardrailNote: 'Separates stamp denomination check from cryptographic pyHanko / PKCS#7 /ByteRange verification (TC-08, TC-09).',
    }),
    buildRule({
      ruleId: 'rule-comp-08',
      code: 'COMP-08',
      title: 'Contiguous Land Area & Built-Up Carpet Area Norms',
      description: 'Validates contiguous land area (minimum acres) and instructional built-up area against AICTE infrastructure norms.',
      family: 'AICTE_INFRASTRUCTURE_NORMS',
      clause: 'Appendix-4, Clause 4.1 & 4.2 (Land & Built-Up Area Requirements)',
      verified: false,
      sourceStatus: 'NEEDS_REVIEW',
      severity: 'CRITICAL',
      applicableApplicationTypes: ['AICTE_NEW_INSTITUTION'],
      guardrailNote: 'Evaluates campus land/built-up area; returns NOT_APPLICABLE for EoA/Generic (TC-12).',
    }),
    buildRule({
      ruleId: 'rule-comp-09',
      code: 'COMP-09',
      title: 'Optional GIS Campus Polygon Boundary Check',
      description: 'Inspects surveyed cadastral polygon GeoJSON boundary, checking perimeter closure and territorial boundary overlap.',
      family: 'GIS_SPATIAL_BOUNDARY',
      clause: 'Chapter I, Clause 1.6.3 (Spatial Verification)',
      verified: false,
      sourceStatus: 'NEEDS_REVIEW',
      severity: 'MEDIUM',
      mandatory: false,
      guardrailNote: 'Returns NOT_CHECKED when no surveyed GeoJSON polygon is attached.',
    }),
    buildRule({
      ruleId: 'rule-comp-10',
      code: 'COMP-10',
      title: 'Cross-Dossier Duplicate Checksum & Certificate Reuse',
      description: 'Detects duplicate SHA-256 document checksums across multiple institutional dossiers to prevent duplicate asset claims.',
      family: 'DUPLICATE_REUSE_DETECTION',
      clause: 'Chapter I, Clause 1.12 (Prevention of Duplicate / Shared Infrastructure)',
      verified: false,
      sourceStatus: 'NEEDS_REVIEW',
      severity: 'HIGH',
      guardrailNote: 'Flags duplicate SHA-256 hashes across dossiers for officer review.',
    }),
    buildRule({
      ruleId: 'rule-comp-11',
      code: 'COMP-11',
      title: 'Fire Safety NOC & Corpus FDR Validity Window',
      description: 'Validates that Fire Safety NOC has not expired prior to academic session cutoff (2026-08-01) and FDR corpus meets threshold.',
      family: 'VALIDITY_WINDOW',
      clause: 'Chapter I, Clause 1.7.4 & Clause 1.9',
      verified: false,
      sourceStatus: 'NEEDS_REVIEW',
      severity: 'HIGH',
      guardrailNote: 'Cutoff date (2026-08-01) and Rs. 35 Lakh FDR threshold are prototype parameters marked verified: false (NEEDS_REVIEW) pending institutional category table confirmation.',
    }),
    buildRule({
      ruleId: 'rule-comp-12',
      code: 'COMP-12',
      title: 'External Authoritative Registry & Issuer Adapter',
      description: 'Adapter for DigiLocker, State Land Revenue Portals, and Core Banking System (CBS) FDR verification.',
      family: 'EXTERNAL_REGISTRY_VERIFICATION',
      clause: 'Chapter I, Clause 1.11 (External Verification)',
      verified: false,
      sourceStatus: 'NEEDS_REVIEW',
      severity: 'MEDIUM',
      guardrailNote: 'Returns NOT_CHECKED (SOURCE_UNAVAILABLE) when live external APIs are unconfigured (TC-13).',
    }),
  ];
}

const DEFAULT_NEW_INST_CHECKLIST: AnnexureChecklistItem[] = [
  {
    category: 'APPLICATION_FORM',
    title: 'AICTE Application Form (Part-1 & Part-2)',
    mandatory: true,
    sourceClause: 'Clause 1.4',
    verified: true,
    description: 'Signed institutional application declaration with proposed programs and intake.',
    acceptedFormats: ['application/pdf'],
  },
  {
    category: 'LAND_OWNERSHIP_CERTIFICATE',
    title: 'Land Ownership / Registered Sale Deed / Lease Deed (>= 30 yrs)',
    mandatory: true,
    sourceClause: 'Appendix 4, Clause 4.1',
    verified: true,
    description: 'Registered title deed establishing clear and unencumbered land ownership.',
    acceptedFormats: ['application/pdf'],
  },
  {
    category: 'BUILDING_PLAN_APPROVAL',
    title: 'Approved Building Plan from Competent Municipal / Town Planning Authority',
    mandatory: true,
    sourceClause: 'Appendix 4, Clause 4.2',
    verified: true,
    description: 'Sanctioned architectural building plan with instructional and administrative carpet area.',
    acceptedFormats: ['application/pdf'],
  },
  {
    category: 'FIRE_SAFETY_NOC',
    title: 'Fire Safety Certificate / NOC from State Fire Services Department',
    mandatory: true,
    sourceClause: 'Clause 1.7.4',
    verified: false,
    description: 'Valid fire safety clearance certificate covering instructional blocks.',
    acceptedFormats: ['application/pdf', 'image/jpeg', 'image/png'],
  },
  {
    category: 'BANK_FDR_CORPUS_RECEIPT',
    title: 'Fixed Deposit Receipt (FDR) / Corpus Fund in Joint Account with AICTE',
    mandatory: true,
    sourceClause: 'Clause 1.9',
    verified: false,
    description: 'Corpus FDR lien receipt established in nationalised or scheduled commercial bank.',
    acceptedFormats: ['application/pdf', 'image/jpeg', 'image/png'],
  },
  {
    category: 'TRUST_SOCIETY_DEED',
    title: 'Trust / Society Registration Certificate and Memorandum of Association',
    mandatory: true,
    sourceClause: 'Clause 1.5',
    verified: true,
    description: 'Statutory registration certificate of sponsoring society or trust.',
    acceptedFormats: ['application/pdf'],
  },
  {
    category: 'NON_JUDICIAL_AFFIDAVIT',
    title: 'Affidavit on Non-Judicial Stamp Paper (Appendix 17)',
    mandatory: true,
    sourceClause: 'Appendix 17',
    verified: false,
    description: 'Sworn affidavit affirming non-deviation from AICTE norms with digital/ink signature.',
    acceptedFormats: ['application/pdf'],
  },
];

const DEFAULT_EOA_CHECKLIST: AnnexureChecklistItem[] = [
  {
    category: 'APPLICATION_FORM',
    title: 'AICTE EoA Application Declaration',
    mandatory: true,
    sourceClause: 'Clause 2.1',
    verified: true,
    description: 'Annual extension of approval compliance declaration.',
    acceptedFormats: ['application/pdf'],
  },
  {
    category: 'PREVIOUS_EOA_LETTER',
    title: 'Previous Academic Year AICTE EoA Letter',
    mandatory: true,
    sourceClause: 'Clause 2.3',
    verified: true,
    description: 'AICTE approval letter issued for the preceding academic cycle.',
    acceptedFormats: ['application/pdf'],
  },
  {
    category: 'FIRE_SAFETY_NOC',
    title: 'Renewed / Valid Fire Safety Certificate',
    mandatory: true,
    sourceClause: 'Clause 2.4',
    verified: false,
    description: 'Current fire clearance certificate for continued campus operations.',
    acceptedFormats: ['application/pdf'],
  },
  {
    category: 'FACULTY_COMPLIANCE_ROSTER',
    title: 'Approved Faculty Roster and Cadre Ratio Declaration',
    mandatory: true,
    sourceClause: 'Appendix 7',
    verified: false,
    description: 'Cadre-wise faculty roster signed by Registrar / Principal.',
    acceptedFormats: ['application/pdf'],
  },
];

const DEFAULT_GENERIC_CHECKLIST: AnnexureChecklistItem[] = [
  {
    category: 'APPLICATION_FORM',
    title: 'Dossier Submission Overview',
    mandatory: true,
    sourceClause: 'General Submission Norms',
    verified: true,
    description: 'Summary dossier overview and indexing sheet.',
    acceptedFormats: ['application/pdf'],
  },
  {
    category: 'OTHER_SUPPORTING',
    title: 'Supporting Documentation Bundle',
    mandatory: false,
    sourceClause: 'General Submission Norms',
    verified: true,
    description: 'General supporting attachments.',
    acceptedFormats: ['application/pdf', 'image/jpeg', 'image/png'],
  },
];

export class RuleRepository {
  private static ruleSets: ComplianceRuleSet[] = [
    {
      id: 'ruleset-aicte-new-2026-27',
      name: 'AICTE New Technical Institution Approval Norms (2026–27)',
      version: '2026.1',
      applicationType: 'AICTE_NEW_INSTITUTION',
      academicYear: '2026-27',
      sourceTitle: 'AICTE Approval Process Handbook (APH) 2024–25 to 2026–27',
      sourceUrl: 'https://www.aicte.gov.in/sites/default/files/APH%20Final.pdf',
      sourceStatus: 'VERIFIED_SOURCE',
      effectiveFrom: '2024-04-01T00:00:00Z',
      effectiveTo: '2027-03-31T23:59:59Z',
      requiredChecklist: DEFAULT_NEW_INST_CHECKLIST,
      rules: createBaseRules(),
    },
    {
      id: 'ruleset-aicte-eoa-2026-27',
      name: 'AICTE Extension of Approval (EoA) Annual Norms (2026–27)',
      version: '2026.1',
      applicationType: 'AICTE_EXTENSION_OF_APPROVAL',
      academicYear: '2026-27',
      sourceTitle: 'AICTE Approval Process Handbook (APH) 2024–25 to 2026–27 Chapter II',
      sourceUrl: 'https://www.aicte.gov.in/sites/default/files/APH%20Final.pdf',
      sourceStatus: 'VERIFIED_SOURCE',
      effectiveFrom: '2024-04-01T00:00:00Z',
      effectiveTo: '2027-03-31T23:59:59Z',
      requiredChecklist: DEFAULT_EOA_CHECKLIST,
      rules: createBaseRules().map(r => {
        // COMP-08 is not applicable to EoA
        if (r.code === 'COMP-08') {
          return {
            ...r,
            applicableApplicationTypes: ['AICTE_NEW_INSTITUTION'],
          };
        }
        return r;
      }),
    },
    {
      id: 'ruleset-generic-dossier-2026',
      name: 'Generic Educational Dossier Verification Framework (2026)',
      version: '2026.1',
      applicationType: 'GENERIC_DOCUMENT_BUNDLE',
      academicYear: '2026-27',
      sourceTitle: 'Standard Electronic Dossier Assurance Model',
      sourceUrl: 'https://www.aicte.gov.in',
      sourceStatus: 'NEEDS_REVIEW',
      effectiveFrom: '2024-04-01T00:00:00Z',
      effectiveTo: '2027-03-31T23:59:59Z',
      requiredChecklist: DEFAULT_GENERIC_CHECKLIST,
      rules: createBaseRules().map(r => {
        if (r.code === 'COMP-08') {
          return {
            ...r,
            applicableApplicationTypes: ['AICTE_NEW_INSTITUTION'],
          };
        }
        return r;
      }),
    },
  ];

  static listRuleSets(): ComplianceRuleSet[] {
    return this.ruleSets;
  }

  static getRuleSetById(ruleSetId: string): ComplianceRuleSet | undefined {
    return this.ruleSets.find(rs => rs.id === ruleSetId);
  }

  static resolveActiveRuleSetForProfile(
    profileType: ApplicationProfileType
  ): ComplianceRuleSet {
    const match = this.ruleSets.find(rs => rs.applicationType === profileType);
    return match || this.ruleSets[0];
  }

  static toggleRuleEnabled(
    ruleSetId: string,
    ruleId: string,
    enabled: boolean
  ): ComplianceRule | null {
    for (const rs of this.ruleSets) {
      if (rs.id === ruleSetId || !ruleSetId) {
        const found = rs.rules.find(r => r.ruleId === ruleId || r.code === ruleId);
        if (found) {
          found.enabled = enabled;
          return found;
        }
      }
    }
    return null;
  }
}
