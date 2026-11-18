import {
  calculateUsAqiFromPm25,
  getAqiCategory,
  getFallbackAqiReading,
} from '@/lib/aqi';

describe('AQI category mapping and calculations', () => {
  it('maps US AQI ranges to expected categories with accessible labels and icons', () => {
    expect(getAqiCategory(25).id).toBe('good');
    expect(getAqiCategory(25).icon).toBe('shield-check');

    expect(getAqiCategory(75).id).toBe('moderate');
    expect(getAqiCategory(125).id).toBe('sensitive');
    expect(getAqiCategory(180).id).toBe('unhealthy');
    expect(getAqiCategory(240).id).toBe('very_unhealthy');
    expect(getAqiCategory(350).id).toBe('hazardous');
    expect(getAqiCategory(350).icon).toBe('siren');
  });

  it('handles negative or non-finite AQI gracefully', () => {
    expect(getAqiCategory(-10).id).toBe('good');
    expect(getAqiCategory(Number.NaN).id).toBe('good');
  });

  it('calculates US EPA AQI from PM2.5 concentrations accurately', () => {
    expect(calculateUsAqiFromPm25(5.0)).toBeLessThanOrEqual(50);
    expect(calculateUsAqiFromPm25(25.0)).toBeGreaterThan(50);
    expect(calculateUsAqiFromPm25(25.0)).toBeLessThanOrEqual(100);
    expect(calculateUsAqiFromPm25(100.0)).toBeGreaterThan(150);
    expect(calculateUsAqiFromPm25(400.0)).toBeGreaterThan(300);
  });

  it('builds a valid fallback baseline reading', () => {
    const fallback = getFallbackAqiReading('Lahore');
    expect(fallback.isFallback).toBe(true);
    expect(fallback.locationName).toContain('Lahore');
    expect(fallback.usAqi).toBeGreaterThan(0);
    expect(fallback.category.label).toBeTruthy();
  });
});
