'use client';

export type SetupSyncStatus =
  | 'SAVED_ON_THIS_PHONE'
  | 'WAITING_FOR_INTERNET'
  | 'SYNCED'
  | 'CONFLICT'
  | 'LOCKED_RECOVERY';

export interface DemoPlot {
  id: string;
  name: string;
  area: number;
  unit: 'ACRE' | 'GUNTHA' | 'HECTARE' | 'SQUARE_METRE';
  normalizedAreaSquareMetres: number;
  gpsPermission: 'DENIED' | 'GRANTED';
  locationMethod: 'VILLAGE_LANDMARK' | 'MANUAL_MAP';
  soilPh: string;
  soilNpk: string;
  water: string;
  crop: string;
  stage: string;
}

export interface FarmerSetupDemoState {
  accountId: string;
  language: 'mr-IN' | 'hi-IN' | 'en-IN';
  deviceMode: 'PERSONAL' | 'TRUSTED_FAMILY' | 'RSK_ASSISTED';
  displayName: string;
  village: string;
  taluka: string;
  district: 'Raigad';
  consents: Record<string, 'ALLOW' | 'DENY' | 'WITHDRAW'>;
  hardwareStatus: 'SKIPPED' | 'NOT_CONFIGURED' | 'RSK_SETUP_REQUIRED';
  syncStatus: SetupSyncStatus;
  setupStatus: 'IN_PROGRESS' | 'READY_FOR_REVIEW' | 'COMPLETE';
  farms: readonly [
    {
      id: string;
      name: string;
      plots: DemoPlot[];
    },
  ];
  voiceProposal?: {
    field: 'plotName';
    plotId: string;
    proposedValue: string;
    confirmed: boolean;
  };
  updatedAt: string;
}

const STORAGE_PREFIX = 'sfka:m3:farmer-setup:';
const ACCOUNT_KEY = 'sfka:m3:active-account';

export function defaultFarmerSetupState(accountId = 'demo-farmer-j1'): FarmerSetupDemoState {
  const updatedAt = new Date().toISOString();
  return {
    accountId,
    language: 'mr-IN',
    deviceMode: 'PERSONAL',
    displayName: 'शेतकरी J1',
    village: 'पोयनाड',
    taluka: 'अलिबाग',
    district: 'Raigad',
    consents: {
      'location.processing': 'DENY',
      'audio.storage': 'DENY',
      'case.sharing': 'ALLOW',
      'visit.access': 'ALLOW',
      'assisted_service.access': 'ALLOW',
      'channel.app_push': 'DENY',
      'channel.sms': 'ALLOW',
      'channel.ivr': 'DENY',
    },
    hardwareStatus: 'SKIPPED',
    syncStatus: 'SAVED_ON_THIS_PHONE',
    setupStatus: 'IN_PROGRESS',
    farms: [
      {
        id: '00000000-0000-4000-8000-000000000301',
        name: 'रायगड प्रात्यक्षिक शेत',
        plots: [
          {
            id: '00000000-0000-4000-8000-000000000401',
            name: 'प्लॉट १',
            area: 1.2,
            unit: 'ACRE',
            normalizedAreaSquareMetres: 4856.23,
            gpsPermission: 'DENIED',
            locationMethod: 'VILLAGE_LANDMARK',
            soilPh: '6.7',
            soilNpk: 'N मध्यम, P कमी, K मध्यम',
            water: 'विहीर, हंगामी उपलब्धता',
            crop: 'भात',
            stage: 'लागवड नियोजित',
          },
          {
            id: '00000000-0000-4000-8000-000000000402',
            name: 'प्लॉट २',
            area: 18,
            unit: 'GUNTHA',
            normalizedAreaSquareMetres: 1821.09,
            gpsPermission: 'DENIED',
            locationMethod: 'MANUAL_MAP',
            soilPh: '6.4',
            soilNpk: 'N कमी, P मध्यम, K मध्यम',
            water: 'पावसावर अवलंबून',
            crop: 'नागली',
            stage: 'पेरणी नियोजित',
          },
        ],
      },
    ],
    updatedAt,
  };
}

export function loadFarmerSetupState(): FarmerSetupDemoState {
  if (typeof window === 'undefined') return defaultFarmerSetupState();
  const accountId = window.localStorage.getItem(ACCOUNT_KEY) ?? 'demo-farmer-j1';
  const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${accountId}`);
  if (!raw) return defaultFarmerSetupState(accountId);
  try {
    return JSON.parse(raw) as FarmerSetupDemoState;
  } catch {
    return defaultFarmerSetupState(accountId);
  }
}

export function saveFarmerSetupState(state: FarmerSetupDemoState): void {
  window.localStorage.setItem(ACCOUNT_KEY, state.accountId);
  window.localStorage.setItem(
    `${STORAGE_PREFIX}${state.accountId}`,
    JSON.stringify({ ...state, updatedAt: new Date().toISOString() }),
  );
}

export function switchDemoAccount(nextAccountId: string): FarmerSetupDemoState {
  window.localStorage.setItem(ACCOUNT_KEY, nextAccountId);
  return loadFarmerSetupState();
}
