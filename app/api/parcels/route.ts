import { NextResponse } from 'next/server';
import { dbStore } from '@/lib/store';

export async function GET() {
  const parcels = dbStore.getParcels();
  return NextResponse.json({
    success: true,
    type: 'FeatureCollection',
    metadata: {
      layerName: 'Demonstration cadastral layer',
      crs: 'EPSG:4326',
      note: 'Sample cadastral boundary polygons linked with Bhu-Aadhaar ULPIN identifiers'
    },
    data: parcels
  });
}
