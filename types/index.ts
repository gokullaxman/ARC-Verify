export * from '../domain/application-dossier';
export * from '../domain/document';
export * from '../domain/extracted-field';
export * from '../domain/compliance-rule';
export * from '../domain/finding';
export * from '../domain/review-decision';

export type UserRole =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'SCRUTINY_OFFICER'
  | 'COMPLIANCE_AUDITOR'
  | 'APPLICANT'
  | 'DEMO_OPERATOR'
  | 'REVENUE_OFFICER'
  | 'VERIFICATION_OFFICER'
  | 'DATA_ENTRY_OPERATOR'
  | 'GIS_OFFICER'
  | 'AUDITOR'
  | 'VIEWER';

export type PermissionKey =
  | 'CASE_VIEW'
  | 'CASE_CREATE'
  | 'CASE_ANALYZE'
  | 'CASE_REVIEW'
  | 'REPORT_GENERATE'
  | 'RULE_VIEW'
  | 'RULE_CONFIGURE'
  | 'DOCUMENT_VIEW'
  | 'DOCUMENT_UPLOAD'
  | 'DOCUMENT_DELETE'
  | 'DOCUMENT_PROCESS'
  | 'DOCUMENT_DOWNLOAD'
  | 'RECORD_VIEW'
  | 'RECORD_CREATE'
  | 'RECORD_EDIT'
  | 'RECORD_DELETE'
  | 'RECORD_APPROVE'
  | 'RECORD_REJECT'
  | 'VERIFICATION_VIEW'
  | 'VERIFICATION_EDIT'
  | 'VERIFICATION_APPROVE'
  | 'VERIFICATION_REJECT'
  | 'GIS_VIEW'
  | 'GIS_EDIT'
  | 'USER_VIEW'
  | 'USER_CREATE'
  | 'USER_EDIT'
  | 'USER_DISABLE'
  | 'ROLE_VIEW'
  | 'ROLE_CREATE'
  | 'ROLE_EDIT'
  | 'ROLE_DELETE'
  | 'AUDIT_VIEW'
  | 'ANALYTICS_VIEW'
  | 'VALIDATION_RUN'
  | 'VALIDATION_CONFIGURE'
  | 'AI_PROCESS'
  | 'SYSTEM_SETTINGS';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  designation: string;
  department: string;
  state: string;
  district: string;
  taluk?: string;
  village?: string;
  institutionId?: string;
  employeeId?: string;
  phone?: string;
  status: 'ACTIVE' | 'INACTIVE';
  passwordHash?: string;
  permissions?: PermissionKey[];
  lastLogin?: string;
}

export interface Role {
  id: string;
  name: string;
  code: UserRole;
  description: string;
  userCount: number;
  createdAt: string;
  isSystem: boolean;
  permissions: PermissionKey[];
}

export interface SystemSettings {
  confidenceThreshold: number;
  areaTolerancePercent: number;
  duplicateMatchThreshold: number;
  maxUploadSizeMb?: number;
  maxPdfPages?: number;
  enableExperimentalForensics?: boolean;
  activeDefaultRuleSetId?: string;
  supportedLanguages: string[];
  documentTypes: string[];
  validationRulesEnabled: Record<string, boolean>;
  notificationsEnabled: boolean;
  emailAlertsEnabled: boolean;
  autoExtractLayoutLM: boolean;
  dilrmpApiSync: boolean;
  updatedAt?: string;
  updatedBy?: string;
}

export interface AppNotification {
  id: string;
  userId?: string;
  title: string;
  message: string;
  type: 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR';
  read: boolean;
  createdAt: string;
  timestamp?: string;
  link?: string;
}

export type DocumentType =
  | 'Application Form'
  | 'Land Ownership Certificate'
  | 'Building Plan Approval'
  | 'Fire Safety NOC'
  | 'Bank FDR / Corpus Receipt'
  | 'Trust / Society Deed'
  | 'Non-Judicial Affidavit'
  | 'Previous EoA Letter'
  | 'Faculty Compliance Roster'
  | 'Accreditation Certificate'
  | 'Patta'
  | 'Chitta'
  | 'Adangal'
  | 'Sale deed'
  | 'Sale Deed'
  | 'Mutation record'
  | 'Survey record'
  | 'Survey Settlement Register'
  | 'Land ownership register'
  | 'Cadastral document'
  | 'Historical register'
  | 'Other';

export type DocumentStatus =
  | 'UPLOADED'
  | 'PROCESSING'
  | 'OCR_COMPLETED'
  | 'EXTRACTION_COMPLETED'
  | 'VALIDATION_COMPLETED'
  | 'VERIFICATION_REQUIRED'
  | 'VERIFIED'
  | 'FLAGGED'
  | 'FAILED'
  | 'REJECTED';

export interface DocumentRecord {
  id: string;
  caseId?: string;
  sha256?: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  filePath: string;
  fileUrl?: string;
  documentType: DocumentType;
  pages: number;
  language: string;
  state: string;
  district: string;
  taluk: string;
  village: string;
  uploadedAt: string;
  uploadedBy: string;
  status: DocumentStatus;
  processingSteps: {
    step: string;
    status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
    timestamp?: string;
    details?: string;
  }[];
  ocrConfidence?: number;
  confidence?: number;
  recordId?: string;
  previewUrl?: string;
  rawText?: string;
  tokens?: RecognizedToken[];
  extractedData?: {
    ownerName?: string;
    surveyNumber?: string;
    extentAcres?: string;
    ulpin?: string;
    [key: string]: any;
  };
}

export interface RecognizedCharacter {
  char: string;
  confidence: number;
  glyphType?: string;
}

export interface RecognizedToken {
  id: string;
  word: string;
  text?: string;
  transliteration?: string;
  characters?: RecognizedCharacter[];
  confidence: number;
  bbox: [number, number, number, number];
  matchedDataset: string;
  fieldTag?: string;
  meaning?: string;
  pageNumber?: number;
}

export interface ExtractedField<T = string> {
  value: T;
  confidence: number;
  originalValue?: T;
  isModified?: boolean;
  explanation?: string;
  boundingBox?: [number, number, number, number];
}

export interface LandRecord {
  id: string;
  documentId: string;
  previewUrl?: string;
  tokens?: RecognizedToken[];
  ownerName: ExtractedField<string>;
  fatherOrHusbandName: ExtractedField<string>;
  surveyNumber: ExtractedField<string>;
  subdivisionNumber: ExtractedField<string>;
  khasraNumber: ExtractedField<string>;
  khataNumber: ExtractedField<string>;
  pattaNumber: ExtractedField<string>;
  plotNumber: ExtractedField<string>;
  village: ExtractedField<string>;
  taluk: ExtractedField<string>;
  district: ExtractedField<string>;
  state: ExtractedField<string>;
  landArea: ExtractedField<number>;
  areaUnit: ExtractedField<'acre' | 'hectare' | 'bigha' | 'sq.ft' | 'sq.m'>;
  landClassification: ExtractedField<'Agricultural (Irrigated)' | 'Agricultural (Dry/Rainfed)' | 'Residential' | 'Commercial' | 'Government/Pormboke'>;
  ownershipType: ExtractedField<'Individual' | 'Joint / Co-owners' | 'Government' | 'Trust/Institutional'>;
  mutationNumber: ExtractedField<string>;
  registrationNumber: ExtractedField<string>;
  registrationDate: ExtractedField<string>;
  previousOwner: ExtractedField<string>;
  currentOwner: ExtractedField<string>;
  overallConfidence: number;
  status: 'PENDING_VALIDATION' | 'REQUIRES_VERIFICATION' | 'VERIFIED' | 'REJECTED';
  validationResult?: ValidationResult;
  assignedOfficer?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  lastModified?: string;
  ulpin?: string;
  gisParcelId?: string;
}

export interface ValidationRuleResult {
  ruleId: string;
  name: string;
  clause?: string;
  verified?: boolean;
  status: 'PASSED' | 'WARNING' | 'FAILED';
  message: string;
  fieldAffected?: string;
}

export interface ValidationResult {
  recordId: string;
  overallStatus: 'PASSED' | 'WARNING' | 'FAILED';
  rulesPassed: number;
  rulesTotal: number;
  rules: ValidationRuleResult[];
  duplicateCheck: {
    isPotentialDuplicate: boolean;
    confidence?: number;
    matchingRecordId?: string;
    details?: string;
  };
  gisAreaCheck: {
    status: 'PASSED' | 'WARNING' | 'FAILED';
    extractedArea: number;
    gisArea: number;
    unit: string;
    deviationPercentage: number;
  };
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  caseId?: string;
  recordId?: string;
  documentId?: string;
  fieldName?: string;
  previousValue?: string;
  newValue?: string;
  ipAddress?: string;
  details?: string;
  previousHash?: string;
  eventHash?: string;
}

export interface CadastralParcel {
  id: string;
  ulpin: string;
  surveyNumber: string;
  subdivision: string;
  village: string;
  taluk: string;
  district: string;
  state: string;
  gisArea: number;
  gisUnit: string;
  ownerName: string;
  classification: string;
  status: 'VERIFIED' | 'PENDING' | 'DISPUTED';
  coordinates: [number, number][];
  center: [number, number];
}

export interface AIFeedbackRecord {
  id: string;
  recordId: string;
  documentId: string;
  fieldName: string;
  originalValue: string;
  correctedValue: string;
  confidence: number;
  documentType: DocumentType;
  language: string;
  officerId: string;
  timestamp: string;
}
