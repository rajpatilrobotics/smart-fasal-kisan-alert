import { randomUUID } from 'node:crypto';

import {
  AdvisoryRejectedError,
  AdvisoryService,
  EvidenceService,
  FarmerSetupService,
  InMemoryAdvisoryRepository,
  InMemoryEvidenceRepository,
  InMemoryRecommendationRepository,
  RecommendationRejectedError,
  RecommendationService,
  RecordedRaigadAdvisoryEvidenceProvider,
  type AdvisoryEvidenceProvider,
  type AdvisoryRepository,
  type EvidenceRepository,
  type FarmerSetupOwner,
  type FarmerSetupRepository,
  type RecommendationEvidenceProvider,
  type RecommendationRepository,
} from '@smart-fasal/application';
import {
  AdvisoryResponseRequestSchema,
  ChangeDeviceModeCommandSchema,
  CompleteFarmerSetupCommandSchema,
  CreateSoilRecordRequestSchema,
  RecommendationAcceptanceRequestSchema,
  RecommendationRequestSchema,
  RecommendationReviewRequestSchema,
  SeasonStartConfirmationRequestSchema,
  SaveFarmerSetupDraftCommandSchema,
  UpdateFarmerPreferencesCommandSchema,
} from '@smart-fasal/contracts/schemas';

import {
  ApiBoundaryProblem,
  dependencyUnavailable,
  type DomainOperationAdapter,
  type DomainOperationRequest,
  type VerifiedRequestBoundary,
} from './boundary.js';

function ownerFor(boundary: VerifiedRequestBoundary): FarmerSetupOwner {
  if (boundary.identity === undefined || boundary.authorization === undefined) {
    throw new ApiBoundaryProblem({
      code: 'AUTHORIZATION_DENIED',
      status: 403,
      title: 'A current Farmer role context is required.',
    });
  }
  if (boundary.authorization.roleType !== 'FARMER') {
    throw new ApiBoundaryProblem({
      code: 'AUTHORIZATION_DENIED',
      status: 403,
      title: 'Only the owning Farmer may access setup data.',
    });
  }
  return {
    environment: boundary.environment,
    subjectId: boundary.identity.subjectId,
    authorizationVersion: boundary.authorization.authorizationVersion,
  };
}

function commandResult(input: {
  commandId: string;
  disposition: 'ACCEPTED' | 'ALREADY_ACCEPTED' | 'CONFLICT' | 'REJECTED';
  type: string;
  id: string;
  revision: number;
  eventIds?: readonly string[];
}) {
  return {
    commandId: input.commandId,
    disposition: input.disposition,
    result: { type: input.type, id: input.id, revision: input.revision },
    eventIds: input.eventIds ?? [randomUUID()],
    serverReceivedAt: new Date().toISOString(),
  };
}

function conflict(code: 'EXPECTED_REVISION_MISMATCH' | 'SETUP_INCOMPLETE'): never {
  throw new ApiBoundaryProblem({
    code,
    status: 409,
    title: 'The setup command could not be applied.',
  });
}

export class FarmerSetupOperations implements DomainOperationAdapter {
  readonly #service: FarmerSetupService;
  readonly #evidence: EvidenceService;
  readonly #recommendations: RecommendationService;
  readonly #advisories: AdvisoryService;

  constructor(
    repository: FarmerSetupRepository = new MemoryFarmerSetupRepository(),
    evidenceRepository: EvidenceRepository = new InMemoryEvidenceRepository(),
    recommendationRepository: RecommendationRepository = new InMemoryRecommendationRepository(),
    advisoryRepository: AdvisoryRepository = new InMemoryAdvisoryRepository(),
    now?: () => Date,
    recommendationEvidenceProvider?: RecommendationEvidenceProvider,
    advisoryEvidenceProvider?: AdvisoryEvidenceProvider,
  ) {
    this.#service = new FarmerSetupService(repository, now);
    this.#evidence = new EvidenceService(evidenceRepository, repository, now);
    this.#recommendations = new RecommendationService(
      repository,
      recommendationRepository,
      now,
      randomUUID,
      recommendationEvidenceProvider,
    );
    this.#advisories = new AdvisoryService(
      repository,
      advisoryRepository,
      now,
      randomUUID,
      advisoryEvidenceProvider ?? new RecordedRaigadAdvisoryEvidenceProvider(),
    );
  }

  async execute(request: DomainOperationRequest): Promise<unknown> {
    switch (request.operationId) {
      case 'getFarmerBootstrap':
        return this.#bootstrap(request);
      case 'getMyFarm':
      case 'listFarmerFarms':
        return this.#service.bootstrap(ownerFor(request.boundary));
      case 'getFarmerFarm':
      case 'getFarmerPlot':
        return this.#farmResource(request);
      case 'getFarmerPlotEvidenceSummary':
        return this.#evidenceSummary(request);
      case 'getFarmerToday':
      case 'listFarmerAdvisories':
        return this.#today(request);
      case 'getFarmerAdvisory':
        return this.#advisory(request);
      case 'respondToFarmerAdvisory':
        return this.#respondToAdvisory(request);
      case 'getFarmerRecommendationReadiness':
        return this.#recommendationReadiness(request);
      case 'createFarmerRecommendationRun':
        return this.#createRecommendationRun(request);
      case 'getFarmerRecommendationRun':
        return this.#recommendationRun(request);
      case 'getFarmerRecommendation':
        return this.#recommendation(request);
      case 'createFarmerRecommendationReviewRequest':
        return this.#recommendationReview(request);
      case 'acceptFarmerRecommendation':
        return this.#acceptRecommendation(request);
      case 'confirmFarmerSeasonStart':
        return this.#confirmSeasonStart(request);
      case 'getFarmerSeasonCalendar':
        return this.#calendar(request);
      case 'createFarmerSoilRecord':
        return this.#soilRecord(request);
      case 'saveFarmerSetupDraft':
      case 'createFarmerFarm':
      case 'updateFarmerFarm':
      case 'createFarmerPlot':
      case 'updateFarmerPlot':
      case 'createFarmerPlotGeometryVersion':
        return this.#saveDraft(request);
      case 'completeFarmerSetup':
        return this.#complete(request);
      case 'updateFarmerPreferences':
        return this.#preferences(request);
      case 'changeFarmerDeviceMode':
        return this.#deviceMode(request);
      default:
        throw dependencyUnavailable();
    }
  }

  async #bootstrap(request: DomainOperationRequest) {
    const owner = ownerFor(request.boundary);
    const myFarm = await this.#service.bootstrap(owner);
    const locale = myFarm.setup.activeDraft?.profile.preferredLocale.slice(0, 2) ?? 'mr';
    return {
      subjectId: owner.subjectId,
      locale,
      onboardingState: myFarm.setup.status,
      authorizationVersion: owner.authorizationVersion,
      capabilities: [
        'farmer.setup.write',
        'farmer.setup.complete',
        'farmer.farm.write',
        'farmer.plot.write',
        'farmer.evidence.read',
        'farmer.soil.write',
        'farmer.voice.setup',
      ],
      farmContextState:
        myFarm.setup.status === 'COMPLETE' ? 'AVAILABLE' : 'UNAVAILABLE_UNTIL_SETUP',
      deviceMode: myFarm.setup.activeDraft?.deviceMode ?? 'PERSONAL',
      setup: myFarm.setup,
      ...(myFarm.setup.status === 'COMPLETE' ? { myFarm } : {}),
    };
  }

  async #saveDraft(request: DomainOperationRequest) {
    const body = SaveFarmerSetupDraftCommandSchema.parse(request.body);
    if (body.expectedRevision !== request.boundary.expectedRevision) {
      conflict('EXPECTED_REVISION_MISMATCH');
    }
    const result = await this.#service.saveDraft({
      owner: ownerFor(request.boundary),
      expectedRevision: body.expectedRevision,
      draft: body.payload.draft,
    });
    if (result.disposition === 'CONFLICT') conflict('EXPECTED_REVISION_MISMATCH');
    return commandResult({
      commandId: request.boundary.idempotencyKey ?? body.target.id,
      disposition: result.disposition,
      type: 'farmerSetupDraft',
      id: result.draft.draftId,
      revision: result.draft.revision,
    });
  }

  async #farmResource(request: DomainOperationRequest) {
    const myFarm = await this.#service.bootstrap(ownerFor(request.boundary));
    const id = request.params?.['farmId'] ?? request.params?.['plotId'];
    const farm =
      request.operationId === 'getFarmerPlot'
        ? myFarm.farms.find((candidate) => candidate.plots.some((plot) => plot.plotId === id))
        : myFarm.farms.find((candidate) => candidate.farmId === id);
    if (farm === undefined) {
      throw new ApiBoundaryProblem({
        code: 'AUTHORIZATION_DENIED',
        status: 404,
        title: 'The requested Farm or Plot is not available to this Farmer.',
      });
    }
    return farm;
  }

  async #evidenceSummary(request: DomainOperationRequest) {
    const plotId = request.params?.['plotId'];
    if (plotId === undefined) throw dependencyUnavailable();
    try {
      return await this.#evidence.summarize(ownerFor(request.boundary), plotId);
    } catch (error) {
      if (error instanceof Error && error.message === 'AUTHORIZATION_DENIED') {
        throw new ApiBoundaryProblem({
          code: 'AUTHORIZATION_DENIED',
          status: 404,
          title: 'The requested Plot evidence is not available to this Farmer.',
        });
      }
      throw error;
    }
  }

  async #today(request: DomainOperationRequest) {
    return this.#translateAdvisoryError(() => this.#advisories.today(ownerFor(request.boundary)));
  }

  async #advisory(request: DomainOperationRequest) {
    const advisoryId = request.params?.['advisoryId'];
    if (advisoryId === undefined) throw dependencyUnavailable();
    return this.#translateAdvisoryError(() =>
      this.#advisories.advisory(ownerFor(request.boundary), advisoryId),
    );
  }

  async #respondToAdvisory(request: DomainOperationRequest) {
    const advisoryId = request.params?.['advisoryId'];
    if (advisoryId === undefined) throw dependencyUnavailable();
    const body = AdvisoryResponseRequestSchema.parse(request.body);
    return this.#translateAdvisoryError(() =>
      this.#advisories.respond({
        owner: ownerFor(request.boundary),
        advisoryId,
        request: {
          commandId: request.boundary.idempotencyKey ?? body.commandId,
          expectedRevision: body.expectedRevision,
          response: body.response,
          clientRecordedAt: body.clientRecordedAt,
          timezone: body.timezone,
          ...(body.snoozeUntil === undefined ? {} : { snoozeUntil: body.snoozeUntil }),
          ...(body.note === undefined ? {} : { note: body.note }),
        },
      }),
    );
  }

  async #recommendationReadiness(request: DomainOperationRequest) {
    const plotId = request.params?.['plotId'];
    if (plotId === undefined) throw dependencyUnavailable();
    return this.#translateRecommendationError(() =>
      this.#recommendations.readiness(ownerFor(request.boundary), plotId),
    );
  }

  async #createRecommendationRun(request: DomainOperationRequest) {
    const plotId = request.params?.['plotId'];
    if (plotId === undefined) throw dependencyUnavailable();
    const body = RecommendationRequestSchema.parse(request.body);
    return this.#translateRecommendationError(() =>
      this.#recommendations.createRun({
        owner: ownerFor(request.boundary),
        operationId: request.boundary.idempotencyKey ?? body.confirmedAreaRef.plotId,
        plotId,
        request: body,
      }),
    );
  }

  async #recommendationRun(request: DomainOperationRequest) {
    const operationId = request.params?.['operationId'];
    if (operationId === undefined) throw dependencyUnavailable();
    return this.#recommendations.runStatus(ownerFor(request.boundary), operationId);
  }

  async #recommendation(request: DomainOperationRequest) {
    const recommendationId = request.params?.['recommendationId'];
    if (recommendationId === undefined) throw dependencyUnavailable();
    return this.#translateRecommendationError(() =>
      this.#recommendations.recommendation(ownerFor(request.boundary), recommendationId),
    );
  }

  async #recommendationReview(request: DomainOperationRequest) {
    const recommendationId = request.params?.['recommendationId'];
    if (recommendationId === undefined) throw dependencyUnavailable();
    const body = RecommendationReviewRequestSchema.parse(request.body);
    return this.#translateRecommendationError(() =>
      this.#recommendations.requestReview({
        owner: ownerFor(request.boundary),
        recommendationId,
        commandId: request.boundary.idempotencyKey ?? body.commandId,
        expectedRevision: body.expectedRevision,
      }),
    );
  }

  async #acceptRecommendation(request: DomainOperationRequest) {
    const recommendationId = request.params?.['recommendationId'];
    if (recommendationId === undefined) throw dependencyUnavailable();
    const body = RecommendationAcceptanceRequestSchema.parse(request.body);
    return this.#translateRecommendationError(() =>
      this.#recommendations.accept({
        owner: ownerFor(request.boundary),
        recommendationId,
        request: { ...body, commandId: request.boundary.idempotencyKey ?? body.commandId },
      }),
    );
  }

  async #confirmSeasonStart(request: DomainOperationRequest) {
    const seasonId = request.params?.['seasonId'];
    if (seasonId === undefined) throw dependencyUnavailable();
    const body = SeasonStartConfirmationRequestSchema.parse(request.body);
    return this.#translateRecommendationError(() =>
      this.#recommendations.confirmSeasonStart({
        owner: ownerFor(request.boundary),
        seasonId,
        commandId: request.boundary.idempotencyKey ?? body.commandId,
        expectedRevision: body.expectedRevision,
      }),
    );
  }

  async #calendar(request: DomainOperationRequest) {
    const seasonId = request.params?.['seasonId'];
    if (seasonId === undefined) throw dependencyUnavailable();
    return this.#translateRecommendationError(() =>
      this.#recommendations.calendar(ownerFor(request.boundary), seasonId),
    );
  }

  async #translateRecommendationError<Result>(work: () => Promise<Result>): Promise<Result> {
    try {
      return await work();
    } catch (error) {
      if (error instanceof RecommendationRejectedError && error.code === 'AUTHORIZATION_DENIED') {
        throw new ApiBoundaryProblem({
          code: 'AUTHORIZATION_DENIED',
          status: 404,
          title: 'The requested Recommendation resource is not available to this Farmer.',
        });
      }
      if (
        error instanceof RecommendationRejectedError &&
        error.code === 'INVALID_STATE_TRANSITION'
      ) {
        throw new ApiBoundaryProblem({
          code: 'INVALID_STATE_TRANSITION',
          status: 409,
          title: 'The Recommendation command cannot be applied in the current state.',
        });
      }
      throw error;
    }
  }

  async #translateAdvisoryError<Result>(work: () => Promise<Result>): Promise<Result> {
    try {
      return await work();
    } catch (error) {
      if (error instanceof AdvisoryRejectedError && error.code === 'AUTHORIZATION_DENIED') {
        throw new ApiBoundaryProblem({
          code: 'AUTHORIZATION_DENIED',
          status: 404,
          title: 'The requested Advisory resource is not available to this Farmer.',
        });
      }
      if (error instanceof AdvisoryRejectedError && error.code === 'ADVISORY_EXPIRED') {
        throw new ApiBoundaryProblem({
          code: 'ADVISORY_EXPIRED',
          status: 410,
          title: 'The Advisory can no longer be changed.',
        });
      }
      if (
        error instanceof AdvisoryRejectedError &&
        error.code === 'INVALID_STATE_TRANSITION'
      ) {
        throw new ApiBoundaryProblem({
          code: 'INVALID_STATE_TRANSITION',
          status: 409,
          title: 'The Advisory command cannot be applied in the current state.',
        });
      }
      throw error;
    }
  }

  async #soilRecord(request: DomainOperationRequest) {
    const plotId = request.params?.['plotId'];
    if (plotId === undefined) throw dependencyUnavailable();
    const body = CreateSoilRecordRequestSchema.parse(request.body);
    try {
      return await this.#evidence.recordSoil(ownerFor(request.boundary), plotId, body);
    } catch (error) {
      if (error instanceof Error && error.message === 'AUTHORIZATION_DENIED') {
        throw new ApiBoundaryProblem({
          code: 'AUTHORIZATION_DENIED',
          status: 404,
          title: 'The requested Plot is not available to this Farmer.',
        });
      }
      throw error;
    }
  }

  async #complete(request: DomainOperationRequest) {
    const body = CompleteFarmerSetupCommandSchema.parse(request.body);
    if (body.expectedRevision !== request.boundary.expectedRevision) {
      conflict('EXPECTED_REVISION_MISMATCH');
    }
    const result = await this.#service.complete({
      owner: ownerFor(request.boundary),
      expectedRevision: body.expectedRevision,
      draftId: body.payload.draftId,
      acceptedDraftRevision: body.payload.acceptedDraftRevision,
      acceptedDraftChecksum: body.payload.acceptedDraftChecksum,
    });
    if (result.disposition === 'CONFLICT') {
      conflict(
        result.conflict.reason === 'SETUP_INCOMPLETE'
          ? 'SETUP_INCOMPLETE'
          : 'EXPECTED_REVISION_MISMATCH',
      );
    }
    return commandResult({
      commandId: request.boundary.idempotencyKey ?? body.target.id,
      disposition: result.disposition,
      type: 'farmerSetup',
      id: result.draft.draftId,
      revision: result.draft.revision,
    });
  }

  #preferences(request: DomainOperationRequest) {
    const body = UpdateFarmerPreferencesCommandSchema.parse(request.body);
    return commandResult({
      commandId: request.boundary.idempotencyKey ?? body.target.id,
      disposition: 'ACCEPTED',
      type: 'farmerPreferences',
      id: body.target.id,
      revision: body.expectedRevision + 1,
    });
  }

  #deviceMode(request: DomainOperationRequest) {
    const body = ChangeDeviceModeCommandSchema.parse(request.body);
    return commandResult({
      commandId: request.boundary.idempotencyKey ?? body.target.id,
      disposition: 'ACCEPTED',
      type: 'deviceMode',
      id: body.target.id,
      revision: body.expectedRevision + 1,
    });
  }
}

class MemoryFarmerSetupRepository implements FarmerSetupRepository {
  readonly #records = new Map<string, Awaited<ReturnType<FarmerSetupRepository['load']>>>();

  async load(owner: FarmerSetupOwner) {
    await Promise.resolve();
    return structuredClone(this.#records.get(`${owner.environment}:${owner.subjectId}`));
  }

  async save(record: NonNullable<Awaited<ReturnType<FarmerSetupRepository['load']>>>) {
    await Promise.resolve();
    this.#records.set(
      `${record.owner.environment}:${record.owner.subjectId}`,
      structuredClone(record),
    );
  }
}
