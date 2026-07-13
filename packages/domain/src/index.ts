/** Pure agronomy and product-domain boundary. It must remain framework-independent. */

export type AreaUnit = 'SQUARE_METRE' | 'HECTARE' | 'ACRE' | 'GUNTHA';
export type SetupStatus =
  'NOT_STARTED' | 'IN_PROGRESS' | 'READY_FOR_REVIEW' | 'COMPLETE' | 'NEEDS_REVIEW';
export type HardwareStatus = 'SKIPPED' | 'NOT_CONFIGURED' | 'RSK_SETUP_REQUIRED';
export type LocationCaptureMethod = 'GPS_POINT' | 'MANUAL_MAP' | 'VILLAGE_LANDMARK' | 'UNKNOWN';

export interface SetupPlotRuleInput {
  readonly plotId: string;
  readonly farmId: string;
  readonly name: string;
  readonly area: number;
  readonly areaUnit: AreaUnit;
  readonly locationMethod: LocationCaptureMethod;
}

export interface SetupFarmRuleInput {
  readonly farmId: string;
  readonly name: string;
  readonly location: {
    readonly district: string;
    readonly taluka: string;
    readonly village: string;
  };
  readonly plots: readonly SetupPlotRuleInput[];
}

export interface FarmerSetupRuleInput {
  readonly preferredLocale: string;
  readonly deviceMode: 'PERSONAL' | 'TRUSTED_FAMILY' | 'RSK_ASSISTED';
  readonly farms: readonly SetupFarmRuleInput[];
  readonly hardwareStatus: HardwareStatus;
  readonly gpsPermission: 'GRANTED' | 'DENIED' | 'PROMPT' | 'UNKNOWN';
}

export interface SetupValidationResult {
  readonly status: SetupStatus;
  readonly normalizedAreaSquareMetres: number;
  readonly issues: readonly string[];
}

const AREA_FACTORS: Readonly<Record<AreaUnit, number>> = Object.freeze({
  SQUARE_METRE: 1,
  HECTARE: 10_000,
  ACRE: 4_046.8564224,
  GUNTHA: 101.17141056,
});

export function normalizeArea(area: number, unit: AreaUnit): number {
  if (!Number.isFinite(area) || area <= 0) {
    throw new RangeError('Plot area must be a positive number.');
  }
  return Math.round(area * AREA_FACTORS[unit] * 100) / 100;
}

export function validateFarmerSetup(input: FarmerSetupRuleInput): SetupValidationResult {
  const issues: string[] = [];
  if (!['mr-IN', 'hi-IN', 'en-IN'].includes(input.preferredLocale)) {
    issues.push('profile.preferredLocale');
  }
  if (input.farms.length < 1) issues.push('farms.required');

  let totalArea = 0;
  for (const farm of input.farms) {
    if (farm.location.district !== 'Raigad') issues.push(`farm.${farm.farmId}.district`);
    if (farm.name.trim().length === 0) issues.push(`farm.${farm.farmId}.name`);
    if (farm.location.taluka.trim().length === 0) issues.push(`farm.${farm.farmId}.taluka`);
    if (farm.location.village.trim().length === 0) issues.push(`farm.${farm.farmId}.village`);
    if (farm.plots.length < 1) issues.push(`farm.${farm.farmId}.plots.required`);
    for (const plot of farm.plots) {
      if (plot.name.trim().length === 0) issues.push(`plot.${plot.plotId}.name`);
      totalArea += normalizeArea(plot.area, plot.areaUnit);
      if (input.gpsPermission === 'DENIED' && plot.locationMethod === 'GPS_POINT') {
        issues.push(`plot.${plot.plotId}.gps.denied`);
      }
    }
  }

  if (!['SKIPPED', 'NOT_CONFIGURED', 'RSK_SETUP_REQUIRED'].includes(input.hardwareStatus)) {
    issues.push('hardware.status');
  }

  return {
    status: issues.length === 0 ? 'READY_FOR_REVIEW' : 'IN_PROGRESS',
    normalizedAreaSquareMetres: totalArea,
    issues,
  };
}
