import { randomUUID } from 'node:crypto';

import {
  FarmerSetupService,
  type FarmerSetupOwner,
  type FarmerSetupRepository,
} from '@smart-fasal/application';
import {
  ChangeDeviceModeCommandSchema,
  CompleteFarmerSetupCommandSchema,
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

  constructor(
    repository: FarmerSetupRepository = new MemoryFarmerSetupRepository(),
    now?: () => Date,
  ) {
    this.#service = new FarmerSetupService(repository, now);
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
