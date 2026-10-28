import { NextResponse } from 'next/server';
import { dbStore } from '@/lib/store';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const district = searchParams.get('district');
    const search = searchParams.get('search');

    const cookieStore = await cookies();
    const userId = cookieStore.get('sih_user_id')?.value;
    const currentUser = userId ? dbStore.getUserById(userId) : dbStore.getCurrentUser();

    let records = dbStore.getLandRecords(currentUser);

    if (status) {
      records = records.filter(r => r.status === status);
    }
    if (district) {
      records = records.filter(r => r.district.value.toLowerCase() === district.toLowerCase());
    }
    if (search) {
      const q = search.toLowerCase();
      records = records.filter(r =>
        r.ownerName.value.toLowerCase().includes(q) ||
        r.surveyNumber.value.toLowerCase().includes(q) ||
        r.pattaNumber.value.toLowerCase().includes(q) ||
        r.village.value.toLowerCase().includes(q) ||
        (r.ulpin && r.ulpin.toLowerCase().includes(q))
      );
    }

    return NextResponse.json({ success: true, count: records.length, data: records });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
