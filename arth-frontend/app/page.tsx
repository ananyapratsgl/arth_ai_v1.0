
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createWorker } from "tesseract.js";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

type AnalysisResult = {
  report_id: string;
  language: string;
  summary: string;
  results: {
    test_name: string;
    value: string | number | null;
    unit: string | null;
    reference_range: {
      low: number | null;
      high: number | null;
      source_text: string | null;
    } | null;
    status: "low" | "in_range" | "high" | "critical" | "unknown";
    explanation: string;
    source_location: string | null;
    validated: boolean;
    needs_review: boolean;
  }[];
  limitations: string[];
};

function getErrorMessage(data: unknown, fallback: string): string {
  if (!data || typeof data !== "object") return fallback;

  const detail = (data as { detail?: unknown }).detail;

  if (typeof detail === "string") return detail;

  if (Array.isArray(detail)) {
    return detail
      .map((item) =>
        item && typeof item === "object" && "msg" in item
          ? String(item.msg)
          : ""
      )
      .filter(Boolean)
      .join(". ") || fallback;
  }

  return fallback;
}

function detectReportType(text: string): string {
  const value = text.toLowerCase();

  if (/complete blood count|\bcbc\b|haemoglobin|hemoglobin|platelet count|white blood cell|red blood cell/.test(value))
    return "Complete blood count (CBC)";

  if (/liver function|bilirubin|sgot|sgpt|\balt\b|\bast\b|alkaline phosphatase/.test(value))
    return "Liver function test";

  if (/kidney function|creatinine|blood urea|\bbun\b|estimated glomerular filtration|\begfr\b/.test(value))
    return "Kidney function test";

  if (/fasting blood sugar|fasting glucose|hba1c|glycated haemoglobin|glycated hemoglobin/.test(value))
    return "Blood glucose test";

  if (/thyroid function|\btsh\b|thyroxine|\bt3\b|\bt4\b/.test(value))
    return "Thyroid function test";

  if (/lipid profile|total cholesterol|triglycerides|hdl cholesterol|ldl cholesterol/.test(value))
    return "Cholesterol (lipid) test";

  if (/urine analysis|urinalysis|urine routine/.test(value))
    return "Urine test";

  if (/laboratory report|lab report|test results|reference range|specimen/.test(value))
    return "Laboratory report";

  return "Report type not confidently identified";
}

export default function Home() {
  const router = useRouter();
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [userName, setUserName] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [showNamePrompt, setShowNamePrompt] = useState(false);

  useEffect(() => {
    const savedName = localStorage.getItem("arth-user-name");
    if (savedName) {
      setUserName(savedName);
      setNameInput(savedName);
    } else {
      setShowNamePrompt(true);
    }
  }, []);

  const saveUserName = () => {
    const cleanedName = nameInput.trim();
    if (!cleanedName) return;
    localStorage.setItem("arth-user-name", cleanedName);
    setUserName(cleanedName);
    setShowNamePrompt(false);
  };



  const languages = [
    { code: "en", label: "English" },
    { code: "kn", label: "ಕನ್ನಡ — Kannada" },
    { code: "hi", label: "हिन्दी — Hindi" },
    { code: "mr", label: "मराठी — Marathi" },
    { code: "ta", label: "தமிழ் — Tamil" },
    { code: "te", label: "తెలుగు — Telugu" },
    { code: "bn", label: "বাংলা — Bengali" },
    { code: "es", label: "Español — Spanish" },
    { code: "fr", label: "Français — French" },
    { code: "ru", label: "Русский — Russian" },
  ];


  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [message, setMessage] = useState("");
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);

  function stopCamera() {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOpen(false);
  }

  useEffect(() => {
    if (!cameraOpen) return;
    let cancelled = false;

    async function start() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Camera unavailable. Open ARTH in a supported browser using localhost.");
        }

        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" },
            audio: false,
          });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        cameraStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (error) {
        if (!cancelled) {
          setCameraError(
            error instanceof Error
              ? error.message + " Check browser camera permission."
              : "Could not open camera. Check browser camera permission."
          );
        }
      }
    }

    void start();
    return () => {
      cancelled = true;
      cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    };
  }, [cameraOpen]);

  useEffect(() => {
    let active = true;

    fetch(`${API_URL}/health`)
      .then((response) => {
        if (!response.ok) throw new Error("Server unavailable");
        return response.json();
      })
      .then(() => {
        if (active) setBackendOnline(true);
      })
      .catch(() => {
        if (active) setBackendOnline(false);
      });

    return () => {
      active = false;
    };
  }, []);

  async function analyzeText(reportText: string, filename: string) {
    if (!reportText.trim()) {
      throw new Error("No readable text was found. Try a clearer photo or PDF.");
    }

    setMessage("ARTH is reading your report and preparing your results…");

    const reportType = detectReportType(reportText);

    const response = await fetch(`${API_URL}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        report_text: reportText,
        language: selectedLanguage,
        report_type: ["lab_report", "prescription", "other"].includes(reportType) ? reportType : "other",
      }),
    });

    const responseText = await response.text();
    let data: AnalysisResult | { detail?: unknown };

    try {
      data = JSON.parse(responseText);
    } catch {
      throw new Error(
        response.ok
          ? "The server returned an unexpected response."
          : `Analysis failed (${response.status}).`
      );
    }

    if (!response.ok) {
      throw new Error(
        getErrorMessage(data, `Analysis failed (${response.status}).`)
      );
    }

    const result = data as AnalysisResult;

    if (
      typeof result.summary !== "string" ||
      !Array.isArray(result.results)
    ) {
      throw new Error("ARTH could not read the analysis results.");
    }

    sessionStorage.setItem(
      "arth-analysis",
      JSON.stringify({
        analysis: result,
        filename,
        reportType,
      })
    );

    router.push("/analyze");
  }

  async function uploadAndAnalyze(file: File) {
    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");

    const isImage =
      file.type === "image/jpeg" ||
      file.type === "image/png" ||
      /\.(jpe?g|png)$/i.test(file.name);

    if (!isPdf && !isImage) {
      setMessage("Choose a PDF, JPG or PNG report.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setMessage("The file is too large. Please choose a file under 10 MB.");
      return;
    }

    if (file.size === 0) {
      setMessage("This file is empty. Please choose another file.");
      return;
    }

    setIsProcessing(true);
    setMessage(isImage ? "Preparing your photo…" : "Uploading your PDF…");

    try {
      let reportText = "";

      if (isImage) {
        setMessage("Reading text from your photo. This can take a moment…");

        const worker = await createWorker("eng");

        try {
          const result = await worker.recognize(file);
          reportText = result.data.text;
        } finally {
          await worker.terminate();
        }

        if (reportText.trim().length < 10) {
          throw new Error(
            "ARTH could not read enough text from this photo. Try a clearer, well-lit image with the whole report visible."
          );
        }
      } else {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch(`${API_URL}/api/upload`, {
          method: "POST",
          body: formData,
        });

        const responseText = await response.text();
        let data: {
          detail?: unknown;
          extracted_text?: string;
          filename?: string;
        };

        try {
          data = JSON.parse(responseText);
        } catch {
          throw new Error(
            response.ok
              ? "The server returned an unexpected upload response."
              : `Upload failed (${response.status}).`
          );
        }

        if (!response.ok) {
          throw new Error(
            getErrorMessage(data, `Upload failed (${response.status}).`)
          );
        }

        reportText = data.extracted_text || "";

        if (!reportText.trim()) {
          throw new Error(
            "No readable text was found in this PDF. Try a PDF with selectable text or upload a clear photo."
          );
        }
      }

      console.log("ARTH OCR extracted text:", reportText);
      console.log("ARTH OCR text length:", reportText.length);
      await analyzeText(reportText, file.name);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setIsProcessing(false);
    }
  }

  function handleFileSelection(file?: File) {
    if (!file || isProcessing) return;
    setMessage("");
    void uploadAndAnalyze(file);
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);

    if (isProcessing) return;

    const file = event.dataTransfer.files?.[0];
    handleFileSelection(file);
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="/">
          <span className="brand-mark">✳</span>
          <span>arth<span className="brand-dot">.</span></span>
        </a>

        <div className="side-label">WORKSPACE</div>

        <a className="nav-item active" href="/">
          <span>↥</span> Upload a report
        </a>

        <a className="nav-item" href="/analyze">
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
            Workspace <span>/</span> Upload report
          </div>

          <div className="top-actions">
            <span className="status-pill">
              <i
                style={{
                  background:
                    backendOnline === true
                      ? "#70d6a4"
                      : backendOnline === false
                        ? "#e6a0b0"
                        : "#c9b8ef",
                }}
              />
              {backendOnline === null
                ? "Connecting…"
                : backendOnline
                  ? "ARTH is ready"
                  : "Server unavailable"}
            </span>
            <div className="avatar">A</div>
          </div>
        </header>

        <div className="content">
          <div className="welcome-row">
            <div>
              <div className="eyebrow">
                <span>✦</span> YOUR HEALTH, MADE CLEARER
              </div>

              <h1>
                {userName ? `Hey, ${userName}! 👋` : "Understand your report,"}
                <br />
                <span>{userName ? "Let's understand your report together." : "without the confusion."}</span>
              </h1>

              <p className="subtitle">
                Upload a PDF or a photo of your report. ARTH will extract the
                text and explain the results in simpler words.
              </p>
            </div>

            <div className="hero-art" aria-hidden="true">
              <div className="orb orb-one" />
              <div className="orb orb-two" />
              <div className="orbit orbit-one" />
              <div className="orbit orbit-two" />
              <div className="hero-symbol">✳</div>
              <span className="spark spark-one">✦</span>
              <span className="spark spark-two">✧</span>
            </div>
          </div>

          <section
            className="feature-card upload-card"
            style={{
              maxWidth: 720,
              margin: "12px auto 0",
              width: "100%",
            }}
          >
            <div className="card-icon purple-icon">↥</div>
            <div className="card-kicker">START HERE</div>
            <h3>Upload your report</h3>
            <div style={{ margin: "18px 0", textAlign: "left" }}>
              <label htmlFor="arth-language" style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
                🌐 Choose your explanation language
              </label>
              <select
                id="arth-language"
                value={selectedLanguage}
                disabled={isProcessing}
                onChange={(event) => {
                  setSelectedLanguage(event.target.value);
                  sessionStorage.setItem("arth-language", event.target.value);
                }}
                style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid #d8d2e8", background: "white", color: "#282238", fontSize: 15 }}
              >
                {languages.map((language) => (
                  <option key={language.code} value={language.code}>{language.label}</option>
                ))}
              </select>
            </div>


            <p>
              Take a photo, choose one from your gallery, select a file or
              drag and drop it below.
            </p>

            <div
              className="upload-zone"
              role="button"
              tabIndex={isProcessing ? -1 : 0}
              aria-label="Choose a PDF or image report"
              onClick={() => {
                if (!isProcessing) fileInput.current?.click();
              }}
              onKeyDown={(event) => {
                if (
                  !isProcessing &&
                  (event.key === "Enter" || event.key === " ")
                ) {
                  event.preventDefault();
                  fileInput.current?.click();
                }
              }}
              onDragEnter={(event) => {
                event.preventDefault();
                if (!isProcessing) setIsDragging(true);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                if (!isProcessing) setIsDragging(true);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                  setIsDragging(false);
                }
              }}
              onDrop={handleDrop}
              style={{
                cursor: isProcessing ? "wait" : "pointer",
                outline: isDragging ? "2px dashed #8b70db" : undefined,
                background: isDragging ? "#f3efff" : undefined,
                opacity: isProcessing ? 0.75 : 1,
              }}
            >
              <span className="upload-symbol">
                {isProcessing ? "…" : "↑"}
              </span>

              <strong>
                {isProcessing
                  ? "ARTH is working on your report"
                  : isDragging
                    ? "Drop your report here"
                    : "Choose a PDF or image"}
              </strong>

              <span>
                {isProcessing
                  ? "Please keep this page open."
                  : "Click to browse or drag and drop a file"}
              </span>

              <small>PDF, JPG or PNG · Maximum 10 MB</small>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))",
                gap: 10,
                marginTop: 14,
              }}
            >
              <button
                type="button"
                className="primary-button"
                disabled={isProcessing}
                onClick={() => { setCameraError(""); setCameraOpen(true); }}
              >
                📸 Take a photo
              </button>

              <button
                type="button"
                className="primary-button"
                disabled={isProcessing}
                onClick={() => galleryInput.current?.click()}
              >
                🖼️ Choose from gallery
              </button>
            </div>

            <input
              ref={fileInput}
              type="file"
              accept=".pdf,application/pdf,image/jpeg,image/png"
              hidden
              disabled={isProcessing}
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                event.currentTarget.value = "";
                handleFileSelection(file);
              }}
            />

            <input
              ref={cameraInput}
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              disabled={isProcessing}
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                event.currentTarget.value = "";
                handleFileSelection(file);
              }}
            />

            <input
              ref={galleryInput}
              type="file"
              accept="image/*"
              hidden
              disabled={isProcessing}
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                event.currentTarget.value = "";
                handleFileSelection(file);
              }}
            />

            {isProcessing && (
              <div
                role="status"
                aria-live="polite"
                style={{
                  marginTop: 18,
                  padding: 16,
                  borderRadius: 12,
                  background: "#f4f1ff",
                  color: "#50427f",
                  fontSize: 13,
                  lineHeight: 1.7,
                }}
              >
                <strong>✳ {message}</strong>
                <p style={{ margin: "6px 0 0" }}>
                  Photo text recognition may take a little longer the first
                  time because the OCR language data needs to load.
                </p>
              </div>
            )}

            {message && !isProcessing && (
              <div
                className="notice"
                role="alert"
                style={{ marginTop: 16 }}
              >
                <span>ⓘ</span>
                <span style={{ flex: 1, overflowWrap: "anywhere" }}>
                  {message}
                </span>
                <button
                  type="button"
                  onClick={() => setMessage("")}
                  aria-label="Dismiss message"
                >
                  ×
                </button>
              </div>
            )}

            {!isProcessing && (
              <p style={{ fontSize: 11, lineHeight: 1.7, marginTop: 14 }}>
                ARTH can make mistakes and is not a diagnosis.
                Have results checked by a qualified healthcare professional.
              </p>
            )}
          </section>

          <div className="page-footer">
            ARTH · A clearer view of your health
            <span>Made for humans, with care ✳</span>
          </div>
        </div>
      </section>
    
      {cameraOpen && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "rgba(20, 12, 38, 0.88)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 20
        }}>
          <section style={{
            background: "#fff", color: "#24163d", borderRadius: 20,
            padding: 20, width: "min(100%, 560px)"
          }}>
            <h2 style={{ marginTop: 0 }}>Take a report photo</h2>
            <video ref={videoRef} autoPlay playsInline muted style={{
              width: "100%", maxHeight: "55vh", objectFit: "contain",
              background: "#171321", borderRadius: 12
            }} />
            {cameraError && <p role="alert" style={{ color: "#b42345" }}>{cameraError}</p>}
            <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
              <button type="button" className="primary-button" onClick={async () => {
                const video = videoRef.current;
                if (!video || !video.videoWidth) {
                  setCameraError("Camera is still starting. Please wait a moment.");
                  return;
                }
                const canvas = document.createElement("canvas");
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                const context = canvas.getContext("2d");
                if (!context) {
                  setCameraError("Could not capture the photo. Please try again.");
                  return;
                }
                context.drawImage(video, 0, 0);
                canvas.toBlob((blob) => {
                  if (!blob) {
                    setCameraError("Could not save the photo. Please try again.");
                    return;
                  }
                  const file = new File([blob], "arth-camera-report.jpg", { type: "image/jpeg" });
                  stopCamera();
                  handleFileSelection(file);
                }, "image/jpeg", 0.92);
              }}>📸 Capture photo</button>
              <button type="button" className="primary-button" onClick={stopCamera}>
                Cancel
              </button>
            </div>
          </section>
        </div>
      )}

      {showNamePrompt && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 10000,
          background: "rgba(20, 12, 38, 0.78)",
          backdropFilter: "blur(8px)",
          display: "flex", alignItems: "center",
          justifyContent: "center", padding: 20
        }}>
          <section role="dialog" aria-modal="true"
            aria-labelledby="arth-welcome-title"
            style={{
              background: "#fff", color: "#24163d",
              borderRadius: 24, padding: 28,
              width: "min(100%, 420px)",
              boxShadow: "0 24px 80px rgba(0,0,0,0.25)",
              textAlign: "center"
            }}>
            <div style={{ fontSize: 38, marginBottom: 10 }}>✳</div>
            <h2 id="arth-welcome-title" style={{ margin: "0 0 10px", fontSize: 26 }}>
              Welcome to ARTH!
            </h2>
            <p style={{ color: "#655b78", lineHeight: 1.6 }}>
              Hey there! What should we call you? Let's make your health journey a little more personal.
            </p>
            <form onSubmit={(event) => {
              event.preventDefault();
              saveUserName();
            }}>
              <input autoFocus value={nameInput}
                onChange={(event) => setNameInput(event.target.value)}
                placeholder="Enter your name" aria-label="Your name"
                required maxLength={50}
                style={{
                  boxSizing: "border-box", width: "100%",
                  padding: "14px 16px", border: "1px solid #d8d0e5",
                  borderRadius: 12, fontSize: 16, margin: "10px 0 16px"
                }} />
              <button type="submit" className="primary-button"
                style={{ width: "100%", padding: 14, borderRadius: 12 }}>
                Let's get started →
              </button>
            </form>
            <p style={{ fontSize: 12, color: "#81778f", marginBottom: 0 }}>
              Your name stays saved in this browser.
            </p>
          </section>
        </div>
      )}

</main>
  );
}
