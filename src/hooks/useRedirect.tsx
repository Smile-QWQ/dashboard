import loadConfig from "@utils/config";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

const RETRY_DELAY = 1250;
const MAX_RETRIES = 10;

export const useRedirect = (
  url: string,
  replace: boolean = false,
  enable: boolean = true,
) => {
  const config = loadConfig();
  const router = useRouter();
  const currentPath = usePathname();
  const callBackUrls = useRef([config.redirectURI, config.silentRedirectURI]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);

  useEffect(() => {
    const [targetPath] = url.split("?");
    const currentFullPath = window.location.pathname;

    if (!enable || callBackUrls.current.includes(url)) {
      return;
    }

    if (targetPath === currentFullPath || targetPath === currentPath) {
      return;
    }

    const performRedirect = () => {
      if (replace) {
        router.replace(url);
      } else {
        router.push(url);
      }

      retryCountRef.current += 1;

      if (retryCountRef.current < MAX_RETRIES) {
        timeoutRef.current = setTimeout(() => {
          if (window.location.pathname !== targetPath) {
            performRedirect();
          }
        }, RETRY_DELAY);
      }
    };

    performRedirect();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      retryCountRef.current = 0;
    };
  }, [replace, router, url, enable, currentPath]);
};

export default useRedirect;
