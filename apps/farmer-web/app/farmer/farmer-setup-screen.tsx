'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import {
  defaultFarmerSetupState,
  loadFarmerSetupState,
  saveFarmerSetupState,
  switchDemoAccount,
  type FarmerSetupDemoState,
  type SetupSyncStatus,
} from './setup-demo-state';

type SetupScreenKind =
  | 'language'
  | 'device'
  | 'consent'
  | 'profile'
  | 'farm'
  | 'soil-water'
  | 'crop'
  | 'sensor'
  | 'review'
  | 'my-farm'
  | 'settings'
  | 'sync'
  | 'help';

const syncLabels: Record<SetupSyncStatus, string> = {
  SAVED_ON_THIS_PHONE: 'या फोनवर सेव्ह',
  WAITING_FOR_INTERNET: 'इंटरनेटची वाट पाहत आहे',
  SYNCED: 'समक्रमित',
  CONFLICT: 'संघर्ष',
  LOCKED_RECOVERY: 'लॉक केलेली पुनर्प्राप्ती',
};

const stepLinks = [
  ['/onboarding/farmer/language', 'भाषा'],
  ['/onboarding/farmer/device', 'डिव्हाइस'],
  ['/onboarding/farmer/consent', 'संमती'],
  ['/onboarding/farmer/profile', 'प्रोफाइल'],
  ['/onboarding/farmer/farm', 'शेत'],
  ['/onboarding/farmer/soil-water', 'माती/पाणी'],
  ['/onboarding/farmer/crop', 'पीक'],
  ['/onboarding/farmer/sensor', 'सेन्सर'],
  ['/onboarding/farmer/review', 'पुनरावलोकन'],
] as const;

export function FarmerSetupScreen({ kind }: { readonly kind: SetupScreenKind }) {
  const [state, setState] = useState<FarmerSetupDemoState>(() => defaultFarmerSetupState());
  const [message, setMessage] = useState('सुरक्षित ड्राफ्ट तयार आहे.');

  useEffect(() => {
    setState(loadFarmerSetupState());
  }, []);

  const totalArea = useMemo(
    () =>
      Math.round(
        state.farms[0].plots.reduce((sum, plot) => sum + plot.normalizedAreaSquareMetres, 0) * 100,
      ) / 100,
    [state.farms],
  );

  function update(next: FarmerSetupDemoState, nextMessage: string) {
    setState(next);
    saveFarmerSetupState(next);
    setMessage(nextMessage);
  }

  function saveOffline() {
    update(
      { ...state, syncStatus: 'SAVED_ON_THIS_PHONE', setupStatus: 'READY_FOR_REVIEW' },
      'ड्राफ्ट या फोनवर एन्क्रिप्टेड ऑफलाइन साठवला आहे.',
    );
  }

  function waitForInternet() {
    update(
      { ...state, syncStatus: 'WAITING_FOR_INTERNET' },
      'ड्राफ्ट आउटबॉक्समध्ये आहे. इंटरनेट आल्यावर पाठवला जाईल.',
    );
  }

  function syncNow() {
    update(
      { ...state, syncStatus: 'SYNCED', setupStatus: 'COMPLETE' },
      'ड्राफ्ट सर्व्हरने स्वीकारला. My Farm अद्ययावत आहे.',
    );
  }

  function proposeVoiceChange() {
    update(
      {
        ...state,
        voiceProposal: {
          field: 'plotName',
          plotId: state.farms[0].plots[1]?.id ?? state.farms[0].plots[0].id,
          proposedValue: 'नागली प्लॉट',
          confirmed: false,
        },
      },
      'आवाजाने बदल सुचवला आहे. पुष्टी केल्याशिवाय बदल होणार नाही.',
    );
  }

  function confirmVoiceChange() {
    const proposal = state.voiceProposal;
    if (!proposal) return;
    update(
      {
        ...state,
        voiceProposal: { ...proposal, confirmed: true },
        farms: [
          {
            ...state.farms[0],
            plots: state.farms[0].plots.map((plot) =>
              plot.id === proposal.plotId ? { ...plot, name: proposal.proposedValue } : plot,
            ),
          },
        ],
        syncStatus: 'SAVED_ON_THIS_PHONE',
      },
      'शेतकऱ्याने स्पष्ट पुष्टी दिली. बदल या फोनवर सेव्ह झाला.',
    );
  }

  function cancelVoiceChange() {
    update(
      { ...state, voiceProposal: undefined },
      'आवाज प्रस्ताव रद्द झाला. कोणताही बदल झाला नाही.',
    );
  }

  function simulateAccountSwitch() {
    if (state.syncStatus !== 'SYNCED') {
      update(
        { ...state, syncStatus: 'LOCKED_RECOVERY' },
        'खाते बदलताना अपूर्ण खाजगी काम लॉक केले.',
      );
      return;
    }
    setState(
      switchDemoAccount(state.accountId === 'demo-farmer-j1' ? 'demo-farmer-j2' : 'demo-farmer-j1'),
    );
    setMessage('दुसरे खाते उघडले. मागील शेतकऱ्याची माहिती दिसत नाही.');
  }

  const title = titleFor(kind);

  return (
    <main className="farmer-setup-shell">
      <header className="setup-topbar">
        <div>
          <p className="eyebrow">रायगड पायलट</p>
          <h1>{title}</h1>
        </div>
        <Link className="small-link" href="/farmer/my-farm">
          My Farm
        </Link>
      </header>

      <nav className="setup-steps" aria-label="Farmer setup">
        {stepLinks.map(([href, label]) => (
          <Link key={href} href={href} aria-current={href.includes(kind) ? 'page' : undefined}>
            {label}
          </Link>
        ))}
      </nav>

      <section className="setup-status-panel" aria-live="polite">
        <span>{syncLabels[state.syncStatus]}</span>
        <span>{state.setupStatus}</span>
        <p>{message}</p>
      </section>

      {kind === 'my-farm' ? (
        <MyFarm state={state} totalArea={totalArea} />
      ) : (
        <SetupEditor
          kind={kind}
          state={state}
          totalArea={totalArea}
          onChange={(next) => {
            update(next, 'ड्राफ्ट बदलला. सेव्ह करा.');
          }}
        />
      )}

      <section className="setup-actions" aria-label="Setup actions">
        <button type="button" onClick={saveOffline}>
          या फोनवर सेव्ह
        </button>
        <button type="button" onClick={waitForInternet}>
          ऑफलाइन व्यत्यय
        </button>
        <button type="button" onClick={syncNow}>
          इंटरनेट आल्यानंतर Sync
        </button>
        <button type="button" onClick={proposeVoiceChange}>
          आवाज प्रस्ताव
        </button>
        <button type="button" onClick={simulateAccountSwitch}>
          खाते बदल चाचणी
        </button>
      </section>

      {state.voiceProposal ? (
        <section className="voice-proposal">
          <p>
            आवाज प्रस्ताव: <strong>{state.voiceProposal.proposedValue}</strong>
          </p>
          <button type="button" onClick={confirmVoiceChange}>
            स्पष्ट पुष्टी
          </button>
          <button type="button" onClick={cancelVoiceChange}>
            रद्द करा
          </button>
        </section>
      ) : null}

      <FarmerBottomNav />
    </main>
  );
}

function SetupEditor({
  kind,
  state,
  totalArea,
  onChange,
}: {
  readonly kind: SetupScreenKind;
  readonly state: FarmerSetupDemoState;
  readonly totalArea: number;
  readonly onChange: (next: FarmerSetupDemoState) => void;
}) {
  const farm = state.farms[0];
  return (
    <section className="setup-card">
      <p className="boundary-note">
        GPS नाकारले तरी सेटअप चालू राहतो. हार्डवेअर वैकल्पिक आहे आणि सध्या{' '}
        <strong>{state.hardwareStatus}</strong>.
      </p>

      {kind === 'language' || kind === 'settings' ? (
        <label>
          भाषा
          <select
            value={state.language}
            onChange={(event) => {
              onChange({ ...state, language: event.target.value as 'mr-IN' });
            }}
          >
            <option value="mr-IN">मराठी</option>
            <option value="hi-IN">हिंदी</option>
            <option value="en-IN">English</option>
          </select>
        </label>
      ) : null}

      {kind === 'device' || kind === 'settings' ? (
        <label>
          डिव्हाइस मोड
          <select
            value={state.deviceMode}
            onChange={(event) => {
              onChange({
                ...state,
                deviceMode: event.target.value as FarmerSetupDemoState['deviceMode'],
              });
            }}
          >
            <option value="PERSONAL">वैयक्तिक</option>
            <option value="TRUSTED_FAMILY">विश्वासू कुटुंब</option>
            <option value="RSK_ASSISTED">RSK सहाय्यित</option>
          </select>
        </label>
      ) : null}

      {kind === 'profile' || kind === 'review' ? (
        <div className="setup-grid">
          <label>
            नाव
            <input
              value={state.displayName}
              onChange={(event) => {
                onChange({ ...state, displayName: event.target.value });
              }}
            />
          </label>
          <label>
            गाव
            <input
              value={state.village}
              onChange={(event) => {
                onChange({ ...state, village: event.target.value });
              }}
            />
          </label>
          <label>
            तालुका
            <input
              value={state.taluka}
              onChange={(event) => {
                onChange({ ...state, taluka: event.target.value });
              }}
            />
          </label>
        </div>
      ) : null}

      {kind === 'consent' ? (
        <div className="consent-list">
          {Object.entries(state.consents).map(([scope, decision]) => (
            <label key={scope}>
              <span>{scope}</span>
              <select
                value={decision}
                onChange={(event) => {
                  onChange({
                    ...state,
                    consents: { ...state.consents, [scope]: event.target.value as 'ALLOW' },
                  });
                }}
              >
                <option value="ALLOW">स्वीकार</option>
                <option value="DENY">नकार</option>
                <option value="WITHDRAW">मागे घ्या</option>
              </select>
            </label>
          ))}
        </div>
      ) : null}

      {['farm', 'soil-water', 'crop', 'review', 'sync', 'help'].includes(kind) ? (
        <>
          <h2>{farm.name}</h2>
          <p>
            {state.village}, {state.taluka}, {state.district} · एकूण {totalArea} sq m
          </p>
          <div className="plot-list">
            {farm.plots.map((plot) => (
              <article key={plot.id}>
                <h3>{plot.name}</h3>
                <p>
                  {plot.area} {plot.unit} · {plot.normalizedAreaSquareMetres} sq m · GPS{' '}
                  {plot.gpsPermission}
                </p>
                <p>
                  {kind === 'soil-water' ? `${plot.soilPh}, ${plot.soilNpk} · ${plot.water}` : null}
                </p>
                <p>{kind === 'crop' ? `${plot.crop} · ${plot.stage}` : null}</p>
              </article>
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}

function MyFarm({
  state,
  totalArea,
}: {
  readonly state: FarmerSetupDemoState;
  readonly totalArea: number;
}) {
  return (
    <section className="setup-card">
      <h2>माझे शेत</h2>
      <p>
        {state.farms.length} शेत · {state.farms[0].plots.length} प्लॉट · {totalArea} sq m ·{' '}
        {syncLabels[state.syncStatus]}
      </p>
      <div className="plot-list">
        {state.farms[0].plots.map((plot) => (
          <article key={plot.id}>
            <h3>{plot.name}</h3>
            <p>
              {plot.crop} · {plot.stage}
            </p>
            <p>
              माती pH {plot.soilPh}; पाणी: {plot.water}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

function FarmerBottomNav() {
  return (
    <nav className="farmer-bottom-nav" aria-label="Farmer navigation">
      <Link href="/farmer/today">Today</Link>
      <span aria-disabled="true">Work</span>
      <Link href="/farmer/today">Speak</Link>
      <span aria-disabled="true">Alerts</span>
      <Link href="/farmer/my-farm">My Farm</Link>
    </nav>
  );
}

function titleFor(kind: SetupScreenKind): string {
  const titles: Record<SetupScreenKind, string> = {
    language: 'भाषा निवडा',
    device: 'डिव्हाइस मोड',
    consent: 'स्वतंत्र संमती',
    profile: 'किमान प्रोफाइल',
    farm: 'शेत आणि प्लॉट',
    'soil-water': 'माती आणि पाणी',
    crop: 'पीक माहिती',
    sensor: 'वैकल्पिक सेन्सर',
    review: 'सेटअप पुनरावलोकन',
    'my-farm': 'My Farm',
    settings: 'सेटिंग्ज',
    sync: 'Sync Status',
    help: 'मदत',
  };
  return titles[kind];
}
