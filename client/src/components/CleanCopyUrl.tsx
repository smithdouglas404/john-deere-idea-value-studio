import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";

export function CleanCopyUrl() {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!copied && !failed) return;
    const timer = window.setTimeout(() => {
      setCopied(false);
      setFailed(false);
    }, 1800);
    return () => window.clearTimeout(timer);
  }, [copied, failed]);

  const copyUrl = async () => {
    const url = window.location.href;
    try {
      if (!navigator.clipboard) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setFailed(false);
    } catch {
      setCopied(false);
      setFailed(true);
    }
  };

  return (
    <button
      type="button"
      onClick={copyUrl}
      aria-label={copied ? "Lifecycle URL copied" : "Copy current lifecycle URL"}
      className="inline-flex h-8 items-center gap-2 border border-[#cbd9c8] px-2.5 text-[9px] font-bold uppercase tracking-[.11em] text-[#526456] transition-colors duration-200 hover:border-[#876e16] hover:bg-[#eef4e9] hover:text-[#173d2a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#876e16] focus-visible:ring-offset-2"
    >
      {copied ? <Check aria-hidden="true" className="h-3.5 w-3.5" /> : <Copy aria-hidden="true" className="h-3.5 w-3.5" />}
      {copied ? "Copied" : failed ? "Copy unavailable" : "Copy URL"}
    </button>
  );
}
