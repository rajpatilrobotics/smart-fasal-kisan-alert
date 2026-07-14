import type { FarmerTodayResponse } from '@smart-fasal/contracts';
import { FarmerTodayResponseSchema } from '@smart-fasal/contracts/schemas';
import type {
  ProviderInterpretation,
  VoicePrincipal,
  VoiceProvider,
  VoiceTurnInput,
} from '@smart-fasal/voice';

interface AdvisoryProjectionReadInput {
  readonly principal: VoicePrincipal;
  readonly contextIds: readonly string[];
  readonly language: 'mr' | 'hi' | 'en';
}

export interface AdvisoryProjectionReader {
  readToday(input: AdvisoryProjectionReadInput): Promise<FarmerTodayResponse>;
}

export interface DomainApiAdvisoryReaderOptions {
  readonly baseUrl: string;
  readonly headers: (
    input: AdvisoryProjectionReadInput,
  ) => Promise<Readonly<Record<string, string>>>;
  readonly fetch?: typeof fetch;
}

const IRRIGATION_TERMS = [
  'irrigation',
  'water',
  'rain',
  'dry',
  'moisture',
  'पाणी',
  'पाऊस',
  'कोरड',
  'ओलावा',
];
const SOIL_TERMS = ['soil', 'fertilizer', 'npk', 'ph', 'nutrient', 'माती', 'खत', 'एनपीके'];
const WEATHER_TERMS = ['heat', 'humidity', 'wind', 'weather', 'उष्ण', 'आर्द्र', 'हवा', 'वादळ'];

function textFromTurn(input: VoiceTurnInput['input']): string | undefined {
  return input.type === 'TEXT' ? input.text.trim().toLocaleLowerCase() : undefined;
}

function mentionsAny(text: string, terms: readonly string[]): boolean {
  return terms.some((term) => text.includes(term.toLocaleLowerCase()));
}

function isAdvisoryQuestion(text: string): boolean {
  return (
    mentionsAny(text, IRRIGATION_TERMS) ||
    mentionsAny(text, SOIL_TERMS) ||
    mentionsAny(text, WEATHER_TERMS)
  );
}

function preferredKind(text: string, cards: FarmerTodayResponse['cards']) {
  if (mentionsAny(text, SOIL_TERMS)) {
    return cards.find((card) => card.kind === 'NUTRIENT_PH_GUIDANCE');
  }
  if (mentionsAny(text, WEATHER_TERMS)) {
    return cards.find(
      (card) =>
        card.kind === 'HEAVY_RAIN_WATERLOGGING_RISK' || card.kind === 'HEAT_HUMIDITY_WEATHER_RISK',
    );
  }
  if (mentionsAny(text, IRRIGATION_TERMS)) {
    return cards.find(
      (card) =>
        card.kind === 'IRRIGATION_NEEDED' ||
        card.kind === 'IRRIGATION_DELAY_RAIN_EXPECTED' ||
        card.kind === 'DRY_SPELL_RISK' ||
        card.kind === 'LOW_SOIL_MOISTURE',
    );
  }
  return undefined;
}

function formatSummary(card: FarmerTodayResponse['cards'][number]): string {
  const reason = card.why[0]?.label;
  return [card.summary, card.recommendedAction.label, card.recommendedAction.timingLabel, reason]
    .filter((part): part is string => part !== undefined && part.trim().length > 0)
    .join(' ');
}

export class AdvisoryReadVoiceProvider implements VoiceProvider {
  constructor(private readonly reader: AdvisoryProjectionReader) {}

  async interpret(
    input: Parameters<VoiceProvider['interpret']>[0],
  ): Promise<ProviderInterpretation> {
    const text = textFromTurn(input.input);
    if (text === undefined || !isAdvisoryQuestion(text)) {
      return { kind: 'HELP', messageKey: 'voice.help' };
    }

    const today = await this.reader.readToday({
      principal: input.principal,
      contextIds: input.sanitizedContextIds,
      language: input.language,
    });
    const card = preferredKind(text, today.cards) ?? today.cards[0];
    if (card === undefined) {
      return {
        kind: 'CLARIFICATION',
        messageKey: 'voice.advisory.no_current_card',
      };
    }

    return {
      kind: 'VALIDATED_RESULT',
      messageKey: 'voice.advisory.ready',
      toolKey: 'farmer.advisory.read',
      result: {
        resultType: 'ADVISORY_READ',
        advisoryId: card.advisoryId,
        summary: formatSummary(card),
        openDetailsRoute: `/farmer/advisories/${card.advisoryId}`,
        dataMode: card.dataMode,
        sourceGeneratedAt: card.generatedAt,
      },
    };
  }

  async cancel(): Promise<void> {
    // The advisory read is synchronous and leaves no provider work to cancel.
  }
}

export class DomainApiAdvisoryProjectionReader implements AdvisoryProjectionReader {
  readonly #baseUrl: URL;
  readonly #headers: DomainApiAdvisoryReaderOptions['headers'];
  readonly #fetch: typeof fetch;

  constructor(options: DomainApiAdvisoryReaderOptions) {
    const baseUrl = new URL(options.baseUrl);
    if (
      !['http:', 'https:'].includes(baseUrl.protocol) ||
      baseUrl.username !== '' ||
      baseUrl.password !== ''
    ) {
      throw new Error('Domain API baseUrl must be credential-free http(s)');
    }
    this.#baseUrl = baseUrl;
    this.#headers = options.headers;
    this.#fetch = options.fetch ?? fetch;
  }

  async readToday(input: AdvisoryProjectionReadInput): Promise<FarmerTodayResponse> {
    const response = await this.#fetch(new URL('/v1/farmer/today', this.#baseUrl), {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'cache-control': 'no-store',
        ...(await this.#headers(input)),
      },
    });
    if (!response.ok) {
      throw new Error(`ADVISORY_PROJECTION_READ_FAILED:${String(response.status)}`);
    }
    return FarmerTodayResponseSchema.parse(await response.json());
  }
}
