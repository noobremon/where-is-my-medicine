// Geolocation utilities for distance calculation and geohash operations
import {
    geohashForLocation,
    geohashQueryBounds,
    distanceBetween,
} from 'geofire-common';
import { GeoLocation } from './types';

/**
 * Generate a geohash string from lat/lng coordinates
 * @param lat Latitude
 * @param lng Longitude
 * @param precision Geohash precision (default 6 ≈ ±0.6 km)
 */
export function createGeohash(lat: number, lng: number, precision: number = 6): string {
    return geohashForLocation([lat, lng], precision);
}

/**
 * Create a GeoLocation object with geohash
 */
export function createGeoLocation(lat: number, lng: number): GeoLocation {
    return {
        lat,
        lng,
        geohash: createGeohash(lat, lng),
    };
}

/**
 * Calculate distance between two points in kilometers using Haversine formula.
 * Note: geofire-common's distanceBetween already returns distance in km.
 */
export function getDistanceKm(
    point1: { lat: number; lng: number },
    point2: { lat: number; lng: number }
): number {
    const distKm = distanceBetween(
        [point1.lat, point1.lng],
        [point2.lat, point2.lng]
    );
    return Math.round(distKm * 100) / 100; // 2 decimal places
}

/**
 * Get geohash query bounds for a given center and radius.
 * Returns an array of [startHash, endHash] pairs for Firestore range queries.
 * Note: geofire-common's geohashQueryBounds expects radius in meters.
 */
export function getGeohashBounds(
    center: { lat: number; lng: number },
    radiusKm: number
): [string, string][] {
    const radiusMeters = radiusKm * 1000;
    return geohashQueryBounds([center.lat, center.lng], radiusMeters);
}

/**
 * Sort an array of items with location by distance from a center point
 */
export function sortByDistance<T extends { location: GeoLocation }>(
    items: T[],
    center: { lat: number; lng: number }
): (T & { distanceKm: number })[] {
    return items
        .map((item) => ({
            ...item,
            distanceKm: getDistanceKm(item.location, center),
        }))
        .sort((a, b) => a.distanceKm - b.distanceKm);
}

/**
 * Filter items within a given radius
 */
export function filterByRadius<T extends { location: GeoLocation }>(
    items: T[],
    center: { lat: number; lng: number },
    radiusKm: number
): (T & { distanceKm: number })[] {
    return sortByDistance(items, center).filter(
        (item) => item.distanceKm <= radiusKm
    );
}
