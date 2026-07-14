import { z } from 'zod';

import {
  JsonObjectSchema,
  PurposeCodeSchema,
  RevisionSchema,
  RoleTypeSchema,
  Sha256DigestSchema,
  TimestampSchema,
  UuidSchema,
} from '../http/common.js';

export const VoiceLanguageSchema = z.enum(['mr', 'hi', 'en']);
export const VoiceSessionStateSchema = z.enum([
  'CREATED',
  'READY',
  'RECONNECTING',
  'EXPIRING',
  'CLOSED',
  'UNAVAILABLE',
]);
export const VoiceDelegationSchema = z
  .object({
    subjectId: UuidSchema,
    roleContextId: UuidSchema,
    roleType: RoleTypeSchema,
    purpose: PurposeCodeSchema,
    toolKey: z.string().min(1).max(120),
    consentAccessVersion: z.int().positive(),
    sessionId: UuidSchema,
    expiresAt: TimestampSchema,
  })
  .strict()
  .meta({ id: 'VoiceDelegation', 'x-data-classification': 'C4' });
export const CreateVoiceSessionRequestSchema = z
  .object({
    protocolVersion: z.literal(1),
    language: VoiceLanguageSchema,
    visualRoute: z.string().min(1).max(240).regex(/^\//),
    contextIds: z.array(UuidSchema).max(8),
    audioCapabilities: z
      .object({ realtime: z.boolean(), httpsAudio: z.boolean(), offlineAudio: z.boolean() })
      .strict(),
  })
  .strict()
  .meta({ id: 'CreateVoiceSessionRequest', 'x-data-classification': 'C2' });
export const CreateVoiceSessionResponseSchema = z
  .object({
    sessionId: UuidSchema,
    state: z.literal('CREATED'),
    websocketEndpoint: z
      .string()
      .url()
      .refine((value) => value.startsWith('wss://')),
    singleUseTicket: z.string().regex(/^[A-Za-z0-9_-]{32,512}$/),
    ticketExpiresAt: TimestampSchema,
    sessionExpiresAt: TimestampSchema,
    protocolVersion: z.literal(1),
    httpsTurnsEndpoint: z.string().min(1).max(512),
  })
  .strict()
  .meta({ id: 'CreateVoiceSessionResponse', 'x-data-classification': 'C4' });
export const VoiceTurnRequestSchema = z
  .object({
    turnId: UuidSchema,
    input: z.discriminatedUnion('type', [
      z.object({ type: z.literal('TEXT'), text: z.string().min(1).max(2_000) }).strict(),
      z
        .object({
          type: z.literal('AUDIO'),
          mimeType: z.enum(['audio/webm;codecs=opus', 'audio/wav']),
          sha256: Sha256DigestSchema,
          bytesBase64: z.string().min(4).max(350_000),
        })
        .strict(),
    ]),
    clientSequence: z.int().positive(),
    acknowledgedServerSequence: z.int().nonnegative(),
  })
  .strict()
  .meta({ id: 'VoiceTurnRequest', 'x-data-classification': 'C4' });
export const VoiceTurnResponseSchema = z
  .object({
    turnId: UuidSchema,
    sessionId: UuidSchema,
    state: z.enum([
      'HELP',
      'UNAVAILABLE',
      'NEEDS_CLARIFICATION',
      'PROPOSAL_PENDING',
      'RESULT_READY',
    ]),
    messageKey: z.string().min(1).max(120),
    proposalId: UuidSchema.optional(),
    result: z
      .discriminatedUnion('resultType', [
        z
          .object({
            resultType: z.literal('RECOMMENDATION_READ'),
            recommendationId: UuidSchema,
            summary: z.string().min(1).max(600),
            openDetailsRoute: z.string().min(1).max(240).regex(/^\//),
            dataMode: z.enum(['LIVE', 'RECORDED', 'SIMULATED']),
            sourceGeneratedAt: TimestampSchema,
          })
          .strict(),
        z
          .object({
            resultType: z.literal('ADVISORY_READ'),
            advisoryId: UuidSchema,
            summary: z.string().min(1).max(600),
            openDetailsRoute: z.string().min(1).max(240).regex(/^\//),
            dataMode: z.enum(['LIVE', 'RECORDED', 'SIMULATED']),
            sourceGeneratedAt: TimestampSchema,
          })
          .strict(),
      ])
      .optional(),
    serverSequence: z.int().positive(),
    acknowledgedClientSequence: z.int().nonnegative(),
  })
  .strict()
  .meta({ id: 'VoiceTurnResponse', 'x-data-classification': 'C2' });
export const VoiceProposalStateSchema = z.enum([
  'PENDING',
  'CONFIRMED',
  'CANCELLED',
  'SUPERSEDED',
  'EXPIRED',
  'EXECUTING',
  'COMPLETE',
  'FAILED',
]);
export const VoiceProposalResponseSchema = z
  .object({
    proposalId: UuidSchema,
    sessionId: UuidSchema,
    revision: RevisionSchema,
    state: VoiceProposalStateSchema,
    toolKey: z.string().min(1).max(120),
    payloadHash: Sha256DigestSchema,
    readBack: JsonObjectSchema,
    expiresAt: TimestampSchema,
    commandId: UuidSchema.optional(),
  })
  .strict()
  .meta({ id: 'VoiceProposalResponse', 'x-data-classification': 'C3' });
const VoiceProposalActionBaseSchema = z.object({
  proposalId: UuidSchema,
  expectedProposalRevision: RevisionSchema,
  commandId: UuidSchema,
});
export const ConfirmVoiceProposalRequestSchema = VoiceProposalActionBaseSchema.extend({
  payloadHash: Sha256DigestSchema,
})
  .strict()
  .meta({ id: 'ConfirmVoiceProposalRequest', 'x-data-classification': 'C3' });
export const CorrectVoiceProposalRequestSchema = VoiceProposalActionBaseSchema.extend({
  correction: JsonObjectSchema,
})
  .strict()
  .meta({ id: 'CorrectVoiceProposalRequest', 'x-data-classification': 'C3' });
export const CancelVoiceProposalRequestSchema = VoiceProposalActionBaseSchema.strict().meta({
  id: 'CancelVoiceProposalRequest',
  'x-data-classification': 'C2',
});
export const VoiceCommandStatusResponseSchema = z
  .object({
    commandId: UuidSchema,
    state: z.enum(['UNKNOWN', 'IN_PROGRESS', 'ACCEPTED', 'REJECTED']),
    receiptReference: UuidSchema.optional(),
  })
  .strict()
  .meta({ id: 'VoiceCommandStatusResponse', 'x-data-classification': 'C2' });
export const VoiceControlFrameSchema = z
  .object({
    protocolVersion: z.literal(1),
    sessionId: UuidSchema,
    messageId: UuidSchema,
    sequence: z.int().positive(),
    acknowledgedSequence: z.int().nonnegative(),
    type: z.enum([
      'session.start',
      'audio.end',
      'barge_in',
      'proposal.confirm',
      'proposal.correct',
      'proposal.cancel',
      'transport.ack',
      'transport.resync_request',
      'ping',
      'session.close',
      'session.ready',
      'state.changed',
      'transcript.partial',
      'transcript.final',
      'clarification',
      'tool.proposal',
      'proposal.state',
      'command.state',
      'validated.result',
      'audio.metadata',
      'transport.resync',
      'error',
      'session.expiring',
      'session.closed',
    ]),
    payload: JsonObjectSchema,
  })
  .strict()
  .meta({ id: 'VoiceControlFrame', 'x-data-classification': 'C4' });

export const M2_VOICE_TOOL_KEYS = [] as const;
export const M5_VOICE_TOOL_KEYS = ['farmer.recommendation.read'] as const;
export type VoiceControlFrame = z.infer<typeof VoiceControlFrameSchema>;
export type VoiceProposalResponse = z.infer<typeof VoiceProposalResponseSchema>;
