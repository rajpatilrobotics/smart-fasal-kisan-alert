import { describe, expect, it } from 'vitest';

import { normalizeArea, validateFarmerSetup } from './index';

const plot = {
  plotId: 'plot-1',
  farmId: 'farm-1',
  name: 'Plot 1',
  area: 1,
  areaUnit: 'ACRE' as const,
  locationMethod: 'VILLAGE_LANDMARK' as const,
};

describe('Farmer setup domain rules', () => {
  it('normalizes supported Raigad pilot area units with a stable versioned factor', () => {
    expect(normalizeArea(1, 'ACRE')).toBe(4046.86);
    expect(normalizeArea(10, 'GUNTHA')).toBe(1011.71);
  });

  it('allows GPS-denied setup when the plot uses a manual or village-landmark alternative', () => {
    const result = validateFarmerSetup({
      preferredLocale: 'mr-IN',
      deviceMode: 'PERSONAL',
      gpsPermission: 'DENIED',
      hardwareStatus: 'SKIPPED',
      farms: [
        {
          farmId: 'farm-1',
          name: 'Raigad Farm',
          location: { district: 'Raigad', taluka: 'Alibag', village: 'Poynad' },
          plots: [plot, { ...plot, plotId: 'plot-2', name: 'Plot 2', area: 12, areaUnit: 'GUNTHA' }],
        },
      ],
    });

    expect(result.status).toBe('READY_FOR_REVIEW');
    expect(result.issues).toEqual([]);
    expect(result.normalizedAreaSquareMetres).toBeGreaterThan(5000);
  });

  it('does not accept a GPS point when permission was denied', () => {
    const result = validateFarmerSetup({
      preferredLocale: 'mr-IN',
      deviceMode: 'PERSONAL',
      gpsPermission: 'DENIED',
      hardwareStatus: 'SKIPPED',
      farms: [
        {
          farmId: 'farm-1',
          name: 'Raigad Farm',
          location: { district: 'Raigad', taluka: 'Alibag', village: 'Poynad' },
          plots: [{ ...plot, locationMethod: 'GPS_POINT' }],
        },
      ],
    });

    expect(result.status).toBe('IN_PROGRESS');
    expect(result.issues).toContain('plot.plot-1.gps.denied');
  });
});
