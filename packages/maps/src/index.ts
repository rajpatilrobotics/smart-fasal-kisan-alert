/** Map-provider adapters and non-map accessibility equivalents live behind this boundary. */

export type ManualPlotCapture =
  | {
      kind: 'VILLAGE_LANDMARK';
      village: string;
      landmark?: string;
    }
  | {
      kind: 'MANUAL_MAP';
      vertices: readonly { lat: number; lng: number }[];
    };

export interface PlotMapAdapter {
  readonly provider: 'GOOGLE_MAPS_DATA_LAYER' | 'ACCESSIBLE_LIST_ONLY';
  load(): Promise<void>;
  captureManualPlot(input: ManualPlotCapture): Promise<ManualPlotCapture>;
}

export function gpsDeniedFallback(village: string, landmark?: string): ManualPlotCapture {
  return { kind: 'VILLAGE_LANDMARK', village, ...(landmark === undefined ? {} : { landmark }) };
}
