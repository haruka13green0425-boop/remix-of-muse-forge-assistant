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

  if (!CLIENT || !SLOT) {
    return (
      <div
        className={
          "mt-10 flex items-center justify-center rounded-lg border border-dashed border-border bg-card/60 px-4 py-6 text-[10px] tracking-widest text-muted-foreground " +
          className
        }
      >
        AD SLOT · set VITE_ADSENSE_CLIENT and VITE_ADSENSE_SLOT
      </div>
    );
  }

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
