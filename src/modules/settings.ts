// src/modules/settings.ts
import * as dotenv from "dotenv";

// Load env before anything else.
const envPath = process.env.NODE_ENV === "test" ? ".env.test" : ".env";
dotenv.config({path: envPath});

export type Settings = {
    appPort: number;
    rootUrl: string;
    sessionSecret: string;
    initialized: boolean;
};

const defaults: Settings = {
    initialized: false,
    rootUrl: "http://localhost:3000",
    appPort: 3000,
    sessionSecret: "change-me-in-production",
};

// CSV_KEY -> settings key
const keyMap: Record<string, keyof Settings> = {
    ROOT_URL: "rootUrl",
    APP_PORT: "appPort",
    SESSION_SECRET: "sessionSecret",
};

// per-field coercion
const coerce: Partial<Record<keyof Settings, (v: string) => any>> = {
    appPort: (v) => Number(v),
};

function applyEnvOverrides(target: Settings): void {
    const entries = Object.entries(keyMap) as [string, keyof Settings][];

    for (const [envKey, settingsKey] of entries) {
        const raw = process.env[envKey];
        if (raw === undefined || raw === "") continue;

        const conv = coerce[settingsKey];
        const v = conv ? conv(String(raw)) : String(raw);
        (target as any)[settingsKey] = v;
    }
}

export class SettingsStore {
    private _settings: Settings = {...defaults};

    get value(): Settings {
        return this._settings;
    }

    read(): void {
        applyEnvOverrides(this._settings);
        this._settings.initialized = true;
    }
}

const settingsStore = new SettingsStore();
export default settingsStore;
