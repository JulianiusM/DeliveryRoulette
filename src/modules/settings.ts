// src/settings-csv.ts
import fs from "node:fs";
import crypto from "node:crypto";
import * as dotenv from "dotenv";

// Load env before anything else.
// Priority: E2E_DOTENV_FILE > .env.e2e (when NODE_ENV=e2e) > .env
const envPath =
    process.env.E2E_DOTENV_FILE ??
    (process.env.NODE_ENV === "e2e" ? ".env.e2e" : ".env");
dotenv.config({path: envPath});

export type Settings = {
    appPort: number;
    file: string;

    dbType: "mariadb" | "mysql";
    dbName: string;
    dbHost: string;
    dbPassword: string;
    dbPort: number;
    dbUser: string;

    rootUrl: string;
    sessionSecret: string;

    smtpEmail: string;
    smtpHost: string;
    smtpPassword: string;
    smtpPool: boolean;
    smtpPort: number;
    smtpSecure: boolean;
    smtpUser: string;

    localLoginEnabled: boolean;
    oidcEnabled: boolean;
    oidcName: string;
    oidcIssuerBaseUrl: string;
    oidcClientId: string;
    oidcClientSecret: string;
    oidcRedirectUrl: string;

    imprintUrl: string;
    privacyPolicyUrl: string;

    // Token expiration (in milliseconds)
    tokenExpirationMs: number;

    // Rate limiting configuration
    rateLimitWindowMs: number;
    rateLimitMaxPushConnector: number;
    rateLimitMaxDeviceRegistration: number;

    // Pagination defaults
    paginationDefaultRestaurants: number;
    paginationMaxPerPage: number;
    paginationMaxTimezoneItems: number;

    // Description length constraints
    minValidDescriptionLength: number;
    maxDescriptionLength: number;

    // Similar title matching thresholds
    minNormalizedTitleLength: number;
    minSimilarityScore: number;

    // Suggestion history
    suggestionExcludeRecentCount: number;
    suggestionDefaultOpenOnly: boolean;
    suggestionDefaultExcludeRecent: boolean;
    suggestionDefaultRespectDoNotSuggest: boolean;
    suggestionDefaultMinDietScore: number;
    suggestionDefaultFavoriteMode: string;

    // Import configuration
    importMaxFileSizeBytes: number;

    // Provider sync configuration (0 = disabled)
    syncIntervalMs: number;

    // Provider credential encryption key (required for encrypted storage)
    credentialEncryptionKey: string;

    // Provider HTTP client configuration
    providerHttpTimeoutMs: number;
    providerHttpMaxConcurrent: number;

    // Provider fetch cache TTL (seconds)
    providerCacheListingTtlSeconds: number;
    providerCacheMenuTtlSeconds: number;
    providerRefreshVersion: string;

    // Diet inference engine configuration
    inferenceHighConfidenceMinRatio: number;
    inferenceHighConfidenceMinStrongSignals: number;
    inferenceHighConfidenceMinUniqueItems: number;
    inferenceMediumConfidenceMinRatio: number;
    inferenceMediumConfidenceMinUniqueItems: number;
    inferenceSmallMenuThreshold: number;
    inferenceEvidenceBoostCap: number;
    inferenceEvidencePenaltyCap: number;
    inferenceStrongSignalWeight: number;
    inferenceManualOverrideWeight: number;
    inferenceRatioWeight: number;
    inferenceCoverageWeight: number;
    inferenceVarietyWeight: number;
    inferenceCategoryWeight: number;
    inferenceVarietyTargetItems: number;
    inferenceVarietyPenaltyCap: number;
    inferencePenaltyPerExcluded: number;
    inferenceConfidenceMultiplierMedium: number;
    inferenceConfidenceMultiplierLow: number;
    inferenceNegativeEvidenceWeight: number;
    inferenceDishHitWeight: number;
    inferenceCrossContaminationWeight: number;
    inferenceAllergenFetchBatchSize: number;
    inferenceIncludeMayContainAllergens: boolean;

    initialized: boolean;
};

const defaults: Settings = {
    initialized: false,
    rootUrl: "http://localhost:3000",

    dbType: "mariadb",
    dbHost: "localhost",
    dbPort: 3306,
    dbUser: "user",
    dbPassword: "password",
    dbName: "database",

    smtpPool: true,
    smtpHost: "smtp.example.com",
    smtpPort: 465,
    smtpSecure: true,
    smtpEmail: "test@example.com",
    smtpUser: "username",
    smtpPassword: "password",

    oidcEnabled: false,
    oidcName: "OIDC Provider",
    oidcClientId: "CLIENT_ID",
    oidcClientSecret: "CLIENT_SECRET",
    oidcIssuerBaseUrl: "http://example.com",
    oidcRedirectUrl: "http://localhost:3000/user/oidc/callback",

    localLoginEnabled: true,

    sessionSecret:
        "CHANGE__" + crypto.randomBytes(32).toString("base64url").slice(0, 20),
    appPort: 3000,

    file: "./settings.csv",

    imprintUrl: "http://example.com/imprint",
    privacyPolicyUrl: "http://example.com/privacy",

    // Token expiration (1 hour in milliseconds)
    tokenExpirationMs: 3600_000,

    // Rate limiting configuration (1 hour window)
    rateLimitWindowMs: 60 * 60 * 1000,
    rateLimitMaxPushConnector: 10,
    rateLimitMaxDeviceRegistration: 5,

    // Pagination defaults
    paginationDefaultRestaurants: 30,
    paginationMaxPerPage: 100,
    paginationMaxTimezoneItems: 200,

    // Description length constraints
    minValidDescriptionLength: 50,
    maxDescriptionLength: 250,

    // Similar title matching thresholds
    minNormalizedTitleLength: 4,
    minSimilarityScore: 50,

    // Suggestion history
    suggestionExcludeRecentCount: 3,
    suggestionDefaultOpenOnly: true,
    suggestionDefaultExcludeRecent: true,
    suggestionDefaultRespectDoNotSuggest: true,
    suggestionDefaultMinDietScore: 10,
    suggestionDefaultFavoriteMode: "prefer",

    // Import configuration
    importMaxFileSizeBytes: 25 * 1024 * 1024, // 25 MB

    // Provider sync (0 = disabled, otherwise interval in ms)
    syncIntervalMs: 0,

    // Provider credential encryption key (set via env: CREDENTIAL_ENCRYPTION_KEY)
    credentialEncryptionKey: "",

    // Provider HTTP client configuration
    providerHttpTimeoutMs: 10_000,        // 10 seconds
    providerHttpMaxConcurrent: 2,

    // Provider fetch cache TTL (seconds)
    providerCacheListingTtlSeconds: 6 * 60 * 60,    // 6 hours
    providerCacheMenuTtlSeconds: 24 * 60 * 60,      // 24 hours
    providerRefreshVersion: "1.0.0",

    // Diet inference engine configuration
    inferenceHighConfidenceMinRatio: 0.3,
    inferenceHighConfidenceMinStrongSignals: 2,
    inferenceHighConfidenceMinUniqueItems: 5,
    inferenceMediumConfidenceMinRatio: 0.5,
    inferenceMediumConfidenceMinUniqueItems: 3,
    inferenceSmallMenuThreshold: 5,
    inferenceEvidenceBoostCap: 20,
    inferenceEvidencePenaltyCap: 18,
    inferenceStrongSignalWeight: 3,
    inferenceManualOverrideWeight: 5,
    inferenceRatioWeight: 4,
    inferenceCoverageWeight: 0.55,
    inferenceVarietyWeight: 0.30,
    inferenceCategoryWeight: 0.15,
    inferenceVarietyTargetItems: 6,
    inferenceVarietyPenaltyCap: 12,
    inferencePenaltyPerExcluded: 2,
    inferenceConfidenceMultiplierMedium: 0.92,
    inferenceConfidenceMultiplierLow: 0.82,
    inferenceNegativeEvidenceWeight: 0.35,
    inferenceDishHitWeight: 1.2,
    inferenceCrossContaminationWeight: 0.5,
    inferenceAllergenFetchBatchSize: 5,
    inferenceIncludeMayContainAllergens: true,
};

// CSV_KEY -> settings key
const keyMap: Record<string, keyof Settings> = {
    ROOT_URL: "rootUrl",
    DB_TYPE: "dbType",
    DB_HOST: "dbHost",
    DB_PORT: "dbPort",
    DB_NAME: "dbName",
    DB_USER: "dbUser",
    DB_PASSWORD: "dbPassword",
    SMTP_POOL: "smtpPool",
    SMTP_HOST: "smtpHost",
    SMTP_PORT: "smtpPort",
    SMTP_SECURE: "smtpSecure",
    SMTP_EMAIL: "smtpEmail",
    SMTP_USER: "smtpUser",
    SMTP_PASSWORD: "smtpPassword",
    OIDC_ENABLED: "oidcEnabled",
    OIDC_NAME: "oidcName",
    OIDC_CLIENT_ID: "oidcClientId",
    OIDC_CLIENT_SECRET: "oidcClientSecret",
    OIDC_ISSUER_BASE_URL: "oidcIssuerBaseUrl",
    OIDC_REDIRECT_URL: "oidcRedirectUrl",
    LOCAL_LOGIN_ENABLED: "localLoginEnabled",
    SESSION_SECRET: "sessionSecret",
    APP_PORT: "appPort",
    IMPRINT_URL: "imprintUrl",
    PRIVACY_POLICY_URL: "privacyPolicyUrl",
    TOKEN_EXPIRATION_MS: "tokenExpirationMs",
    RATE_LIMIT_WINDOW_MS: "rateLimitWindowMs",
    RATE_LIMIT_MAX_PUSH_CONNECTOR: "rateLimitMaxPushConnector",
    RATE_LIMIT_MAX_DEVICE_REGISTRATION: "rateLimitMaxDeviceRegistration",
    PAGINATION_DEFAULT_RESTAURANTS: "paginationDefaultRestaurants",
    PAGINATION_MAX_PER_PAGE: "paginationMaxPerPage",
    PAGINATION_MAX_TIMEZONE_ITEMS: "paginationMaxTimezoneItems",
    MIN_VALID_DESCRIPTION_LENGTH: "minValidDescriptionLength",
    MAX_DESCRIPTION_LENGTH: "maxDescriptionLength",
    MIN_NORMALIZED_TITLE_LENGTH: "minNormalizedTitleLength",
    MIN_SIMILARITY_SCORE: "minSimilarityScore",
    SUGGESTION_EXCLUDE_RECENT_COUNT: "suggestionExcludeRecentCount",
    SUGGESTION_DEFAULT_OPEN_ONLY: "suggestionDefaultOpenOnly",
    SUGGESTION_DEFAULT_EXCLUDE_RECENT: "suggestionDefaultExcludeRecent",
    SUGGESTION_DEFAULT_RESPECT_DO_NOT_SUGGEST: "suggestionDefaultRespectDoNotSuggest",
    SUGGESTION_DEFAULT_MIN_DIET_SCORE: "suggestionDefaultMinDietScore",
    SUGGESTION_DEFAULT_FAVORITE_MODE: "suggestionDefaultFavoriteMode",
    IMPORT_MAX_FILE_SIZE_BYTES: "importMaxFileSizeBytes",
    SYNC_INTERVAL_MS: "syncIntervalMs",
    CREDENTIAL_ENCRYPTION_KEY: "credentialEncryptionKey",
    PROVIDER_HTTP_TIMEOUT_MS: "providerHttpTimeoutMs",
    PROVIDER_HTTP_MAX_CONCURRENT: "providerHttpMaxConcurrent",
    PROVIDER_CACHE_LISTING_TTL_SECONDS: "providerCacheListingTtlSeconds",
    PROVIDER_CACHE_MENU_TTL_SECONDS: "providerCacheMenuTtlSeconds",
    PROVIDER_REFRESH_VERSION: "providerRefreshVersion",
    INFERENCE_HIGH_CONFIDENCE_MIN_RATIO: "inferenceHighConfidenceMinRatio",
    INFERENCE_HIGH_CONFIDENCE_MIN_STRONG_SIGNALS: "inferenceHighConfidenceMinStrongSignals",
    INFERENCE_HIGH_CONFIDENCE_MIN_UNIQUE_ITEMS: "inferenceHighConfidenceMinUniqueItems",
    INFERENCE_MEDIUM_CONFIDENCE_MIN_RATIO: "inferenceMediumConfidenceMinRatio",
    INFERENCE_MEDIUM_CONFIDENCE_MIN_UNIQUE_ITEMS: "inferenceMediumConfidenceMinUniqueItems",
    INFERENCE_SMALL_MENU_THRESHOLD: "inferenceSmallMenuThreshold",
    INFERENCE_EVIDENCE_BOOST_CAP: "inferenceEvidenceBoostCap",
    INFERENCE_EVIDENCE_PENALTY_CAP: "inferenceEvidencePenaltyCap",
    INFERENCE_STRONG_SIGNAL_WEIGHT: "inferenceStrongSignalWeight",
    INFERENCE_MANUAL_OVERRIDE_WEIGHT: "inferenceManualOverrideWeight",
    INFERENCE_RATIO_WEIGHT: "inferenceRatioWeight",
    INFERENCE_COVERAGE_WEIGHT: "inferenceCoverageWeight",
    INFERENCE_VARIETY_WEIGHT: "inferenceVarietyWeight",
    INFERENCE_CATEGORY_WEIGHT: "inferenceCategoryWeight",
    INFERENCE_VARIETY_TARGET_ITEMS: "inferenceVarietyTargetItems",
    INFERENCE_VARIETY_PENALTY_CAP: "inferenceVarietyPenaltyCap",
    INFERENCE_PENALTY_PER_EXCLUDED: "inferencePenaltyPerExcluded",
    INFERENCE_CONFIDENCE_MULTIPLIER_MEDIUM: "inferenceConfidenceMultiplierMedium",
    INFERENCE_CONFIDENCE_MULTIPLIER_LOW: "inferenceConfidenceMultiplierLow",
    INFERENCE_NEGATIVE_EVIDENCE_WEIGHT: "inferenceNegativeEvidenceWeight",
    INFERENCE_DISH_HIT_WEIGHT: "inferenceDishHitWeight",
    INFERENCE_CROSS_CONTAMINATION_WEIGHT: "inferenceCrossContaminationWeight",
    INFERENCE_ALLERGEN_FETCH_BATCH_SIZE: "inferenceAllergenFetchBatchSize",
    INFERENCE_INCLUDE_MAY_CONTAIN_ALLERGENS: "inferenceIncludeMayContainAllergens",
};

// per-field coercion
const coerce: Partial<Record<keyof Settings, (v: string) => any>> = {
    dbPort: (v) => Number(v),
    smtpPort: (v) => Number(v),
    appPort: (v) => Number(v),
    tokenExpirationMs: (v) => Number(v),
    rateLimitWindowMs: (v) => Number(v),
    rateLimitMaxPushConnector: (v) => Number(v),
    rateLimitMaxDeviceRegistration: (v) => Number(v),
    paginationDefaultRestaurants: (v) => Number(v),
    paginationMaxPerPage: (v) => Number(v),
    paginationMaxTimezoneItems: (v) => Number(v),
    minValidDescriptionLength: (v) => Number(v),
    maxDescriptionLength: (v) => Number(v),
    minNormalizedTitleLength: (v) => Number(v),
    minSimilarityScore: (v) => Number(v),
    suggestionExcludeRecentCount: (v) => Number(v),
    suggestionDefaultOpenOnly: (v) => /^(1|true|yes|on)$/i.test(v),
    suggestionDefaultExcludeRecent: (v) => /^(1|true|yes|on)$/i.test(v),
    suggestionDefaultRespectDoNotSuggest: (v) => /^(1|true|yes|on)$/i.test(v),
    suggestionDefaultMinDietScore: (v) => Number(v),
    importMaxFileSizeBytes: (v) => Number(v),
    syncIntervalMs: (v) => Number(v),
    providerHttpTimeoutMs: (v) => Number(v),
    providerHttpMaxConcurrent: (v) => Number(v),
    providerCacheListingTtlSeconds: (v) => Number(v),
    providerCacheMenuTtlSeconds: (v) => Number(v),
    inferenceHighConfidenceMinRatio: (v) => Number(v),
    inferenceHighConfidenceMinStrongSignals: (v) => Number(v),
    inferenceMediumConfidenceMinRatio: (v) => Number(v),
    inferenceSmallMenuThreshold: (v) => Number(v),
    inferenceEvidenceBoostCap: (v) => Number(v),
    inferenceEvidencePenaltyCap: (v) => Number(v),
    inferenceStrongSignalWeight: (v) => Number(v),
    inferenceManualOverrideWeight: (v) => Number(v),
    inferenceRatioWeight: (v) => Number(v),
    inferencePenaltyPerExcluded: (v) => Number(v),
    inferenceConfidenceMultiplierMedium: (v) => Number(v),
    inferenceConfidenceMultiplierLow: (v) => Number(v),
    inferenceNegativeEvidenceWeight: (v) => Number(v),
    inferenceDishHitWeight: (v) => Number(v),
    inferenceCrossContaminationWeight: (v) => Number(v),
    inferenceAllergenFetchBatchSize: (v) => Number(v),
    inferenceIncludeMayContainAllergens: (v) => /^(1|true|yes|on)$/i.test(v),
    smtpPool: (v) => /^(1|true|yes|on)$/i.test(v),
    smtpSecure: (v) => /^(1|true|yes|on)$/i.test(v),
    localLoginEnabled: (v) => /^(1|true|yes|on)$/i.test(v),
    oidcEnabled: (v) => /^(1|true|yes|on)$/i.test(v),
};

// Apply environment variable overrides AFTER reading CSV.
// In E2E: E2E_* vars override; otherwise plain vars override.
// Example: E2E_DB_HOST > DB_HOST > CSV value.
function applyEnvOverrides(target: Settings): void {
    const entries = Object.entries(keyMap) as [string, keyof Settings][];

    for (const [csvKey, settingsKey] of entries) {
        // Prefer E2E_ prefixed variables when running in E2E mode
        let raw;
        if (process.env.NODE_ENV === 'e2e') {
            raw = process.env[`E2E_${csvKey}` as keyof NodeJS.ProcessEnv]
        }
        raw = raw ?? process.env[csvKey as keyof NodeJS.ProcessEnv];

        if (raw === undefined || raw === "") continue;

        const conv = coerce[settingsKey];
        const v = conv ? conv(String(raw)) : String(raw);
        (target as any)[settingsKey] = v;
    }

    // Allow overriding the settings file location itself.
    if (process.env.SETTINGS_FILE) {
        target.file = process.env.SETTINGS_FILE;
    }

    // Safety: when in E2E, nudge to use a dedicated database.
    if (
        process.env.NODE_ENV === "e2e" &&
        target.dbName &&
        !/e2e/i.test(target.dbName)
    ) {
        console.warn(
            `[settings] E2E mode: database name "${target.dbName}" does not contain "e2e". ` +
            `Consider setting E2E_DB_NAME for safety.`
        );
    }
}

export class SettingsStore {
    private _settings: Settings = {...defaults};

    get value(): Settings {
        return this._settings;
    }

    async read(file = this._settings.file, forceCsv: boolean = false): Promise<void> {
        // If an env override for the file is present, prefer it.
        if (!forceCsv && process.env.SETTINGS_FILE) {
            file = process.env.SETTINGS_FILE;
            this._settings.file = file;
        }

        const isE2E = process.env.NODE_ENV === "e2e";

        // If the CSV doesn't exist:
        // - in normal modes, create it from defaults (original behavior)
        // - in E2E, SKIP writing (we rely on env-only for secrets)
        if (!fs.existsSync(file)) {
            if (!isE2E) {
                await this.write(file);
            }
            applyEnvOverrides(this._settings);
            this._settings.initialized = true;
            return;
        }

        // Parse CSV
        const text = fs.readFileSync(file, "utf8");
        for (const line of text.split(/\r?\n/)) {
            if (!line.trim()) continue;
            const [kRaw, ...rest] = line.split(",");
            const k = kRaw.trim();
            const vRaw = rest.join(","); // allow commas in values
            const mapKey = keyMap[k];
            if (!mapKey) {
                console.warn("Unknown setting:", k);
                continue;
            }
            const conv = coerce[mapKey];
            const v = (conv ? conv(vRaw) : vRaw) as any;
            (this._settings as any)[mapKey] = v;
        }

        // Finally, apply env overrides on top.
        if (!forceCsv) applyEnvOverrides(this._settings);
        this._settings.initialized = true;
    }

    async write(file = this._settings.file): Promise<void> {
        const reverse = Object.fromEntries(
            Object.entries(keyMap).map(([csv, key]) => [key, csv])
        );
        const lines: string[] = [];
        for (const [key, value] of Object.entries(this._settings)) {
            const csvKey = (reverse as any)[key];
            if (!csvKey) continue; // skip fields not in CSV
            lines.push(`${csvKey},${String(value)}`);
        }
        fs.writeFileSync(file, lines.join("\n") + "\n", "utf8");
        console.log("Settings file written!");
    }
}

const settingsStore = new SettingsStore();
export default settingsStore;
