import { NextResponse } from 'next/server';
import { RuleRepository } from '@/repositories/rule-repository';
import { getSessionUserFromCookies } from '@/lib/session';
import { hasPermission } from '@/lib/auth';

export async function GET(request: Request) {
  const caller = await getSessionUserFromCookies(request);
  if (!caller) {
    return NextResponse.json(
      { success: false, errorCode: 'UNAUTHORIZED', message: 'Authentication required.' },
      { status: 401 }
    );
  }
  return NextResponse.json({
    success: true,
    data: RuleRepository.listRuleSets(),
  });
}

export async function PATCH(request: Request) {
  const caller = await getSessionUserFromCookies(request);
  if (!caller || !hasPermission(caller, 'RULE_CONFIGURE')) {
    return NextResponse.json(
      { success: false, errorCode: 'FORBIDDEN', message: 'Forbidden: RULE_CONFIGURE permission required.' },
      { status: 403 }
    );
  }
  const body = await request.json();
  const updated = RuleRepository.toggleRuleEnabled(body.ruleSetId, body.ruleId, Boolean(body.enabled));
  if (!updated) {
    return NextResponse.json({ success: false, message: 'Rule not found.' }, { status: 404 });
  }
  return NextResponse.json({ success: true, data: updated });
}
