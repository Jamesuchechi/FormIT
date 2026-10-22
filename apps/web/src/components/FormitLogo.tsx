interface FormitLogoProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  showWordmark?: boolean;
  className?: string;
  useImage?: boolean;
}

const SIZE_MAP = {
  xs: { icon: "h-6 w-6 rounded-md", text: "text-sm", mark: 24 },
  sm: { icon: "h-8 w-8 rounded-lg", text: "text-base", mark: 32 },
  md: { icon: "h-10 w-10 rounded-xl", text: "text-lg", mark: 40 },
  lg: { icon: "h-12 w-12 rounded-2xl", text: "text-xl", mark: 48 },
  xl: { icon: "h-16 w-16 rounded-2xl", text: "text-2xl", mark: 64 },
};

export function FormitLogo({
  size = "sm",
  showWordmark = false,
  className = "",
  useImage = true,
}: FormitLogoProps) {
  const cfg = SIZE_MAP[size];

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {useImage ? (
        <img
          src="/logo.png"
          alt="FormIT"
          className={`${cfg.icon} object-cover shadow-sm ring-1 ring-black/5 hover:scale-105 transition-transform duration-200`}
        />
      ) : (
        <svg
          viewBox="0 0 100 100"
          className={`${cfg.icon} shadow-sm ring-1 ring-black/5`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect width="100" height="100" rx="24" fill="#18181b" />
          <rect
            x="22"
            y="36"
            width="16"
            height="34"
            rx="4"
            transform="rotate(-15 22 36)"
            fill="#60a5fa"
            opacity="0.4"
          />
          <rect
            x="30"
            y="30"
            width="17"
            height="38"
            rx="4"
            transform="rotate(-8 30 30)"
            fill="#6366f1"
            opacity="0.75"
          />
          <path
            d="M44 26 C44 23.8 45.8 22 48 22 L74 22 C76.2 22 78 23.8 77.2 26.2 L73.5 37 C73 38.5 71.5 39.5 70 39.5 L55 39.5 L55 46 L68 46 C70.2 46 71.8 47.8 71 50 L68 58 C67.5 59.5 66 60.5 64.5 60.5 L53 60.5 L47 79 C46.4 80.8 44.5 82 42.5 82 L38 82 C35.8 82 34.2 80 34.8 78 L44 48 Z"
            fill="url(#logoGrad)"
          />
          <path d="M57 38 L48 51 L55 51 L51 63 L65 48 L58 48 Z" fill="#38bdf8" />
          <defs>
            <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#38bdf8" />
              <stop offset="50%" stop-color="#6366f1" />
              <stop offset="100%" stop-color="#a855f7" />
            </linearGradient>
          </defs>
        </svg>
      )}

      {showWordmark && (
        <span className={`font-bold tracking-tight text-neutral-900 ${cfg.text}`}>
          Form<span className="text-indigo-600">IT</span>
        </span>
      )}
    </div>
  );
}
