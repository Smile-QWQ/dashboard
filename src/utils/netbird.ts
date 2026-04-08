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

export const isNetBirdHosted = () => {
  return (
    window.location.hostname.endsWith(".netbird.io") ||
    window.location.hostname.endsWith(".wiretrustee.com")
  );
};

export const isLocalDev = () => {
  return window.location.hostname.includes("localhost");
};

export const isProduction = () => {
  return process.env.NODE_ENV === "production";
};
