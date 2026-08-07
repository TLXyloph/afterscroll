import { economics } from "@/lib/data";
import CountUp from "./CountUp";

export default function ProofCard() {
  const { naiveTokens, retrievedTokens, costSaved } = economics.thisQuery;
  const retrievedWidth = Math.max((retrievedTokens / naiveTokens) * 100, 2.5);

  return (
    <div className="card flex flex-col justify-between gap-5 p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
      <div className="flex items-start justify-between">
        <span className="panel-eyebrow">Token economy</span>
        <span
          className="flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10.5px] font-semibold"
          style={{ background: "var(--success-bg)", color: "var(--success)" }}
        >
          <span className="relative flex h-1.5 w-1.5">
            <span
              className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-70"
              style={{ background: "var(--success)" }}
            />
            <span
              className="relative inline-flex h-1.5 w-1.5 rounded-full"
              style={{ background: "var(--success)" }}
            />
          </span>
          LIVE
        </span>
      </div>

      <div>
        <p
          className="num-glow tabular text-[44px] font-extrabold leading-none tracking-tight"
          style={{ color: "var(--primary)" }}
        >
          <CountUp value={97} suffix="%" />
        </p>
        <p className="mt-2 text-[13px] text-muted">
          less context sent to the AI on every question
        </p>
      </div>

      <div className="flex flex-col gap-2.5">
        <div>
          <div className="flex items-center justify-between text-[11px] text-muted">
            <span>Without memory</span>
            <span className="tabular">
              {naiveTokens.toLocaleString()} tokens
            </span>
          </div>
          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-primary-50">
            <div
              className="animate-bar h-full w-full rounded-full"
              style={{ background: "var(--primary)", opacity: 0.45 }}
            />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between text-[11px] text-muted">
            <span style={{ color: "var(--primary)" }} className="font-medium">
              With AfterScroll
            </span>
            <span className="tabular">
              {retrievedTokens.toLocaleString()} tokens
            </span>
          </div>
          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-primary-50">
            <div
              className="animate-bar h-full rounded-full"
              style={{ width: `${retrievedWidth}%`, background: "var(--primary)" }}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-5 border-t border-border pt-3.5 text-[12.5px]">
        <span className="text-muted">
          <b className="font-bold" style={{ color: "var(--success)" }}>
            ${costSaved.toFixed(2)}
          </b>{" "}
          saved / query
        </span>
        <span className="text-muted">
          <b className="font-bold text-foreground">
            <CountUp value={economics.actionsGenerated} />
          </b>{" "}
          actions created
        </span>
      </div>
    </div>
  );
}
