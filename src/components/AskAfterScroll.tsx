"use client";

import { FormEvent, useRef, useState } from "react";
import {
  ArrowUp,
  Bot,
  Lightbulb,
  ListTodo,
  Mic,
  MicOff,
  PiggyBank,
  Sparkles,
  Volume2,
  VolumeX,
  type LucideIcon,
} from "lucide-react";
import { api, isPaywallResponse, startCheckout } from "@/lib/clientApi";

type AskResult = {
  answer: string;
  sources: Array<{ text: string }>;
};

type Message = {
  id: number;
  role: "assistant" | "user";
  text: string;
  sources?: Array<{ text: string }>;
};

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

const prompts: Array<{ label: string; query: string }> = [
  {
    label: "What needs action?",
    query: "What should I act on from my saved posts?",
  },
  {
    label: "That cache tip",
    query: "What was the tip about caches?",
  },
  {
    label: "Money habits",
    query: "What did I save about money habits?",
  },
];

const starterCards: Array<{
  title: string;
  detail: string;
  promptIndex: number;
  icon: LucideIcon;
  tone: string;
  background: string;
}> = [
  {
    title: "Follow through",
    detail: "Surface the saves waiting on you",
    promptIndex: 0,
    icon: ListTodo,
    tone: "var(--amber)",
    background: "var(--amber-bg)",
  },
  {
    title: "Recall a tip",
    detail: "That engineering advice you saved",
    promptIndex: 1,
    icon: Lightbulb,
    tone: "var(--blue)",
    background: "var(--blue-bg)",
  },
  {
    title: "Money moves",
    detail: "Finance habits from your saves",
    promptIndex: 2,
    icon: PiggyBank,
    tone: "var(--rose)",
    background: "var(--rose-bg)",
  },
];

export default function AskAfterScroll() {
  const [query, setQuery] = useState("");
  const [thinking, setThinking] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const [notice, setNotice] = useState("");
  const [paywalled, setPaywalled] = useState(false);
  const [startingTrial, setStartingTrial] = useState(false);

  const startTrial = async () => {
    if (startingTrial) return;
    setStartingTrial(true);
    try {
      await startCheckout();
    } catch {
      setStartingTrial(false);
    }
  };
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: "assistant",
      text: "Hi, I’m Scout. I remember the things you saved so you do not have to. What are we bringing back today?",
    },
  ]);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  const speak = (text: string) => {
    if (!("speechSynthesis" in window)) {
      setNotice("Voice playback is not available in this browser.");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.04;
    utterance.pitch = 1.05;
    window.speechSynthesis.speak(utterance);
  };

  const sendQuestion = async (nextQuery: string) => {
    const cleanedQuery = nextQuery.trim();
    if (!cleanedQuery || thinking) return;

    setMessages((current) => [
      ...current,
      { id: Date.now(), role: "user", text: cleanedQuery },
    ]);
    setQuery("");
    setThinking(true);
    setNotice("");

    try {
      const result = await api<AskResult>("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: cleanedQuery }),
      });
      setMessages((current) => [
        ...current,
        {
          id: Date.now() + 1,
          role: "assistant",
          text: result.answer,
          sources: result.sources,
        },
      ]);
      if (voiceOn) speak(result.answer);
    } catch (err) {
      if (isPaywallResponse(err)) {
        setPaywalled(true);
        setMessages((current) => [
          ...current,
          {
            id: Date.now() + 1,
            role: "assistant",
            text: "Answering from your saves is part of the plan — start your free week and ask me again.",
          },
        ]);
        setNotice("");
      } else {
        setMessages((current) => [
          ...current,
          {
            id: Date.now() + 1,
            role: "assistant",
            text: "I hit a snag reaching your memory. Give it another try in a moment.",
          },
        ]);
        setNotice("Scout could not reach your memory just now.");
      }
    } finally {
      setThinking(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void sendQuestion(query);
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
      setNotice("Speech input is not available in this browser. You can still type your question.");
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
      setNotice(transcript ? "Voice captured. Review it, then send." : "I did not catch that. Try again.");
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => {
      setListening(false);
      setNotice("I could not hear that. Check microphone permissions and try again.");
    };
    recognitionRef.current = recognition;
    setNotice("Listening… say your question naturally.");
    setListening(true);
    recognition.start();
  };

  return (
    <section className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-[1060px] flex-col py-2">
      <header className="flex items-center justify-between gap-5 border-b border-border pb-5">
        <div className="flex items-center gap-3">
          <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/20">
            <Bot size={23} strokeWidth={2.4} />
            <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-background bg-success" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold tracking-tight">Scout</h1>
              <span className="rounded-full bg-success-bg px-2 py-0.5 text-[10px] font-bold text-success">online</span>
            </div>
            <p className="mt-0.5 text-[12px] text-muted">Your saved-world companion</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setVoiceOn((current) => !current);
            window.speechSynthesis?.cancel();
          }}
          aria-label={voiceOn ? "Turn voice replies off" : "Turn voice replies on"}
          title={voiceOn ? "Turn voice replies off" : "Turn voice replies on"}
          className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-[11px] font-bold transition-colors ${
            voiceOn
              ? "border-primary bg-primary-50 text-primary"
              : "border-border bg-card text-muted hover:border-border-strong"
          }`}
        >
          {voiceOn ? <Volume2 size={15} /> : <VolumeX size={15} />}
          Voice {voiceOn ? "on" : "off"}
        </button>
      </header>

      <div className="flex min-h-[610px] flex-1 flex-col py-8">
        <div className="custom-scroll flex flex-1 flex-col gap-5 overflow-y-auto pr-2">
          {messages.map((message) => (
            <div key={message.id} className="flex flex-col">
              <div
                className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {message.role === "assistant" && (
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary">
                    <Bot size={16} />
                  </span>
                )}
                <div
                  className={`max-w-[72%] rounded-2xl px-4 py-3 text-[13px] leading-relaxed ${
                    message.role === "user"
                      ? "rounded-tr-md bg-primary text-white"
                      : "rounded-tl-md bg-card-muted text-foreground"
                  }`}
                >
                  <p>{message.text}</p>
                  {message.role === "assistant" && message.id !== 1 && (
                    <div className="mt-2 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => speak(message.text)}
                        aria-label="Read this reply aloud"
                        title="Read this reply aloud"
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-muted transition-colors hover:text-primary"
                      >
                        <Volume2 size={12} />
                        Listen
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {message.sources && message.sources.length > 0 && (
                <div
                  className="ml-11 mt-3 max-w-[720px] border-l-2 pl-4"
                  style={{ borderColor: "var(--primary)" }}
                >
                  <p className="text-[10px] font-bold uppercase tracking-[0.09em] text-muted">
                    Found in your saves
                  </p>
                  <div className="mt-2 flex flex-col gap-1.5">
                    {message.sources.map((source, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-2.5 rounded-lg border border-border bg-card px-3 py-2"
                      >
                        <span className="mt-0.5 flex h-4.5 w-5 shrink-0 items-center justify-center rounded bg-primary-50 text-[9px] font-extrabold text-primary">
                          {index + 1}
                        </span>
                        <p className="line-clamp-2 text-[11.5px] leading-relaxed text-muted">
                          {source.text}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

          {thinking && (
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-50 text-primary">
                <Bot size={16} />
              </span>
              <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-md bg-card-muted px-4 py-3">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary [animation-delay:120ms]" />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary [animation-delay:240ms]" />
              </div>
            </div>
          )}

          {messages.length === 1 && !thinking && (
            <div className="animate-fade-up mx-auto my-auto w-full max-w-[730px] py-8">
              <div className="text-center">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-50 text-primary">
                  <Sparkles size={19} />
                </span>
                <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.12em] text-muted">A small nudge</p>
                <h2 className="mt-2 text-2xl font-extrabold tracking-tight">Pick a thread to pull.</h2>
                <p className="mx-auto mt-2 max-w-sm text-[12.5px] leading-relaxed text-muted">
                  Your saves already hold the beginning. Let&apos;s bring one back into the day.
                </p>
              </div>

              <div className="mt-6 grid grid-cols-3 gap-3">
                {starterCards.map((card) => {
                  const prompt = prompts[card.promptIndex];
                  const Icon = card.icon;
                  return (
                    <button
                      key={card.title}
                      type="button"
                      onClick={() => void sendQuestion(prompt.query)}
                      className="group relative flex min-h-[148px] flex-col overflow-hidden rounded-xl border border-border bg-card p-4 text-left shadow-sm transition-all hover:-translate-y-1 hover:border-primary hover:shadow-lg"
                    >
                      <span
                        className="pointer-events-none absolute inset-0 opacity-60"
                        style={{
                          background: `radial-gradient(circle at 88% 8%, ${card.background}, transparent 55%)`,
                        }}
                      />
                      <span
                        className="relative flex h-9 w-9 items-center justify-center rounded-lg"
                        style={{ color: card.tone, background: card.background }}
                      >
                        <Icon size={17} strokeWidth={2.2} />
                      </span>
                      <span className="relative mt-auto block pt-3">
                        <span className="block text-[9px] font-bold uppercase tracking-[0.08em] text-muted">
                          {prompt.label}
                        </span>
                        <span className="mt-1 block text-[13px] font-bold">{card.title}</span>
                        <span className="mt-1 block line-clamp-1 text-[10px] text-muted">{card.detail}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 border-t border-border pt-5">
          <div className="mb-3 flex flex-wrap gap-2">
            {prompts.map((prompt) => (
              <button
                key={prompt.label}
                type="button"
                disabled={thinking}
                onClick={() => void sendQuestion(prompt.query)}
                className="rounded-full border border-border bg-card px-3 py-1.5 text-[11px] font-semibold text-muted transition-colors hover:border-primary hover:bg-primary-50 hover:text-primary disabled:opacity-50"
              >
                {prompt.label}
              </button>
            ))}
          </div>
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 rounded-xl border border-border bg-card p-2 shadow-sm transition-colors focus-within:border-primary"
          >
            <button
              type="button"
              onClick={toggleListening}
              aria-label={listening ? "Stop listening" : "Speak your question"}
              title={listening ? "Stop listening" : "Speak your question"}
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors ${
                listening ? "bg-red text-white" : "bg-primary-50 text-primary hover:bg-primary hover:text-white"
              }`}
            >
              {listening ? <MicOff size={17} /> : <Mic size={17} />}
            </button>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ask Scout about anything you saved…"
              className="h-10 min-w-0 flex-1 bg-transparent px-1 text-[13px] font-medium outline-none placeholder:text-muted-soft"
            />
            <button
              type="submit"
              disabled={thinking || !query.trim()}
              aria-label="Send question"
              title="Send question"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-white transition-transform hover:-translate-y-0.5 disabled:opacity-45"
            >
              <ArrowUp size={18} strokeWidth={2.5} />
            </button>
          </form>
          {paywalled ? (
            <div className="mt-2 flex flex-wrap items-center gap-2.5">
              <span className="text-[10.5px] font-semibold text-primary">
                Try Scout free for 7 days — $5/mo after, cancel anytime.
              </span>
              <button
                type="button"
                onClick={() => void startTrial()}
                disabled={startingTrial}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-[11px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                <Sparkles size={12} />
                {startingTrial ? "Opening checkout…" : "Start free trial"}
              </button>
            </div>
          ) : (
            <p className="mt-2 min-h-4 text-[10.5px] text-muted">
              {notice || "Tap the microphone to dictate, or type a question."}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
