import { Check, Copy, Download, ExternalLink, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

type Props = {
  slug: string;
  title: string;
  status: "draft" | "open" | "closed";
  onClose: () => void;
  /** Offered when the form isn't live yet. */
  onPublish?: () => void;
};

/** Share modal: copyable link, downloadable QR code, and a publish shortcut for drafts. */
export function ShareDialog({ slug, title, status, onClose, onPublish }: Props) {
  const url = `${window.location.origin}/f/${slug}`;
  const [copied, setCopied] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(url, { width: 512, margin: 2, errorCorrectionLevel: "M" })
      .then((d) => active && setQr(d))
      .catch(() => active && setQr(null));
    return () => {
      active = false;
    };
  }, [url]);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/50 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-dialog-title"
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id="share-dialog-title" className="font-bold text-neutral-900">
              Share form
            </h2>
            <p className="mt-0.5 truncate text-xs text-neutral-500">{title}</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-3 text-xs text-neutral-600">
          {status === "open"
            ? "Anyone with the link can respond."
            : "This form isn't live yet. Publish it to accept responses."}
        </p>

        <div className="mt-3 flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 p-2 text-xs">
          <span className="flex-1 truncate font-mono text-neutral-700">{url}</span>
          <button
            type="button"
            onClick={() => void copy()}
            title="Copy link"
            aria-label="Copy link"
            className="rounded p-1 text-neutral-500 shadow-sm hover:bg-white hover:text-neutral-900"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>

        <div className="mt-5 flex flex-col items-center">
          {qr ? (
            <img
              src={qr}
              alt={`QR code linking to ${url}`}
              className="h-44 w-44 rounded-lg border border-neutral-200"
            />
          ) : (
            <div className="h-44 w-44 animate-pulse rounded-lg bg-neutral-100" aria-hidden="true" />
          )}
          {qr && (
            <a
              href={qr}
              download={`${slug}-qr.png`}
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:underline"
            >
              <Download className="h-3.5 w-3.5" /> Download QR code
            </a>
          )}
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-neutral-100 pt-4">
          <a
            href={`/f/${slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline"
          >
            Open fill page <ExternalLink className="h-3 w-3" />
          </a>
          {status !== "open" && onPublish && (
            <button
              type="button"
              onClick={() => {
                onPublish();
                onClose();
              }}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500"
            >
              Publish now
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
