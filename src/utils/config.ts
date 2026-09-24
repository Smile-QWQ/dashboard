import { StringMap } from "@axa-fr/react-oidc";
import { validator } from "@utils/helpers";

type RawConfig = {
  auth0Auth?: boolean | string;
  authAuthority?: string;
  authClientId?: string;
  authClientSecret?: string;
  authScopesSupported?: string;
  authAudience?: string;
  apiOrigin?: string;
  grpcApiOrigin?: string;
  redirectURI?: string;
  silentRedirectURI?: string;
  tokenSource?: string;
  dragQueryParams?: boolean | string;
  hotjarTrackID?: number | string;
  googleAnalyticsID?: string;
  googleTagManagerID?: string;
  authServiceUrl?: string;
  wasmPath?: string;
  licensed?: boolean | string;
  cloud?: boolean | string;
  agentNetworkOnly?: boolean | string;
  agentNetworkEnabled?: boolean | string;
  hubspotPortalId?: string;
  hubspotSignupFormId?: string;
  hubspotOnboardingFormId?: string;
  hubspotSurveyFormId?: string;
  analyticsExcludedEmails?: string | string[];
  announcement?: string;
};

export interface Config {
  auth0Auth: boolean;
  authority: string;
  clientId: string;
  clientSecret: string;
  scopesSupported: string;
  apiOrigin: string;
  grpcApiOrigin: string;
  audience: string;
  redirectURI: string;
  silentRedirectURI: string;
  tokenSource: string;
  dragQueryParams: boolean;
  hotjarTrackID?: number;
  googleAnalyticsID?: string;
  googleTagManagerID?: string;
  authServiceUrl?: string;
  wasmPath: string;
  licensed: boolean;
  cloud: boolean;
  // agentNetworkOnly: dedicated Agent Network surface — the regular UI
  // (network routing, DNS, reverse proxy, activity) is hidden, no Beta badge.
  // agentNetworkEnabled: the regular UI plus the Agent Network menu item (Beta).
  agentNetworkOnly: boolean;
  agentNetworkEnabled: boolean;
  hubspotPortalId?: string;
  hubspotSignupFormId?: string;
  hubspotOnboardingFormId?: string;
  hubspotSurveyFormId?: string;
  analyticsExcludedEmails: string[];
  // announcement: text the operator wants every user of this deployment to
  // see in a permanent banner (NETBIRD_ANNOUNCEMENT), e.g. which environment
  // or backend instance a dashboard belongs to. Unset for none.
  announcement?: string;
}

const DEFAULT_REDIRECT_URI = "/auth";
const DEFAULT_SILENT_REDIRECT_URI = "/silent-auth";
const DEFAULT_TOKEN_SOURCE = "accessToken";
const DEFAULT_DRAG_QUERY_PARAMS = false;
const DEFAULT_WASM_PATH = "https://pkgs.netbird.io/wasm/client/v0.76.3";
const RUNTIME_CONFIG_URL = "/config.json";

let cachedConfig: Config | null = null;
let configProxy: Config | null = null;

declare global {
  interface Window {
    __NETBIRD_RUNTIME_CONFIG__?: RawConfig;
  }
}

const isPlaceholderValue = (value: unknown) => {
  return typeof value === "string" && /^\$[A-Z0-9_]+$/.test(value.trim());
};

const parseBoolean = (value: unknown) => {
  if (typeof value === "boolean") return value;
  if (value === undefined || value === null) return false;
  if (isPlaceholderValue(value)) return false;
  return String(value).toLowerCase() === "true";
};

const parseOptionalString = (value: unknown) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (trimmed === "" || isPlaceholderValue(trimmed)) return undefined;
  return trimmed;
};

const parseOptionalNumber = (value: unknown) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value !== "string" || isPlaceholderValue(value)) return undefined;
  const trimmed = value.trim();
  if (trimmed === "") return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const parseEmailList = (value: unknown) => {
  const source = Array.isArray(value) ? value.join(",") : value;
  const raw = parseOptionalString(source);
  if (!raw) return [];
  return raw
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);
};

const normalizeConfig = (configJson: RawConfig): Config => {
  const authoritySource = parseOptionalString(configJson.authAuthority)?.replace(
    /\/+$/,
    "",
  );
  const authority =
    authoritySource && validator.isValidUrl(authoritySource)
      ? authoritySource
      : "http://localhost";

  return {
    auth0Auth: parseBoolean(configJson.auth0Auth),
    authority,
    clientId: parseOptionalString(configJson.authClientId) || "",
    clientSecret: parseOptionalString(configJson.authClientSecret) || "",
    scopesSupported: parseOptionalString(configJson.authScopesSupported) || "",
    apiOrigin: parseOptionalString(configJson.apiOrigin) || "",
    grpcApiOrigin: parseOptionalString(configJson.grpcApiOrigin) || "",
    audience: parseOptionalString(configJson.authAudience) || "",
    redirectURI:
      parseOptionalString(configJson.redirectURI) || DEFAULT_REDIRECT_URI,
    silentRedirectURI:
      parseOptionalString(configJson.silentRedirectURI) ||
      DEFAULT_SILENT_REDIRECT_URI,
    tokenSource:
      parseOptionalString(configJson.tokenSource) || DEFAULT_TOKEN_SOURCE,
    dragQueryParams:
      configJson.dragQueryParams === undefined
        ? DEFAULT_DRAG_QUERY_PARAMS
        : parseBoolean(configJson.dragQueryParams),
    hotjarTrackID: parseOptionalNumber(configJson.hotjarTrackID),
    googleAnalyticsID: parseOptionalString(configJson.googleAnalyticsID),
    googleTagManagerID: parseOptionalString(configJson.googleTagManagerID),
    authServiceUrl: parseOptionalString(configJson.authServiceUrl),
    wasmPath: parseOptionalString(configJson.wasmPath) || DEFAULT_WASM_PATH,
    licensed: parseBoolean(configJson.licensed),
    cloud: parseBoolean(configJson.cloud),
    agentNetworkOnly: parseBoolean(configJson.agentNetworkOnly),
    agentNetworkEnabled: parseBoolean(configJson.agentNetworkEnabled),
    hubspotPortalId: parseOptionalString(configJson.hubspotPortalId),
    hubspotSignupFormId: parseOptionalString(configJson.hubspotSignupFormId),
    hubspotOnboardingFormId: parseOptionalString(
      configJson.hubspotOnboardingFormId,
    ),
    hubspotSurveyFormId: parseOptionalString(configJson.hubspotSurveyFormId),
    analyticsExcludedEmails: parseEmailList(configJson.analyticsExcludedEmails),
    announcement: parseOptionalString(configJson.announcement),
  };
};

const getConfigValidationErrors = (configJson: RawConfig) => {
  const requiredFields: Array<keyof RawConfig> = [
    "auth0Auth",
    "authAuthority",
    "authClientId",
    "authScopesSupported",
    "apiOrigin",
  ];

  return requiredFields.filter((field) => {
    const value = configJson[field];
    if (value === undefined || value === null) return true;
    if (typeof value === "string") {
      return value.trim() === "" || isPlaceholderValue(value);
    }
    return false;
  });
};

const getBundledConfig = (): RawConfig => {
  if (process.env.APP_ENV === "test") {
    return require("@/config/test");
  }
  if (process.env.NODE_ENV === "development") {
    return require("@/config/local");
  }
  return require("../../config.json");
};

const canUseBundledConfig = () => {
  return (
    process.env.APP_ENV === "test" || process.env.NODE_ENV === "development"
  );
};

const readWindowConfig = () => {
  if (typeof window === "undefined") return undefined;
  return window.__NETBIRD_RUNTIME_CONFIG__;
};

const hydrateConfig = () => {
  if (cachedConfig) return cachedConfig;

  const windowConfig = readWindowConfig();
  if (windowConfig) return setRuntimeConfig(windowConfig);
  if (canUseBundledConfig()) return setRuntimeConfig(getBundledConfig());
  return null;
};

const resolveConfig = () => {
  const config = hydrateConfig();
  if (config) return config;
  throw new Error(
    "Runtime config has not been initialized yet. Make sure RuntimeConfigProvider loads before rendering the app.",
  );
};

// Module-scope `const config = loadConfig()` is evaluated before /config.json
// is fetched. A proxy defers every property read until render time.
const getConfigProxy = (): Config => {
  if (configProxy) return configProxy;

  configProxy = new Proxy({} as Config, {
    get(_target, prop, receiver) {
      const current = resolveConfig();
      const value = Reflect.get(current, prop, receiver);
      return typeof value === "function" ? value.bind(current) : value;
    },
    ownKeys() {
      return Reflect.ownKeys(resolveConfig());
    },
    getOwnPropertyDescriptor(_target, prop) {
      const descriptor = Reflect.getOwnPropertyDescriptor(resolveConfig(), prop);
      if (!descriptor) return undefined;
      return { ...descriptor, configurable: true };
    },
  });

  return configProxy;
};

export const setRuntimeConfig = (configJson: RawConfig) => {
  cachedConfig = normalizeConfig(configJson);

  if (typeof window !== "undefined") {
    window.__NETBIRD_RUNTIME_CONFIG__ = configJson;
  }

  return cachedConfig;
};

export const initializeRuntimeConfig = async () => {
  if (cachedConfig) return cachedConfig;

  if (canUseBundledConfig()) {
    return setRuntimeConfig(getBundledConfig());
  }

  const response = await fetch(RUNTIME_CONFIG_URL, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Failed to load runtime config from ${RUNTIME_CONFIG_URL} (${response.status})`,
    );
  }

  const configJson = (await response.json()) as RawConfig;
  const validationErrors = getConfigValidationErrors(configJson);

  if (validationErrors.length > 0) {
    throw new Error(
      `Runtime config is missing required values: ${validationErrors.join(", ")}`,
    );
  }

  return setRuntimeConfig(configJson);
};

/**
 * Load the config from the current runtime source.
 */
const loadConfig = (): Config => {
  hydrateConfig();
  return getConfigProxy();
};

/**
 * Build the extras object that will be passed to the auth layer
 */
export const buildExtras = () => {
  const extras: StringMap = {};
  const config = loadConfig();

  if (config.dragQueryParams) {
    const searchParams = new URLSearchParams(window.location.search);
    searchParams.forEach((value, key) => {
      extras[key] = value;
    });
  }

  if (config.audience) {
    extras.audience = config.audience;
  }
  return extras;
};

export default loadConfig;
