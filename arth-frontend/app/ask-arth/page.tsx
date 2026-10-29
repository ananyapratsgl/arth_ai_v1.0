"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

type Message = {
  role: "user" | "assistant";
  text: string;
  note?: string;
};

const suggestions = [
  "What does a CBC blood test measure?",
  "What is the difference between viral and bacterial infections?",
  "What questions should I ask my doctor about my test results?",
  "How can I understand medicine labels safely?",
];


export default function AskArth() {
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("arth-analysis");
      if (!stored) return;

      const parsed = JSON.parse(stored);
      const analysis = parsed.analysis;
      if (!analysis) return;

      const context = [
        parsed.filename ? `Uploaded file: ${parsed.filename}` : "",
        analysis.summary ? `Report summary: ${analysis.summary}` : "",
        Array.isArray(analysis.results)
          ? "Report results:\n" + analysis.results.map((item: any) =>
              typeof item === "string" ? item : JSON.stringify(item)
            ).join("\n")
          : "",
      ].filter(Boolean).join("\n");

      if (context.trim()) {
        setReportContext(context.slice(0, 12000));
        setReportFilename(parsed.filename || "");
        setReportReady(true);
      }
    } catch {
      setReportReady(false);
    }
  }, []);

  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reportContext, setReportContext] = useState("");
  const [reportFilename, setReportFilename] = useState("");
  const [reportReady, setReportReady] = useState(false);

  function speakText(text: string) {
    if (!("speechSynthesis" in window)) {
      setError("Voice reading isn't supported by this browser.");
      return;
    }
    window.speechSynthesis.cancel();
    const language = sessionStorage.getItem("arth-language") || "en";
    const voiceLanguage: Record<string, string> = {
      en: "en-IN", kn: "kn-IN", hi: "hi-IN", mr: "mr-IN",
      ta: "ta-IN", te: "te-IN", bn: "bn-IN",
      es: "es-ES", fr: "fr-FR", ru: "ru-RU",
    };
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = voiceLanguage[language] || "en-IN";
    window.speechSynthesis.speak(utterance);
  }

  function pauseOrResumeSpeech() {
    if (!("speechSynthesis" in window)) return;
    if (window.speechSynthesis.paused) window.speechSynthesis.resume();
    else if (window.speechSynthesis.speaking) window.speechSynthesis.pause();
  }

  async function ask(value?: string) {
    const q = (value ?? question).trim();
    if (!q || loading) return;

    const previous = messages;
    setMessages((old) => [...old, { role: "user", text: q }]);
    setQuestion("");
    setError("");
    setLoading(true);

    try {
      const context = previous
        .slice(-8)
        .map((m) => `${m.role === "user" ? "User" : "Ask ARTH"}: ${m.text}`)
        .join("\n");

      const response = await fetch(`${API_URL}/api/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: context ? `${context}\nUser: ${q}` : q,
          language: sessionStorage.getItem("arth-language") || "en",
          report_context: reportContext || "General medical question",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : "Ask ARTH couldn't answer just now. Please try again."
        );
      }

      if (typeof data.answer !== "string" || !data.answer.trim()) {
        throw new Error("The server returned an empty answer. Please try again.");
      }

      setMessages((old) => [
        ...old,
        {
          role: "assistant",
          text: data.answer,
          note: data.evidence_note,
        },
      ]);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not connect to ARTH. Check that the backend is running."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{
      minHeight: "100vh",
      background: "#f8f6fc",
      color: "#29213b",
      fontFamily: "Arial, sans-serif",
      padding: "0 18px 28px",
    }}>
      {reportReady && (
        <div style={{
          maxWidth: 900, margin: "12px auto 0", padding: "12px 16px",
          background: "#eee7fa", borderRadius: 12, fontSize: 14,
        }}>
          💜 Using uploaded report{reportFilename ? `: ${reportFilename}` : ""}.
          Answers may be incomplete; confirm medical decisions with a clinician.
        </div>
      )}
      <header style={{
        maxWidth: 900, margin: "0 auto", height: 72,
        display: "flex", alignItems: "center",
        justifyContent: "space-between",
        borderBottom: "1px solid #e9e2f3",
      }}>
        <Link href="/" style={{
          color: "#6941b5", fontSize: 25, fontWeight: 800,
          textDecoration: "none",
        }}>✳ arth<span style={{ color: "#a78bfa" }}>.</span></Link>
        <nav style={{ display: "flex", gap: 18, fontSize: 14 }}>
          <Link href="/" style={{ color: "#6d5b87" }}>Upload report</Link>
          <Link href="/analyze" style={{ color: "#6d5b87" }}>Results</Link>
        </nav>
      </header>

      <section style={{ maxWidth: 800, margin: "35px auto 0" }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          border: "1px solid #e4d9fb", borderRadius: 30,
          padding: "8px 13px", background: "#f0eaff",
          color: "#6941b5", fontSize: 13, fontWeight: 700,
        }}>✦ YOUR HEALTH COMPANION</div>

        <h1 style={{
          fontSize: "clamp(32px, 6vw, 48px)",
          lineHeight: 1.12, letterSpacing: "-1.5px",
          margin: "18px 0 12px",
        }}>
          Ask ARTH<span style={{ color: "#8057cf" }}>.</span>
        </h1>

        <p style={{
          color: "#756b86", lineHeight: 1.7, maxWidth: 590,
          margin: "0 0 24px",
        }}>
          Medical questions can be confusing. Ask about health, medical
          terms, tests and medicines, and get an explanation in simpler words.
        </p>

        <div style={{
          background: "#fff", border: "1px solid #e9e2f3",
          borderRadius: 20, minHeight: 350, padding: 20,
          boxShadow: "0 8px 30px rgba(65, 39, 100, 0.05)",
        }}>
          {messages.length === 0 ? (
            <div style={{ padding: "14px 0 20px" }}>
              <div style={{
                width: 48, height: 48, borderRadius: 16,
                background: "#eee6ff", color: "#7650bf",
                display: "grid", placeItems: "center",
                fontSize: 25, marginBottom: 18,
              }}>✳</div>
              <h2 style={{ fontSize: 21, margin: "0 0 8px" }}>
                What would you like to understand?
              </h2>
              <p style={{ color: "#81778f", fontSize: 14, lineHeight: 1.6 }}>
                Start with one of these questions, or type your own below.
              </p>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
                gap: 10, marginTop: 22,
              }}>
                {suggestions.map((s) => (
                  <button key={s} onClick={() => void ask(s)} style={{
                    textAlign: "left", border: "1px solid #e8e0f3",
                    background: "#fcfbff", borderRadius: 12,
                    padding: 14, color: "#5d4b79", lineHeight: 1.5,
                    cursor: "pointer", fontSize: 13,
                  }}>{s} <span style={{ color: "#9876d9" }}>↗</span></button>
                ))}
              </div>
            </div>
          ) : (
            <div style={{
              display: "flex", flexDirection: "column", gap: 18,
            }}>
              {messages.map((m, i) => (
                <div key={i} style={{
                  alignSelf: m.role === "user" ? "flex-end" : "stretch",
                  maxWidth: m.role === "user" ? "88%" : "100%",
                }}>
                  <div style={{
                    fontSize: 12, color: "#897d9d",
                    marginBottom: 7,
                    textAlign: m.role === "user" ? "right" : "left",
                  }}>{m.role === "user" ? "YOU" : "✳ ASK ARTH"}</div>
                  <div style={{
                    background: m.role === "user" ? "#7650bf" : "#f8f6fc",
                    color: m.role === "user" ? "#fff" : "#382c4d",
                    borderRadius: 14, padding: "13px 15px",
                    lineHeight: 1.75, fontSize: 14,
                    whiteSpace: "pre-wrap", overflowWrap: "anywhere",
                  }}>{m.text}</div>
                  {m.role === "assistant" && (
                    <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                      <button onClick={() => speakText(m.text)}
                        style={{ padding: "7px 11px", borderRadius: 9, border: "1px solid #ddd2f2", background: "#fff", color: "#6845a6", cursor: "pointer" }}>
                        🔊 Listen
                      </button>
                      <button onClick={pauseOrResumeSpeech}
                        style={{ padding: "7px 11px", borderRadius: 9, border: "1px solid #ddd2f2", background: "#fff", color: "#6845a6", cursor: "pointer" }}>
                        ⏯ Pause / Resume
                      </button>
                      <button onClick={() => window.speechSynthesis?.cancel()}
                        style={{ padding: "7px 11px", borderRadius: 9, border: "1px solid #ddd2f2", background: "#fff", color: "#6845a6", cursor: "pointer" }}>
                        ⏹ Stop
                      </button>
                    </div>
                  )}
                  {m.note && m.role === "assistant" && (
                    <p style={{ color: "#8a7b9b", fontSize: 12, lineHeight: 1.5 }}>
                      {m.note}
                    </p>
                  )}
                </div>
              ))}
              {loading && (
                <p style={{ color: "#7650bf", fontSize: 14 }}>
                  ✳ Ask ARTH is preparing an answer…
                </p>
              )}
            </div>
          )}

          {error && (
            <p role="alert" style={{
              color: "#a52b49", background: "#fff0f3",
              padding: 12, borderRadius: 10, fontSize: 13,
            }}>{error}</p>
          )}

          <form onSubmit={(e) => {
            e.preventDefault();
            void ask();
          }} style={{
            display: "flex", gap: 10, marginTop: 20,
            border: "1px solid #ded3ef", borderRadius: 15,
            padding: 8, alignItems: "flex-end",
          }}>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void ask();
                }
              }}
              placeholder="Ask a medical question…"
              aria-label="Your medical question"
              rows={2}
              maxLength={4000}
              style={{
                flex: 1, minWidth: 0, border: 0, outline: 0,
                resize: "vertical", padding: 10, fontSize: 14,
                lineHeight: 1.5, fontFamily: "inherit",
                background: "transparent", color: "#29213b",
              }}
            />
            <button type="submit" disabled={loading || !question.trim()} style={{
              background: loading || !question.trim() ? "#c9b9e6" : "#7650bf",
              color: "#fff", border: 0, borderRadius: 11,
              padding: "12px 17px", fontWeight: 700,
              cursor: loading ? "wait" : "pointer",
            }}>{loading ? "…" : "Ask ↑"}</button>
          </form>
          <p style={{
            color: "#978ca5", fontSize: 11, margin: "10px 3px 0",
          }}>Don't include your name, address, phone number or other personal identifiers.</p>
        </div>

        <div style={{
          marginTop: 17, padding: 15, borderRadius: 13,
          background: "#f0eaff", color: "#66517f",
          fontSize: 12, lineHeight: 1.7,
        }}>
          <strong>Important health note</strong><br />
          Ask ARTH provides general health information, not a diagnosis or
          a substitute for a qualified healthcare professional. AI can make
          mistakes. Do not start, stop or change medicines based only on its
          answers. For severe or rapidly worsening symptoms, seek urgent
          medical care rather than waiting for a chat response.
        </div>
      </section>
    </main>
  );
}
