import { ApplicationProfileType, InstitutionCategory } from './application-dossier';
import { DocumentCategory } from './document';

export type RuleSourceStatus = 'VERIFIED_SOURCE' | 'NEEDS_REVIEW' | 'DISABLED';

export type RuleSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export type RuleFamily =
  | 'DOSSIER_COMPLETENESS'
  | 'REFERENCE_AND_IDENTIFIER'
  | 'CROSS_DOCUMENT_CONSISTENCY'
  | 'DOCUMENT_INTEGRITY'
  | 'FORENSIC_QUALITY_INDICATOR'
  | 'STAMP_SEAL_SIGNATURE'
  | 'AICTE_INFRASTRUCTURE_NORMS'
  | 'GIS_SPATIAL_BOUNDARY'
  | 'DUPLICATE_REUSE_DETECTION'
  | 'VALIDITY_WINDOW'
  | 'EXTERNAL_REGISTRY_VERIFICATION'
  | 'GENERIC_DOMAIN_COMPLIANCE';

export interface ComplianceRule {
  ruleId: string;
  code: string; // e.g. COMP-01 .. COMP-12
  version: string;
  title: string;
  description: string;
  family: RuleFamily;
  sourceTitle: string;
  sourceUrl: string;
  clause: string;
  chapterClauseAnnexure: string;
   verified: boolean;
  effectiveFrom: string;
  effectiveTo?: string;
  applicableApplicationTypes: ApplicationProfileType[];
  applicableInstitutionCategories: InstitutionCategory[];
  applicableAcademicYears: string[];
  mandatory: boolean;
  severity: RuleSeverity;
  requiredInputs: string[];
  evaluationMethod: string;
  guardrailNote: string;
  sourceStatus: RuleSourceStatus;
  enabled: boolean;
  lastVerifiedAt: string;
}

export interface AnnexureChecklistItem {
  category: DocumentCategory;
  title: string;
  mandatory: boolean;
  sourceClause: string;
  verified?: boolean;
  description: string;
  acceptedFormats: ('application/pdf' | 'image/jpeg' | 'image/png')[];
}

export interface ComplianceRuleSet {
  id: string;
  name: string;
  version: string;
  applicationType: ApplicationProfileType;
  academicYear: string;
  sourceTitle: string;
  sourceUrl: string;
  sourceStatus: RuleSourceStatus;
  effectiveFrom: string;
  effectiveTo?: string;
  requiredChecklist: AnnexureChecklistItem[];
  rules: ComplianceRule[];
}
