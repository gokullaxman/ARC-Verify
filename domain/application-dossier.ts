/**
 * Domain: Application Dossier — Core types for AICTE institutional verification cases.
 *
 * Used by:
 *  - types/index.ts (re-exports)
 *  - domain/compliance-rule.ts (ApplicationProfileType, InstitutionCategory)
 *  - lib/auth.ts (VerificationCase)
 *  - repositories/dossier-repository.ts (VerificationCase)
 *  - services/assurance/compliance-engine.ts (VerificationCase)
 *  - app/api/cases/* (VerificationCase, ApplicationProfileType, InstitutionCategory, CampusZoneType)
 */

export type ApplicationProfileType =
  | 'AICTE_NEW_INSTITUTION'
  | 'AICTE_EXTENSION_OF_APPROVAL'
  | 'AICTE_CLOSURE'
  | 'GENERIC_DOCUMENT_BUNDLE';

export type InstitutionCategory =
  | 'ENGINEERING_AND_TECHNOLOGY'
  | 'MANAGEMENT'
  | 'PHARMACY'
  | 'ARCHITECTURE'
  | 'APPLIED_ARTS_AND_CRAFTS'
  | 'HOTEL_MANAGEMENT'
  | 'MCA'
  | 'POLYTECHNIC';

export type CampusZoneType =
  | 'URBAN_MUNICIPAL'
  | 'RURAL_PANCHAYAT';

export type DossierStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_SCRUTINY'
  | 'NEEDS_INFORMATION'
  | 'REVIEW_REQUIRED'
  | 'READY_FOR_OFFICER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'WITHDRAWN';

export interface ApplicationFormData {
  declaredInstitutionName: string;
  declaredTrustName: string;
  applicationReferenceNumber: string;
  academicYear: string;
  proposedIntake: number;
  declaredLandAreaAcres: number;
  declaredBuiltUpAreaSqm: number;
  requiredBuiltUpAreaSqm: number;
  fireSafetyCertificateNumber?: string;
  fireSafetyExpiryDate?: string;
  affidavitStampDenominationRs?: number;
  fdrAmountLakhs?: number;
  previousEoaReferenceNumber?: string;
  facultyStudentRatio?: string;
  declaredSignatoryName?: string;
}

export interface Institution {
  id: string;
  legalName: string;
  trustOrSocietyName: string;
  institutionCategory: InstitutionCategory;
  campusZone: CampusZoneType;
  state: string;
  district: string;
  cityOrVillage: string;
  pincode: string;
  aictePermanentId?: string;
  createdAt: string;
}

export interface ApplicationProfile {
  id: string;
  institutionId: string;
  applicationType: ApplicationProfileType;
  academicYear: string;
  referenceNumber: string;
  createdBy: string;
  createdAt: string;
  formData: ApplicationFormData;
}

export interface VerificationCase {
  id: string;
  applicationId: string;
  institution: Institution;
  application: ApplicationProfile;
  status: DossierStatus;
  activeRuleSetId: string;
  activeRuleSetVersion: string;
  updatedAt: string;
  isSyntheticDemo: boolean;
}
