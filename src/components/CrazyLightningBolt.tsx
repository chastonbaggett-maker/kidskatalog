"use client";

type Props = {
  id: string;
  left: number;
  top: number;
  height: number;
};

/** Asymmetric jagged ribbon — scales cleanly with preserveAspectRatio="none". */
const BOLT_PATH =
  "M32 0 L46 9 L24 13 L50 24 L20 29 L48 41 L22 46 L52 58 L18 63 L44 75 L26 79 L40 90 L28 94 L34 100 " +
  "L38 100 L42 92 L30 88 L46 76 L32 72 L50 60 L36 54 L54 42 L38 36 L56 24 L42 18 L58 8 L36 4 Z";

export function CrazyLightningBolt({ id, left, top, height }: Props) {
  const width = Math.min(Math.max(height * 0.28, 56), 80);
  const gradId = `bolt-grad-${id}`;
  const glowId = `bolt-glow-${id}`;

  return (
    <>
      <div
        className="crazy-lightning-flash"
        style={{
          left,
          top,
          ["--flash-x" as string]: `${left}px`,
          ["--flash-y" as string]: `${top}px`,
        }}
      />
      <div
        className="crazy-lightning-bolt"
        style={{
          left,
          top,
          height,
          width,
          marginLeft: -width / 2,
        }}
      >
        <svg
          viewBox="0 0 64 100"
          preserveAspectRatio="none"
          width="100%"
          height="100%"
          aria-hidden
        >
          <defs>
            <linearGradient id={gradId} x1="32" y1="0" x2="32" y2="100" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="18%" stopColor="#fffef0" />
              <stop offset="55%" stopColor="#ffe566" />
              <stop offset="100%" stopColor="#ff9800" />
            </linearGradient>
            <filter id={glowId} x="-70%" y="-5%" width="240%" height="110%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="3.6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <path
            className="crazy-lightning-bolt__halo"
            d={BOLT_PATH}
            fill="#ffe566"
            filter={`url(#${glowId})`}
          />
          <path className="crazy-lightning-bolt__core" d={BOLT_PATH} fill={`url(#${gradId})`} />
        </svg>
      </div>
    </>
  );
}
