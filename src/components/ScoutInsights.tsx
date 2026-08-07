"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CalendarClock,
  CalendarPlus,
  Check,
  ListTodo,
  LoaderCircle,
} from "lucide-react";
import { api } from "@/lib/clientApi";
import { categoryTint, categoryLabel } from "@/lib/ui";
import type { Todo, EventSuggestion } from "@/lib/types";

function formatStart(startTs: string | null): string {
  if (!startTs) return "Anytime";
  const d = new Date(startTs);
  if (Number.isNaN(d.getTime())) return "Anytime";
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function PulseRows() {
  return (
    <div className="flex flex-col gap-2.5">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-11 animate-pulse rounded-lg bg-card-muted"
          style={{ animationDelay: `${i * 120}ms` }}
        />
      ))}
    </div>
  );
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed border-border bg-card-muted px-3 py-4 text-center text-[11.5px] leading-relaxed text-muted">
      {children}
    </p>
  );
}

export default function ScoutInsights({
  refreshKey = 0,
  googleConnected = false,
}: {
  refreshKey?: number;
  googleConnected?: boolean;
}) {
  const [todos, setTodos] = useState<Todo[] | null>(null);
  const [events, setEvents] = useState<EventSuggestion[] | null>(null);
  const [error, setError] = useState("");
  const [addingId, setAddingId] = useState("");

  const load = useCallback(() => {
    setError("");
    api<{ todos: Todo[] }>("/api/todos")
      .then((r) => setTodos(r.todos))
      .catch(() => setError("Scout couldn't reach your saves — refresh to retry."));
    api<{ events: EventSuggestion[] }>("/api/events")
      .then((r) => setEvents(r.events))
      .catch(() => setError("Scout couldn't reach your saves — refresh to retry."));
  }, []);

  useEffect(load, [load, refreshKey]);

  const toggleTodo = async (todo: Todo) => {
    const next = !todo.done;
    setTodos((prev) =>
      prev?.map((t) => (t.id === todo.id ? { ...t, done: next } : t)) ?? prev,
    );
    try {
      await api<{ ok: true }>(`/api/todos/${todo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: next }),
      });
    } catch {
      setTodos((prev) =>
        prev?.map((t) => (t.id === todo.id ? { ...t, done: todo.done } : t)) ??
        prev,
      );
    }
  };

  const addEvent = async (event: EventSuggestion) => {
    if (event.added || addingId) return;
    setAddingId(event.id);
    try {
      await api<{ ok: true }>(`/api/events/${event.id}/add`, { method: "POST" });
      setEvents((prev) =>
        prev?.map((e) => (e.id === event.id ? { ...e, added: true } : e)) ?? prev,
      );
    } catch {
      setError("That event didn't make it to your calendar — try again.");
    } finally {
      setAddingId("");
    }
  };

  const openTodos = todos?.filter((t) => !t.done).length ?? 0;

  return (
    <section className="border-t border-border pt-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <span className="panel-eyebrow">02 / Scout&apos;s next moves</span>
          <h2 className="mt-1 text-lg font-extrabold tracking-tight">
            Scout found the signals worth acting on.
          </h2>
        </div>
        {todos && events && (todos.length > 0 || events.length > 0) && (
          <span className="rounded-full bg-card-muted px-2 py-1 text-[10px] font-bold text-muted">
            {openTodos} open · {events.length} events
          </span>
        )}
      </div>

      {error && (
        <p
          className="mt-3 rounded-lg border px-3 py-2 text-[11px] font-semibold"
          style={{
            borderColor: "var(--red)",
            background: "var(--red-bg)",
            color: "var(--red)",
          }}
        >
          {error}
        </p>
      )}

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <article className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ color: "var(--amber)", background: "var(--amber-bg)" }}
            >
              <ListTodo size={16} strokeWidth={2.3} />
            </span>
            <p className="text-[10px] font-bold uppercase tracking-[0.07em] text-muted">
              Do next
            </p>
          </div>
          <div className="mt-4 flex flex-col gap-2">
            {todos === null ? (
              <PulseRows />
            ) : todos.length === 0 ? (
              <EmptyNote>
                Nothing to do yet. Connect X and hit Sync — Scout pulls the
                actions out of your saves.
              </EmptyNote>
            ) : (
              todos.map((todo) => (
                <div
                  key={todo.id}
                  className="flex items-center gap-2.5 rounded-lg border border-border bg-card-muted px-2.5 py-2 transition-colors hover:border-border-strong"
                  style={{ opacity: todo.done ? 0.6 : 1 }}
                >
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={todo.done}
                    aria-label={
                      todo.done
                        ? `Mark "${todo.title}" not done`
                        : `Mark "${todo.title}" done`
                    }
                    onClick={() => toggleTodo(todo)}
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-all hover:-translate-y-0.5"
                    style={{
                      background: todo.done ? "var(--success-bg)" : "var(--card)",
                      color: todo.done ? "var(--success)" : "var(--muted)",
                      borderColor: todo.done ? "transparent" : "var(--border-strong)",
                    }}
                  >
                    {todo.done && <Check size={13} strokeWidth={3} />}
                  </button>
                  <span
                    className={`min-w-0 flex-1 truncate text-[12.5px] font-semibold ${
                      todo.done ? "line-through" : ""
                    }`}
                  >
                    {todo.title}
                  </span>
                  <span
                    className="shrink-0 rounded-md px-1.5 py-0.5 text-[9.5px] font-bold"
                    style={categoryTint[todo.category] ?? categoryTint.other}
                  >
                    {categoryLabel[todo.category] ?? todo.category}
                  </span>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span
                className="flex h-8 w-8 items-center justify-center rounded-lg"
                style={{ color: "var(--blue)", background: "var(--blue-bg)" }}
              >
                <CalendarClock size={16} strokeWidth={2.3} />
              </span>
              <p className="text-[10px] font-bold uppercase tracking-[0.07em] text-muted">
                Put it on the calendar
              </p>
            </div>
            {!googleConnected && events !== null && events.length > 0 && (
              <a
                href="/api/connect/google"
                className="text-[10px] font-bold text-primary hover:text-primary-600"
              >
                Connect Calendar
              </a>
            )}
          </div>
          <div className="mt-4 flex flex-col gap-2">
            {events === null ? (
              <PulseRows />
            ) : events.length === 0 ? (
              <EmptyNote>
                No time-sensitive saves yet. When a save mentions a date, it
                shows up here ready for your calendar.
              </EmptyNote>
            ) : (
              events.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center gap-2.5 rounded-lg border border-border bg-card-muted px-2.5 py-2 transition-colors hover:border-border-strong"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-semibold">
                      {event.title}
                    </p>
                    <p className="mt-0.5 text-[10px] font-medium text-muted">
                      {formatStart(event.startTs)} · {event.durationMin} min
                    </p>
                  </div>
                  {event.added ? (
                    <span
                      className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-bold"
                      style={{
                        background: "var(--success-bg)",
                        color: "var(--success)",
                      }}
                    >
                      <Check size={12} strokeWidth={3} />
                      Added
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={addingId === event.id}
                      onClick={() => addEvent(event)}
                      aria-label={`Add "${event.title}" to Google Calendar`}
                      title="Add to Google Calendar"
                      className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-primary-50 px-2 py-1.5 text-[10px] font-bold text-primary transition-all hover:-translate-y-0.5 hover:bg-primary hover:text-white disabled:cursor-wait disabled:opacity-60"
                    >
                      {addingId === event.id ? (
                        <LoaderCircle size={12} className="animate-spin" />
                      ) : (
                        <CalendarPlus size={12} />
                      )}
                      Add
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </article>
      </div>
    </section>
  );
}
