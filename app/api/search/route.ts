import { NextResponse } from 'next/server';
import { dbStore } from '@/lib/store';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') || '').toLowerCase().trim();

  if (!q) {
    return NextResponse.json({ success: true, count: 0, data: [] });
  }

  const records = dbStore.getLandRecords().filter(r =>
    r.ownerName.value.toLowerCase().includes(q) ||
    r.surveyNumber.value.toLowerCase().includes(q) ||
    r.pattaNumber.value.toLowerCase().includes(q) ||
    r.village.value.toLowerCase().includes(q) ||
    r.district.value.toLowerCase().includes(q) ||
    r.khasraNumber.value.toLowerCase().includes(q) ||
    (r.ulpin && r.ulpin.toLowerCase().includes(q))
  );

  return NextResponse.json({
    success: true,
    query: q,
    count: records.length,
    data: records
  });
}
