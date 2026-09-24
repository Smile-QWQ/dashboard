import loadConfig from "@utils/config";

export const getGrpcApiOrigin = () => {
  return loadConfig().grpcApiOrigin;
};

export const getNetBirdUpCommand = () => {
  let cmd = "netbird up";
  const grpcApiOrigin = getGrpcApiOrigin();
  if (grpcApiOrigin) {
    cmd += " --management-url " + grpcApiOrigin;
  }
  return cmd;
};

export const getInstallUrl = () => {
  return window.location.origin + "/install/";
};

export type Edition = "cloud" | "licensed" | "oss";

// testOnboardingEnabled lets e2e tests opt into rendering the onboarding flow,
// which is disabled by default in the test build so it doesn't interfere with
// other specs. Inert outside test builds (the APP_ENV check is tree-shaken).
export const testOnboardingEnabled = (): boolean => {
  if (process.env.APP_ENV !== "test") return false;
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem("netbird-test-onboarding") === "true";
  } catch (e) {
    return false;
  }
};

// testEditionOverride lets e2e tests drive cloud/licensed/oss behavior against
// the test build by setting localStorage. It is inert outside test builds,
// where the APP_ENV check is replaced at compile time and tree-shaken away.
export const testEditionOverride = (): Edition | undefined => {
  if (process.env.APP_ENV !== "test") return undefined;
  if (typeof window === "undefined") return undefined;
  try {
    const value = window.localStorage.getItem("netbird-test-edition");
    if (value === "cloud" || value === "licensed" || value === "oss") {
      return value;
    }
  } catch (e) {
    return undefined;
  }
  return undefined;
};

// isNetBirdCloud returns true when the dashboard runs on the NetBird-managed
// cloud infrastructure (billing, MSP, trial, hosted integrations).
// The hostname fallback keeps deployments without NETBIRD_CLOUD working.
export const isNetBirdCloud = () => {
  const override = testEditionOverride();
  if (override) return override === "cloud";
  if (process.env.APP_ENV === "test") return true;
  if (loadConfig().cloud) return true;
  return false;
};

// hasLicensedFlag returns true when the deployment declares a self-hosted
// license via NETBIRD_LICENSED. Cloud is always licensed. Deployments without
// the flag are detected at runtime via useIsLicensed.
export const hasLicensedFlag = () => {
  const override = testEditionOverride();
  if (override) return override !== "oss";
  return loadConfig().licensed || isNetBirdCloud();
};

// testAgentNetworkOverride lets e2e tests drive the deployment flags
// NETBIRD_AGENT_NETWORK_ONLY / NETBIRD_AGENT_NETWORK_ENABLED against the test
// build via localStorage. "off" forces both flags off regardless of the build
// config. Inert outside test builds, where the APP_ENV check is replaced at
// compile time and tree-shaken away.
export const testAgentNetworkOverride = ():
  | "only"
  | "enabled"
  | "off"
  | undefined => {
  if (process.env.APP_ENV !== "test") return undefined;
  if (typeof window === "undefined") return undefined;
  try {
    const value = window.localStorage.getItem("netbird-test-agent-network");
    if (value === "only" || value === "enabled" || value === "off") {
      return value;
    }
  } catch (e) {
    return undefined;
  }
  return undefined;
};

// isAgentNetworkOnly returns true for the dedicated Agent Network surface:
// the regular UI (network routing, DNS, reverse proxy, activity) is hidden and
// the Agent Network menu shows without a Beta badge.
export const isAgentNetworkOnly = () => {
  const override = testAgentNetworkOverride();
  if (override) return override === "only";
  return loadConfig().agentNetworkOnly;
};

// pkgsDownloadUrl builds a NetBird client installer download link on
// pkgs.netbird.io. `path` is the platform path without a
// leading slash, e.g. "windows/x64" or "macos/universal".
export const pkgsDownloadUrl = (path: string) =>
  `https://pkgs.netbird.io/${path}`;

// isAgentNetworkEnabled returns true when the Agent Network product surface
// (Providers, Policies, Usage & Logs) is available — in either the dedicated
// "only" mode or alongside the regular UI (where it carries a Beta badge).
export const isAgentNetworkEnabled = () => {
  const override = testAgentNetworkOverride();
  if (override) return override === "only" || override === "enabled";
  return loadConfig().agentNetworkEnabled || loadConfig().agentNetworkOnly;
};

export const isAuth0 = () => {
  return loadConfig().auth0Auth;
};

export const isLocalDev = () => {
  return window.location.hostname.includes("localhost");
};

export const isProduction = () => {
  return process.env.NODE_ENV === "production";
};
