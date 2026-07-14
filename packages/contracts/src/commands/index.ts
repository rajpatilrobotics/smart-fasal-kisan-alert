import { z } from 'zod';

import { AdvisoryResponseRequestSchema } from '../advisory/index.js';
import {
  CompleteFarmerSetupPayloadSchema,
  DeviceModeChangePayloadSchema,
  SaveFarmerSetupDraftPayloadSchema,
  UpdateFarmerPreferencesPayloadSchema,
} from '../farmer-setup/index.js';
import {
  ConsentScopeSchema,
  PurposeCodeSchema,
  RevisionSchema,
  TimestampSchema,
  UuidSchema,
} from '../http/common.js';
import { COMMAND_DISPOSITIONS } from '../vocabulary.js';

export const ClientContextSchema = z
  .object({
    clientRecordedAt: TimestampSchema,
    timezone: z.string().min(1).max(64),
    dataModeClaim: z.enum(['LIVE', 'RECORDED', 'SIMULATED']),
  })
  .strict();

export const CommandTargetSchema = z
  .object({
    type: z.enum([
      'roleContext',
      'consentDecision',
      'accessGrant',
      'farmerSetupDraft',
      'farmerSetup',
      'farmerPreferences',
      'deviceMode',
      'advisory',
    ]),
    id: UuidSchema,
  })
  .strict();

export const RoleContextCommandTargetSchema = CommandTargetSchema.extend({
  type: z.literal('roleContext'),
}).strict();

export const ConsentDecisionCommandTargetSchema = CommandTargetSchema.extend({
  type: z.literal('consentDecision'),
}).strict();

export const AccessGrantCommandTargetSchema = CommandTargetSchema.extend({
  type: z.literal('accessGrant'),
}).strict();

export const FarmerSetupDraftCommandTargetSchema = CommandTargetSchema.extend({
  type: z.literal('farmerSetupDraft'),
}).strict();

export const FarmerSetupCommandTargetSchema = CommandTargetSchema.extend({
  type: z.literal('farmerSetup'),
}).strict();

export const FarmerPreferencesCommandTargetSchema = CommandTargetSchema.extend({
  type: z.literal('farmerPreferences'),
}).strict();

export const DeviceModeCommandTargetSchema = CommandTargetSchema.extend({
  type: z.literal('deviceMode'),
}).strict();

export const AdvisoryCommandTargetSchema = CommandTargetSchema.extend({
  type: z.literal('advisory'),
}).strict();

export const SelectRoleContextPayloadSchema = z
  .object({
    roleGrantId: UuidSchema,
    officeId: UuidSchema.optional(),
    jurisdictionId: UuidSchema.optional(),
  })
  .strict();

export const ConsentDecisionPayloadSchema = z
  .object({
    decision: z.enum(['ALLOW', 'DENY', 'WITHDRAW']),
    scopeKey: ConsentScopeSchema,
    purposeKey: PurposeCodeSchema,
    targetKind: z.enum(['ACCOUNT', 'ASSISTED_FARMER_CONTEXT']),
    targetId: UuidSchema,
    policyVersionId: UuidSchema,
    expiresAt: TimestampSchema.optional(),
  })
  .strict();

export const AccessGrantPayloadSchema = z
  .object({
    targetKind: z.literal('ASSISTED_FARMER_CONTEXT'),
    targetId: UuidSchema,
    farmerSubjectId: UuidSchema,
    purposeKey: z.literal('assisted.service'),
    consentAccessVersion: z.int().positive(),
    expiresAt: TimestampSchema,
  })
  .strict();

function commandEnvelope<TTarget extends z.ZodType, TPayload extends z.ZodType>(
  operation: string,
  target: TTarget,
  payload: TPayload,
) {
  return z
    .object({
      commandSchemaVersion: z.literal(1),
      operation: z.literal(operation),
      target,
      expectedRevision: RevisionSchema,
      payload,
      clientContext: ClientContextSchema,
    })
    .strict();
}

export const SelectRoleContextCommandSchema = commandEnvelope(
  'SelectRoleContext',
  RoleContextCommandTargetSchema,
  SelectRoleContextPayloadSchema,
).meta({ id: 'SelectRoleContextCommand', 'x-data-classification': 'C2' });

export const RecordConsentDecisionCommandSchema = commandEnvelope(
  'RecordConsentDecision',
  ConsentDecisionCommandTargetSchema,
  ConsentDecisionPayloadSchema,
).meta({ id: 'RecordConsentDecisionCommand', 'x-data-classification': 'C2' });

export const IssueAccessGrantCommandSchema = commandEnvelope(
  'IssueAccessGrant',
  AccessGrantCommandTargetSchema,
  AccessGrantPayloadSchema,
).meta({ id: 'IssueAccessGrantCommand', 'x-data-classification': 'C2' });

export const SaveFarmerSetupDraftCommandSchema = commandEnvelope(
  'SaveFarmerSetupDraft',
  FarmerSetupDraftCommandTargetSchema,
  SaveFarmerSetupDraftPayloadSchema,
).meta({ id: 'SaveFarmerSetupDraftCommand', 'x-data-classification': 'C3' });

export const CompleteFarmerSetupCommandSchema = commandEnvelope(
  'CompleteFarmerSetup',
  FarmerSetupCommandTargetSchema,
  CompleteFarmerSetupPayloadSchema,
).meta({ id: 'CompleteFarmerSetupCommand', 'x-data-classification': 'C3' });

export const UpdateFarmerPreferencesCommandSchema = commandEnvelope(
  'UpdateFarmerPreferences',
  FarmerPreferencesCommandTargetSchema,
  UpdateFarmerPreferencesPayloadSchema,
).meta({ id: 'UpdateFarmerPreferencesCommand', 'x-data-classification': 'C2' });

export const ChangeDeviceModeCommandSchema = commandEnvelope(
  'ChangeDeviceMode',
  DeviceModeCommandTargetSchema,
  DeviceModeChangePayloadSchema,
).meta({ id: 'ChangeDeviceModeCommand', 'x-data-classification': 'C2' });

export const RespondToAdvisoryCommandSchema = commandEnvelope(
  'RespondToAdvisory',
  AdvisoryCommandTargetSchema,
  AdvisoryResponseRequestSchema.omit({ commandId: true, expectedRevision: true }),
).meta({ id: 'RespondToAdvisoryCommand', 'x-data-classification': 'C3' });

export const CommandEnvelopeSchema = z
  .discriminatedUnion('operation', [
    SelectRoleContextCommandSchema,
    RecordConsentDecisionCommandSchema,
    IssueAccessGrantCommandSchema,
    SaveFarmerSetupDraftCommandSchema,
    CompleteFarmerSetupCommandSchema,
    UpdateFarmerPreferencesCommandSchema,
    ChangeDeviceModeCommandSchema,
    RespondToAdvisoryCommandSchema,
  ])
  .meta({ id: 'CommandEnvelope', 'x-data-classification': 'C2' });

/** @deprecated Use CommandEnvelopeSchema. Retained as the v1 source-compatible alias. */
export const CommandSchema = CommandEnvelopeSchema;

export const CommandDispositionSchema = z.enum(COMMAND_DISPOSITIONS);

export const CommandResultSchema = z
  .object({
    commandId: UuidSchema,
    disposition: CommandDispositionSchema,
    result: z
      .object({
        type: z.enum([
          'roleContext',
          'consentDecision',
          'accessGrant',
          'farmerSetupDraft',
          'farmerSetup',
          'farmerPreferences',
          'deviceMode',
          'advisory',
        ]),
        id: UuidSchema,
        revision: RevisionSchema,
      })
      .strict()
      .optional(),
    eventIds: z.array(UuidSchema).max(20),
    syncAcknowledgementId: UuidSchema.optional(),
    serverReceivedAt: TimestampSchema,
  })
  .strict()
  .meta({ id: 'CommandResult', 'x-data-classification': 'C2' });

export type CommandEnvelope = z.infer<typeof CommandEnvelopeSchema>;
export type Command = CommandEnvelope;
export type CommandResult = z.infer<typeof CommandResultSchema>;
