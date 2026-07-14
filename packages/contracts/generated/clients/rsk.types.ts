// Generated from rsk.openapi.json. Do not edit by hand.
export interface paths {
    readonly "/health/live": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get: operations["getLiveness"];
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/health/ready": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get: operations["getReadiness"];
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/v1/auth/return-states": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        readonly post: operations["createReturnState"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/v1/auth/role-contexts": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        readonly post: operations["selectRoleContext"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/v1/auth/role-contexts/{roleContextId}": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        readonly post?: never;
        readonly delete: operations["revokeRoleContext"];
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/v1/auth/roles": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get: operations["listRoles"];
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/v1/auth/session": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get: operations["getAuthSession"];
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/v1/commands/{commandId}": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get: operations["getVoiceCommandStatus"];
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/v1/media/assets/{assetId}/status": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get: operations["getMediaAssetStatus"];
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/v1/media/attachments/{attachmentId}/content": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get: operations["streamMediaAttachment"];
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/v1/media/upload-intents": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        readonly post: operations["createMediaUploadIntent"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/v1/media/upload-intents/{intentId}": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        readonly post?: never;
        readonly delete: operations["cancelMediaUploadIntent"];
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/v1/media/upload-intents/{intentId}:finalize": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        readonly post: operations["finalizeMediaUploadIntent"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/v1/realtime": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get: operations["openVoiceRealtime"];
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/v1/rsk/access-grants": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        readonly post: operations["issueRskAccessGrant"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/v1/rsk/bootstrap": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get: operations["getRskBootstrap"];
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/v1/rsk/protected-disclosures": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        readonly post: operations["createRskProtectedDisclosure"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/v1/system/reachability": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get: operations["getReachability"];
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/v1/voice/offline-audio": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        readonly post: operations["attachVoiceOfflineAudio"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/v1/voice/proposals/{proposalId}": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get: operations["getVoiceProposal"];
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/v1/voice/proposals/{proposalId}:cancel": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        readonly post: operations["cancelVoiceProposal"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/v1/voice/proposals/{proposalId}:confirm": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        readonly post: operations["confirmVoiceProposal"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/v1/voice/proposals/{proposalId}:correct": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        readonly post: operations["correctVoiceProposal"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/v1/voice/sessions": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        readonly post: operations["createVoiceSession"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/v1/voice/sessions/{sessionId}/turns": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        readonly post: operations["createVoiceTurn"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        readonly AttachOfflineAudioRequest: {
            /** Format: uuid */
            readonly assetId: string;
            readonly audioConsentVersion: number;
            readonly expectedSessionRevision: number;
            /** @enum {string} */
            readonly language: "mr" | "hi" | "en";
            /** Format: uuid */
            readonly localCaptureId: string;
            /** Format: uuid */
            readonly sessionId: string;
        };
        readonly AttachOfflineAudioResponse: {
            /** Format: uuid */
            readonly attachmentId: string;
            /** Format: date-time */
            readonly expiresAt: string;
            /** Format: uuid */
            readonly offlineAudioRefId: string;
            /** @constant */
            readonly state: "TRANSCRIPTION_PENDING";
        };
        readonly AuthorizationContext: {
            readonly authorizationVersion: number;
            readonly capabilities: readonly ("case.response.draft" | "case.care_plan.issue" | "case.severe.resolve" | "advisory.review.decide" | "alert.draft" | "alert.approve" | "alert.publish" | "alert.delivery.monitor" | "alert.delivery.operate" | "sensor.agronomic_invalidate" | "template.draft" | "template.approve" | "template.publish" | "calendar.review" | "market.support" | "market.mapping.review" | "market.mapping.approve" | "assisted_session.operate" | "visit.manage" | "visit.execute.field" | "visit.execute.sensor" | "visit.outcome.review" | "audit.investigate_sensitive" | "rsk.work.read" | "rsk.work.operate" | "rsk.work.assign" | "rsk.protected_search" | "rsk.access_grant.issue" | "rsk.protected_disclose" | "case.read" | "case.evidence.request" | "case.follow_up.record" | "case.resolve.routine" | "advisory.review.read" | "outreach.operate" | "sensor.issue.operate" | "sensor.install" | "sensor.calibration.record" | "sensor.maintenance.execute" | "template.read" | "alert.read" | "identity.role_context.select" | "profile.correct" | "device_mode.change" | "farmer.setup.write" | "farmer.setup.complete" | "farmer.farm.write" | "farmer.plot.write" | "farmer.evidence.read" | "farmer.soil.write" | "farmer.voice.setup" | "farmer.recommendation.read" | "farmer.recommendation.run" | "farmer.recommendation.review_request" | "farmer.recommendation.accept" | "farmer.season.start_confirm" | "farmer.calendar.read")[];
            readonly capabilitySetVersion: number;
            /** @enum {string} */
            readonly environment: "local" | "preview" | "staging" | "demo" | "production";
            /** Format: uuid */
            readonly jurisdictionId?: string;
            /** Format: uuid */
            readonly officeId?: string;
            /** @enum {string} */
            readonly purposeCode: "farmer.self_service" | "case.expert_support" | "field.visit" | "sensor.maintenance" | "assisted.service" | "alert.delivery" | "market.support" | "data.rights";
            /** Format: uuid */
            readonly roleContextId: string;
            /** @enum {string} */
            readonly roleType: "FARMER" | "RSK" | "MP";
            /** Format: uuid */
            readonly subjectId: string;
        };
        readonly CancelMediaUploadIntentResponse: {
            /** Format: date-time */
            readonly cancelledAt: string;
            /** Format: uuid */
            readonly intentId: string;
            /** @constant */
            readonly state: "CANCELLED";
        };
        readonly CancelVoiceProposalRequest: {
            /** Format: uuid */
            readonly commandId: string;
            readonly expectedProposalRevision: number;
            /** Format: uuid */
            readonly proposalId: string;
        };
        readonly CommandResult: {
            /** Format: uuid */
            readonly commandId: string;
            /** @enum {string} */
            readonly disposition: "ACCEPTED" | "ALREADY_ACCEPTED" | "REJECTED" | "CONFLICT" | "IN_PROGRESS";
            readonly eventIds: readonly string[];
            readonly result?: {
                /** Format: uuid */
                readonly id: string;
                readonly revision: number;
                /** @enum {string} */
                readonly type: "roleContext" | "consentDecision" | "accessGrant" | "farmerSetupDraft" | "farmerSetup" | "farmerPreferences" | "deviceMode";
            };
            /** Format: date-time */
            readonly serverReceivedAt: string;
            /** Format: uuid */
            readonly syncAcknowledgementId?: string;
        };
        readonly ConfirmVoiceProposalRequest: {
            /** Format: uuid */
            readonly commandId: string;
            readonly expectedProposalRevision: number;
            readonly payloadHash: string;
            /** Format: uuid */
            readonly proposalId: string;
        };
        readonly CorrectVoiceProposalRequest: {
            /** Format: uuid */
            readonly commandId: string;
            readonly correction: {
                readonly [key: string]: components["schemas"]["JsonValue"];
            };
            readonly expectedProposalRevision: number;
            /** Format: uuid */
            readonly proposalId: string;
        };
        readonly CreateMediaUploadIntentRequest: {
            /** @enum {string} */
            readonly claimedMimeType: "image/jpeg" | "image/png" | "image/webp" | "audio/webm;codecs=opus" | "audio/wav";
            readonly consentAccessVersion: number;
            readonly declaredDurationSeconds?: number;
            readonly declaredHeight?: number;
            readonly declaredSizeBytes: number;
            readonly declaredWidth?: number;
            readonly expectedSha256: string;
            /** @constant */
            readonly mediaProtocolVersion: 1;
            readonly owner: {
                /** Format: uuid */
                readonly ownerId: string;
                /** @constant */
                readonly ownerType: "HEALTH_REPORT";
            } | {
                /** Format: uuid */
                readonly ownerId: string;
                /** @constant */
                readonly ownerType: "DIARY_ENTRY";
            } | {
                /** Format: uuid */
                readonly ownerId: string;
                /** @constant */
                readonly ownerType: "RSK_VISIT";
            } | {
                /** Format: uuid */
                readonly ownerId: string;
                /** @constant */
                readonly ownerType: "SENSOR_MAINTENANCE";
            } | {
                /** Format: uuid */
                readonly ownerId: string;
                /** @constant */
                readonly ownerType: "VOICE_SESSION";
            };
            /** @enum {string} */
            readonly purpose: "CROP_HEALTH_IMAGE" | "DIARY_MEDIA" | "RSK_VISIT_EVIDENCE" | "SENSOR_MAINTENANCE_EVIDENCE" | "VOICE_OFFLINE_AUDIO";
        };
        readonly CreateMediaUploadIntentResponse: {
            /** Format: uuid */
            readonly assetId: string;
            /** Format: date-time */
            readonly expiresAt: string;
            readonly generationPrecondition: string;
            /** Format: uuid */
            readonly intentId: string;
            /** Format: uri */
            readonly resumableUploadUri: string;
            /** @constant */
            readonly state: "INTENT_ISSUED";
        };
        readonly CreateVoiceSessionRequest: {
            readonly audioCapabilities: {
                readonly httpsAudio: boolean;
                readonly offlineAudio: boolean;
                readonly realtime: boolean;
            };
            readonly contextIds: readonly string[];
            /** @enum {string} */
            readonly language: "mr" | "hi" | "en";
            /** @constant */
            readonly protocolVersion: 1;
            readonly visualRoute: string;
        };
        readonly CreateVoiceSessionResponse: {
            readonly httpsTurnsEndpoint: string;
            /** @constant */
            readonly protocolVersion: 1;
            /** Format: date-time */
            readonly sessionExpiresAt: string;
            /** Format: uuid */
            readonly sessionId: string;
            readonly singleUseTicket: string;
            /** @constant */
            readonly state: "CREATED";
            /** Format: date-time */
            readonly ticketExpiresAt: string;
            /** Format: uri */
            readonly websocketEndpoint: string;
        };
        readonly FinalizeMediaUploadIntentRequest: {
            readonly finalSizeBytes: number;
            readonly objectGeneration: string;
            readonly sha256: string;
        };
        readonly HealthPayload: {
            readonly service: string;
            /** @enum {string} */
            readonly status: "ok" | "not_ready";
            /** Format: date-time */
            readonly timestamp: string;
        };
        readonly IssueAccessGrantCommand: {
            readonly clientContext: {
                /** Format: date-time */
                readonly clientRecordedAt: string;
                /** @enum {string} */
                readonly dataModeClaim: "LIVE" | "RECORDED" | "SIMULATED";
                readonly timezone: string;
            };
            /** @constant */
            readonly commandSchemaVersion: 1;
            readonly expectedRevision: number;
            /** @constant */
            readonly operation: "IssueAccessGrant";
            readonly payload: {
                readonly consentAccessVersion: number;
                /** Format: date-time */
                readonly expiresAt: string;
                /** Format: uuid */
                readonly farmerSubjectId: string;
                /** @constant */
                readonly purposeKey: "assisted.service";
                /** Format: uuid */
                readonly targetId: string;
                /** @constant */
                readonly targetKind: "ASSISTED_FARMER_CONTEXT";
            };
            readonly target: {
                /** Format: uuid */
                readonly id: string;
                /** @constant */
                readonly type: "accessGrant";
            };
        };
        readonly JsonValue: unknown;
        readonly MediaAssetStatusResponse: {
            /** Format: uuid */
            readonly assetId: string;
            readonly derivativeSha256?: string;
            /** @enum {string} */
            readonly failureCode?: "GENERATION_MISMATCH" | "SIZE_MISMATCH" | "CHECKSUM_MISMATCH" | "MIME_MISMATCH" | "UNSUPPORTED_CODEC" | "DECODER_REJECTED" | "POLYGLOT_REJECTED" | "MALWARE_REJECTED" | "DIMENSION_LIMIT_EXCEEDED" | "DURATION_LIMIT_EXCEEDED" | "CONSENT_OR_ACCESS_VERSION_CHANGED";
            /** @enum {string} */
            readonly purpose: "CROP_HEALTH_IMAGE" | "DIARY_MEDIA" | "RSK_VISIT_EVIDENCE" | "SENSOR_MAINTENANCE_EVIDENCE" | "VOICE_OFFLINE_AUDIO";
            readonly revision: number;
            /** @enum {string} */
            readonly state: "INTENT_ISSUED" | "UPLOADED_UNVERIFIED" | "SCANNING" | "VERIFIED" | "ATTACHED" | "FAILED_RETRYABLE" | "REJECTED" | "EXPIRED" | "CANCELLED";
            /** Format: date-time */
            readonly updatedAt: string;
            readonly verifiedMimeType?: string;
            readonly verifiedSizeBytes?: number;
        };
        readonly MediaOperationAcceptedResponse: {
            /** Format: date-time */
            readonly acceptedAt: string;
            /** Format: uuid */
            readonly assetId: string;
            /** Format: uuid */
            readonly operationId: string;
            /** @constant */
            readonly state: "SCANNING";
        };
        readonly ProblemDetails: {
            /** @enum {string} */
            readonly code: "AUTHENTICATION_REQUIRED" | "AUTHORIZATION_DENIED" | "MFA_REQUIRED" | "AUTHORIZATION_VERSION_CHANGED" | "CONSENT_OR_ACCESS_VERSION_CHANGED" | "DEVICE_BINDING_MISMATCH" | "IDEMPOTENCY_KEY_REUSED" | "EXPECTED_REVISION_MISMATCH" | "INVALID_STATE_TRANSITION" | "TOMBSTONED_ENTITY" | "SOURCE_VERSION_EXPIRED" | "EVIDENCE_INSUFFICIENT" | "SYNC_CURSOR_INVALID" | "SYNC_CURSOR_EXPIRED" | "SYNC_BOOTSTRAP_REQUIRED" | "SYNC_SCHEMA_UNSUPPORTED" | "SYNC_BATCH_ID_REUSED" | "CAUSAL_DEPENDENCY_UNSATISFIED" | "ASSIGNMENT_CHANGED" | "CLOCK_UNTRUSTED" | "MEDIA_INTEGRITY_MISMATCH" | "MEDIA_NOT_VERIFIED" | "UPLOAD_INTENT_EXPIRED" | "VOICE_PROPOSAL_EXPIRED" | "VOICE_PROPOSAL_HASH_MISMATCH" | "VISUAL_REVIEW_REQUIRED" | "RELEASE_INVALIDATED" | "RELEASE_UNAVAILABLE" | "DEPENDENCY_UNAVAILABLE" | "FILTER_NOT_ALLOWLISTED" | "COMPARISON_NOT_RELEASABLE" | "BATCH_ID_PAYLOAD_MISMATCH" | "RATE_LIMITED" | "SETUP_INCOMPLETE" | "GPS_PERMISSION_DENIED" | "HARDWARE_SKIPPED" | "STALE_DATA" | "PAYLOAD_TOO_LARGE" | "SIGNATURE_INVALID" | "REPLAY_DETECTED" | "CHALLENGE_EXPIRED" | "SOURCE_RIGHTS_OR_VERSION_INVALID" | "NO_SAFE_RECOMMENDATION";
            /** Format: uuid */
            readonly correlationId: string;
            readonly detail?: string;
            /** @default [] */
            readonly fieldErrors: readonly {
                readonly code: string;
                readonly field: string;
            }[];
            readonly retryable: boolean;
            readonly status: number;
            readonly title: string;
            /** Format: uri */
            readonly type: string;
        };
        readonly ProtectedDisclosureRequest: {
            readonly expectedAccessVersion: number;
            /** @constant */
            readonly fieldSet: "CONTACT";
            /** @constant */
            readonly purposeKey: "assisted.service";
            /** Format: uuid */
            readonly targetId: string;
            /** @constant */
            readonly targetKind: "ASSISTED_FARMER_CONTEXT";
        };
        readonly ProtectedDisclosureResponse: {
            readonly accessVersion: number;
            /** Format: date-time */
            readonly auditedAt: string;
            readonly fields: {
                readonly contact: string;
                readonly displayName: string;
            };
            /** Format: uuid */
            readonly targetId: string;
        };
        readonly ReturnStateRequest: {
            /** @enum {string} */
            readonly routeKey: "FARMER_HOME" | "RSK_HOME" | "MP_HOME";
        };
        readonly ReturnStateResponse: {
            /** Format: date-time */
            readonly expiresAt: string;
            /** Format: uuid */
            readonly returnStateId: string;
        };
        readonly RskBootstrapResponse: {
            readonly authorizationVersion: number;
            readonly capabilities: readonly ("case.response.draft" | "case.care_plan.issue" | "case.severe.resolve" | "advisory.review.decide" | "alert.draft" | "alert.approve" | "alert.publish" | "alert.delivery.monitor" | "alert.delivery.operate" | "sensor.agronomic_invalidate" | "template.draft" | "template.approve" | "template.publish" | "calendar.review" | "market.support" | "market.mapping.review" | "market.mapping.approve" | "assisted_session.operate" | "visit.manage" | "visit.execute.field" | "visit.execute.sensor" | "visit.outcome.review" | "audit.investigate_sensitive" | "rsk.work.read" | "rsk.work.operate" | "rsk.work.assign" | "rsk.protected_search" | "rsk.access_grant.issue" | "rsk.protected_disclose" | "case.read" | "case.evidence.request" | "case.follow_up.record" | "case.resolve.routine" | "advisory.review.read" | "outreach.operate" | "sensor.issue.operate" | "sensor.install" | "sensor.calibration.record" | "sensor.maintenance.execute" | "template.read" | "alert.read" | "identity.role_context.select" | "profile.correct" | "device_mode.change" | "farmer.setup.write" | "farmer.setup.complete" | "farmer.farm.write" | "farmer.plot.write" | "farmer.evidence.read" | "farmer.soil.write" | "farmer.voice.setup" | "farmer.recommendation.read" | "farmer.recommendation.run" | "farmer.recommendation.review_request" | "farmer.recommendation.accept" | "farmer.season.start_confirm" | "farmer.calendar.read")[];
            /** Format: uuid */
            readonly jurisdictionId: string;
            /** Format: uuid */
            readonly officeId: string;
            /** Format: uuid */
            readonly subjectId: string;
            /** @constant */
            readonly workState: "UNAVAILABLE_UNTIL_WORK_MILESTONE";
        };
        readonly SelectRoleContextCommand: {
            readonly clientContext: {
                /** Format: date-time */
                readonly clientRecordedAt: string;
                /** @enum {string} */
                readonly dataModeClaim: "LIVE" | "RECORDED" | "SIMULATED";
                readonly timezone: string;
            };
            /** @constant */
            readonly commandSchemaVersion: 1;
            readonly expectedRevision: number;
            /** @constant */
            readonly operation: "SelectRoleContext";
            readonly payload: {
                /** Format: uuid */
                readonly jurisdictionId?: string;
                /** Format: uuid */
                readonly officeId?: string;
                /** Format: uuid */
                readonly roleGrantId: string;
            };
            readonly target: {
                /** Format: uuid */
                readonly id: string;
                /** @constant */
                readonly type: "roleContext";
            };
        };
        readonly SessionResponse: {
            readonly activeRoleContext?: components["schemas"]["AuthorizationContext"];
            readonly authorizationVersion: number;
            readonly capabilitySetVersion: number;
            /** @enum {string} */
            readonly deviceBindingState: "ACTIVE" | "REQUIRED" | "REVOKED";
            /** @enum {string} */
            readonly environment: "local" | "preview" | "staging" | "demo" | "production";
            /** @enum {string} */
            readonly mfaState: "NOT_REQUIRED" | "CURRENT" | "REQUIRED" | "EXPIRED";
            readonly roles: readonly {
                readonly capabilitySetVersion: number;
                /** @enum {string} */
                readonly destination: "/farmer/today" | "/rsk/work" | "/mp/overview";
                /** Format: uuid */
                readonly jurisdictionId?: string;
                /** Format: uuid */
                readonly officeId?: string;
                /** Format: uuid */
                readonly roleGrantId: string;
                /** @enum {string} */
                readonly roleType: "FARMER" | "RSK" | "MP";
            }[];
            /** Format: uuid */
            readonly subjectId: string;
            /** @enum {string} */
            readonly subjectType: "FARMER" | "STAFF";
        };
        readonly VoiceCommandStatusResponse: {
            /** Format: uuid */
            readonly commandId: string;
            /** Format: uuid */
            readonly receiptReference?: string;
            /** @enum {string} */
            readonly state: "UNKNOWN" | "IN_PROGRESS" | "ACCEPTED" | "REJECTED";
        };
        readonly VoiceProposalResponse: {
            /** Format: uuid */
            readonly commandId?: string;
            /** Format: date-time */
            readonly expiresAt: string;
            readonly payloadHash: string;
            /** Format: uuid */
            readonly proposalId: string;
            readonly readBack: {
                readonly [key: string]: components["schemas"]["JsonValue"];
            };
            readonly revision: number;
            /** Format: uuid */
            readonly sessionId: string;
            /** @enum {string} */
            readonly state: "PENDING" | "CONFIRMED" | "CANCELLED" | "SUPERSEDED" | "EXPIRED" | "EXECUTING" | "COMPLETE" | "FAILED";
            readonly toolKey: string;
        };
        readonly VoiceTurnRequest: {
            readonly acknowledgedServerSequence: number;
            readonly clientSequence: number;
            readonly input: {
                readonly text: string;
                /** @constant */
                readonly type: "TEXT";
            } | {
                readonly bytesBase64: string;
                /** @enum {string} */
                readonly mimeType: "audio/webm;codecs=opus" | "audio/wav";
                readonly sha256: string;
                /** @constant */
                readonly type: "AUDIO";
            };
            /** Format: uuid */
            readonly turnId: string;
        };
        readonly VoiceTurnResponse: {
            readonly acknowledgedClientSequence: number;
            readonly messageKey: string;
            /** Format: uuid */
            readonly proposalId?: string;
            readonly result?: {
                /** @enum {string} */
                readonly dataMode: "LIVE" | "RECORDED" | "SIMULATED";
                readonly openDetailsRoute: string;
                /** Format: uuid */
                readonly recommendationId: string;
                /** @constant */
                readonly resultType: "RECOMMENDATION_READ";
                /** Format: date-time */
                readonly sourceGeneratedAt: string;
                readonly summary: string;
            };
            readonly serverSequence: number;
            /** Format: uuid */
            readonly sessionId: string;
            /** @enum {string} */
            readonly state: "HELP" | "UNAVAILABLE" | "NEEDS_CLARIFICATION" | "PROPOSAL_PENDING" | "RESULT_READY";
            /** Format: uuid */
            readonly turnId: string;
        };
    };
    responses: never;
    parameters: {
        /** @description Client build identifier */
        readonly clientBuild: string;
        /** @description Stable command UUID */
        readonly commandId: string;
        /** @description Quoted entity revision, for example "rev:3" */
        readonly expectedRevision: string;
        /** @description Stable installation identifier */
        readonly installationId: string;
        /** @description Selected role-context identifier when resolving the current session */
        readonly optionalRoleContextId: string;
        /** @description Current authorized role-context identifier */
        readonly roleContextId: string;
        /** @description Supported Milestone 3 contract schema version */
        readonly schemaVersion: "1";
        /** @description Optional single inclusive byte range */
        readonly singleByteRange: string;
    };
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    readonly getLiveness: {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response */
            readonly 200: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["HealthPayload"];
                };
            };
        };
    };
    readonly getReadiness: {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response */
            readonly 200: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["HealthPayload"];
                };
            };
            /** @description A required dependency is unavailable */
            readonly 503: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["HealthPayload"];
                };
            };
        };
    };
    readonly createReturnState: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description Client build identifier */
                readonly "X-Client-Build": components["parameters"]["clientBuild"];
                /** @description Stable installation identifier */
                readonly "X-Client-Installation-Id": components["parameters"]["installationId"];
                /** @description Supported Milestone 3 contract schema version */
                readonly "X-Client-Schema-Version": components["parameters"]["schemaVersion"];
            };
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly requestBody: {
            readonly content: {
                readonly "application/json": components["schemas"]["ReturnStateRequest"];
            };
        };
        readonly responses: {
            /** @description Successful response */
            readonly 200: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["ReturnStateResponse"];
                };
            };
            /** @description Request header, path or body failed schema or value validation */
            readonly 400: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Typed request failure */
            readonly 401: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Typed request failure */
            readonly 403: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Typed request failure */
            readonly 429: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Typed request failure */
            readonly 503: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    readonly selectRoleContext: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description Stable command UUID */
                readonly "Idempotency-Key": components["parameters"]["commandId"];
                /** @description Client build identifier */
                readonly "X-Client-Build": components["parameters"]["clientBuild"];
                /** @description Stable installation identifier */
                readonly "X-Client-Installation-Id": components["parameters"]["installationId"];
                /** @description Supported Milestone 3 contract schema version */
                readonly "X-Client-Schema-Version": components["parameters"]["schemaVersion"];
            };
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly requestBody: {
            readonly content: {
                readonly "application/json": components["schemas"]["SelectRoleContextCommand"];
            };
        };
        readonly responses: {
            /** @description Successful response */
            readonly 200: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["CommandResult"];
                };
            };
            /** @description Request header, path or body failed schema or value validation */
            readonly 400: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Typed request failure */
            readonly 401: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Typed request failure */
            readonly 403: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Command revision, idempotency hash or authorization-version conflict */
            readonly 409: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description A required command precondition is missing */
            readonly 428: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Typed request failure */
            readonly 503: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    readonly revokeRoleContext: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description Stable command UUID */
                readonly "Idempotency-Key": components["parameters"]["commandId"];
                /** @description Client build identifier */
                readonly "X-Client-Build": components["parameters"]["clientBuild"];
                /** @description Stable installation identifier */
                readonly "X-Client-Installation-Id": components["parameters"]["installationId"];
                /** @description Supported Milestone 3 contract schema version */
                readonly "X-Client-Schema-Version": components["parameters"]["schemaVersion"];
            };
            readonly path: {
                readonly roleContextId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response */
            readonly 200: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["CommandResult"];
                };
            };
            /** @description Request header, path or body failed schema or value validation */
            readonly 400: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Typed request failure */
            readonly 401: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Typed request failure */
            readonly 403: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Command revision, idempotency hash or authorization-version conflict */
            readonly 409: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description A required command precondition is missing */
            readonly 428: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Typed request failure */
            readonly 503: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    readonly listRoles: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description Client build identifier */
                readonly "X-Client-Build": components["parameters"]["clientBuild"];
                /** @description Stable installation identifier */
                readonly "X-Client-Installation-Id": components["parameters"]["installationId"];
                /** @description Supported Milestone 3 contract schema version */
                readonly "X-Client-Schema-Version": components["parameters"]["schemaVersion"];
                /** @description Selected role-context identifier when resolving the current session */
                readonly "X-Role-Context-Id"?: components["parameters"]["optionalRoleContextId"];
            };
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response */
            readonly 200: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["SessionResponse"];
                };
            };
            /** @description Request header, path or body failed schema or value validation */
            readonly 400: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Typed request failure */
            readonly 401: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Typed request failure */
            readonly 403: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Typed request failure */
            readonly 409: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Typed request failure */
            readonly 503: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    readonly getAuthSession: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description Client build identifier */
                readonly "X-Client-Build": components["parameters"]["clientBuild"];
                /** @description Stable installation identifier */
                readonly "X-Client-Installation-Id": components["parameters"]["installationId"];
                /** @description Supported Milestone 3 contract schema version */
                readonly "X-Client-Schema-Version": components["parameters"]["schemaVersion"];
                /** @description Selected role-context identifier when resolving the current session */
                readonly "X-Role-Context-Id"?: components["parameters"]["optionalRoleContextId"];
            };
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response */
            readonly 200: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["SessionResponse"];
                };
            };
            /** @description Request header, path or body failed schema or value validation */
            readonly 400: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Typed request failure */
            readonly 401: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Typed request failure */
            readonly 403: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Typed request failure */
            readonly 409: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Typed request failure */
            readonly 503: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    readonly getVoiceCommandStatus: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description Client build identifier */
                readonly "X-Client-Build": components["parameters"]["clientBuild"];
                /** @description Stable installation identifier */
                readonly "X-Client-Installation-Id": components["parameters"]["installationId"];
                /** @description Supported Milestone 3 contract schema version */
                readonly "X-Client-Schema-Version": components["parameters"]["schemaVersion"];
                /** @description Current authorized role-context identifier */
                readonly "X-Role-Context-Id": components["parameters"]["roleContextId"];
            };
            readonly path: {
                readonly commandId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response */
            readonly 200: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["VoiceCommandStatusResponse"];
                };
            };
            /** @description Request header, path or body failed schema or value validation */
            readonly 400: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Typed request failure */
            readonly 401: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Typed request failure */
            readonly 403: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Typed request failure */
            readonly 409: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Typed request failure */
            readonly 503: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    readonly getMediaAssetStatus: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description Client build identifier */
                readonly "X-Client-Build": components["parameters"]["clientBuild"];
                /** @description Stable installation identifier */
                readonly "X-Client-Installation-Id": components["parameters"]["installationId"];
                /** @description Supported Milestone 3 contract schema version */
                readonly "X-Client-Schema-Version": components["parameters"]["schemaVersion"];
                /** @description Current authorized role-context identifier */
                readonly "X-Role-Context-Id": components["parameters"]["roleContextId"];
            };
            readonly path: {
                readonly assetId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response */
            readonly 200: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["MediaAssetStatusResponse"];
                };
            };
            /** @description Request header, path or body failed schema or value validation */
            readonly 400: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Typed request failure */
            readonly 401: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Typed request failure */
            readonly 403: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Typed request failure */
            readonly 409: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Typed request failure */
            readonly 503: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    readonly streamMediaAttachment: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description Optional single inclusive byte range */
                readonly Range?: components["parameters"]["singleByteRange"];
                /** @description Client build identifier */
                readonly "X-Client-Build": components["parameters"]["clientBuild"];
                /** @description Stable installation identifier */
                readonly "X-Client-Installation-Id": components["parameters"]["installationId"];
                /** @description Supported Milestone 3 contract schema version */
                readonly "X-Client-Schema-Version": components["parameters"]["schemaVersion"];
                /** @description Current authorized role-context identifier */
                readonly "X-Role-Context-Id": components["parameters"]["roleContextId"];
            };
            readonly path: {
                readonly attachmentId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Complete generation-pinned attachment */
            readonly 200: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/octet-stream": string;
                };
            };
            /** @description Single authorized byte range */
            readonly 206: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/octet-stream": string;
                };
            };
            /** @description Request header, path or body failed schema or value validation */
            readonly 400: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Typed request failure */
            readonly 401: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Typed request failure */
            readonly 403: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Typed request failure */
            readonly 409: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description The requested byte range is not satisfiable */
            readonly 416: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Typed request failure */
            readonly 503: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    readonly createMediaUploadIntent: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description Stable command UUID */
                readonly "Idempotency-Key": components["parameters"]["commandId"];
                /** @description Client build identifier */
                readonly "X-Client-Build": components["parameters"]["clientBuild"];
                /** @description Stable installation identifier */
                readonly "X-Client-Installation-Id": components["parameters"]["installationId"];
                /** @description Supported Milestone 3 contract schema version */
                readonly "X-Client-Schema-Version": components["parameters"]["schemaVersion"];
                /** @description Current authorized role-context identifier */
                readonly "X-Role-Context-Id": components["parameters"]["roleContextId"];
            };
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly requestBody: {
            readonly content: {
                readonly "application/json": components["schemas"]["CreateMediaUploadIntentRequest"];
            };
        };
        readonly responses: {
            /** @description One-time quarantine upload initiation */
            readonly 201: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["CreateMediaUploadIntentResponse"];
                };
            };
            /** @description Request header, path or body failed schema or value validation */
            readonly 400: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Typed request failure */
            readonly 401: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Typed request failure */
            readonly 403: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Command revision, idempotency hash or authorization-version conflict */
            readonly 409: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description A required command precondition is missing */
            readonly 428: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Typed request failure */
            readonly 429: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Typed request failure */
            readonly 503: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    readonly cancelMediaUploadIntent: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description Stable command UUID */
                readonly "Idempotency-Key": components["parameters"]["commandId"];
                /** @description Client build identifier */
                readonly "X-Client-Build": components["parameters"]["clientBuild"];
                /** @description Stable installation identifier */
                readonly "X-Client-Installation-Id": components["parameters"]["installationId"];
                /** @description Supported Milestone 3 contract schema version */
                readonly "X-Client-Schema-Version": components["parameters"]["schemaVersion"];
                /** @description Current authorized role-context identifier */
                readonly "X-Role-Context-Id": components["parameters"]["roleContextId"];
            };
            readonly path: {
                readonly intentId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response */
            readonly 200: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["CancelMediaUploadIntentResponse"];
                };
            };
            /** @description Request header, path or body failed schema or value validation */
            readonly 400: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Typed request failure */
            readonly 401: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Typed request failure */
            readonly 403: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Command revision, idempotency hash or authorization-version conflict */
            readonly 409: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description A required command precondition is missing */
            readonly 428: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Typed request failure */
            readonly 503: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    readonly finalizeMediaUploadIntent: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description Stable command UUID */
                readonly "Idempotency-Key": components["parameters"]["commandId"];
                /** @description Client build identifier */
                readonly "X-Client-Build": components["parameters"]["clientBuild"];
                /** @description Stable installation identifier */
                readonly "X-Client-Installation-Id": components["parameters"]["installationId"];
                /** @description Supported Milestone 3 contract schema version */
                readonly "X-Client-Schema-Version": components["parameters"]["schemaVersion"];
                /** @description Current authorized role-context identifier */
                readonly "X-Role-Context-Id": components["parameters"]["roleContextId"];
            };
            readonly path: {
                readonly intentId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody: {
            readonly content: {
                readonly "application/json": components["schemas"]["FinalizeMediaUploadIntentRequest"];
            };
        };
        readonly responses: {
            /** @description Verification accepted */
            readonly 202: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["MediaOperationAcceptedResponse"];
                };
            };
            /** @description Request header, path or body failed schema or value validation */
            readonly 400: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Typed request failure */
            readonly 401: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Typed request failure */
            readonly 403: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Command revision, idempotency hash or authorization-version conflict */
            readonly 409: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Typed request failure */
            readonly 410: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Typed request failure */
            readonly 422: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description A required command precondition is missing */
            readonly 428: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Typed request failure */
            readonly 503: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    readonly openVoiceRealtime: {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description sfka.voice.v1 WebSocket upgrade */
            readonly 101: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Request header, path or body failed schema or value validation */
            readonly 400: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Typed request failure */
            readonly 401: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Typed request failure */
            readonly 403: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Typed request failure */
            readonly 409: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Typed request failure */
            readonly 429: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Typed request failure */
            readonly 503: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    readonly issueRskAccessGrant: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description Stable command UUID */
                readonly "Idempotency-Key": components["parameters"]["commandId"];
                /** @description Quoted entity revision, for example "rev:3" */
                readonly "If-Match": components["parameters"]["expectedRevision"];
                /** @description Client build identifier */
                readonly "X-Client-Build": components["parameters"]["clientBuild"];
                /** @description Stable installation identifier */
                readonly "X-Client-Installation-Id": components["parameters"]["installationId"];
                /** @description Supported Milestone 3 contract schema version */
                readonly "X-Client-Schema-Version": components["parameters"]["schemaVersion"];
                /** @description Current authorized role-context identifier */
                readonly "X-Role-Context-Id": components["parameters"]["roleContextId"];
            };
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly requestBody: {
            readonly content: {
                readonly "application/json": components["schemas"]["IssueAccessGrantCommand"];
            };
        };
        readonly responses: {
            /** @description Successful response */
            readonly 200: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["CommandResult"];
                };
            };
            /** @description Request header, path or body failed schema or value validation */
            readonly 400: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Typed request failure */
            readonly 401: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Typed request failure */
            readonly 403: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Command revision, idempotency hash or authorization-version conflict */
            readonly 409: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description A required command precondition is missing */
            readonly 428: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Typed request failure */
            readonly 503: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    readonly getRskBootstrap: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description Client build identifier */
                readonly "X-Client-Build": components["parameters"]["clientBuild"];
                /** @description Stable installation identifier */
                readonly "X-Client-Installation-Id": components["parameters"]["installationId"];
                /** @description Supported Milestone 3 contract schema version */
                readonly "X-Client-Schema-Version": components["parameters"]["schemaVersion"];
                /** @description Current authorized role-context identifier */
                readonly "X-Role-Context-Id": components["parameters"]["roleContextId"];
            };
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response */
            readonly 200: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["RskBootstrapResponse"];
                };
            };
            /** @description Request header, path or body failed schema or value validation */
            readonly 400: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Typed request failure */
            readonly 401: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Typed request failure */
            readonly 403: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Typed request failure */
            readonly 409: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Typed request failure */
            readonly 503: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    readonly createRskProtectedDisclosure: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description Client build identifier */
                readonly "X-Client-Build": components["parameters"]["clientBuild"];
                /** @description Stable installation identifier */
                readonly "X-Client-Installation-Id": components["parameters"]["installationId"];
                /** @description Supported Milestone 3 contract schema version */
                readonly "X-Client-Schema-Version": components["parameters"]["schemaVersion"];
                /** @description Current authorized role-context identifier */
                readonly "X-Role-Context-Id": components["parameters"]["roleContextId"];
            };
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly requestBody: {
            readonly content: {
                readonly "application/json": components["schemas"]["ProtectedDisclosureRequest"];
            };
        };
        readonly responses: {
            /** @description Successful response */
            readonly 200: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["ProtectedDisclosureResponse"];
                };
            };
            /** @description Request header, path or body failed schema or value validation */
            readonly 400: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Typed request failure */
            readonly 401: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Typed request failure */
            readonly 403: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Typed request failure */
            readonly 409: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Typed request failure */
            readonly 503: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    readonly getReachability: {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response */
            readonly 200: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["HealthPayload"];
                };
            };
        };
    };
    readonly attachVoiceOfflineAudio: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description Stable command UUID */
                readonly "Idempotency-Key": components["parameters"]["commandId"];
                /** @description Quoted entity revision, for example "rev:3" */
                readonly "If-Match": components["parameters"]["expectedRevision"];
                /** @description Client build identifier */
                readonly "X-Client-Build": components["parameters"]["clientBuild"];
                /** @description Stable installation identifier */
                readonly "X-Client-Installation-Id": components["parameters"]["installationId"];
                /** @description Supported Milestone 3 contract schema version */
                readonly "X-Client-Schema-Version": components["parameters"]["schemaVersion"];
                /** @description Current authorized role-context identifier */
                readonly "X-Role-Context-Id": components["parameters"]["roleContextId"];
            };
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly requestBody: {
            readonly content: {
                readonly "application/json": components["schemas"]["AttachOfflineAudioRequest"];
            };
        };
        readonly responses: {
            /** @description Successful response */
            readonly 200: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["AttachOfflineAudioResponse"];
                };
            };
            /** @description Request header, path or body failed schema or value validation */
            readonly 400: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Typed request failure */
            readonly 401: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Typed request failure */
            readonly 403: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Command revision, idempotency hash or authorization-version conflict */
            readonly 409: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description A required command precondition is missing */
            readonly 428: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Typed request failure */
            readonly 503: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    readonly getVoiceProposal: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description Client build identifier */
                readonly "X-Client-Build": components["parameters"]["clientBuild"];
                /** @description Stable installation identifier */
                readonly "X-Client-Installation-Id": components["parameters"]["installationId"];
                /** @description Supported Milestone 3 contract schema version */
                readonly "X-Client-Schema-Version": components["parameters"]["schemaVersion"];
                /** @description Current authorized role-context identifier */
                readonly "X-Role-Context-Id": components["parameters"]["roleContextId"];
            };
            readonly path: {
                readonly proposalId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful response */
            readonly 200: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["VoiceProposalResponse"];
                };
            };
            /** @description Request header, path or body failed schema or value validation */
            readonly 400: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Typed request failure */
            readonly 401: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Typed request failure */
            readonly 403: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Typed request failure */
            readonly 409: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Typed request failure */
            readonly 503: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    readonly cancelVoiceProposal: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description Stable command UUID */
                readonly "Idempotency-Key": components["parameters"]["commandId"];
                /** @description Client build identifier */
                readonly "X-Client-Build": components["parameters"]["clientBuild"];
                /** @description Stable installation identifier */
                readonly "X-Client-Installation-Id": components["parameters"]["installationId"];
                /** @description Supported Milestone 3 contract schema version */
                readonly "X-Client-Schema-Version": components["parameters"]["schemaVersion"];
                /** @description Current authorized role-context identifier */
                readonly "X-Role-Context-Id": components["parameters"]["roleContextId"];
            };
            readonly path: {
                readonly proposalId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody: {
            readonly content: {
                readonly "application/json": components["schemas"]["CancelVoiceProposalRequest"];
            };
        };
        readonly responses: {
            /** @description Successful response */
            readonly 200: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["VoiceProposalResponse"];
                };
            };
            /** @description Request header, path or body failed schema or value validation */
            readonly 400: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Typed request failure */
            readonly 401: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Typed request failure */
            readonly 403: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Command revision, idempotency hash or authorization-version conflict */
            readonly 409: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Typed request failure */
            readonly 410: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description A required command precondition is missing */
            readonly 428: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Typed request failure */
            readonly 503: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    readonly confirmVoiceProposal: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description Stable command UUID */
                readonly "Idempotency-Key": components["parameters"]["commandId"];
                /** @description Client build identifier */
                readonly "X-Client-Build": components["parameters"]["clientBuild"];
                /** @description Stable installation identifier */
                readonly "X-Client-Installation-Id": components["parameters"]["installationId"];
                /** @description Supported Milestone 3 contract schema version */
                readonly "X-Client-Schema-Version": components["parameters"]["schemaVersion"];
                /** @description Current authorized role-context identifier */
                readonly "X-Role-Context-Id": components["parameters"]["roleContextId"];
            };
            readonly path: {
                readonly proposalId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody: {
            readonly content: {
                readonly "application/json": components["schemas"]["ConfirmVoiceProposalRequest"];
            };
        };
        readonly responses: {
            /** @description Successful response */
            readonly 200: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["VoiceCommandStatusResponse"];
                };
            };
            /** @description Request header, path or body failed schema or value validation */
            readonly 400: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Typed request failure */
            readonly 401: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Typed request failure */
            readonly 403: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Command revision, idempotency hash or authorization-version conflict */
            readonly 409: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Typed request failure */
            readonly 410: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description A required command precondition is missing */
            readonly 428: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Typed request failure */
            readonly 503: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    readonly correctVoiceProposal: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description Stable command UUID */
                readonly "Idempotency-Key": components["parameters"]["commandId"];
                /** @description Client build identifier */
                readonly "X-Client-Build": components["parameters"]["clientBuild"];
                /** @description Stable installation identifier */
                readonly "X-Client-Installation-Id": components["parameters"]["installationId"];
                /** @description Supported Milestone 3 contract schema version */
                readonly "X-Client-Schema-Version": components["parameters"]["schemaVersion"];
                /** @description Current authorized role-context identifier */
                readonly "X-Role-Context-Id": components["parameters"]["roleContextId"];
            };
            readonly path: {
                readonly proposalId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody: {
            readonly content: {
                readonly "application/json": components["schemas"]["CorrectVoiceProposalRequest"];
            };
        };
        readonly responses: {
            /** @description Successful response */
            readonly 200: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["VoiceProposalResponse"];
                };
            };
            /** @description Request header, path or body failed schema or value validation */
            readonly 400: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Typed request failure */
            readonly 401: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Typed request failure */
            readonly 403: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Command revision, idempotency hash or authorization-version conflict */
            readonly 409: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Typed request failure */
            readonly 410: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description A required command precondition is missing */
            readonly 428: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Typed request failure */
            readonly 503: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    readonly createVoiceSession: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description Stable command UUID */
                readonly "Idempotency-Key": components["parameters"]["commandId"];
                /** @description Client build identifier */
                readonly "X-Client-Build": components["parameters"]["clientBuild"];
                /** @description Stable installation identifier */
                readonly "X-Client-Installation-Id": components["parameters"]["installationId"];
                /** @description Supported Milestone 3 contract schema version */
                readonly "X-Client-Schema-Version": components["parameters"]["schemaVersion"];
                /** @description Current authorized role-context identifier */
                readonly "X-Role-Context-Id": components["parameters"]["roleContextId"];
            };
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly requestBody: {
            readonly content: {
                readonly "application/json": components["schemas"]["CreateVoiceSessionRequest"];
            };
        };
        readonly responses: {
            /** @description Bound one-time voice ticket */
            readonly 201: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["CreateVoiceSessionResponse"];
                };
            };
            /** @description Request header, path or body failed schema or value validation */
            readonly 400: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Typed request failure */
            readonly 401: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Typed request failure */
            readonly 403: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Command revision, idempotency hash or authorization-version conflict */
            readonly 409: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description A required command precondition is missing */
            readonly 428: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Typed request failure */
            readonly 429: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Typed request failure */
            readonly 503: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    readonly createVoiceTurn: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description Stable command UUID */
                readonly "Idempotency-Key": components["parameters"]["commandId"];
                /** @description Client build identifier */
                readonly "X-Client-Build": components["parameters"]["clientBuild"];
                /** @description Stable installation identifier */
                readonly "X-Client-Installation-Id": components["parameters"]["installationId"];
                /** @description Supported Milestone 3 contract schema version */
                readonly "X-Client-Schema-Version": components["parameters"]["schemaVersion"];
                /** @description Current authorized role-context identifier */
                readonly "X-Role-Context-Id": components["parameters"]["roleContextId"];
            };
            readonly path: {
                readonly sessionId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody: {
            readonly content: {
                readonly "application/json": components["schemas"]["VoiceTurnRequest"];
            };
        };
        readonly responses: {
            /** @description Successful response */
            readonly 200: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["VoiceTurnResponse"];
                };
            };
            /** @description Request header, path or body failed schema or value validation */
            readonly 400: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Typed request failure */
            readonly 401: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Typed request failure */
            readonly 403: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Command revision, idempotency hash or authorization-version conflict */
            readonly 409: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description A required command precondition is missing */
            readonly 428: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Typed request failure */
            readonly 503: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
}
