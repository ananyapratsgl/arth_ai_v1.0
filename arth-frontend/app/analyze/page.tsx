
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type ResultStatus = "low" | "in_range" | "high" | "critical" | "unknown";

type TestResult = {
  test_name: string;
  value: string | number | null;
  unit: string | null;
  reference_range: {
    low: number | null;
    high: number | null;
    source_text: string | null;
  } | null;
  status: ResultStatus;
  explanation: string;
  source_location: string | null;
  validated: boolean;
  needs_review: boolean;
};

type Analysis = {
  report_id: string;
  language: string;
  summary: string;
  results: TestResult[];
  limitations: string[];
};

type SavedReport = {
  analysis: Analysis;
  filename: string;
  reportType: string;
};

const statuses: Record<
  ResultStatus,
  { label: string; color: string; background: string }
> = {
  in_range: {
    label: "Within the report's range",
    color: "#18794e",
    background: "#e6f6ed",
  },
  low: {
    label: "Below the report's range",
    color: "#8b5b0b",
    background: "#fff3d8",
  },
  high: {
    label: "Above the report's range",
    color: "#8b5b0b",
    background: "#fff3d8",
  },
  critical: {
    label: "Needs prompt review",
    color: "#b42332",
    background: "#ffeaec",
  },
  unknown: {
    label: "Could not determine",
    color: "#5d6472",
    background: "#edf0f4",
  },
};

function formatUnit(unit: string | null): string {
  if (!unit) return "";

  return unit
    .replace(/\s*[×x*]?\s*10\^9\b/g, " × 10⁹")
    .replace(/\s*[×x*]?\s*10\^12\b/g, " × 10¹²")
    .replace(/\s*[×x*]?\s*10\^3\b/g, " × 10³")
    .replace(/\s*[×x*]?\s*10\^6\b/g, " × 10⁶")
    .trim();
}

function formatRange(
  range: TestResult["reference_range"],
  unit: string | null
) {
  if (!range) return "Not provided in the report";

  if (range.source_text?.trim()) return formatUnit(range.source_text);

  const formattedUnit = formatUnit(unit);
  const suffix = formattedUnit ? ` ${formattedUnit}` : "";

  if (range.low != null && range.high != null) {
    return `${range.low}–${range.high}${suffix}`;
  }

  if (range.low != null) return `At least ${range.low}${suffix}`;
  if (range.high != null) return `Up to ${range.high}${suffix}`;

  return "Not provided in the report";
}

function TestCard({
  result,
  index,
}: {
  result: TestResult;
  index: number;
}) {
  const status = statuses[result.status] ? result.status : "unknown";
  const info = statuses[status];

  return (
    <article
      style={{
        padding: 22,
        background: "#fff",
        border: "1px solid #e8e4ef",
        borderRadius: 18,
        boxShadow: "0 3px 14px rgba(37, 28, 70, 0.035)",
        minWidth: 0,
      }}
    >
      <div
        style={{
          color: "#858092",
          fontSize: 11,
          fontWeight: 750,
          letterSpacing: 1,
          marginBottom: 8,
        }}
      >
        TEST {String(index + 1).padStart(2, "0")}
      </div>

      <h3
        style={{
          margin: "0 0 18px",
          fontSize: 18,
          lineHeight: 1.45,
          color: "#29243a",
          overflowWrap: "anywhere",
        }}
      >
        {result.test_name || "Unnamed test"}
      </h3>

      <div style={{ color: "#827e91", fontSize: 12, marginBottom: 5 }}>
        Your reported result
      </div>

      <div
        style={{
          fontSize: 27,
          fontWeight: 800,
          color: "#29243a",
          overflowWrap: "anywhere",
          marginBottom: 14,
        }}
      >
        {result.value == null || result.value === ""
          ? "Not provided"
          : String(result.value)}
        {result.unit && (
          <span
            style={{
              marginLeft: 6,
              fontSize: 13,
              fontWeight: 500,
              color: "#777286",
            }}
          >
            {formatUnit(result.unit)}
          </span>
        )}
      </div>

      <span
        style={{
          display: "inline-block",
          padding: "7px 11px",
          borderRadius: 999,
          fontSize: 12,
          fontWeight: 700,
          color: info.color,
          background: info.background,
          lineHeight: 1.5,
        }}
      >
        {info.label}
      </span>

      <div
        style={{
          marginTop: 18,
          padding: 13,
          background: "#f8f7fb",
          borderRadius: 12,
        }}
      >
        <div style={{ color: "#827e91", fontSize: 11, marginBottom: 5 }}>
          Reference range shown on your report
        </div>
        <div
          style={{
            color: "#3f394f",
            fontSize: 13,
            fontWeight: 650,
            lineHeight: 1.7,
            overflowWrap: "anywhere",
          }}
        >
          {formatRange(result.reference_range, result.unit)}
        </div>
      </div>

      <div
        style={{
          marginTop: 17,
          color: "#5f5a6e",
          fontSize: 14,
          lineHeight: 1.85,
          overflowWrap: "anywhere",
        }}
      >
        <strong style={{ display: "block", color: "#393248", marginBottom: 5 }}>
          What this means
        </strong>
        {result.explanation || "ARTH could not provide an explanation for this result."}
      </div>

      {result.needs_review && (
        <p
          style={{
            margin: "15px 0 0",
            paddingTop: 12,
            borderTop: "1px solid #f0edf4",
            color: "#79551a",
            fontSize: 12,
            lineHeight: 1.7,
          }}
        >
          Please discuss this result with a qualified healthcare professional, who can interpret it in the context of your health and the full report.
        </p>
      )}
    </article>
  );
}

export default function AnalyzePage() {
  const router = useRouter();
  const [report, setReport] = useState<SavedReport | null>(null);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("arth-analysis");

      if (!stored) return;

      const parsed = JSON.parse(stored) as SavedReport;

      if (
        parsed.analysis &&
        typeof parsed.analysis.summary === "string" &&
        Array.isArray(parsed.analysis.results)
      ) {
        setReport(parsed);
      }
    } catch {
      setReport(null);
    }
  }, []);

  if (!report) {
    return (
      <main className="app-shell">
        <aside className="sidebar">
          <a className="brand" href="/">
            <span className="brand-mark">✳</span>
            <span>
              arth<span className="brand-dot">.</span>
            </span>
          </a>
          <div className="side-label">WORKSPACE</div>
          <a className="nav-item" href="/">
            <span>↥</span> Upload a report
          </a>
          <a className="nav-item active" href="/analyze">
            <span>▤</span> Report results
          </a>
          <a className="nav-item" href="/ask-arth">
            <span>✳</span> Ask ARTH
          </a>
        </aside>

        <section className="main-area">
          <header className="topbar">
            <div className="breadcrumb">
              Workspace <span>/</span> Report results
            </div>
          </header>

          <div className="content">
            <section
              className="feature-card"
              style={{ maxWidth: 650, margin: "60px auto", textAlign: "center" }}
            >
              <div className="card-icon purple-icon" style={{ margin: "0 auto 18px" }}>
                ▤
              </div>
              <h2 style={{ color: "#302747" }}>No report to show yet</h2>
              <p style={{ color: "#777087", lineHeight: 1.8 }}>
                Upload a PDF first. ARTH will analyse it and bring you back
                here to see the results.
              </p>
              <button
                type="button"
                className="primary-button"
                onClick={() => router.push("/")}
              >
                Upload a report <span>↗</span>
              </button>
            </section>
          </div>
        </section>
      </main>
    );
  }

  const { analysis } = report;

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="/">
          <span className="brand-mark">✳</span>
          <span>
            arth<span className="brand-dot">.</span>
          </span>
        </a>

        <div className="side-label">WORKSPACE</div>
        <a className="nav-item" href="/">
          <span>↥</span> Upload a report
        </a>
        <a className="nav-item active" href="/analyze">
          <span>▤</span> Report results
        </a>
          <a className="nav-item" href="/ask-arth">
            <span>✳</span> Ask ARTH
          </a>

        <div className="sidebar-bottom">
          <div className="help-icon">✳</div>
          <strong>Your health, clearer.</strong>
          <p>Understand your reports, one step at a time.</p>
          <div className="sidebar-foot">
            Built with care <span>♥</span>
          </div>
        </div>
      </aside>

      <section className="main-area">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <span>/</span> Report results
          </div>
          <div className="top-actions">
            <button
              type="button"
              className="primary-button"
              onClick={() => router.push("/")}
              style={{ width: "auto", margin: 0 }}
            >
              + New report
            </button>
          </div>
        </header>

        <div className="content">
          <div className="eyebrow">
            <span>✦</span> YOUR REPORT, EXPLAINED
          </div>

          <h1 style={{ marginTop: 12 }}>
            Let’s make sense
            <br />
            <span>of your results.</span>
          </h1>

          <p className="subtitle">
            Here is your report, explained in simpler words.
          </p>

          <section
            style={{
              marginTop: 28,
              padding: 26,
              borderRadius: 22,
              background:
                "linear-gradient(135deg, #f0edff 0%, #f8f6ff 60%, #eef9f5 100%)",
              border: "1px solid #e7e0f7",
            }}
          >
            <div
              className="card-kicker"
              style={{ color: "#756b98", marginBottom: 9 }}
            >
              REPORT TYPE
            </div>

            <h2
              style={{
                margin: "0 0 12px",
                color: "#302747",
                fontSize: 25,
                lineHeight: 1.4,
              }}
            >
              {report.reportType}
            </h2>

            <p
              style={{
                margin: 0,
                color: "#6a627d",
                fontSize: 13,
                overflowWrap: "anywhere",
              }}
            >
              File: {report.filename}
            </p>

            <div
              style={{
                marginTop: 23,
                paddingTop: 20,
                borderTop: "1px solid #e4def4",
              }}
            >
              <h3
                style={{
                  margin: "0 0 10px",
                  color: "#302747",
                  fontSize: 18,
                }}
              >
                The short version
              </h3>

              <p
                style={{
                  margin: 0,
                  color: "#504961",
                  fontSize: 15,
                  lineHeight: 1.95,
                  whiteSpace: "pre-wrap",
                  overflowWrap: "anywhere",
                }}
              >
                {analysis.summary || "No summary was returned."}
              </p>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
                <button onClick={() => {
                  if (!("speechSynthesis" in window)) {
                    alert("Voice reading is not supported by this browser.");
                    return;
                  }
                  window.speechSynthesis.cancel();

                  const language = sessionStorage.getItem("arth-language") || "en";
                  const voiceLanguages: Record<string, string> = {
                    en: "en-IN", kn: "kn-IN", hi: "hi-IN",
                    mr: "mr-IN", ta: "ta-IN", te: "te-IN",
                    bn: "bn-IN", es: "es-ES", fr: "fr-FR", ru: "ru-RU",
                  };

                  const fullText = (analysis.summary || "No summary was returned.").trim();
                  const chunks = fullText.match(/[^.!?。！？\n]+[.!?。！？\n]*/g) || [fullText];
                  let index = 0;

                  const speakNext = () => {
                    if (index >= chunks.length) return;
                    const part = chunks[index++].trim();
                    if (!part) {
                      speakNext();
                      return;
                    }
                    const utterance = new SpeechSynthesisUtterance(part);



                    const targetLanguage = voiceLanguages[language] || "en-IN";
                    const availableVoices = window.speechSynthesis.getVoices();

                    if (language === "en") {
                      // Prefer Samantha explicitly for English summaries.
                      // Fall back to a female English voice if Samantha is unavailable.
                      const preferredVoice =
                        availableVoices.find((voice) => voice.name === "Samantha") ||
                        availableVoices.find((voice) => voice.name === "Google UK English Female");

                      if (preferredVoice) {
                        utterance.voice = preferredVoice;
                        utterance.lang = preferredVoice.lang;
                      } else {
                        utterance.lang = "en-US";
                      }

                      utterance.rate = 0.95;
                      utterance.pitch = 1.0;
                    } else {
                      utterance.lang = targetLanguage;

                      // Keep the selected language's matching voice for other languages.
                      const matchingVoice = availableVoices.find(
                        (voice) => voice.lang.toLowerCase() === targetLanguage.toLowerCase()
                      );
                      if (matchingVoice) utterance.voice = matchingVoice;
                    }

                    utterance.onend = speakNext;
                    utterance.onerror = (event) => {
                      if (event.error !== "canceled" && event.error !== "interrupted") {
                        console.error("Speech reading error:", event.error);
                      }
                    };
                    window.speechSynthesis.speak(utterance);
                  };

                  const synth = window.speechSynthesis;
                  let started = false;
                  const startPlayback = () => {
                    if (started) return;
                    const voices = synth.getVoices();
                    if (!voices.length) return;
                    started = true;
                    synth.removeEventListener("voiceschanged", startPlayback);
                    speakNext();
                  };
                  startPlayback();
                  if (!started) {
                    synth.addEventListener("voiceschanged", startPlayback);
                    window.setTimeout(startPlayback, 2000);
                  }
                }} style={{ padding: "8px 12px", borderRadius: 9, border: "1px solid #ddd2f2", background: "#fff", color: "#6845a6", cursor: "pointer" }}>
                  🔊 Read full summary
                </button>
                <button onClick={() => {
                  if (!("speechSynthesis" in window)) return;
                  if (window.speechSynthesis.paused) window.speechSynthesis.resume();
                  else if (window.speechSynthesis.speaking) window.speechSynthesis.pause();
                }} style={{ padding: "8px 12px", borderRadius: 9, border: "1px solid #ddd2f2", background: "#fff", color: "#6845a6", cursor: "pointer" }}>
                  ⏯ Pause / Resume
                </button>
                <button onClick={() => {
                  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
                }} style={{ padding: "8px 12px", borderRadius: 9, border: "1px solid #ddd2f2", background: "#fff", color: "#6845a6", cursor: "pointer" }}>
                  ⏹ Stop
                </button>
              </div>
            </div>

            <div
              style={{
                marginTop: 20,
                display: "inline-flex",
                gap: 8,
                padding: "10px 13px",
                background: "#fff",
                borderRadius: 12,
                color: "#504961",
                fontSize: 13,
              }}
            >
              <strong>{analysis.results.length}</strong>
              {analysis.results.length === 1 ? "test result" : "test results"} found
            </div>
          </section>

          <section style={{ marginTop: 32 }}>
            <div className="card-kicker">YOUR TESTS</div>
            <h2
              style={{
                margin: "7px 0 8px",
                fontSize: 24,
                color: "#29243a",
              }}
            >
              Results, one by one
            </h2>
            <p
              style={{
                margin: "0 0 20px",
                color: "#777087",
                fontSize: 13,
                lineHeight: 1.8,
              }}
            >
              Each result includes the value in your report and an explanation
              in everyday language. Reference ranges can differ between labs.
            </p>

            {analysis.results.length > 0 ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(min(100%, 290px), 1fr))",
                  gap: 16,
                }}
              >
                {analysis.results.map((result, index) => (
                  <TestCard
                    key={`${result.test_name}-${index}`}
                    result={result}
                    index={index}
                  />
                ))}
              </div>
            ) : (
              <div
                className="info-panel"
                style={{ padding: 24, lineHeight: 1.8 }}
              >
                ARTH could not identify individual test results from this
                document. Check the report with a healthcare professional.
              </div>
            )}
          </section>

          {analysis.limitations.length > 0 && (
            <section
              style={{
                marginTop: 24,
                padding: 20,
                borderRadius: 16,
                background: "#fff8e9",
                border: "1px solid #f2e4c5",
              }}
            >
              <h3 style={{ margin: "0 0 10px", color: "#76551d" }}>
                What ARTH could not confirm
              </h3>
              <ul
                style={{
                  margin: 0,
                  paddingLeft: 20,
                  color: "#6f5b38",
                  fontSize: 13,
                  lineHeight: 1.9,
                }}
              >
                {analysis.limitations.map((item, index) => (
                  <li key={`${index}-${item}`}>{item}</li>
                ))}
              </ul>
            </section>
          )}

          <footer className="disclaimer" style={{ marginTop: 30 }}>
            <span>ⓘ</span>
            <p>
              <strong>A note about these results:</strong> ARTH uses AI to
              explain medical information in simpler words. It can make
              mistakes, and this is not a diagnosis. Please discuss your
              results with a qualified healthcare professional.
            </p>
          </footer>

          <div className="page-footer">
            ARTH · A clearer view of your health
            <span>Made for humans, with care ✳</span>
          </div>
        </div>
      </section>
    </main>
  );
}
