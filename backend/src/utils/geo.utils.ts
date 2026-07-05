/**
 * Haversine formula — calculates the great-circle distance between two
 * points on Earth given their latitude and longitude in decimal degrees.
 *
 * @returns Distance in **meters**.
 */
export const calculateDistance = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const EARTH_RADIUS_M = 6_371_000; // Earth's mean radius in meters

  const toRad = (deg: number): number => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_M * c;
};
