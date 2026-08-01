"use client";

type Props = {
  onDigit: (digit: string) => void;
  onDelete: () => void;
  disabled?: boolean;
};

const LETTER_HINTS: Record<string, string> = {
  "2": "ABC",
  "3": "DEF",
  "4": "GHI",
  "5": "JKL",
  "6": "MNO",
  "7": "PQRS",
  "8": "TUV",
  "9": "WXYZ",
};

export function PinKeypad({ onDigit, onDelete, disabled }: Props) {
  const rows = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    ["", "0", "del"],
  ] as const;

  return (
    <div className="admin-pin-keypad mx-auto w-full max-w-[19rem]">
      {rows.map((row, rowIndex) => (
        <div key={`row-${rowIndex}`} className="admin-pin-keypad__row grid grid-cols-3 gap-4">
          {row.map((key, colIndex) => {
            if (key === "") {
              return <div key={`spacer-${rowIndex}-${colIndex}`} aria-hidden />;
            }

            if (key === "del") {
              return (
                <button
                  key="del"
                  type="button"
                  disabled={disabled}
                  onClick={onDelete}
                  className="admin-pin-key admin-pin-key--action flex h-[4.75rem] items-center justify-center rounded-full transition active:scale-95 disabled:opacity-40"
                  aria-label="Delete"
                >
                  <BackspaceIcon />
                </button>
              );
            }

            const letters = LETTER_HINTS[key];
            return (
              <button
                key={key}
                type="button"
                disabled={disabled}
                onClick={() => onDigit(key)}
                className="admin-pin-key flex h-[4.75rem] flex-col items-center justify-center rounded-full transition active:scale-95 disabled:opacity-40"
              >
                <span className="admin-pin-key__digit">{key}</span>
                {letters ? (
                  <span className="admin-pin-key__letters">{letters}</span>
                ) : (
                  <span className="admin-pin-key__letters" aria-hidden>
                    &nbsp;
                  </span>
                )}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function BackspaceIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 7h11a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H6l-4-4.5L6 7z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M14.5 10.5 12 13l2.5 2.5M12 13h4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
