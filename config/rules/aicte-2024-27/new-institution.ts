import { RuleRepository } from '@/repositories/rule-repository';
import { ComplianceRuleSet } from '@/domain/compliance-rule';

export const AICTE_NEW_INSTITUTION_RULE_SET: ComplianceRuleSet =
  RuleRepository.resolveActiveRuleSetForProfile('AICTE_NEW_INSTITUTION');
