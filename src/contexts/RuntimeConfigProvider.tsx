"use client";

import FullScreenLoading from "@components/ui/FullScreenLoading";
import loadConfig, { initializeRuntimeConfig } from "@utils/config";
import React, { useEffect, useState } from "react";
import NetBirdIcon from "@/assets/icons/NetBirdIcon";

type Props = {
  children: React.ReactNode;
};

type RuntimeConfigState =
  | { status: "loading"; error: null }
  | { status: "ready"; error: null }
  | { status: "error"; error: string };

const shouldFetchRuntimeConfig =
  process.env.APP_ENV !== "test" && process.env.NODE_ENV === "production";

export default function RuntimeConfigProvider({ children }: Readonly<Props>) {
  const [state, setState] = useState<RuntimeConfigState>(() => {
    if (shouldFetchRuntimeConfig) {
      return { status: "loading", error: null };
    }

    try {
      loadConfig();
      return { status: "ready", error: null };
    } catch (error) {
      return {
        status: "error",
        error:
          error instanceof Error ? error.message : "Failed to load runtime config",
      };
    }
  });

  useEffect(() => {
    if (!shouldFetchRuntimeConfig) return;

    initializeRuntimeConfig()
      .then(() => {
        setState({ status: "ready", error: null });
      })
      .catch((error) => {
        setState({
          status: "error",
          error:
            error instanceof Error
              ? error.message
              : "Failed to load runtime config",
        });
      });
  }, []);

  if (state.status === "loading") {
    return <FullScreenLoading />;
  }

  if (state.status === "error") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="bg-nb-gray-930 border border-nb-gray-900 flex h-12 w-12 items-center justify-center rounded-md">
          <NetBirdIcon size={22} />
        </div>
        <div className="max-w-xl">
          <h1>Runtime configuration error</h1>
          <p className="text-sm text-gray-400">
            The dashboard could not load <code>/config.json</code>. Make sure the
            file exists and that the required values have been replaced before
            publishing the static bundle.
          </p>
          <pre className="bg-nb-gray-930 border border-nb-gray-800 mt-4 overflow-auto rounded-md p-4 text-left text-xs text-red-300">
            {state.error}
          </pre>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
