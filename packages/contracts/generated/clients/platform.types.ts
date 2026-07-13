// Generated from platform.openapi.json. Do not edit by hand.
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
    readonly "/v1/mp/query-context": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly get: operations["getMpQueryContext"];
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
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        readonly AuthorizationContext: {
            readonly authorizationVersion: number;
            readonly capabilities: readonly ("case.response.draft" | "case.care_plan.issue" | "case.severe.resolve" | "advisory.review.decide" | "alert.draft" | "alert.approve" | "alert.publish" | "alert.delivery.monitor" | "alert.delivery.operate" | "sensor.agronomic_invalidate" | "template.draft" | "template.approve" | "template.publish" | "calendar.review" | "market.support" | "market.mapping.review" | "market.mapping.approve" | "assisted_session.operate" | "visit.manage" | "visit.execute.field" | "visit.execute.sensor" | "visit.outcome.review" | "audit.investigate_sensitive" | "rsk.work.read" | "rsk.work.operate" | "rsk.work.assign" | "rsk.protected_search" | "rsk.access_grant.issue" | "rsk.protected_disclose" | "case.read" | "case.evidence.request" | "case.follow_up.record" | "case.resolve.routine" | "advisory.review.read" | "outreach.operate" | "sensor.issue.operate" | "sensor.install" | "sensor.calibration.record" | "sensor.maintenance.execute" | "template.read" | "alert.read" | "identity.role_context.select" | "profile.correct" | "device_mode.change")[];
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
        readonly Command: components["schemas"]["SelectRoleContextCommand"] | components["schemas"]["RecordConsentDecisionCommand"] | components["schemas"]["IssueAccessGrantCommand"];
        readonly CommandEnvelope: components["schemas"]["SelectRoleContextCommand"] | components["schemas"]["RecordConsentDecisionCommand"] | components["schemas"]["IssueAccessGrantCommand"];
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
                readonly type: "roleContext" | "consentDecision" | "accessGrant";
            };
            /** Format: date-time */
            readonly serverReceivedAt: string;
            /** Format: uuid */
            readonly syncAcknowledgementId?: string;
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
        readonly DeviceBatchReceipt: {
            /** Format: uuid */
            readonly batchId: string;
            /** @constant */
            readonly explicitlyNotAgronomicTrust: true;
            /** Format: date-time */
            readonly receivedAt: string;
            /** @enum {string} */
            readonly state: "DURABLY_ACCEPTED" | "ALREADY_ACCEPTED" | "REJECTED";
        };
        readonly EventEnvelope: {
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
            readonly eventName: "farmer.setup_saved_local" | "farmer.setup_saved" | "farmer.preferences_changed" | "farmer.setup_completed" | "identity.role_context_created" | "identity.role_context_revoked" | "identity.device_mode_changed" | "consent.decision_recorded" | "farm.created" | "farm.updated" | "plot.created" | "plot.updated" | "soil_record.added" | "water_context.updated" | "farm.crop_history_recorded" | "profile.snapshot_created" | "season.created" | "season.start_confirmed" | "season.activated" | "harvest.window_confirmed" | "harvest.readiness_updated" | "harvest.actual_recorded" | "today.briefing_generated" | "today.briefing_played" | "today.primary_action_selected" | "today.card_opened" | "evidence.validated" | "evidence.snapshot_created" | "evidence.snapshot_finalized" | "evidence.snapshot_invalidated" | "evidence.freshness_changed" | "recommendation.requested" | "recommendation.input_rejected" | "recommendation.generated" | "recommendation.no_safe_result" | "recommendation.review_requested" | "recommendation.accepted" | "recommendation.superseded" | "decision.impact_review_requested" | "decision.impact_review_completed" | "dry_spell.evaluated" | "advisory.evaluated" | "advisory.no_action" | "advisory.review_requested" | "advisory.review_claimed" | "advisory.consent_checked" | "advisory.evidence_accessed" | "advisory.review_decided" | "advisory.issued" | "advisory.publication_started" | "advisory.publication_failed" | "advisory.publication_retried" | "advisory.publication_blocked" | "advisory.published" | "advisory.recalculated" | "advisory.replaced" | "advisory.cancelled" | "advisory.disputed" | "farmer.response_recorded" | "constraint.recorded" | "template.version_created" | "template.submitted" | "template.reviewed" | "template.approved" | "template.changes_requested" | "template.activation_started" | "template.activation_failed" | "template.published" | "template.expired" | "template.retired" | "template.rolled_back" | "calendar.instantiated" | "calendar.task_created" | "calendar.task_changed" | "calendar.task_replaced" | "calendar.task_completed" | "calendar.task_partially_completed" | "calendar.task_blocked" | "calendar.task_cancelled" | "calendar.reminder_scheduled_local" | "calendar.reminder_requested" | "calendar.review_created" | "calendar.review_claimed" | "calendar.review_evidence_requested" | "calendar.review_decided" | "calendar.change_application_started" | "calendar.change_application_failed" | "calendar.change_applied" | "diary.entry_saved_local" | "diary.activity_recorded" | "diary.observation_recorded" | "diary.entry_corrected" | "diary.entry_voided" | "sync.batch_started" | "sync.event_accepted" | "sync.event_already_accepted" | "sync.event_rejected" | "sync.conflict_detected" | "sync.conflict_resolved" | "media.upload_verified" | "diary.media_attached" | "health_media.attached" | "visit.media_attached" | "data.export_requested" | "data.export_retrieved" | "data.export_cancelled" | "data.export_preparation_started" | "data.export_ready" | "data.export_failed" | "data.export_expired" | "data.export_artifact_deleted" | "data.deletion_requested" | "data.deletion_completed" | "data.deletion_started" | "data.deletion_item_completed" | "data.deletion_item_failed" | "data.deletion_ledger_committed" | "data.restore_ledger_verified" | "data.tombstone_created" | "health_report.saved" | "health_media.queued" | "health_report.synced" | "health_report.triage_ready" | "triage.completed" | "triage.escalated" | "triage.escalation_sharing_declined" | "case.created" | "case.contact_access_authorized" | "case.evidence_accessed" | "case.evidence_requested" | "case.care_plan_issued" | "case.visit_scheduled" | "case.follow_up_recorded" | "case.resolved" | "case.closed" | "case.reopened" | "rsk.work_created" | "rsk.work_assigned" | "rsk.work_claimed" | "rsk.work_started" | "rsk.work_resumed" | "rsk.work_waiting" | "rsk.work_scheduled" | "rsk.work_resolved" | "rsk.work_reopened" | "rsk.work_cancelled" | "rsk.work_marked_duplicate" | "outreach.created" | "outreach.assigned" | "outreach.claimed" | "outreach.contact_access_checked" | "outreach.contact_revealed" | "outreach.attempted" | "outreach.response_recorded" | "outreach.follow_up_scheduled" | "outreach.resolved" | "contact.correction_requested" | "alert.delivery_incident_created" | "alert.delivery_incident_triaged" | "alert.delivery_mitigation_started" | "alert.delivery_incident_resolved" | "alert.delivery_incident_reopened" | "alert.delivery_exception_resolved" | "alert.retry_requested" | "alert.alternate_channel_selected" | "alert.provider_noncritical_pause_started" | "assisted.search_attempted" | "assisted.protected_data_accessed" | "assisted.farmer_verified" | "assisted.consent_checked" | "assisted.session_started" | "assisted.session_revoked" | "assisted.mutation_confirmed" | "assisted.receipt_issued" | "assisted.client_data_purged" | "assisted.recovery_locked" | "visit.requested" | "visit.approved" | "visit.scheduled" | "visit.assigned" | "visit.accepted" | "visit.cancelled" | "visit.consent_checked" | "visit.location_accessed" | "visit.pack_issued" | "visit.started" | "visit.observation_recorded" | "visit.farmer_response_recorded" | "visit.saved_offline" | "visit.synced" | "visit.completed" | "visit.outcome_reviewed" | "visit.closed" | "visit.access_revoked" | "visit.client_data_purged" | "sensor.consent_recorded" | "sensor.consent_withdrawn" | "sensor.collection_stopped" | "sensor.location_access_revoked" | "sensor.deassigned" | "sensor.removal_requested" | "sensor.installed" | "sensor.activated" | "sensor.device_registered" | "sensor.calibration_recorded" | "sensor.maintenance_requested" | "sensor.batch_rejected" | "sensor.batch_durably_accepted" | "sensor.observation_received" | "sensor.observation_normalized" | "sensor.trust_interval_created" | "sensor.interval_flagged" | "sensor.issue_created" | "sensor.issue_triaged" | "sensor.issue_mitigation_recorded" | "sensor.issue_resolved" | "sensor.issue_reopened" | "sensor.location_accessed" | "sensor.interval_invalidated" | "sensor.advice_impact_reviewed" | "sensor.maintenance_saved_offline" | "sensor.maintenance_started" | "sensor.maintenance_observation_recorded" | "sensor.maintenance_validation_started" | "sensor.maintenance_completed" | "sensor.maintenance_closed" | "sensor.returned_to_service" | "sensor.maintenance_media_attached" | "sensor.credential_revoked" | "alert.draft_created" | "alert.draft_submitted" | "alert.draft_approved" | "alert.changes_requested" | "alert.draft_rejected" | "alert.draft_expired" | "alert.draft_cancelled" | "alert.publication_started" | "alert.publication_failed" | "alert.draft_published" | "alert.version_created" | "alert.cohort_frozen" | "alert.attempt_queued" | "alert.provider_accepted" | "alert.delivered" | "alert.delivery_failed" | "alert.delivery_unknown" | "alert.attempt_expired" | "alert.recipient_reached" | "alert.opened_or_heard" | "alert.acknowledged" | "alert.response_recorded" | "alert.expired" | "alert.replaced" | "alert.corrected" | "alert.cancelled" | "alert.push_registration_created" | "alert.push_registration_rotated" | "alert.push_registration_revoked" | "market.raw_record_archived" | "market.mapping_requested" | "market.mapping_claimed" | "market.mapping_decided" | "market.mapping_approved" | "market.mapping_rejected" | "market.mapping_superseded" | "market.mapping_rollback_started" | "market.mapping_rolled_back" | "market.reprocessing_started" | "market.reprocessing_completed" | "market.reprocessing_failed" | "market.comparison_replaced" | "market.watch_created" | "market.watch_updated" | "market.watch_paused" | "market.watch_resumed" | "market.watch_completed" | "market.watch_expired" | "market.watch_cancelled" | "market.watch_triggered" | "market.watch_cooldown_started" | "market.watch_rearmed" | "market.support_created" | "market.support_claimed" | "market.support_information_requested" | "market.support_response_issued" | "market.support_follow_up_recorded" | "market.support_resolved" | "market.support_closed" | "market.sale_recorded" | "voice.session_started" | "voice.session_ended" | "voice.intent_recognized" | "voice.clarification_requested" | "voice.proposal_created" | "voice.proposal_cancelled" | "voice.proposal_confirmed" | "voice.proposal_corrected" | "voice.proposal_expired" | "voice.proposal_superseded" | "voice.provider_failed" | "voice.offline_audio_attached" | "voice.offline_audio_transcription_started" | "voice.offline_audio_needs_confirmation" | "voice.offline_audio_declined" | "voice.offline_audio_deleted" | "ai.invocation_started" | "ai.invocation_completed" | "ai.invocation_failed" | "ai.output_validation_failed" | "ai.extraction_accepted" | "ai.extraction_rejected" | "ai.explanation_published" | "model.kill_switch_activated" | "model.alias_rolled_back" | "external.import_started" | "external.import_completed" | "external.import_failed" | "external.raw_artifact_deleted" | "weather.forecast_edition_ingested" | "weather.forecast_edition_expired" | "weather.freshness_changed" | "weather.warning_version_ingested" | "weather.warning_corrected" | "weather.warning_cancelled" | "earth.job_requested" | "earth.job_started" | "earth.job_completed" | "earth.job_failed" | "earth.job_cancelled" | "earth.snapshot_created" | "earth.snapshot_expired" | "earth.snapshot_invalidated" | "earth.location_consent_blocked" | "analytics.candidate_recorded" | "analytics.candidate_corrected" | "analytics.candidate_withdrawn" | "analytics.safe_fact_recorded" | "analytics.safe_fact_corrected" | "analytics.safe_fact_retracted" | "privacy.release_started" | "privacy.release_validated" | "privacy.release_failed" | "privacy.release_signed" | "privacy.release_activated" | "privacy.release_invalidated" | "privacy.release_expired" | "privacy.cell_suppressed" | "mp.aggregate_query_completed" | "mp.aggregate_query_refused" | "mp.safe_rollup_returned" | "mp.briefing_generation_requested" | "mp.briefing_generation_failed" | "mp.briefing_export_requested" | "mp.briefing_draft_created" | "mp.briefing_snapshot_saved" | "mp.briefing_exported" | "mp.briefing_export_refused";
            readonly eventOrdinal: number;
            readonly eventVersion: number;
            /** Format: uuid */
            readonly jurisdictionId?: string;
            readonly modeDerivationVersion: string;
            /** Format: date-time */
            readonly occurredAt: string;
            readonly payload: {
                readonly [key: string]: components["schemas"]["JsonValue"];
            };
            readonly payloadChecksum: string;
            /** @enum {string} */
            readonly payloadClassification: "C0" | "C1" | "C2" | "C3" | "C4" | "P1";
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
        readonly FarmerBootstrapResponse: {
            readonly authorizationVersion: number;
            readonly capabilities: readonly ("case.response.draft" | "case.care_plan.issue" | "case.severe.resolve" | "advisory.review.decide" | "alert.draft" | "alert.approve" | "alert.publish" | "alert.delivery.monitor" | "alert.delivery.operate" | "sensor.agronomic_invalidate" | "template.draft" | "template.approve" | "template.publish" | "calendar.review" | "market.support" | "market.mapping.review" | "market.mapping.approve" | "assisted_session.operate" | "visit.manage" | "visit.execute.field" | "visit.execute.sensor" | "visit.outcome.review" | "audit.investigate_sensitive" | "rsk.work.read" | "rsk.work.operate" | "rsk.work.assign" | "rsk.protected_search" | "rsk.access_grant.issue" | "rsk.protected_disclose" | "case.read" | "case.evidence.request" | "case.follow_up.record" | "case.resolve.routine" | "advisory.review.read" | "outreach.operate" | "sensor.issue.operate" | "sensor.install" | "sensor.calibration.record" | "sensor.maintenance.execute" | "template.read" | "alert.read" | "identity.role_context.select" | "profile.correct" | "device_mode.change")[];
            /** @constant */
            readonly farmContextState: "UNAVAILABLE_UNTIL_SETUP";
            /** @enum {string} */
            readonly locale: "mr" | "hi" | "en";
            /** @enum {string} */
            readonly onboardingState: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETE";
            /** Format: uuid */
            readonly subjectId: string;
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
        readonly MpQueryContextResponse: {
            readonly activeRelease: null;
            readonly availableMetricKeys: readonly unknown[];
            /** @constant */
            readonly code: "DEPENDENCY_UNAVAILABLE";
            /** @constant */
            readonly state: "UNAVAILABLE";
        };
        readonly MpSafeResult: components["schemas"]["MpUnavailableResult"] | components["schemas"]["MpSuppressedResult"];
        readonly MpSuppressedResult: {
            readonly methodologyId: string;
            /** @enum {string} */
            readonly reasonCode: "COHORT_TOO_SMALL" | "COMPLEMENTARY_SUPPRESSION" | "STICKY_SUPPRESSION";
            /** @constant */
            readonly status: "SUPPRESSED";
        };
        readonly MpUnavailableResult: {
            /** @enum {string} */
            readonly reasonCode: "NO_ACTIVE_RELEASE" | "RELEASE_INVALID" | "RELEASE_STALE";
            /** @constant */
            readonly status: "UNAVAILABLE";
        };
        readonly ProblemDetails: {
            /** @enum {string} */
            readonly code: "AUTHENTICATION_REQUIRED" | "AUTHORIZATION_DENIED" | "MFA_REQUIRED" | "AUTHORIZATION_VERSION_CHANGED" | "CONSENT_OR_ACCESS_VERSION_CHANGED" | "DEVICE_BINDING_MISMATCH" | "IDEMPOTENCY_KEY_REUSED" | "EXPECTED_REVISION_MISMATCH" | "INVALID_STATE_TRANSITION" | "TOMBSTONED_ENTITY" | "SOURCE_VERSION_EXPIRED" | "EVIDENCE_INSUFFICIENT" | "SYNC_CURSOR_INVALID" | "SYNC_CURSOR_EXPIRED" | "SYNC_BOOTSTRAP_REQUIRED" | "SYNC_SCHEMA_UNSUPPORTED" | "SYNC_BATCH_ID_REUSED" | "CAUSAL_DEPENDENCY_UNSATISFIED" | "ASSIGNMENT_CHANGED" | "CLOCK_UNTRUSTED" | "MEDIA_INTEGRITY_MISMATCH" | "MEDIA_NOT_VERIFIED" | "UPLOAD_INTENT_EXPIRED" | "VOICE_PROPOSAL_EXPIRED" | "VOICE_PROPOSAL_HASH_MISMATCH" | "VISUAL_REVIEW_REQUIRED" | "RELEASE_INVALIDATED" | "RELEASE_UNAVAILABLE" | "DEPENDENCY_UNAVAILABLE" | "FILTER_NOT_ALLOWLISTED" | "COMPARISON_NOT_RELEASABLE" | "BATCH_ID_PAYLOAD_MISMATCH" | "RATE_LIMITED";
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
        readonly RoleContextResponse: {
            /** Format: date-time */
            readonly expiresAt: string;
            /** Format: date-time */
            readonly issuedAt: string;
            readonly roleContext: components["schemas"]["AuthorizationContext"];
        };
        readonly RskBootstrapResponse: {
            readonly authorizationVersion: number;
            readonly capabilities: readonly ("case.response.draft" | "case.care_plan.issue" | "case.severe.resolve" | "advisory.review.decide" | "alert.draft" | "alert.approve" | "alert.publish" | "alert.delivery.monitor" | "alert.delivery.operate" | "sensor.agronomic_invalidate" | "template.draft" | "template.approve" | "template.publish" | "calendar.review" | "market.support" | "market.mapping.review" | "market.mapping.approve" | "assisted_session.operate" | "visit.manage" | "visit.execute.field" | "visit.execute.sensor" | "visit.outcome.review" | "audit.investigate_sensitive" | "rsk.work.read" | "rsk.work.operate" | "rsk.work.assign" | "rsk.protected_search" | "rsk.access_grant.issue" | "rsk.protected_disclose" | "case.read" | "case.evidence.request" | "case.follow_up.record" | "case.resolve.routine" | "advisory.review.read" | "outreach.operate" | "sensor.issue.operate" | "sensor.install" | "sensor.calibration.record" | "sensor.maintenance.execute" | "template.read" | "alert.read" | "identity.role_context.select" | "profile.correct" | "device_mode.change")[];
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
        readonly SyncBatchResponse: {
            readonly authorizationVersion: number;
            /** Format: uuid */
            readonly batchId: string;
            readonly dispositions: readonly components["schemas"]["SyncCommandDisposition"][];
            readonly feedEvents: readonly components["schemas"]["SyncFeedEvent"][];
            readonly hasMore: boolean;
            readonly highWaterMark: string;
            readonly nextCursor: string;
            /** Format: date-time */
            readonly serverTime: string;
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
            readonly problemCode: "AUTHENTICATION_REQUIRED" | "AUTHORIZATION_DENIED" | "MFA_REQUIRED" | "AUTHORIZATION_VERSION_CHANGED" | "CONSENT_OR_ACCESS_VERSION_CHANGED" | "DEVICE_BINDING_MISMATCH" | "IDEMPOTENCY_KEY_REUSED" | "EXPECTED_REVISION_MISMATCH" | "INVALID_STATE_TRANSITION" | "TOMBSTONED_ENTITY" | "SOURCE_VERSION_EXPIRED" | "EVIDENCE_INSUFFICIENT" | "SYNC_CURSOR_INVALID" | "SYNC_CURSOR_EXPIRED" | "SYNC_BOOTSTRAP_REQUIRED" | "SYNC_SCHEMA_UNSUPPORTED" | "SYNC_BATCH_ID_REUSED" | "CAUSAL_DEPENDENCY_UNSATISFIED" | "ASSIGNMENT_CHANGED" | "CLOCK_UNTRUSTED" | "MEDIA_INTEGRITY_MISMATCH" | "MEDIA_NOT_VERIFIED" | "UPLOAD_INTENT_EXPIRED" | "VOICE_PROPOSAL_EXPIRED" | "VOICE_PROPOSAL_HASH_MISMATCH" | "VISUAL_REVIEW_REQUIRED" | "RELEASE_INVALIDATED" | "RELEASE_UNAVAILABLE" | "DEPENDENCY_UNAVAILABLE" | "FILTER_NOT_ALLOWLISTED" | "COMPARISON_NOT_RELEASABLE" | "BATCH_ID_PAYLOAD_MISMATCH" | "RATE_LIMITED";
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
            readonly problemCode: "AUTHENTICATION_REQUIRED" | "AUTHORIZATION_DENIED" | "MFA_REQUIRED" | "AUTHORIZATION_VERSION_CHANGED" | "CONSENT_OR_ACCESS_VERSION_CHANGED" | "DEVICE_BINDING_MISMATCH" | "IDEMPOTENCY_KEY_REUSED" | "EXPECTED_REVISION_MISMATCH" | "INVALID_STATE_TRANSITION" | "TOMBSTONED_ENTITY" | "SOURCE_VERSION_EXPIRED" | "EVIDENCE_INSUFFICIENT" | "SYNC_CURSOR_INVALID" | "SYNC_CURSOR_EXPIRED" | "SYNC_BOOTSTRAP_REQUIRED" | "SYNC_SCHEMA_UNSUPPORTED" | "SYNC_BATCH_ID_REUSED" | "CAUSAL_DEPENDENCY_UNSATISFIED" | "ASSIGNMENT_CHANGED" | "CLOCK_UNTRUSTED" | "MEDIA_INTEGRITY_MISMATCH" | "MEDIA_NOT_VERIFIED" | "UPLOAD_INTENT_EXPIRED" | "VOICE_PROPOSAL_EXPIRED" | "VOICE_PROPOSAL_HASH_MISMATCH" | "VISUAL_REVIEW_REQUIRED" | "RELEASE_INVALIDATED" | "RELEASE_UNAVAILABLE" | "DEPENDENCY_UNAVAILABLE" | "FILTER_NOT_ALLOWLISTED" | "COMPARISON_NOT_RELEASABLE" | "BATCH_ID_PAYLOAD_MISMATCH" | "RATE_LIMITED";
            readonly serverEventIds: readonly string[];
            /** Format: date-time */
            readonly serverReceivedAt: string;
        };
        readonly SyncCommandEnvelope: {
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
        readonly SyncFeedEvent: {
            /** Format: uuid */
            readonly feedEventId: string;
            readonly integrationEvent: components["schemas"]["MilestoneOneEvent"];
            readonly projectionDeltas: readonly components["schemas"]["SyncProjectionDelta"][];
            readonly sequence: number;
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
            readonly payloadClassification: "C0" | "C1" | "C2";
            /** Format: uuid */
            readonly projectionId: string;
            readonly projectionSchemaVersion: number;
            readonly projectionType: string;
        };
        readonly Unavailable: {
            /** @constant */
            readonly code: "DEPENDENCY_UNAVAILABLE";
            /** Format: uuid */
            readonly correlationId: string;
            readonly retryable: boolean;
            /** @constant */
            readonly state: "UNAVAILABLE";
        };
        readonly VoiceDelegation: {
            readonly consentAccessVersion: number;
            /** Format: date-time */
            readonly expiresAt: string;
            /** @enum {string} */
            readonly purpose: "farmer.self_service" | "case.expert_support" | "field.visit" | "sensor.maintenance" | "assisted.service" | "alert.delivery" | "market.support" | "data.rights";
            /** Format: uuid */
            readonly roleContextId: string;
            /** @enum {string} */
            readonly roleType: "FARMER" | "RSK" | "MP";
            /** Format: uuid */
            readonly sessionId: string;
            /** Format: uuid */
            readonly subjectId: string;
            readonly toolKey: string;
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
        /** @description Supported Milestone 1 contract schema version */
        readonly schemaVersion: "1";
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
                /** @description Supported Milestone 1 contract schema version */
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
                /** @description Supported Milestone 1 contract schema version */
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
                /** @description Supported Milestone 1 contract schema version */
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
                /** @description Supported Milestone 1 contract schema version */
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
                /** @description Supported Milestone 1 contract schema version */
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
    readonly getFarmerBootstrap: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description Client build identifier */
                readonly "X-Client-Build": components["parameters"]["clientBuild"];
                /** @description Stable installation identifier */
                readonly "X-Client-Installation-Id": components["parameters"]["installationId"];
                /** @description Supported Milestone 1 contract schema version */
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
                /** @description Supported Milestone 1 contract schema version */
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
                /** @description Supported Milestone 1 contract schema version */
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
    readonly getMpQueryContext: {
        readonly parameters: {
            readonly query?: never;
            readonly header: {
                /** @description Client build identifier */
                readonly "X-Client-Build": components["parameters"]["clientBuild"];
                /** @description Stable installation identifier */
                readonly "X-Client-Installation-Id": components["parameters"]["installationId"];
                /** @description Supported Milestone 1 contract schema version */
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
                    readonly "application/json": components["schemas"]["MpQueryContextResponse"];
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
                /** @description Supported Milestone 1 contract schema version */
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
                /** @description Supported Milestone 1 contract schema version */
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
                /** @description Supported Milestone 1 contract schema version */
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
}
