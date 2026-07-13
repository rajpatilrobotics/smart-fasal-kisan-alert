'use client';

import Link from 'next/link';
import { type FormEvent, useCallback, useEffect, useId, useRef, useState } from 'react';

import type { SupportedLocale } from '@smart-fasal/i18n';

import type { FarmerVoiceTextOutcome } from '../../lib/voice-api';

interface VoiceCopy {
  readonly close: string;
  readonly description: string;
  readonly emptyQuestion: string;
  readonly help: string;
  readonly helpBody: string;
  readonly inputLabel: string;
  readonly navAlerts: string;
  readonly navLabel: string;
  readonly navMyFarm: string;
  readonly navSpeak: string;
  readonly navToday: string;
  readonly navUnavailable: string;
  readonly navWork: string;
  readonly offline: string;
  readonly providerUnavailable: string;
  readonly routeLabel: string;
  readonly routeToday: string;
  readonly send: string;
  readonly sending: string;
  readonly title: string;
  readonly transportHelp: string;
  readonly transportNeedsClarification: string;
  readonly typePlaceholder: string;
  readonly voiceActionUnavailable: string;
}

const VOICE_COPY = {
  en: {
    close: 'Close Speak',
    description:
      'Ask in Marathi, Hindi or English. This bounded shell cannot execute an action without its owning tool and an explicit confirmation.',
    emptyQuestion: 'Type a question before sending.',
    help: 'Help',
    helpBody:
      'Use text while speech is unavailable. Farm answers and actions appear only after their owning features and authorized tools are implemented.',
    inputLabel: 'Type your question',
    navAlerts: 'Alerts',
    navLabel: 'Farmer navigation',
    navMyFarm: 'My Farm',
    navSpeak: 'Speak',
    navToday: 'Today',
    navUnavailable: 'Available in its owning feature milestone',
    navWork: 'Work',
    offline:
      'You are offline. Text and audio are not sent or queued. Use the screen controls now, or try again after reconnecting.',
    providerUnavailable:
      'The voice provider is not configured or could not be reached. No answer or action was created.',
    routeLabel: 'Current screen',
    routeToday: 'Today',
    send: 'Send text',
    sending: 'Sending…',
    title: 'Kisan Saathi',
    transportHelp: 'Help is shown below. No farm result or action was created.',
    transportNeedsClarification:
      'More detail would be needed, but this milestone has no owned Farmer tool for this action.',
    typePlaceholder: 'For example: What can I do on this screen?',
    voiceActionUnavailable: 'Voice unavailable for this action — use touch or text.',
  },
  hi: {
    close: 'बोलें बंद करें',
    description:
      'मराठी, हिंदी या अंग्रेज़ी में पूछें। यह सीमित शेल अपने अधिकृत टूल और स्पष्ट पुष्टि के बिना कोई कार्रवाई नहीं कर सकता।',
    emptyQuestion: 'भेजने से पहले प्रश्न लिखें।',
    help: 'मदद',
    helpBody:
      'आवाज़ उपलब्ध न होने पर टेक्स्ट का उपयोग करें। खेत के उत्तर और कार्रवाइयाँ अपने फ़ीचर और अधिकृत टूल बनने के बाद ही उपलब्ध होंगी।',
    inputLabel: 'अपना प्रश्न लिखें',
    navAlerts: 'सूचनाएँ',
    navLabel: 'किसान नेविगेशन',
    navMyFarm: 'मेरा खेत',
    navSpeak: 'बोलें',
    navToday: 'आज',
    navUnavailable: 'अपने फ़ीचर माइलस्टोन में उपलब्ध होगा',
    navWork: 'काम',
    offline:
      'आप ऑफ़लाइन हैं। टेक्स्ट या ऑडियो भेजा या कतार में नहीं रखा जाएगा। अभी स्क्रीन के नियंत्रण इस्तेमाल करें या दोबारा ऑनलाइन होने पर कोशिश करें।',
    providerUnavailable:
      'वॉइस प्रदाता कॉन्फ़िगर नहीं है या उस तक पहुँचा नहीं जा सका। कोई उत्तर या कार्रवाई नहीं बनी।',
    routeLabel: 'वर्तमान स्क्रीन',
    routeToday: 'आज',
    send: 'टेक्स्ट भेजें',
    sending: 'भेजा जा रहा है…',
    title: 'किसान साथी',
    transportHelp: 'मदद नीचे दिखाई गई है। खेत का कोई परिणाम या कार्रवाई नहीं बनी।',
    transportNeedsClarification:
      'और जानकारी चाहिए, लेकिन इस माइलस्टोन में इस कार्रवाई का किसान टूल उपलब्ध नहीं है।',
    typePlaceholder: 'उदाहरण: मैं इस स्क्रीन पर क्या कर सकता हूँ?',
    voiceActionUnavailable:
      'इस कार्रवाई के लिए आवाज़ उपलब्ध नहीं है — स्पर्श या टेक्स्ट का उपयोग करें।',
  },
  mr: {
    close: 'बोला बंद करा',
    description:
      'मराठी, हिंदी किंवा इंग्रजीमध्ये विचारा. हे मर्यादित शेल मालकीचे अधिकृत टूल आणि स्पष्ट पुष्टी नसताना कोणतीही कृती करू शकत नाही.',
    emptyQuestion: 'पाठवण्यापूर्वी प्रश्न लिहा.',
    help: 'मदत',
    helpBody:
      'आवाज उपलब्ध नसताना मजकूर वापरा. शेताची उत्तरे आणि कृती त्यांच्या फीचरचे अधिकृत टूल तयार झाल्यावरच उपलब्ध होतील.',
    inputLabel: 'तुमचा प्रश्न लिहा',
    navAlerts: 'सूचना',
    navLabel: 'शेतकरी नेव्हिगेशन',
    navMyFarm: 'माझे शेत',
    navSpeak: 'बोला',
    navToday: 'आज',
    navUnavailable: 'त्याच्या फीचर टप्प्यात उपलब्ध होईल',
    navWork: 'कामे',
    offline:
      'तुम्ही ऑफलाइन आहात. मजकूर किंवा ऑडिओ पाठवला किंवा रांगेत ठेवला जाणार नाही. आत्ता स्क्रीनवरील नियंत्रणे वापरा किंवा पुन्हा ऑनलाइन झाल्यावर प्रयत्न करा.',
    providerUnavailable:
      'आवाज प्रदाता कॉन्फिगर केलेला नाही किंवा त्याच्याशी संपर्क झाला नाही. कोणतेही उत्तर किंवा कृती तयार झाली नाही.',
    routeLabel: 'सध्याची स्क्रीन',
    routeToday: 'आज',
    send: 'मजकूर पाठवा',
    sending: 'पाठवत आहे…',
    title: 'किसान साथी',
    transportHelp: 'मदत खाली दाखवली आहे. शेताचा कोणताही निकाल किंवा कृती तयार झाली नाही.',
    transportNeedsClarification:
      'अधिक तपशील आवश्यक आहे, पण या टप्प्यात या कृतीसाठी शेतकरी टूल उपलब्ध नाही.',
    typePlaceholder: 'उदाहरण: या स्क्रीनवर मी काय करू शकतो?',
    voiceActionUnavailable: 'या कृतीसाठी आवाज उपलब्ध नाही — स्पर्श किंवा मजकूर वापरा.',
  },
} as const satisfies Record<SupportedLocale, VoiceCopy>;

export type SubmitFarmerVoiceText = (
  text: string,
  signal: AbortSignal,
) => Promise<FarmerVoiceTextOutcome>;

interface FarmerNavigationProps {
  readonly currentRoute: '/farmer/today';
  readonly locale: SupportedLocale;
  readonly submitText: SubmitFarmerVoiceText;
  readonly transportConfigured: boolean;
}

type ShellStatus =
  | 'empty'
  | 'help'
  | 'idle'
  | 'needs-clarification'
  | 'offline'
  | 'provider-unavailable'
  | 'sending';

function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  return online;
}

function statusMessage(copy: VoiceCopy, status: ShellStatus): string | null {
  if (status === 'empty') return copy.emptyQuestion;
  if (status === 'help') return copy.transportHelp;
  if (status === 'needs-clarification') return copy.transportNeedsClarification;
  if (status === 'offline') return copy.offline;
  if (status === 'provider-unavailable') return copy.providerUnavailable;
  return null;
}

export function FarmerNavigation({
  currentRoute,
  locale,
  submitText,
  transportConfigured,
}: FarmerNavigationProps) {
  const copy = VOICE_COPY[locale];
  const descriptionId = useId();
  const headingId = useId();
  const unavailableId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const openRef = useRef<HTMLButtonElement>(null);
  const requestRef = useRef<AbortController>(null);
  const sheetRef = useRef<HTMLElement>(null);
  const online = useOnlineStatus();
  const [helpVisible, setHelpVisible] = useState(false);
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [status, setStatus] = useState<ShellStatus>('idle');

  const close = useCallback(() => {
    requestRef.current?.abort();
    requestRef.current = null;
    setOpen(false);
    setHelpVisible(false);
    setQuestion('');
    setStatus('idle');
    queueMicrotask(() => openRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close();
        return;
      }
      if (event.key !== 'Tab' || !sheetRef.current) return;
      const focusable = Array.from(
        sheetRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      const first = focusable.at(0);
      const last = focusable.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [close, open]);

  useEffect(
    () => () => {
      requestRef.current?.abort();
    },
    [],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = question.trim();
    if (!text) {
      setStatus('empty');
      return;
    }
    if (!online) {
      setStatus('offline');
      return;
    }
    if (!transportConfigured) {
      setStatus('provider-unavailable');
      return;
    }

    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setStatus('sending');
    try {
      const result = await submitText(text, controller.signal);
      if (controller.signal.aborted) return;
      if (result.kind === 'help') {
        setHelpVisible(true);
        setStatus('help');
      } else if (result.kind === 'needs-clarification') {
        setStatus('needs-clarification');
      } else {
        setStatus('provider-unavailable');
      }
    } catch {
      if (controller.signal.aborted) return;
      setStatus('provider-unavailable');
    } finally {
      if (requestRef.current === controller) requestRef.current = null;
    }
  }

  const visibleStatus = !online
    ? copy.offline
    : !transportConfigured
      ? copy.providerUnavailable
      : statusMessage(copy, status);

  return (
    <>
      <p className="visually-hidden" id={unavailableId}>
        {copy.navUnavailable}
      </p>
      <nav aria-label={copy.navLabel} className="farmer-bottom-nav">
        <ul>
          <li>
            <Link aria-current="page" className="farmer-nav-item" href="/farmer/today">
              <span aria-hidden="true">⌂</span>
              {copy.navToday}
            </Link>
          </li>
          <li>
            <button
              aria-describedby={unavailableId}
              className="farmer-nav-item"
              disabled
              type="button"
            >
              <span aria-hidden="true">✓</span>
              {copy.navWork}
            </button>
          </li>
          <li>
            <button
              aria-expanded={open}
              className="farmer-nav-item farmer-nav-speak"
              onClick={() => setOpen(true)}
              ref={openRef}
              type="button"
            >
              <span aria-hidden="true">●</span>
              {copy.navSpeak}
            </button>
          </li>
          <li>
            <button
              aria-describedby={unavailableId}
              className="farmer-nav-item"
              disabled
              type="button"
            >
              <span aria-hidden="true">!</span>
              {copy.navAlerts}
            </button>
          </li>
          <li>
            <button
              aria-describedby={unavailableId}
              className="farmer-nav-item"
              disabled
              type="button"
            >
              <span aria-hidden="true">◇</span>
              {copy.navMyFarm}
            </button>
          </li>
        </ul>
      </nav>

      {open ? (
        <div className="speak-backdrop">
          <section
            aria-describedby={descriptionId}
            aria-labelledby={headingId}
            aria-modal="true"
            className="speak-sheet"
            data-origin-route={currentRoute}
            ref={sheetRef}
            role="dialog"
          >
            <header className="speak-header">
              <div>
                <p className="eyebrow">Milestone 2 · Voice transport</p>
                <h2 id={headingId}>{copy.title}</h2>
              </div>
              <button className="text-button" onClick={close} ref={closeRef} type="button">
                {copy.close}
              </button>
            </header>
            <p id={descriptionId}>{copy.description}</p>
            <p className="voice-context">
              <strong>{copy.routeLabel}:</strong> {copy.routeToday}
            </p>
            <p className="voice-boundary">{copy.voiceActionUnavailable}</p>

            <form className="voice-text-form" onSubmit={handleSubmit}>
              <label htmlFor={`${headingId}-question`}>{copy.inputLabel}</label>
              <textarea
                disabled={status === 'sending'}
                id={`${headingId}-question`}
                maxLength={2_000}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder={copy.typePlaceholder}
                rows={3}
                value={question}
              />
              <div className="voice-actions">
                <button className="primary-button" disabled={status === 'sending'} type="submit">
                  {status === 'sending' ? copy.sending : copy.send}
                </button>
                <button
                  aria-expanded={helpVisible}
                  className="text-button"
                  onClick={() => setHelpVisible((visible) => !visible)}
                  type="button"
                >
                  {copy.help}
                </button>
              </div>
            </form>

            {visibleStatus ? (
              <p aria-live="polite" className="voice-status">
                {visibleStatus}
              </p>
            ) : null}
            {helpVisible ? <p className="voice-help">{copy.helpBody}</p> : null}
          </section>
        </div>
      ) : null}
    </>
  );
}
