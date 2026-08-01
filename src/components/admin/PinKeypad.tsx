"use client";

type Props = {
  onDigit: (digit: string) => void;
  onDelete: () => void;
  disabled?: boolean;
};

export function PinKeypad({ onDigit, onDelete, disabled }: Props) {
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"] as const;

  return (
    <div className="admin-pin-keypad grid grid-cols-3 gap-3">
      {keys.map((key, index) => {
        if (key === "") {
          return <div key={`spacer-${index}`} aria-hidden />;
        }
        if (key === "del") {
          return (
            <button
              key="del"
              type="button"
              disabled={disabled}
              onClick={onDelete}
              className="admin-pin-key flex h-[4.6rem] items-center justify-center rounded-full text-lg font-semibold text-white/90 transition active:scale-95 disabled:opacity-40"
              aria-label="Delete"
            >
              Delete
            </button>
          );
        }
        return (
          <button
            key={key}
            type="button"
            disabled={disabled}
            onClick={() => onDigit(key)}
            className="admin-pin-key flex h-[4.6rem] items-center justify-center rounded-full text-2xl font-medium text-white transition active:scale-95 disabled:opacity-40"
          >
            {key}
          </button>
        );
      })}
    </div>
  );
}
