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
  wasmPath?: string;
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
  wasmPath: string;
}

const DEFAULT_REDIRECT_URI = "/auth";
const DEFAULT_SILENT_REDIRECT_URI = "/silent-auth";
const DEFAULT_TOKEN_SOURCE = "accessToken";
const DEFAULT_DRAG_QUERY_PARAMS = false;
const DEFAULT_WASM_PATH = "https://pkgs.netbird.io/wasm/client/v0.63.0";
const RUNTIME_CONFIG_URL = "/config.json";

let cachedConfig: Config | null = null;

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
  return String(value).toLowerCase() === "true";
};

const parseOptionalString = (value: unknown) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
};

const parseOptionalNumber = (value: unknown) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (trimmed === "") return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
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
    wasmPath: parseOptionalString(configJson.wasmPath) || DEFAULT_WASM_PATH,
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
  return require("../../config.json");
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

  if (
    process.env.APP_ENV === "test" ||
    process.env.NODE_ENV === "development"
  ) {
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
  if (cachedConfig) {
    return cachedConfig;
  }

  if (
    typeof window !== "undefined" &&
    window.__NETBIRD_RUNTIME_CONFIG__ !== undefined
  ) {
    return setRuntimeConfig(window.__NETBIRD_RUNTIME_CONFIG__);
  }

  if (
    process.env.APP_ENV === "test" ||
    process.env.NODE_ENV === "development"
  ) {
    return setRuntimeConfig(getBundledConfig());
  }

  throw new Error(
    "Runtime config has not been initialized yet. Make sure RuntimeConfigProvider loads before rendering the app.",
  );
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
