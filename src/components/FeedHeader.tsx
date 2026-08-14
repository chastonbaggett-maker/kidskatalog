"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAccentStore } from "@/lib/accent-store";
import { Logo } from "./Logo";

type Props = {
  query: string;
  onQueryChange: (value: string) => void;
  showBack?: boolean;
  /** Disable controls while collapsed / animating out */
  inert?: boolean;
};

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    0: { transcript: string };
  }>;
};

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function FeedHeader({
  query,
  onQueryChange,
  showBack = false,
  inert = false,
}: Props) {
  const audience = useAccentStore((s) => s.audience);
  const micClass =
    audience === "boys"
      ? "bg-[var(--boys-chip)]"
      : audience === "girls"
        ? "bg-[var(--girls-chip)]"
        : "bg-[var(--mint)]";

  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const [micPop, setMicPop] = useState(false);
  const [keyboardHint, setKeyboardHint] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const baseQueryRef = useRef(query);
  const hintTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setSupported(Boolean(getSpeechRecognition()));
  }, []);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
      if (hintTimerRef.current != null) {
        window.clearTimeout(hintTimerRef.current);
      }
    };
  }, []);

  const focusSearch = useCallback(() => {
    const input = inputRef.current;
    if (!input) return;
    input.focus({ preventScroll: true });
    // Place caret at end so spoken text appends like keyboard dictation.
    const end = input.value.length;
    try {
      input.setSelectionRange(end, end);
    } catch {
      /* some input types reject selection */
    }
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  const startListening = useCallback(() => {
    const Ctor = getSpeechRecognition();
    if (!Ctor) {
      setSupported(false);
      return false;
    }

    recognitionRef.current?.abort();
    const recognition = new Ctor();
    recognition.lang =
      typeof navigator !== "undefined" && navigator.language
        ? navigator.language
        : "en-US";
    // Keep listening across short pauses — closer to keyboard speak-to-text.
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    baseQueryRef.current = query.trim();
    recognitionRef.current = recognition;

    recognition.onstart = () => {
      setListening(true);
      focusSearch();
    };

    recognition.onresult = (event) => {
      let spoken = "";
      for (let i = 0; i < event.results.length; i++) {
        spoken += event.results[i]?.[0]?.transcript ?? "";
      }
      spoken = spoken.replace(/\s+/g, " ").trim();
      if (!spoken) return;
      const base = baseQueryRef.current;
      onQueryChange(base ? `${base} ${spoken}` : spoken);
      // Keep the field focused/caret ready while dictating.
      focusSearch();
    };

    recognition.onerror = (event) => {
      // "aborted" / "no-speech" are normal end states — don't flash unsupported.
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setSupported(false);
      }
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };

    try {
      focusSearch();
      recognition.start();
      setListening(true);
      return true;
    } catch {
      setListening(false);
      return false;
    }
  }, [focusSearch, onQueryChange, query]);

  const showKeyboardHint = useCallback(() => {
    setKeyboardHint(true);
    if (hintTimerRef.current != null) {
      window.clearTimeout(hintTimerRef.current);
    }
    hintTimerRef.current = window.setTimeout(() => {
      setKeyboardHint(false);
      hintTimerRef.current = null;
    }, 3200);
  }, []);

  const toggleVoice = () => {
    if (inert) return;
    setMicPop(true);
    window.setTimeout(() => setMicPop(false), 520);

    if (listening) {
      stopListening();
      focusSearch();
      return;
    }

    // Always open the search field first (brings up the mobile keyboard).
    focusSearch();

    const started = startListening();
    if (!started) {
      // No Web Speech API — rely on the system keyboard mic / dictation key.
      showKeyboardHint();
    }
  };

  const placeholder = listening
    ? "Listening… speak now"
    : keyboardHint
      ? "Tap the mic on your keyboard"
      : "Search toys";

  return (
    <header className="feed-header bg-[image:var(--header-grad)] px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-white shadow-[0_8px_24px_-12px_rgba(80,100,180,0.55)] sm:px-5 lg:px-6">
      <div className="feed-header__row flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
        <div className="flex shrink-0 justify-center sm:justify-start">
          <Logo light href="/shop" size={110} />
        </div>

        <div className="feed-header__search flex w-full min-w-0 items-center gap-2 sm:ml-auto sm:max-w-md md:max-w-lg lg:max-w-xl">
          {showBack && (
            <Link
              href="/shop"
              tabIndex={inert ? -1 : 0}
              className="flex h-10 w-10 shrink-0 items-center justify-center text-white"
              aria-label="Back"
            >
              <Chevron />
            </Link>
          )}

          <label className="relative flex min-w-0 flex-1 items-center rounded-full bg-white px-3 py-2.5 shadow-sm">
            <span className="mr-2 text-[var(--blue)]" aria-hidden>
              <SearchIcon />
            </span>
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder={placeholder}
              inputMode="search"
              enterKeyHint="search"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              tabIndex={inert ? -1 : 0}
              readOnly={inert}
              className="min-w-0 flex-1 bg-transparent text-base text-[var(--ink)] outline-none placeholder:text-[var(--ink-soft)]"
            />
            <button
              type="button"
              tabIndex={inert ? -1 : 0}
              disabled={inert}
              onClick={toggleVoice}
              className={`voice-mic relative -mr-1 ml-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white shadow-md transition active:scale-95 disabled:opacity-50 ${micClass} ${
                listening ? "voice-mic-listening" : ""
              } ${micPop ? "voice-mic-pop" : ""}`}
              aria-label={
                listening
                  ? "Stop speak to text"
                  : "Speak to text"
              }
              aria-pressed={listening}
              title={
                listening
                  ? "Tap to stop"
                  : supported
                    ? "Speak to type in search"
                    : "Opens search — use the mic on your keyboard"
              }
            >
              <span className="voice-mic__rings" aria-hidden>
                <span />
                <span />
                <span />
              </span>
              <MicIcon />
            </button>
          </label>
        </div>
      </div>
    </header>
  );
}

function Chevron() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M15 5 8 12l7 7"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="2.2" />
      <path
        d="M16 16l4 4"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="9.25"
        y="3.5"
        width="5.5"
        height="10.5"
        rx="2.75"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M6.5 11.25a5.5 5.5 0 0 0 11 0M12 16.75V19.5M10 19.5h4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
