// Generated from farmer.openapi.json. Do not edit by hand.
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
    readonly "/v1/farmer/bootstrap": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get: operations["getFarmerBootstrap"];
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/v1/farmer/consent-decisions": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        readonly post: operations["recordConsentDecision"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/v1/farmer/consents": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get: operations["listFarmerConsents"];
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/v1/farmer/device-mode-changes": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        readonly post: operations["changeFarmerDeviceMode"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/v1/farmer/farms": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get: operations["listFarmerFarms"];
        readonly put?: never;
        readonly post: operations["createFarmerFarm"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/v1/farmer/farms/{farmId}": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get: operations["getFarmerFarm"];
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch: operations["updateFarmerFarm"];
        readonly trace?: never;
    };
    readonly "/v1/farmer/farms/{farmId}/plots": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        readonly post: operations["createFarmerPlot"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/v1/farmer/my-farm": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get: operations["getMyFarm"];
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/v1/farmer/plots/{plotId}": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get: operations["getFarmerPlot"];
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch: operations["updateFarmerPlot"];
        readonly trace?: never;
    };
    readonly "/v1/farmer/plots/{plotId}/geometry-versions": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        readonly post: operations["createFarmerPlotGeometryVersion"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/v1/farmer/preferences": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch: operations["updateFarmerPreferences"];
        readonly trace?: never;
    };
    readonly "/v1/farmer/setup-drafts": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        readonly post: operations["saveFarmerSetupDraft"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/v1/farmer/setup:complete": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        readonly post: operations["completeFarmerSetup"];
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
    readonly "/v1/sync/batches": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        readonly post: operations["syncFarmerBatch"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/v1/sync/bootstrap": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        readonly post: operations["bootstrapFarmerSync"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/v1/sync/commands/{commandId}": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get: operations["getFarmerSyncCommand"];
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/v1/sync/conflicts": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get: operations["listFarmerSyncConflicts"];
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/v1/sync/conflicts/{conflictId}": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get: operations["getFarmerSyncConflict"];
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/v1/sync/conflicts/{conflictId}/resolutions": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        readonly post: operations["resolveFarmerSyncConflict"];
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/v1/sync/feed": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get: operations["getFarmerSyncFeed"];
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/v1/sync/streams": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get?: never;
        readonly put?: never;
        readonly post: operations["openFarmerSyncStream"];
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
            readonly capabilities: readonly ("case.response.draft" | "case.care_plan.issue" | "case.severe.resolve" | "advisory.review.decide" | "alert.draft" | "alert.approve" | "alert.publish" | "alert.delivery.monitor" | "alert.delivery.operate" | "sensor.agronomic_invalidate" | "template.draft" | "template.approve" | "template.publish" | "calendar.review" | "market.support" | "market.mapping.review" | "market.mapping.approve" | "assisted_session.operate" | "visit.manage" | "visit.execute.field" | "visit.execute.sensor" | "visit.outcome.review" | "audit.investigate_sensitive" | "rsk.work.read" | "rsk.work.operate" | "rsk.work.assign" | "rsk.protected_search" | "rsk.access_grant.issue" | "rsk.protected_disclose" | "case.read" | "case.evidence.request" | "case.follow_up.record" | "case.resolve.routine" | "advisory.review.read" | "outreach.operate" | "sensor.issue.operate" | "sensor.install" | "sensor.calibration.record" | "sensor.maintenance.execute" | "template.read" | "alert.read" | "identity.role_context.select" | "profile.correct" | "device_mode.change" | "farmer.setup.write" | "farmer.setup.complete" | "farmer.farm.write" | "farmer.plot.write" | "farmer.voice.setup")[];
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
        readonly ChangeDeviceModeCommand: {
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
            readonly operation: "ChangeDeviceMode";
            readonly payload: components["schemas"]["DeviceModeChangePayload"];
            readonly target: {
                /** Format: uuid */
                readonly id: string;
                /** @constant */
                readonly type: "deviceMode";
            };
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
        readonly CompleteFarmerSetupCommand: {
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
            readonly operation: "CompleteFarmerSetup";
            readonly payload: components["schemas"]["CompleteFarmerSetupPayload"];
            readonly target: {
                /** Format: uuid */
                readonly id: string;
                /** @constant */
                readonly type: "farmerSetup";
            };
        };
        readonly CompleteFarmerSetupPayload: {
            readonly acceptedDraftChecksum: string;
            readonly acceptedDraftRevision: number;
            /** Format: uuid */
            readonly draftId: string;
        };
        readonly ConfirmVoiceProposalRequest: {
            /** Format: uuid */
            readonly commandId: string;
            readonly expectedProposalRevision: number;
            readonly payloadHash: string;
            /** Format: uuid */
            readonly proposalId: string;
        };
        readonly ConsentListResponse: {
            readonly items: readonly {
                readonly accessVersion: number;
                /** Format: uuid */
                readonly consentDecisionId?: string;
                /** Format: date-time */
                readonly expiresAt?: string;
                /** @enum {string} */
                readonly purposeKey: "farmer.self_service" | "case.expert_support" | "field.visit" | "sensor.maintenance" | "assisted.service" | "alert.delivery" | "market.support" | "data.rights";
                /** @enum {string} */
                readonly scopeKey: "location.processing" | "audio.storage" | "case.sharing" | "sensor.collection" | "sensor.maintenance_location" | "visit.access" | "assisted_service.access" | "channel.app_push" | "channel.sms" | "channel.ivr" | "market.private_fields";
                /** @enum {string} */
                readonly state: "MISSING" | "ALLOWED" | "DENIED" | "EXPIRED" | "WITHDRAWN";
                /** Format: uuid */
                readonly targetId: string;
                /** @enum {string} */
                readonly targetKind: "ACCOUNT" | "ASSISTED_FARMER_CONTEXT";
            }[];
            readonly revision: number;
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
        readonly CropDeclaration: {
            readonly cropName: string;
            readonly planned: boolean;
            /** Format: date */
            readonly sowingOrTransplantDate?: string;
            /** @enum {string} */
            readonly stage: "PLANNED" | "SOWN" | "TRANSPLANTED" | "VEGETATIVE" | "FLOWERING" | "FRUITING" | "HARVESTED" | "UNKNOWN";
            readonly variety?: string;
        };
        readonly CropHistoryRecord: {
            readonly cropName: string;
            readonly notes?: string;
            readonly seasonLabel: string;
            readonly year: number;
        };
        /** @enum {string} */
        readonly DeviceMode: "PERSONAL" | "TRUSTED_FAMILY" | "RSK_ASSISTED";
        readonly DeviceModeChangePayload: {
            /** @enum {string} */
            readonly localPrivateWorkState: "NONE" | "SYNCED" | "LOCKED_RECOVERY_REQUIRED";
            /** @enum {string} */
            readonly nextDeviceMode: "PERSONAL" | "TRUSTED_FAMILY" | "RSK_ASSISTED";
        };
        readonly FarmerBootstrapResponse: {
            readonly authorizationVersion: number;
            readonly capabilities: readonly ("case.response.draft" | "case.care_plan.issue" | "case.severe.resolve" | "advisory.review.decide" | "alert.draft" | "alert.approve" | "alert.publish" | "alert.delivery.monitor" | "alert.delivery.operate" | "sensor.agronomic_invalidate" | "template.draft" | "template.approve" | "template.publish" | "calendar.review" | "market.support" | "market.mapping.review" | "market.mapping.approve" | "assisted_session.operate" | "visit.manage" | "visit.execute.field" | "visit.execute.sensor" | "visit.outcome.review" | "audit.investigate_sensitive" | "rsk.work.read" | "rsk.work.operate" | "rsk.work.assign" | "rsk.protected_search" | "rsk.access_grant.issue" | "rsk.protected_disclose" | "case.read" | "case.evidence.request" | "case.follow_up.record" | "case.resolve.routine" | "advisory.review.read" | "outreach.operate" | "sensor.issue.operate" | "sensor.install" | "sensor.calibration.record" | "sensor.maintenance.execute" | "template.read" | "alert.read" | "identity.role_context.select" | "profile.correct" | "device_mode.change" | "farmer.setup.write" | "farmer.setup.complete" | "farmer.farm.write" | "farmer.plot.write" | "farmer.voice.setup")[];
            /** @enum {string} */
            readonly deviceMode: "PERSONAL" | "TRUSTED_FAMILY" | "RSK_ASSISTED";
            /** @enum {string} */
            readonly farmContextState: "UNAVAILABLE_UNTIL_SETUP" | "AVAILABLE";
            /** @enum {string} */
            readonly locale: "mr" | "hi" | "en";
            readonly myFarm?: components["schemas"]["MyFarmResponse"];
            /** @enum {string} */
            readonly onboardingState: "NOT_STARTED" | "IN_PROGRESS" | "READY_FOR_REVIEW" | "COMPLETE" | "NEEDS_REVIEW";
            readonly setup: components["schemas"]["FarmerSetupSummary"];
            /** Format: uuid */
            readonly subjectId: string;
        };
        readonly FarmerProfileSetup: {
            readonly accessibility: {
                readonly highContrast: boolean;
                readonly largeTargets: boolean;
                readonly voicePrompts: boolean;
            };
            readonly displayName?: string;
            /** @enum {string} */
            readonly preferredLocale: "mr-IN" | "hi-IN" | "en-IN";
            /** @constant */
            readonly timezone: "Asia/Kolkata";
        };
        readonly FarmerSetupDraft: {
            readonly checksum: string;
            readonly consents: components["schemas"]["SetupConsents"];
            readonly cropHistoryByPlot: {
                readonly [key: string]: readonly components["schemas"]["CropHistoryRecord"][];
            };
            readonly currentCropByPlot: {
                readonly [key: string]: components["schemas"]["CropDeclaration"];
            };
            /** @enum {string} */
            readonly deviceMode: "PERSONAL" | "TRUSTED_FAMILY" | "RSK_ASSISTED";
            /** Format: uuid */
            readonly draftId: string;
            readonly farms: readonly components["schemas"]["FarmSetup"][];
            /** @enum {string} */
            readonly hardwareStatus: "SKIPPED" | "NOT_CONFIGURED" | "RSK_SETUP_REQUIRED";
            readonly profile: components["schemas"]["FarmerProfileSetup"];
            readonly revision: number;
            readonly soilByPlot: {
                readonly [key: string]: components["schemas"]["SoilMeasurement"];
            };
            /** @enum {string} */
            readonly status: "NOT_STARTED" | "IN_PROGRESS" | "READY_FOR_REVIEW" | "COMPLETE" | "NEEDS_REVIEW";
            /** @enum {string} */
            readonly syncStatus: "SAVED_ON_THIS_PHONE" | "WAITING_FOR_INTERNET" | "SYNCED" | "CONFLICT" | "LOCKED_RECOVERY" | "REJECTED";
            /** Format: date-time */
            readonly updatedAt: string;
            readonly waterByPlot: {
                readonly [key: string]: components["schemas"]["WaterContext"];
            };
        };
        readonly FarmerSetupSummary: {
            readonly activeDraft?: components["schemas"]["FarmerSetupDraft"];
            /** Format: date-time */
            readonly completedAt?: string;
            readonly conflictCount: number;
            /** @enum {string} */
            readonly status: "NOT_STARTED" | "IN_PROGRESS" | "READY_FOR_REVIEW" | "COMPLETE" | "NEEDS_REVIEW";
            /** @enum {string} */
            readonly syncStatus: "SAVED_ON_THIS_PHONE" | "WAITING_FOR_INTERNET" | "SYNCED" | "CONFLICT" | "LOCKED_RECOVERY" | "REJECTED";
        };
        readonly FarmSetup: {
            /** Format: uuid */
            readonly farmId: string;
            /** @enum {string} */
            readonly farmingMethod: "TRADITIONAL" | "ORGANIC" | "MIXED" | "UNKNOWN";
            readonly location: components["schemas"]["RaigadLocation"];
            readonly name: string;
            readonly plots: readonly components["schemas"]["PlotSetup"][];
            readonly revision: number;
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
        readonly MilestoneOneEvent: {
            /** Format: uuid */
            readonly actorRef?: string;
            /** @enum {string} */
            readonly actorType: "FARMER" | "RSK_STAFF" | "MP_STAFF" | "SYSTEM" | "DEVICE" | "PROVIDER";
            /** Format: uuid */
            readonly aggregateId: string;
            readonly aggregateRevision: number;
            readonly aggregateType: string;
            /** Format: uuid */
            readonly causationId?: string;
            /** Format: date-time */
            readonly clientRecordedAt?: string;
            /** Format: date-time */
            readonly committedAt: string;
            readonly consentAccessVersion?: number;
            /** Format: uuid */
            readonly correlationId: string;
            /** @enum {string} */
            readonly dataMode: "LIVE" | "RECORDED" | "SIMULATED";
            /** Format: uuid */
            readonly deviceRef?: string;
            /** Format: uuid */
            readonly eventId: string;
            /** @constant */
            readonly eventName: "identity.role_context_created";
            readonly eventOrdinal: number;
            readonly eventVersion: number;
            /** Format: uuid */
            readonly jurisdictionId?: string;
            readonly modeDerivationVersion: string;
            /** Format: date-time */
            readonly occurredAt: string;
            readonly payload: {
                readonly authorizationVersion: number;
                readonly capabilitySetVersion: number;
                /** Format: date-time */
                readonly expiresAt: string;
                /** Format: uuid */
                readonly roleContextId: string;
                /** @enum {string} */
                readonly roleType: "FARMER" | "RSK" | "MP";
                /** Format: uuid */
                readonly subjectId: string;
            };
            readonly payloadChecksum: string;
            /** @constant */
            readonly payloadClassification: "C2";
            readonly payloadSchemaVersion: number;
            readonly producerBuild: string;
            readonly producerService: string;
            readonly provenanceTypes: readonly ("SENSOR" | "FARMER_MANUAL" | "RSK_MANUAL" | "LABORATORY" | "SOIL_HEALTH_CARD" | "WEATHER" | "SATELLITE" | "PUBLIC_MARKET" | "DERIVED")[];
            /** @enum {string} */
            readonly purposeCode?: "farmer.self_service" | "case.expert_support" | "field.visit" | "sensor.maintenance" | "assisted.service" | "alert.delivery" | "market.support" | "data.rights";
            readonly retentionClass: string;
            /** Format: uuid */
            readonly roleContextRef?: string;
            /** Format: date-time */
            readonly serverReceivedAt: string;
            readonly traceId?: string;
        } | {
            /** Format: uuid */
            readonly actorRef?: string;
            /** @enum {string} */
            readonly actorType: "FARMER" | "RSK_STAFF" | "MP_STAFF" | "SYSTEM" | "DEVICE" | "PROVIDER";
            /** Format: uuid */
            readonly aggregateId: string;
            readonly aggregateRevision: number;
            readonly aggregateType: string;
            /** Format: uuid */
            readonly causationId?: string;
            /** Format: date-time */
            readonly clientRecordedAt?: string;
            /** Format: date-time */
            readonly committedAt: string;
            readonly consentAccessVersion?: number;
            /** Format: uuid */
            readonly correlationId: string;
            /** @enum {string} */
            readonly dataMode: "LIVE" | "RECORDED" | "SIMULATED";
            /** Format: uuid */
            readonly deviceRef?: string;
            /** Format: uuid */
            readonly eventId: string;
            /** @constant */
            readonly eventName: "identity.role_context_revoked";
            readonly eventOrdinal: number;
            readonly eventVersion: number;
            /** Format: uuid */
            readonly jurisdictionId?: string;
            readonly modeDerivationVersion: string;
            /** Format: date-time */
            readonly occurredAt: string;
            readonly payload: {
                readonly authorizationVersion: number;
                /** @enum {string} */
                readonly reasonCode: "USER_SWITCH" | "LOGOUT" | "GRANT_REVOKED" | "SECURITY_VERSION_CHANGED";
                /** Format: uuid */
                readonly roleContextId: string;
                /** Format: uuid */
                readonly subjectId: string;
            };
            readonly payloadChecksum: string;
            /** @constant */
            readonly payloadClassification: "C2";
            readonly payloadSchemaVersion: number;
            readonly producerBuild: string;
            readonly producerService: string;
            readonly provenanceTypes: readonly ("SENSOR" | "FARMER_MANUAL" | "RSK_MANUAL" | "LABORATORY" | "SOIL_HEALTH_CARD" | "WEATHER" | "SATELLITE" | "PUBLIC_MARKET" | "DERIVED")[];
            /** @enum {string} */
            readonly purposeCode?: "farmer.self_service" | "case.expert_support" | "field.visit" | "sensor.maintenance" | "assisted.service" | "alert.delivery" | "market.support" | "data.rights";
            readonly retentionClass: string;
            /** Format: uuid */
            readonly roleContextRef?: string;
            /** Format: date-time */
            readonly serverReceivedAt: string;
            readonly traceId?: string;
        } | {
            /** Format: uuid */
            readonly actorRef?: string;
            /** @enum {string} */
            readonly actorType: "FARMER" | "RSK_STAFF" | "MP_STAFF" | "SYSTEM" | "DEVICE" | "PROVIDER";
            /** Format: uuid */
            readonly aggregateId: string;
            readonly aggregateRevision: number;
            readonly aggregateType: string;
            /** Format: uuid */
            readonly causationId?: string;
            /** Format: date-time */
            readonly clientRecordedAt?: string;
            /** Format: date-time */
            readonly committedAt: string;
            readonly consentAccessVersion?: number;
            /** Format: uuid */
            readonly correlationId: string;
            /** @enum {string} */
            readonly dataMode: "LIVE" | "RECORDED" | "SIMULATED";
            /** Format: uuid */
            readonly deviceRef?: string;
            /** Format: uuid */
            readonly eventId: string;
            /** @constant */
            readonly eventName: "consent.decision_recorded";
            readonly eventOrdinal: number;
            readonly eventVersion: number;
            /** Format: uuid */
            readonly jurisdictionId?: string;
            readonly modeDerivationVersion: string;
            /** Format: date-time */
            readonly occurredAt: string;
            readonly payload: {
                readonly accessVersion: number;
                /** Format: uuid */
                readonly consentDecisionId: string;
                /** @enum {string} */
                readonly decision: "ALLOW" | "DENY" | "WITHDRAW";
                /** @enum {string} */
                readonly purposeKey: "farmer.self_service" | "case.expert_support" | "field.visit" | "sensor.maintenance" | "assisted.service" | "alert.delivery" | "market.support" | "data.rights";
                /** @enum {string} */
                readonly scopeKey: "location.processing" | "audio.storage" | "case.sharing" | "sensor.collection" | "sensor.maintenance_location" | "visit.access" | "assisted_service.access" | "channel.app_push" | "channel.sms" | "channel.ivr" | "market.private_fields";
                /** Format: uuid */
                readonly subjectId: string;
                /** Format: uuid */
                readonly targetId: string;
                /** @enum {string} */
                readonly targetKind: "ACCOUNT" | "ASSISTED_FARMER_CONTEXT";
            };
            readonly payloadChecksum: string;
            /** @constant */
            readonly payloadClassification: "C2";
            readonly payloadSchemaVersion: number;
            readonly producerBuild: string;
            readonly producerService: string;
            readonly provenanceTypes: readonly ("SENSOR" | "FARMER_MANUAL" | "RSK_MANUAL" | "LABORATORY" | "SOIL_HEALTH_CARD" | "WEATHER" | "SATELLITE" | "PUBLIC_MARKET" | "DERIVED")[];
            /** @enum {string} */
            readonly purposeCode?: "farmer.self_service" | "case.expert_support" | "field.visit" | "sensor.maintenance" | "assisted.service" | "alert.delivery" | "market.support" | "data.rights";
            readonly retentionClass: string;
            /** Format: uuid */
            readonly roleContextRef?: string;
            /** Format: date-time */
            readonly serverReceivedAt: string;
            readonly traceId?: string;
        };
        readonly MilestoneTwoEvent: components["schemas"]["MilestoneOneEvent"] | {
            /** Format: uuid */
            readonly actorRef?: string;
            /** @enum {string} */
            readonly actorType: "FARMER" | "RSK_STAFF" | "MP_STAFF" | "SYSTEM" | "DEVICE" | "PROVIDER";
            /** Format: uuid */
            readonly aggregateId: string;
            readonly aggregateRevision: number;
            readonly aggregateType: string;
            /** Format: uuid */
            readonly causationId?: string;
            /** Format: date-time */
            readonly clientRecordedAt?: string;
            /** Format: date-time */
            readonly committedAt: string;
            readonly consentAccessVersion?: number;
            /** Format: uuid */
            readonly correlationId: string;
            /** @enum {string} */
            readonly dataMode: "LIVE" | "RECORDED" | "SIMULATED";
            /** Format: uuid */
            readonly deviceRef?: string;
            /** Format: uuid */
            readonly eventId: string;
            /** @enum {string} */
            readonly eventName: "sync.batch_started" | "sync.event_accepted" | "sync.event_already_accepted" | "sync.event_rejected" | "sync.conflict_detected" | "sync.conflict_resolved";
            readonly eventOrdinal: number;
            readonly eventVersion: number;
            /** Format: uuid */
            readonly jurisdictionId?: string;
            readonly modeDerivationVersion: string;
            /** Format: date-time */
            readonly occurredAt: string;
            readonly payload: {
                /** Format: uuid */
                readonly batchId?: string;
                /** Format: uuid */
                readonly commandId?: string;
                /** Format: uuid */
                readonly conflictId?: string;
                /** @enum {string} */
                readonly disposition?: "ACCEPTED" | "ALREADY_ACCEPTED" | "REJECTED" | "CONFLICT";
                /** Format: uuid */
                readonly streamId: string;
            };
            readonly payloadChecksum: string;
            /** @constant */
            readonly payloadClassification: "C2";
            readonly payloadSchemaVersion: number;
            readonly producerBuild: string;
            readonly producerService: string;
            readonly provenanceTypes: readonly ("SENSOR" | "FARMER_MANUAL" | "RSK_MANUAL" | "LABORATORY" | "SOIL_HEALTH_CARD" | "WEATHER" | "SATELLITE" | "PUBLIC_MARKET" | "DERIVED")[];
            /** @enum {string} */
            readonly purposeCode?: "farmer.self_service" | "case.expert_support" | "field.visit" | "sensor.maintenance" | "assisted.service" | "alert.delivery" | "market.support" | "data.rights";
            readonly retentionClass: string;
            /** Format: uuid */
            readonly roleContextRef?: string;
            /** Format: date-time */
            readonly serverReceivedAt: string;
            readonly traceId?: string;
        } | {
            /** Format: uuid */
            readonly actorRef?: string;
            /** @enum {string} */
            readonly actorType: "FARMER" | "RSK_STAFF" | "MP_STAFF" | "SYSTEM" | "DEVICE" | "PROVIDER";
            /** Format: uuid */
            readonly aggregateId: string;
            readonly aggregateRevision: number;
            readonly aggregateType: string;
            /** Format: uuid */
            readonly causationId?: string;
            /** Format: date-time */
            readonly clientRecordedAt?: string;
            /** Format: date-time */
            readonly committedAt: string;
            readonly consentAccessVersion?: number;
            /** Format: uuid */
            readonly correlationId: string;
            /** @enum {string} */
            readonly dataMode: "LIVE" | "RECORDED" | "SIMULATED";
            /** Format: uuid */
            readonly deviceRef?: string;
            /** Format: uuid */
            readonly eventId: string;
            /** @constant */
            readonly eventName: "media.upload_verified";
            readonly eventOrdinal: number;
            readonly eventVersion: number;
            /** Format: uuid */
            readonly jurisdictionId?: string;
            readonly modeDerivationVersion: string;
            /** Format: date-time */
            readonly occurredAt: string;
            readonly payload: {
                /** Format: uuid */
                readonly assetId: string;
                readonly derivativeChecksum: string;
                /** Format: uuid */
                readonly derivativeId: string;
                /** @enum {string} */
                readonly purpose: "CROP_HEALTH_IMAGE" | "DIARY_MEDIA" | "RSK_VISIT_EVIDENCE" | "SENSOR_MAINTENANCE_EVIDENCE" | "VOICE_OFFLINE_AUDIO";
                readonly scannerVersion: string;
                readonly sourceChecksum: string;
            };
            readonly payloadChecksum: string;
            /** @constant */
            readonly payloadClassification: "C2";
            readonly payloadSchemaVersion: number;
            readonly producerBuild: string;
            readonly producerService: string;
            readonly provenanceTypes: readonly ("SENSOR" | "FARMER_MANUAL" | "RSK_MANUAL" | "LABORATORY" | "SOIL_HEALTH_CARD" | "WEATHER" | "SATELLITE" | "PUBLIC_MARKET" | "DERIVED")[];
            /** @enum {string} */
            readonly purposeCode?: "farmer.self_service" | "case.expert_support" | "field.visit" | "sensor.maintenance" | "assisted.service" | "alert.delivery" | "market.support" | "data.rights";
            readonly retentionClass: string;
            /** Format: uuid */
            readonly roleContextRef?: string;
            /** Format: date-time */
            readonly serverReceivedAt: string;
            readonly traceId?: string;
        } | {
            /** Format: uuid */
            readonly actorRef?: string;
            /** @enum {string} */
            readonly actorType: "FARMER" | "RSK_STAFF" | "MP_STAFF" | "SYSTEM" | "DEVICE" | "PROVIDER";
            /** Format: uuid */
            readonly aggregateId: string;
            readonly aggregateRevision: number;
            readonly aggregateType: string;
            /** Format: uuid */
            readonly causationId?: string;
            /** Format: date-time */
            readonly clientRecordedAt?: string;
            /** Format: date-time */
            readonly committedAt: string;
            readonly consentAccessVersion?: number;
            /** Format: uuid */
            readonly correlationId: string;
            /** @enum {string} */
            readonly dataMode: "LIVE" | "RECORDED" | "SIMULATED";
            /** Format: uuid */
            readonly deviceRef?: string;
            /** Format: uuid */
            readonly eventId: string;
            /** @enum {string} */
            readonly eventName: "voice.session_started" | "voice.session_ended" | "voice.intent_recognized" | "voice.clarification_requested" | "voice.proposal_created" | "voice.proposal_cancelled" | "voice.proposal_confirmed" | "voice.proposal_corrected" | "voice.proposal_expired" | "voice.proposal_superseded" | "voice.provider_failed" | "voice.offline_audio_attached" | "voice.offline_audio_transcription_started" | "voice.offline_audio_needs_confirmation" | "voice.offline_audio_declined" | "voice.offline_audio_deleted";
            readonly eventOrdinal: number;
            readonly eventVersion: number;
            /** Format: uuid */
            readonly jurisdictionId?: string;
            readonly modeDerivationVersion: string;
            /** Format: date-time */
            readonly occurredAt: string;
            readonly payload: {
                readonly detailCode?: string;
                readonly lifecycleState: string;
                /** Format: uuid */
                readonly offlineAudioRefId?: string;
                readonly payloadHash?: string;
                /** Format: uuid */
                readonly proposalId?: string;
                /** Format: uuid */
                readonly sessionId: string;
            };
            readonly payloadChecksum: string;
            /** @enum {string} */
            readonly payloadClassification: "C2" | "C3";
            readonly payloadSchemaVersion: number;
            readonly producerBuild: string;
            readonly producerService: string;
            readonly provenanceTypes: readonly ("SENSOR" | "FARMER_MANUAL" | "RSK_MANUAL" | "LABORATORY" | "SOIL_HEALTH_CARD" | "WEATHER" | "SATELLITE" | "PUBLIC_MARKET" | "DERIVED")[];
            /** @enum {string} */
            readonly purposeCode?: "farmer.self_service" | "case.expert_support" | "field.visit" | "sensor.maintenance" | "assisted.service" | "alert.delivery" | "market.support" | "data.rights";
            readonly retentionClass: string;
            /** Format: uuid */
            readonly roleContextRef?: string;
            /** Format: date-time */
            readonly serverReceivedAt: string;
            readonly traceId?: string;
        };
        readonly MyFarmResponse: {
            readonly currentCropByPlot: {
                readonly [key: string]: components["schemas"]["CropDeclaration"];
            };
            readonly farms: readonly components["schemas"]["FarmSetup"][];
            /** Format: date-time */
            readonly generatedAt: string;
            readonly setup: components["schemas"]["FarmerSetupSummary"];
            readonly totals: {
                readonly farms: number;
                readonly normalizedAreaSquareMetres: number;
                readonly plots: number;
            };
        };
        readonly PlotGeometrySummary: {
            /** @enum {string} */
            readonly captureMethod: "GPS_POINT" | "MANUAL_MAP" | "VILLAGE_LANDMARK" | "UNKNOWN";
            readonly geometryVersion: number;
            /** @enum {string} */
            readonly gpsPermission: "GRANTED" | "DENIED" | "PROMPT" | "UNKNOWN";
            readonly hasExactServerGeometry: boolean;
            /** @enum {string} */
            readonly kind: "NONE" | "POINT" | "POLYGON" | "VILLAGE_LANDMARK";
            /** Format: date-time */
            readonly recordedAt: string;
        };
        readonly PlotSetup: {
            readonly area: number;
            /** @constant */
            readonly areaConversionVersion: "area-v1";
            /** @enum {string} */
            readonly areaUnit: "SQUARE_METRE" | "HECTARE" | "ACRE" | "GUNTHA";
            /** Format: uuid */
            readonly farmId: string;
            readonly geometry: components["schemas"]["PlotGeometrySummary"];
            /** @enum {string} */
            readonly locationMethod: "GPS_POINT" | "MANUAL_MAP" | "VILLAGE_LANDMARK" | "UNKNOWN";
            readonly name: string;
            readonly normalizedAreaSquareMetres: number;
            /** Format: uuid */
            readonly plotId: string;
            readonly revision: number;
        };
        readonly ProblemDetails: {
            /** @enum {string} */
            readonly code: "AUTHENTICATION_REQUIRED" | "AUTHORIZATION_DENIED" | "MFA_REQUIRED" | "AUTHORIZATION_VERSION_CHANGED" | "CONSENT_OR_ACCESS_VERSION_CHANGED" | "DEVICE_BINDING_MISMATCH" | "IDEMPOTENCY_KEY_REUSED" | "EXPECTED_REVISION_MISMATCH" | "INVALID_STATE_TRANSITION" | "TOMBSTONED_ENTITY" | "SOURCE_VERSION_EXPIRED" | "EVIDENCE_INSUFFICIENT" | "SYNC_CURSOR_INVALID" | "SYNC_CURSOR_EXPIRED" | "SYNC_BOOTSTRAP_REQUIRED" | "SYNC_SCHEMA_UNSUPPORTED" | "SYNC_BATCH_ID_REUSED" | "CAUSAL_DEPENDENCY_UNSATISFIED" | "ASSIGNMENT_CHANGED" | "CLOCK_UNTRUSTED" | "MEDIA_INTEGRITY_MISMATCH" | "MEDIA_NOT_VERIFIED" | "UPLOAD_INTENT_EXPIRED" | "VOICE_PROPOSAL_EXPIRED" | "VOICE_PROPOSAL_HASH_MISMATCH" | "VISUAL_REVIEW_REQUIRED" | "RELEASE_INVALIDATED" | "RELEASE_UNAVAILABLE" | "DEPENDENCY_UNAVAILABLE" | "FILTER_NOT_ALLOWLISTED" | "COMPARISON_NOT_RELEASABLE" | "BATCH_ID_PAYLOAD_MISMATCH" | "RATE_LIMITED" | "SETUP_INCOMPLETE" | "GPS_PERMISSION_DENIED" | "HARDWARE_SKIPPED";
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
        readonly RaigadLocation: {
            /** @constant */
            readonly district: "Raigad";
            readonly landmark?: string;
            readonly taluka: string;
            readonly village: string;
        };
        readonly RecordConsentDecisionCommand: {
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
            readonly operation: "RecordConsentDecision";
            readonly payload: {
                /** @enum {string} */
                readonly decision: "ALLOW" | "DENY" | "WITHDRAW";
                /** Format: date-time */
                readonly expiresAt?: string;
                /** Format: uuid */
                readonly policyVersionId: string;
                /** @enum {string} */
                readonly purposeKey: "farmer.self_service" | "case.expert_support" | "field.visit" | "sensor.maintenance" | "assisted.service" | "alert.delivery" | "market.support" | "data.rights";
                /** @enum {string} */
                readonly scopeKey: "location.processing" | "audio.storage" | "case.sharing" | "sensor.collection" | "sensor.maintenance_location" | "visit.access" | "assisted_service.access" | "channel.app_push" | "channel.sms" | "channel.ivr" | "market.private_fields";
                /** Format: uuid */
                readonly targetId: string;
                /** @enum {string} */
                readonly targetKind: "ACCOUNT" | "ASSISTED_FARMER_CONTEXT";
            };
            readonly target: {
                /** Format: uuid */
                readonly id: string;
                /** @constant */
                readonly type: "consentDecision";
            };
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
        readonly SaveFarmerSetupDraftCommand: {
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
            readonly operation: "SaveFarmerSetupDraft";
            readonly payload: components["schemas"]["SaveFarmerSetupDraftPayload"];
            readonly target: {
                /** Format: uuid */
                readonly id: string;
                /** @constant */
                readonly type: "farmerSetupDraft";
            };
        };
        readonly SaveFarmerSetupDraftPayload: {
            readonly draft: {
                readonly consents: components["schemas"]["SetupConsents"];
                readonly cropHistoryByPlot: {
                    readonly [key: string]: readonly components["schemas"]["CropHistoryRecord"][];
                };
                readonly currentCropByPlot: {
                    readonly [key: string]: components["schemas"]["CropDeclaration"];
                };
                /** @enum {string} */
                readonly deviceMode: "PERSONAL" | "TRUSTED_FAMILY" | "RSK_ASSISTED";
                /** Format: uuid */
                readonly draftId: string;
                readonly farms: readonly components["schemas"]["FarmSetup"][];
                /** @enum {string} */
                readonly hardwareStatus: "SKIPPED" | "NOT_CONFIGURED" | "RSK_SETUP_REQUIRED";
                readonly profile: components["schemas"]["FarmerProfileSetup"];
                readonly soilByPlot: {
                    readonly [key: string]: components["schemas"]["SoilMeasurement"];
                };
                /** @enum {string} */
                readonly status: "NOT_STARTED" | "IN_PROGRESS" | "READY_FOR_REVIEW" | "COMPLETE" | "NEEDS_REVIEW";
                readonly waterByPlot: {
                    readonly [key: string]: components["schemas"]["WaterContext"];
                };
            };
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
        readonly SetupConsents: {
            readonly decisions: readonly {
                /** Format: date-time */
                readonly decidedAt: string;
                /** @enum {string} */
                readonly decision: "ALLOW" | "DENY" | "WITHDRAW";
                /** @enum {string} */
                readonly scopeKey: "location.processing" | "audio.storage" | "case.sharing" | "visit.access" | "assisted_service.access" | "channel.app_push" | "channel.sms" | "channel.ivr";
            }[];
        };
        readonly SoilMeasurement: {
            readonly nitrogen?: number;
            /** Format: date-time */
            readonly observedAt?: string;
            readonly ph?: number;
            readonly phosphorus?: number;
            readonly potassium?: number;
            /** @enum {string} */
            readonly source: "SOIL_HEALTH_CARD" | "LABORATORY" | "FARMER_MANUAL" | "SENSOR" | "UNKNOWN";
            /** @enum {string} */
            readonly unit: "MG_PER_KG" | "KG_PER_HECTARE" | "UNKNOWN";
        };
        readonly SyncBatch: {
            /** Format: uuid */
            readonly batchId: string;
            readonly clientBuild: string;
            readonly commands: readonly components["schemas"]["SyncCommandEnvelope"][];
            readonly cursor: string;
            readonly feedLimit: number;
            /** Format: uuid */
            readonly streamId: string;
            /** @constant */
            readonly syncBatchVersion: 1;
        };
        readonly SyncBatchResponseV2: {
            readonly authorizationVersion: number;
            /** Format: uuid */
            readonly batchId: string;
            readonly dispositions: readonly components["schemas"]["SyncCommandDisposition"][];
            readonly feedEvents: readonly components["schemas"]["SyncFeedEventV2"][];
            readonly hasMore: boolean;
            readonly highWaterMark: string;
            readonly nextCursor: string;
            /** Format: date-time */
            readonly serverTime: string;
        };
        readonly SyncBootstrapRequest: {
            /** @constant */
            readonly bootstrapVersion: 1;
            readonly localDatabaseSchemaVersion: number;
            /** Format: uuid */
            readonly streamId: string;
            readonly supportedProjectionVersions: {
                readonly maximum: number;
                readonly minimum: number;
            };
        };
        readonly SyncBootstrapResponse: {
            readonly authorizationVersion: number;
            readonly cursor: string;
            /** Format: date-time */
            readonly expiresAt: string;
            /** Format: date-time */
            readonly generatedAt: string;
            readonly highWaterMark: string;
            readonly projections: readonly components["schemas"]["SyncProjectionDelta"][];
            readonly snapshotChecksum: string;
            readonly snapshotSchemaVersion: number;
            /** Format: uuid */
            readonly streamId: string;
            readonly tombstones: readonly {
                readonly deletionEpoch: number;
                readonly minimumResurrectionRevision: number;
                /** Format: uuid */
                readonly projectionId: string;
                readonly projectionType: string;
            }[];
        };
        readonly SyncChangeDeviceModeCommandEnvelope: {
            readonly causalCommandIds: readonly string[];
            readonly clientEventIds: readonly string[];
            /** Format: uuid */
            readonly commandId: string;
            /** @constant */
            readonly commandSchemaVersion: 1;
            readonly expectedRevision: number;
            readonly localSequence: number;
            /** Format: date-time */
            readonly occurredAt: string;
            /** @constant */
            readonly operation: "ChangeDeviceMode";
            readonly payload: components["schemas"]["DeviceModeChangePayload"];
            readonly requestHash: string;
            readonly target: {
                /** Format: uuid */
                readonly id: string;
                /** @constant */
                readonly type: "deviceMode";
            };
            readonly timezone: string;
        };
        readonly SyncCommandDisposition: {
            /** Format: uuid */
            readonly acknowledgementId: string;
            readonly authoritativeRevision: number;
            readonly clientEventIds: readonly string[];
            /** Format: uuid */
            readonly commandId: string;
            /** @constant */
            readonly disposition: "ACCEPTED";
            readonly serverEventIds: readonly string[];
            /** Format: date-time */
            readonly serverReceivedAt: string;
        } | {
            /** Format: uuid */
            readonly acknowledgementId: string;
            readonly authoritativeRevision: number;
            readonly clientEventIds: readonly string[];
            /** Format: uuid */
            readonly commandId: string;
            /** @constant */
            readonly disposition: "ALREADY_ACCEPTED";
            readonly serverEventIds: readonly string[];
            /** Format: date-time */
            readonly serverReceivedAt: string;
        } | {
            /** Format: uuid */
            readonly acknowledgementId: string;
            readonly authoritativeRevision?: number;
            readonly clientEventIds: readonly string[];
            /** Format: uuid */
            readonly commandId: string;
            /** @constant */
            readonly disposition: "REJECTED";
            /** @enum {string} */
            readonly problemCode: "AUTHENTICATION_REQUIRED" | "AUTHORIZATION_DENIED" | "MFA_REQUIRED" | "AUTHORIZATION_VERSION_CHANGED" | "CONSENT_OR_ACCESS_VERSION_CHANGED" | "DEVICE_BINDING_MISMATCH" | "IDEMPOTENCY_KEY_REUSED" | "EXPECTED_REVISION_MISMATCH" | "INVALID_STATE_TRANSITION" | "TOMBSTONED_ENTITY" | "SOURCE_VERSION_EXPIRED" | "EVIDENCE_INSUFFICIENT" | "SYNC_CURSOR_INVALID" | "SYNC_CURSOR_EXPIRED" | "SYNC_BOOTSTRAP_REQUIRED" | "SYNC_SCHEMA_UNSUPPORTED" | "SYNC_BATCH_ID_REUSED" | "CAUSAL_DEPENDENCY_UNSATISFIED" | "ASSIGNMENT_CHANGED" | "CLOCK_UNTRUSTED" | "MEDIA_INTEGRITY_MISMATCH" | "MEDIA_NOT_VERIFIED" | "UPLOAD_INTENT_EXPIRED" | "VOICE_PROPOSAL_EXPIRED" | "VOICE_PROPOSAL_HASH_MISMATCH" | "VISUAL_REVIEW_REQUIRED" | "RELEASE_INVALIDATED" | "RELEASE_UNAVAILABLE" | "DEPENDENCY_UNAVAILABLE" | "FILTER_NOT_ALLOWLISTED" | "COMPARISON_NOT_RELEASABLE" | "BATCH_ID_PAYLOAD_MISMATCH" | "RATE_LIMITED" | "SETUP_INCOMPLETE" | "GPS_PERMISSION_DENIED" | "HARDWARE_SKIPPED";
            readonly serverEventIds: readonly string[];
            /** Format: date-time */
            readonly serverReceivedAt: string;
        } | {
            /** Format: uuid */
            readonly acknowledgementId: string;
            readonly authoritativeRevision: number;
            readonly clientEventIds: readonly string[];
            /** Format: uuid */
            readonly commandId: string;
            /** Format: uuid */
            readonly conflictId: string;
            /** @constant */
            readonly disposition: "CONFLICT";
            /** @enum {string} */
            readonly problemCode: "AUTHENTICATION_REQUIRED" | "AUTHORIZATION_DENIED" | "MFA_REQUIRED" | "AUTHORIZATION_VERSION_CHANGED" | "CONSENT_OR_ACCESS_VERSION_CHANGED" | "DEVICE_BINDING_MISMATCH" | "IDEMPOTENCY_KEY_REUSED" | "EXPECTED_REVISION_MISMATCH" | "INVALID_STATE_TRANSITION" | "TOMBSTONED_ENTITY" | "SOURCE_VERSION_EXPIRED" | "EVIDENCE_INSUFFICIENT" | "SYNC_CURSOR_INVALID" | "SYNC_CURSOR_EXPIRED" | "SYNC_BOOTSTRAP_REQUIRED" | "SYNC_SCHEMA_UNSUPPORTED" | "SYNC_BATCH_ID_REUSED" | "CAUSAL_DEPENDENCY_UNSATISFIED" | "ASSIGNMENT_CHANGED" | "CLOCK_UNTRUSTED" | "MEDIA_INTEGRITY_MISMATCH" | "MEDIA_NOT_VERIFIED" | "UPLOAD_INTENT_EXPIRED" | "VOICE_PROPOSAL_EXPIRED" | "VOICE_PROPOSAL_HASH_MISMATCH" | "VISUAL_REVIEW_REQUIRED" | "RELEASE_INVALIDATED" | "RELEASE_UNAVAILABLE" | "DEPENDENCY_UNAVAILABLE" | "FILTER_NOT_ALLOWLISTED" | "COMPARISON_NOT_RELEASABLE" | "BATCH_ID_PAYLOAD_MISMATCH" | "RATE_LIMITED" | "SETUP_INCOMPLETE" | "GPS_PERMISSION_DENIED" | "HARDWARE_SKIPPED";
            readonly serverEventIds: readonly string[];
            /** Format: date-time */
            readonly serverReceivedAt: string;
        };
        readonly SyncCommandEnvelope: components["schemas"]["SyncConsentCommandEnvelope"] | components["schemas"]["SyncSaveFarmerSetupDraftCommandEnvelope"] | components["schemas"]["SyncCompleteFarmerSetupCommandEnvelope"] | components["schemas"]["SyncUpdateFarmerPreferencesCommandEnvelope"] | components["schemas"]["SyncChangeDeviceModeCommandEnvelope"];
        readonly SyncCommandStatusResponse: {
            readonly command: components["schemas"]["SyncCommandDisposition"];
        };
        readonly SyncCompleteFarmerSetupCommandEnvelope: {
            readonly causalCommandIds: readonly string[];
            readonly clientEventIds: readonly string[];
            /** Format: uuid */
            readonly commandId: string;
            /** @constant */
            readonly commandSchemaVersion: 1;
            readonly expectedRevision: number;
            readonly localSequence: number;
            /** Format: date-time */
            readonly occurredAt: string;
            /** @constant */
            readonly operation: "CompleteFarmerSetup";
            readonly payload: components["schemas"]["CompleteFarmerSetupPayload"];
            readonly requestHash: string;
            readonly target: {
                /** Format: uuid */
                readonly id: string;
                /** @constant */
                readonly type: "farmerSetup";
            };
            readonly timezone: string;
        };
        readonly SyncConflict: {
            readonly allowedActions: readonly ("CREATE_NEW_COMMAND" | "KEEP_BOTH_FACTS" | "DISCARD_LOCAL_PROPOSAL")[];
            readonly authoritativeRevision: number;
            readonly authoritativeSummary: {
                readonly [key: string]: components["schemas"]["JsonValue"];
            };
            readonly clientEventIds: readonly string[];
            /** Format: uuid */
            readonly commandId: string;
            /** Format: uuid */
            readonly conflictId: string;
            /** @enum {string} */
            readonly conflictType: "EXPECTED_REVISION_MISMATCH" | "DUPLICATE_LOGICAL_ACTION" | "CONCURRENT_MUTABLE_FIELD" | "TASK_ACTUAL_VS_PLAN_CHANGE" | "CROP_STAGE_DISAGREEMENT" | "TOMBSTONED_ENTITY" | "ASSIGNMENT_CHANGED" | "CONSENT_OR_ACCESS_VERSION_CHANGED" | "CLOCK_UNTRUSTED" | "MEDIA_INTEGRITY_MISMATCH" | "SCHEMA_REQUIRES_MIGRATION";
            /** Format: date-time */
            readonly createdAt: string;
            readonly localRevision: number;
            readonly localSummary: {
                readonly [key: string]: components["schemas"]["JsonValue"];
            };
            readonly revision: number;
            /** @enum {string} */
            readonly state: "OPEN" | "RESOLUTION_PENDING" | "RESOLVED" | "LOCKED_RECOVERY";
            /** Format: uuid */
            readonly targetId: string;
            readonly targetType: string;
        };
        readonly SyncConflictListResponse: {
            readonly conflicts: readonly components["schemas"]["SyncConflict"][];
            readonly nextCursor?: string;
        };
        readonly SyncConflictResolutionRequest: {
            /** @enum {string} */
            readonly action: "CREATE_NEW_COMMAND" | "KEEP_BOTH_FACTS" | "DISCARD_LOCAL_PROPOSAL";
            /** Format: uuid */
            readonly conflictId: string;
            readonly expectedConflictRevision: number;
            readonly payloadHash: string;
            /** Format: uuid */
            readonly resolutionCommandId: string;
            /** @constant */
            readonly resolutionSchemaVersion: 1;
        };
        readonly SyncConsentCommandEnvelope: {
            readonly causalCommandIds: readonly string[];
            readonly clientEventIds: readonly string[];
            /** Format: uuid */
            readonly commandId: string;
            /** @constant */
            readonly commandSchemaVersion: 1;
            readonly expectedRevision: number;
            readonly localSequence: number;
            /** Format: date-time */
            readonly occurredAt: string;
            /** @constant */
            readonly operation: "RecordConsentDecision";
            readonly payload: {
                /** @enum {string} */
                readonly decision: "ALLOW" | "DENY" | "WITHDRAW";
                /** Format: date-time */
                readonly expiresAt?: string;
                /** Format: uuid */
                readonly policyVersionId: string;
                /** @enum {string} */
                readonly purposeKey: "farmer.self_service" | "case.expert_support" | "field.visit" | "sensor.maintenance" | "assisted.service" | "alert.delivery" | "market.support" | "data.rights";
                /** @enum {string} */
                readonly scopeKey: "location.processing" | "audio.storage" | "case.sharing" | "sensor.collection" | "sensor.maintenance_location" | "visit.access" | "assisted_service.access" | "channel.app_push" | "channel.sms" | "channel.ivr" | "market.private_fields";
                /** Format: uuid */
                readonly targetId: string;
                /** @enum {string} */
                readonly targetKind: "ACCOUNT" | "ASSISTED_FARMER_CONTEXT";
            };
            readonly requestHash: string;
            readonly target: {
                /** Format: uuid */
                readonly id: string;
                /** @constant */
                readonly type: "consentDecision";
            };
            readonly timezone: string;
        };
        readonly SyncFeedEventV2: {
            /** Format: uuid */
            readonly feedEventId: string;
            readonly integrationEvent: components["schemas"]["MilestoneTwoEvent"];
            readonly projectionDeltas: readonly components["schemas"]["SyncProjectionDelta"][];
            readonly sequence: number;
        };
        readonly SyncFeedPageResponseV2: {
            readonly authorizationVersion: number;
            readonly feedEvents: readonly components["schemas"]["SyncFeedEventV2"][];
            readonly hasMore: boolean;
            readonly highWaterMark: string;
            readonly nextCursor: string;
            /** Format: date-time */
            readonly serverTime: string;
        };
        readonly SyncProjectionDelta: {
            readonly authoritativeRevision: number;
            /** @enum {string} */
            readonly changeType: "UPSERT" | "TOMBSTONE";
            /** @enum {string} */
            readonly dataMode: "LIVE" | "RECORDED" | "SIMULATED";
            readonly payload: {
                readonly [key: string]: components["schemas"]["JsonValue"];
            };
            readonly payloadChecksum: string;
            /** @enum {string} */
            readonly payloadClassification: "C0" | "C1" | "C2" | "C3";
            /** Format: uuid */
            readonly projectionId: string;
            readonly projectionSchemaVersion: number;
            readonly projectionType: string;
        };
        readonly SyncSaveFarmerSetupDraftCommandEnvelope: {
            readonly causalCommandIds: readonly string[];
            readonly clientEventIds: readonly string[];
            /** Format: uuid */
            readonly commandId: string;
            /** @constant */
            readonly commandSchemaVersion: 1;
            readonly expectedRevision: number;
            readonly localSequence: number;
            /** Format: date-time */
            readonly occurredAt: string;
            /** @constant */
            readonly operation: "SaveFarmerSetupDraft";
            readonly payload: components["schemas"]["SaveFarmerSetupDraftPayload"];
            readonly requestHash: string;
            readonly target: {
                /** Format: uuid */
                readonly id: string;
                /** @constant */
                readonly type: "farmerSetupDraft";
            };
            readonly timezone: string;
        };
        readonly SyncStreamOpenRequest: {
            readonly clientBuild: string;
            readonly clientEventVersions: {
                readonly maximum: number;
                readonly minimum: number;
            };
            readonly commandVersions: {
                readonly maximum: number;
                readonly minimum: number;
            };
            readonly deviceMode: components["schemas"]["DeviceMode"];
            readonly localDatabaseSchemaVersion: number;
            readonly mediaVersions: {
                readonly maximum: number;
                readonly minimum: number;
            };
            readonly priorCursor?: string;
            /** Format: uuid */
            readonly priorStreamId?: string;
            readonly projectionVersions: {
                readonly maximum: number;
                readonly minimum: number;
            };
            /** @constant */
            readonly stakeholder?: "FARMER";
            /** @constant */
            readonly streamProtocolVersion: 1;
        };
        readonly SyncStreamOpenResponse: {
            readonly acceptedClientEventVersions: {
                readonly maximum: number;
                readonly minimum: number;
            };
            readonly acceptedCommandVersions: {
                readonly maximum: number;
                readonly minimum: number;
            };
            readonly acceptedMediaVersions: {
                readonly maximum: number;
                readonly minimum: number;
            };
            readonly acceptedProjectionVersions: {
                readonly maximum: number;
                readonly minimum: number;
            };
            readonly authorizationVersion: number;
            readonly bootstrapRequired: boolean;
            readonly cursor: string;
            readonly maximumBatchBytes: number;
            readonly maximumBatchCommands: number;
            /** @constant */
            readonly scope: "FARMER_SELF_SERVICE";
            /** Format: date-time */
            readonly serverTime: string;
            readonly serverTimeSignature: string;
            /** @constant */
            readonly stakeholder: "FARMER";
            /** Format: uuid */
            readonly streamId: string;
            /** Format: uuid */
            readonly subjectDeviceBindingId: string;
        };
        readonly SyncUpdateFarmerPreferencesCommandEnvelope: {
            readonly causalCommandIds: readonly string[];
            readonly clientEventIds: readonly string[];
            /** Format: uuid */
            readonly commandId: string;
            /** @constant */
            readonly commandSchemaVersion: 1;
            readonly expectedRevision: number;
            readonly localSequence: number;
            /** Format: date-time */
            readonly occurredAt: string;
            /** @constant */
            readonly operation: "UpdateFarmerPreferences";
            readonly payload: components["schemas"]["UpdateFarmerPreferencesPayload"];
            readonly requestHash: string;
            readonly target: {
                /** Format: uuid */
                readonly id: string;
                /** @constant */
                readonly type: "farmerPreferences";
            };
            readonly timezone: string;
        };
        readonly UpdateFarmerPreferencesCommand: {
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
            readonly operation: "UpdateFarmerPreferences";
            readonly payload: components["schemas"]["UpdateFarmerPreferencesPayload"];
            readonly target: {
                /** Format: uuid */
                readonly id: string;
                /** @constant */
                readonly type: "farmerPreferences";
            };
        };
        readonly UpdateFarmerPreferencesPayload: {
            /** @enum {string} */
            readonly preferredLocale: "mr-IN" | "hi-IN" | "en-IN";
            /** @constant */
            readonly timezone: "Asia/Kolkata";
            readonly voicePrompts: boolean;
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
            readonly serverSequence: number;
            /** Format: uuid */
            readonly sessionId: string;
            /** @enum {string} */
            readonly state: "HELP" | "UNAVAILABLE" | "NEEDS_CLARIFICATION" | "PROPOSAL_PENDING";
            /** Format: uuid */
            readonly turnId: string;
        };
        readonly WaterContext: {
            /** @enum {string} */
            readonly availability: "HIGH" | "MEDIUM" | "LOW" | "SEASONAL" | "UNKNOWN";
            readonly rainfed: boolean;
            /** @enum {string} */
            readonly reliability: "RELIABLE" | "SOMETIMES" | "UNRELIABLE" | "UNKNOWN";
            readonly sources: readonly ("RAIN_FED" | "WELL" | "BOREWELL" | "CANAL" | "POND" | "TANKER" | "OTHER" | "UNKNOWN")[];
            /** @enum {string} */
            readonly storage: "NONE" | "SMALL_TANK" | "FARM_POND" | "OTHER" | "UNKNOWN";
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
    readonly getFarmerBootstrap: {
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
                    readonly "application/json": components["schemas"]["FarmerBootstrapResponse"];
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
    readonly recordConsentDecision: {
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
                readonly "application/json": components["schemas"]["RecordConsentDecisionCommand"];
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
    readonly listFarmerConsents: {
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
                    readonly "application/json": components["schemas"]["ConsentListResponse"];
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
    readonly changeFarmerDeviceMode: {
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
                readonly "application/json": components["schemas"]["ChangeDeviceModeCommand"];
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
    readonly listFarmerFarms: {
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
                    readonly "application/json": components["schemas"]["MyFarmResponse"];
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
    readonly createFarmerFarm: {
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
                readonly "application/json": components["schemas"]["SaveFarmerSetupDraftCommand"];
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
    readonly getFarmerFarm: {
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
                readonly farmId: string;
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
                    readonly "application/json": components["schemas"]["FarmSetup"];
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
    readonly updateFarmerFarm: {
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
            readonly path: {
                readonly farmId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody: {
            readonly content: {
                readonly "application/json": components["schemas"]["SaveFarmerSetupDraftCommand"];
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
    readonly createFarmerPlot: {
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
            readonly path: {
                readonly farmId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody: {
            readonly content: {
                readonly "application/json": components["schemas"]["SaveFarmerSetupDraftCommand"];
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
    readonly getMyFarm: {
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
                    readonly "application/json": components["schemas"]["MyFarmResponse"];
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
    readonly getFarmerPlot: {
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
                readonly plotId: string;
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
                    readonly "application/json": components["schemas"]["FarmSetup"];
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
    readonly updateFarmerPlot: {
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
            readonly path: {
                readonly plotId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody: {
            readonly content: {
                readonly "application/json": components["schemas"]["SaveFarmerSetupDraftCommand"];
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
    readonly createFarmerPlotGeometryVersion: {
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
            readonly path: {
                readonly plotId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody: {
            readonly content: {
                readonly "application/json": components["schemas"]["SaveFarmerSetupDraftCommand"];
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
    readonly updateFarmerPreferences: {
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
                readonly "application/json": components["schemas"]["UpdateFarmerPreferencesCommand"];
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
    readonly saveFarmerSetupDraft: {
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
                readonly "application/json": components["schemas"]["SaveFarmerSetupDraftCommand"];
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
    readonly completeFarmerSetup: {
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
                readonly "application/json": components["schemas"]["CompleteFarmerSetupCommand"];
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
    readonly syncFarmerBatch: {
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
                readonly "application/json": components["schemas"]["SyncBatch"];
            };
        };
        readonly responses: {
            /** @description Successful response */
            readonly 200: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["SyncBatchResponseV2"];
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
            readonly 415: {
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
    readonly bootstrapFarmerSync: {
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
                readonly "application/json": components["schemas"]["SyncBootstrapRequest"];
            };
        };
        readonly responses: {
            /** @description Successful response */
            readonly 200: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["SyncBootstrapResponse"];
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
            readonly 415: {
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
    readonly getFarmerSyncCommand: {
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
                    readonly "application/json": components["schemas"]["SyncCommandStatusResponse"];
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
    readonly listFarmerSyncConflicts: {
        readonly parameters: {
            readonly query?: {
                /** @description Opaque cursor for the next authorized conflict page */
                readonly cursor?: string;
                /** @description Maximum number of conflicts to return */
                readonly limit?: number;
            };
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
                    readonly "application/json": components["schemas"]["SyncConflictListResponse"];
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
    readonly getFarmerSyncConflict: {
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
                readonly conflictId: string;
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
                    readonly "application/json": components["schemas"]["SyncConflict"];
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
    readonly resolveFarmerSyncConflict: {
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
                readonly conflictId: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody: {
            readonly content: {
                readonly "application/json": components["schemas"]["SyncConflictResolutionRequest"];
            };
        };
        readonly responses: {
            /** @description Successful response */
            readonly 200: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["SyncCommandStatusResponse"];
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
    readonly getFarmerSyncFeed: {
        readonly parameters: {
            readonly query: {
                /** @description Opaque cursor bound to the current stream and authorization */
                readonly cursor: string;
                /** @description Maximum number of feed items to return */
                readonly limit?: number;
                /** @description Current Farmer sync stream identifier */
                readonly streamId: string;
            };
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
                    readonly "application/json": components["schemas"]["SyncFeedPageResponseV2"];
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
            readonly 410: {
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
    readonly openFarmerSyncStream: {
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
                readonly "application/json": components["schemas"]["SyncStreamOpenRequest"];
            };
        };
        readonly responses: {
            /** @description Successful response */
            readonly 200: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["SyncStreamOpenResponse"];
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
            readonly 415: {
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
