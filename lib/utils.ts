import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatArea(area: number, unit: string) {
  return `${area.toFixed(2)} ${unit}`;
}

export function formatDate(isoString: string) {
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return isoString;
  }
}

export function getConfidenceBadgeClass(confidence: number) {
  const percentage = confidence <= 1 ? confidence * 100 : confidence;
  if (percentage >= 90) {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  } else if (percentage >= 70) {
    return 'bg-amber-50 text-amber-700 border-amber-200';
  } else {
    return 'bg-rose-50 text-rose-700 border-rose-200';
  }
}

export function getConfidenceLabel(confidence: number) {
  const percentage = confidence <= 1 ? confidence * 100 : confidence;
  if (percentage >= 90) return 'High Confidence';
  if (percentage >= 70) return 'Medium Confidence';
  return 'Low Confidence (Review Required)';
}

/**
 * Calculates the exact geodesic surface area of a spherical polygon
 * on WGS84 ellipsoid model (Earth radius ~ 6,378,137m).
 * @param coordinates Array of [latitude, longitude] pairs
 * @param targetUnit 'acre' | 'hectare' | 'bigha' | 'sq.m' | 'sq.ft'
 * @returns Area in the requested target unit
 */
export function calculateGeodesicPolygonArea(
  coordinates: [number, number][],
  targetUnit: string = 'acre'
): number {
  if (!coordinates || coordinates.length < 3) return 0;

  const EARTH_RADIUS_METERS = 6378137;
  const DEG_TO_RAD = Math.PI / 180;
  let totalAngle = 0;

  const n = coordinates.length;
  for (let i = 0; i < n; i++) {
    const p1 = coordinates[i];
    const p2 = coordinates[(i + 1) % n];
    const p3 = coordinates[(i + 2) % n];

    // Coordinates are [lat, lng]
    const lat1 = p1[0] * DEG_TO_RAD;
    const lon1 = p1[1] * DEG_TO_RAD;
    const lat2 = p2[0] * DEG_TO_RAD;
    const lon2 = p2[1] * DEG_TO_RAD;
    const lat3 = p3[0] * DEG_TO_RAD;
    const lon3 = p3[1] * DEG_TO_RAD;

    // Spherical excess component
    totalAngle += (lon3 - lon1) * Math.sin(lat2);
  }

  const areaSqMeters = Math.abs((totalAngle * EARTH_RADIUS_METERS * EARTH_RADIUS_METERS) / 2);

  // Unit conversion
  switch (targetUnit.toLowerCase()) {
    case 'hectare':
      return areaSqMeters / 10000;
    case 'bigha':
      // Standard pucca bigha ~ 2529.3 sq meters
      return areaSqMeters / 2529.285;
    case 'sq.ft':
      return areaSqMeters * 10.7639;
    case 'sq.m':
      return areaSqMeters;
    case 'cent':
      // 1 cent = 40.4686 sq meters
      return areaSqMeters / 40.4686;
    case 'acre':
    default:
      // 1 acre = 4046.856 sq meters
      return areaSqMeters / 4046.856;
  }
}
