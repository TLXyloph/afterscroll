"use client";

import { FormEvent, useRef, useState } from "react";
import { ArrowUp, Mic, MicOff, Sparkles, Volume2, VolumeX } from "lucide-react";
import ScoutFace, { type ScoutMood } from "./ScoutFace";
import { api } from "@/lib/clientApi";

type SpeechResult = { transcript: string };

type SpeechResultEvent = {
  results: ArrayLike<ArrayLike<SpeechResult>>;
};

type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechResultEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

type SpeechWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

const prompts = [
  "What needs action this week?",
  "What was the tip about caches?",
  "What did I save about money?",
];

export default function HomeScout({ onOpenAsk }: { onOpenAsk: () => void }) {
  const [query, setQuery] = useState("");
  const [lastQuestion, setLastQuestion] = useState("");
  const [reply, setReply] = useState(
    "I am ready to turn one of your saved posts into a next move.",
  );
  const [mood, setMood] = useState<ScoutMood>("ready");
  const [listening, setListening] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const [notice, setNotice] = useState("");
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  const speak = (text: string) => {
    if (!("speechSynthesis" in window)) {
      setNotice("Voice playback is not available in this browser.");
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.04;
    utterance.pitch = 1.08;
    window.speechSynthesis.speak(utterance);
  };

  const askScout = async (nextQuestion: string) => {
    const cleanedQuestion = nextQuestion.trim();
    if (!cleanedQuestion || mood === "thinking") return;

    setLastQuestion(cleanedQuestion);
    setQuery("");
    setNotice("");
    setMood("thinking");

    try {
      const result = await api<{ answer: string }>("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: cleanedQuestion }),
      });
      setReply(result.answer);
      setMood("bright");
      if (voiceOn) speak(result.answer);
    } catch {
      setReply(
        "I couldn't reach your memory just now. Give it another try in a moment.",
      );
      setMood("ready");
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    askScout(query);
  };

  const toggleListening = () => {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }

    const speechWindow = window as SpeechWindow;
    const Recognition =
      speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;

    if (!Recognition) {
      setNotice("Speech input is unavailable here. You can still type to Scout.");
      return;
    }

    const recognition = new Recognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? "")
        .join(" ")
        .trim();
      setQuery(transcript);
      setNotice(
        transcript
          ? "Voice captured. Send it whenever you are ready."
          : "I did not catch that. Try once more.",
      );
    };
    recognition.onend = () => {
      setListening(false);
      setMood((current) => (current === "listening" ? "ready" : current));
    };
    recognition.onerror = () => {
      setListening(false);
      setMood("ready");
      setNotice("Scout could not access the microphone. Check permission and try again.");
    };
    recognitionRef.current = recognition;
    setMood("listening");
    setListening(true);
    setNotice("Listening. Ask naturally.");
    recognition.start();
  };

  return (
    <section
      aria-label="Scout home assistant"
      className="relative flex h-full flex-col overflow-hidden rounded-xl border border-primary/25 bg-card shadow-xl"
      style={{ minHeight: 280 }}
    >
      <span
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          background:
            "radial-gradient(circle at 94% 5%, var(--primary-50), transparent 34%), linear-gradient(145deg, transparent 45%, var(--card-muted))",
        }}
      />

      <header className="relative flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="scale-[0.72] origin-left">
            <ScoutFace mood={mood} />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-extrabold">Scout</h2>
              <span className="rounded-full bg-success-bg px-1.5 py-0.5 text-[9px] font-bold text-success">
                live
              </span>
            </div>
            <p className="mt-0.5 truncate text-[10px] text-muted">
              {mood === "listening"
                ? "Listening"
                : mood === "thinking"
                  ? "Reading your saves"
                  : mood === "bright"
                    ? "Found a useful signal"
                    : "Your saved-world companion"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setVoiceOn((current) => !current);
            window.speechSynthesis?.cancel();
          }}
          aria-label={voiceOn ? "Turn Scout voice off" : "Turn Scout voice on"}
          title={voiceOn ? "Turn Scout voice off" : "Turn Scout voice on"}
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
            voiceOn ? "bg-primary-50 text-primary" : "text-muted hover:bg-card-muted"
          }`}
        >
          {voiceOn ? <Volume2 size={15} /> : <VolumeX size={15} />}
        </button>
      </header>

      <div className="relative flex min-h-0 flex-1 flex-col justify-center px-4 py-3">
        {lastQuestion && (
          <p className="ml-auto max-w-[78%] rounded-2xl rounded-tr-md bg-primary px-3 py-2 text-[10px] font-semibold leading-relaxed text-white">
            {lastQuestion}
          </p>
        )}
        <div className="mt-2 flex gap-2.5">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary">
            <Sparkles size={14} />
          </span>
          <div className="max-w-[88%] rounded-2xl rounded-tl-md bg-card-muted px-3 py-2.5">
            {mood === "thinking" ? (
              <div className="flex items-center gap-1.5 py-1.5">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary [animation-delay:120ms]" />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary [animation-delay:240ms]" />
              </div>
            ) : (
              <p className="text-[11px] leading-relaxed">{reply}</p>
            )}
          </div>
        </div>
      </div>

      <div className="relative border-t border-border px-4 py-3">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {prompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              disabled={mood === "thinking"}
              onClick={() => askScout(prompt)}
              className="rounded-full border border-border bg-card-muted px-2 py-1 text-[9px] font-bold text-muted transition-colors hover:border-primary hover:bg-primary-50 hover:text-primary disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 rounded-lg border border-border bg-card-muted p-1.5 focus-within:border-primary"
        >
          <button
            type="button"
            onClick={toggleListening}
            aria-label={listening ? "Stop Scout listening" : "Talk to Scout"}
            title={listening ? "Stop Scout listening" : "Talk to Scout"}
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors ${
              listening
                ? "bg-red text-white"
                : "bg-primary-50 text-primary hover:bg-primary hover:text-white"
            }`}
          >
            {listening ? <MicOff size={15} /> : <Mic size={15} />}
          </button>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ask Scout about a save..."
            className="h-8 min-w-0 flex-1 bg-transparent px-0.5 text-[11px] font-medium outline-none placeholder:text-muted-soft"
          />
          <button
            type="submit"
            disabled={!query.trim() || mood === "thinking"}
            aria-label="Send question to Scout"
            title="Send question to Scout"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-white transition-transform hover:-translate-y-0.5 disabled:opacity-45"
          >
            <ArrowUp size={15} strokeWidth={2.6} />
          </button>
        </form>
        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="min-h-3 text-[9px] text-muted">
            {notice || "Ask by voice or type a question."}
          </p>
          <button
            type="button"
            onClick={onOpenAsk}
            className="shrink-0 text-[9px] font-bold text-primary hover:text-primary-600"
          >
            Open full chat
          </button>
        </div>
      </div>
    </section>
  );
}