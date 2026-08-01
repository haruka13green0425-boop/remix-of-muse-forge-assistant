import { useEffect, useRef } from "react";

const CLIENT = import.meta.env.VITE_ADSENSE_CLIENT as string | undefined;
const SLOT = import.meta.env.VITE_ADSENSE_SLOT as string | undefined;

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

export function AdSlot({ className = "" }: { className?: string }) {
  const pushed = useRef(false);
  useEffect(() => {
    if (!CLIENT || !SLOT || pushed.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
    } catch {
      /* ignore */
    }
  }, []);

  if (!CLIENT || !SLOT) return null;

  return (
    <div className={"mt-10 " + className}>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={CLIENT}
        data-ad-slot={SLOT}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
