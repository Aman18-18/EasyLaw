"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  getAllCases,
  uploadMeetingAudio,
  getAllMeetingNotes,
  getSingleNote,
} from "@/lib/api";

// ─── Types ─────────────────────────────────────────────────────────
interface Case {
  id: number;
  full_name: string;
  case_type: string;
  city: string;
}

interface ClassifiedSentence {
  sentence: string;
  label: string;
  confidence: number;
}

interface ActionItem {
  text: string;
  confidence: number;
  status?: string;
}

interface DecisionItem {
  text: string;
  confidence: number;
}

interface RiskFlagItem {
  text: string;
  confidence: number;
  severity?: string;
}

interface DateMentionedItem {
  text: string;
  confidence: number;
}

interface MeetingNote {
  id: number;
  case_id: number;
  audio_filename: string;
  transcript?: string;
  summary: string;
  classified_sentences?: ClassifiedSentence[];
  action_items?: ActionItem[];
  decisions?: DecisionItem[];
  risk_flags?: RiskFlagItem[];
  dates_mentioned?: DateMentionedItem[];
  created_at: string;
  client_name?: string;
  case_type?: string;
  action_items_count?: number;
  risk_flags_count?: number;
}

// ─── Label Config ──────────────────────────────────────────────────
const LABEL_CONFIG: Record<
  string,
  { color: string; bg: string; border: string; icon: string; label: string }
> = {
  ACTION_ITEM: {
    color: "#3b82f6",
    bg: "rgba(59,130,246,0.08)",
    border: "rgba(59,130,246,0.2)",
    icon: "⚡",
    label: "Action Item",
  },
  DECISION: {
    color: "#22c55e",
    bg: "rgba(34,197,94,0.08)",
    border: "rgba(34,197,94,0.2)",
    icon: "✓",
    label: "Decision",
  },
  DATE_MENTIONED: {
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.08)",
    border: "rgba(245,158,11,0.2)",
    icon: "📅",
    label: "Date / Deadline",
  },
  RISK_FLAG: {
    color: "#ef4444",
    bg: "rgba(239,68,68,0.08)",
    border: "rgba(239,68,68,0.2)",
    icon: "⚠",
    label: "Risk Flag",
  },
  GENERAL: {
    color: "#888888",
    bg: "rgba(136,136,136,0.05)",
    border: "rgba(136,136,136,0.15)",
    icon: "•",
    label: "General",
  },
};

// ─── Processing Steps ──────────────────────────────────────────────
const PROCESSING_STEPS = [
  { id: 1, label: "Uploading audio file", icon: "📤" },
  { id: 2, label: "Transcribing with Whisper AI", icon: "🎙" },
  { id: 3, label: "Classifying sentences with LLM", icon: "🧠" },
  { id: 4, label: "Extracting action items & risks", icon: "⚡" },
  { id: 5, label: "Saving to case file", icon: "💾" },
];

export default function Module2Page() {
  // ─── State ──────────────────────────────────────────────────────
  const [cases, setCases] = useState<Case[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<number | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [notes, setNotes] = useState<MeetingNote[]>([]);
  const [selectedNote, setSelectedNote] = useState<MeetingNote | null>(null);
  const [loadingNotes, setLoadingNotes] = useState(true);

  const [activeTab, setActiveTab] = useState<"upload" | "history">("upload");
  const [transcriptFilter, setTranscriptFilter] = useState<string>("ALL");
  const [isDragging, setIsDragging] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Load Data ──────────────────────────────────────────────────
  const loadNotes = useCallback(async () => {
    setLoadingNotes(true);
    try {
      const data = await getAllMeetingNotes();
      setNotes(data.notes || []);
    } catch {
      setNotes([]);
    } finally {
      setLoadingNotes(false);
    }
  }, []);

  useEffect(() => {
    getAllCases()
      .then((data: { cases?: Case[] }) => setCases(data.cases || []))
      .catch(() => setCases([]));

    getAllMeetingNotes()
      .then((data: { notes?: MeetingNote[] }) => setNotes(data.notes || []))
      .catch(() => setNotes([]))
      .finally(() => setLoadingNotes(false));
  }, []);

  // ─── Recording ──────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "audio/mp4",
      });

      chunksRef.current = [];
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e: BlobEvent) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: mediaRecorder.mimeType,
        });
        const ext = mediaRecorder.mimeType.includes("webm") ? "webm" : "m4a";
        const file = new File([blob], `recording_${Date.now()}.${ext}`, {
          type: mediaRecorder.mimeType,
        });
        setAudioFile(file);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(
        () => setRecordingTime((t: number) => t + 1),
        1000
      );
    } catch {
      setError(
        "Microphone access denied. Please allow microphone permissions."
      );
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isRecording]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // ─── Upload ─────────────────────────────────────────────────────
  const handleUpload = async () => {
    if (!audioFile || !selectedCaseId) return;

    setIsProcessing(true);
    setProcessingStep(1);
    setError(null);

    // Simulate processing stages
    const stepTimer = setInterval(() => {
      setProcessingStep((prev: number) => (prev < 5 ? prev + 1 : prev));
    }, 3000);

    try {
      const result = await uploadMeetingAudio(audioFile, selectedCaseId);

      clearInterval(stepTimer);
      setProcessingStep(5);

      // Small delay to show the final step
      await new Promise((r) => setTimeout(r, 800));

      setIsProcessing(false);
      setShowSuccess(true);
      setAudioFile(null);

      // Load the full note
      const noteData = await getSingleNote(result.note_id);
      setSelectedNote(noteData.note);
      setActiveTab("history");

      // Refresh notes list
      await loadNotes();

      setTimeout(() => setShowSuccess(false), 4000);
    } catch (err: unknown) {
      clearInterval(stepTimer);
      setIsProcessing(false);
      setError(
        err instanceof Error ? err.message : "Processing failed. Try again."
      );
    }
  };

  // ─── Drag & Drop ────────────────────────────────────────────────
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) setAudioFile(file);
  };

  // ─── View Note ──────────────────────────────────────────────────
  const viewNote = async (noteId: number) => {
    try {
      const data = await getSingleNote(noteId);
      setSelectedNote(data.note);
    } catch {
      setError("Failed to load note details");
    }
  };

  // ─── Filtered Sentences ─────────────────────────────────────────
  const filteredSentences = (selectedNote?.classified_sentences || []).filter(
    (s: ClassifiedSentence) => transcriptFilter === "ALL" || s.label === transcriptFilter
  );

  // ─── Count helpers ──────────────────────────────────────────────
  const countByLabel = (label: string) =>
    (selectedNote?.classified_sentences || []).filter((s: ClassifiedSentence) => s.label === label)
      .length;

  // ─── Render ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#f5f5f0]">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="border-b border-[#e0e0d8] px-10 py-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center text-sm"
                style={{
                  background:
                    "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
                }}
              >
                🎙
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-[#1a1a1a]">
                  AI Meeting Notetaker
                </h1>
                <p className="text-sm text-[#888] mt-0.5">
                  Auto-transcribe & classify legal meetings — Hindi + English
                  support
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSelectedNote(null);
                setActiveTab("upload");
              }}
              className={`px-4 py-2 text-sm rounded-md transition-all ${
                activeTab === "upload" && !selectedNote
                  ? "bg-[#1a1a1a] text-white"
                  : "text-[#666] hover:bg-[#e8e8e0]"
              }`}
            >
              + New Recording
            </button>
            <button
              onClick={() => {
                setSelectedNote(null);
                setActiveTab("history");
              }}
              className={`px-4 py-2 text-sm rounded-md transition-all ${
                activeTab === "history" && !selectedNote
                  ? "bg-[#1a1a1a] text-white"
                  : "text-[#666] hover:bg-[#e8e8e0]"
              }`}
            >
              History ({notes.length})
            </button>
          </div>
        </div>
      </div>

      {/* ── Success Notification ───────────────────────────────── */}
      {showSuccess && (
        <div className="mx-10 mt-4 p-3 bg-[#1a1a1a] text-white text-sm rounded-md flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          Meeting notes processed & saved successfully — AI classified all
          sentences
        </div>
      )}

      {/* ── Error Notification ─────────────────────────────────── */}
      {error && (
        <div className="mx-10 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-600"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Processing Overlay ─────────────────────────────────── */}
      {isProcessing && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-full bg-[#f0f0ea] flex items-center justify-center mx-auto mb-4">
                <div className="text-2xl animate-spin">🧠</div>
              </div>
              <h3 className="text-lg font-semibold text-[#1a1a1a]">
                Processing Meeting Audio
              </h3>
              <p className="text-sm text-[#888] mt-1">
                AI is analyzing your recording...
              </p>
            </div>

            <div className="space-y-3">
              {PROCESSING_STEPS.map((step) => (
                <div key={step.id} className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all duration-500 ${
                      processingStep > step.id
                        ? "bg-green-100 text-green-600"
                        : processingStep === step.id
                        ? "bg-blue-100 text-blue-600 animate-pulse"
                        : "bg-[#f0f0ea] text-[#ccc]"
                    }`}
                  >
                    {processingStep > step.id ? "✓" : step.icon}
                  </div>
                  <span
                    className={`text-sm transition-colors duration-300 ${
                      processingStep >= step.id
                        ? "text-[#1a1a1a]"
                        : "text-[#ccc]"
                    }`}
                  >
                    {step.label}
                  </span>
                  {processingStep === step.id && (
                    <div className="ml-auto">
                      <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Progress bar */}
            <div className="mt-6 h-1.5 bg-[#f0f0ea] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000 ease-out"
                style={{
                  width: `${(processingStep / 5) * 100}%`,
                  background:
                    "linear-gradient(90deg, #3b82f6, #8b5cf6, #22c55e)",
                }}
              />
            </div>
          </div>
        </div>
      )}

      <div className="px-10 py-6">
        {/* ── UPLOAD VIEW ──────────────────────────────────────── */}
        {activeTab === "upload" && !selectedNote && (
          <div className="max-w-3xl mx-auto">
            {/* Case Selector */}
            <div className="mb-6">
              <label className="block text-xs font-medium text-[#888] uppercase tracking-wide mb-2">
                Link to Case
              </label>
              <select
                value={selectedCaseId || ""}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setSelectedCaseId(
                    e.target.value ? parseInt(e.target.value) : null
                  )
                }
                className="w-full bg-white border border-[#e0e0d8] rounded-md px-4 py-3 text-sm text-[#1a1a1a] focus:outline-none focus:border-[#1a1a1a] transition-colors appearance-none cursor-pointer"
              >
                <option value="">Select a case...</option>
                {cases.map((c: Case) => (
                  <option key={c.id} value={c.id}>
                    #{c.id} — {c.full_name} — {c.case_type}
                  </option>
                ))}
              </select>
              {cases.length === 0 && (
                <p className="text-xs text-[#888] mt-2">
                  No cases found. Create a case in Module 1 first.
                </p>
              )}
            </div>

            {/* Upload Area */}
            <div
              className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300 ${
                isDragging
                  ? "border-blue-500 bg-blue-50/50"
                  : audioFile
                  ? "border-green-400 bg-green-50/30"
                  : "border-[#d0d0c8] hover:border-[#888] bg-white"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {!audioFile ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-[#f5f5f0] flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">
                      {isDragging ? "📥" : "🎵"}
                    </span>
                  </div>
                  <p className="text-base text-[#1a1a1a] font-medium mb-1">
                    {isDragging
                      ? "Drop your audio file here"
                      : "Upload meeting recording"}
                  </p>
                  <p className="text-sm text-[#888] mb-6">
                    Drag & drop or click to browse — MP3, WAV, M4A, WebM
                    supported
                  </p>

                  <div className="flex items-center justify-center gap-4">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-5 py-2.5 bg-[#1a1a1a] text-white text-sm rounded-md hover:bg-[#333] transition-colors"
                    >
                      Browse Files
                    </button>
                    <span className="text-sm text-[#ccc]">or</span>
                    <button
                      onClick={isRecording ? stopRecording : startRecording}
                      className={`px-5 py-2.5 text-sm rounded-md border transition-all ${
                        isRecording
                          ? "bg-red-500 text-white border-red-500 animate-pulse"
                          : "border-[#1a1a1a] text-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-white"
                      }`}
                    >
                      {isRecording
                        ? `⏹ Stop (${formatTime(recordingTime)})`
                        : "🎙 Record Live"}
                    </button>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*,.mp3,.wav,.m4a,.ogg,.webm,.flac"
                    className="hidden"
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const file = e.target.files?.[0];
                      if (file) setAudioFile(file);
                    }}
                  />
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">✓</span>
                  </div>
                  <p className="text-base text-[#1a1a1a] font-medium mb-1">
                    {audioFile.name}
                  </p>
                  <p className="text-sm text-[#888] mb-4">
                    {(audioFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <button
                    onClick={() => setAudioFile(null)}
                    className="text-sm text-red-500 hover:text-red-600 underline"
                  >
                    Remove & choose another
                  </button>
                </>
              )}
            </div>

            {/* Recording Indicator */}
            {isRecording && (
              <div className="mt-4 bg-white border border-red-200 rounded-lg p-4 flex items-center gap-4">
                <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-[#1a1a1a]">
                    Recording in progress...
                  </p>
                  <p className="text-xs text-[#888]">
                    Duration: {formatTime(recordingTime)} — Click &quot;Stop&quot; when
                    done
                  </p>
                </div>
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i: number) => (
                    <div
                      key={i}
                      className="w-1 bg-red-400 rounded-full animate-pulse"
                      style={{
                        height: `${12 + ((i * 5) % 16)}px`,
                        animationDelay: `${i * 0.15}s`,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="mt-6 flex justify-end">
              <button
                onClick={handleUpload}
                disabled={!audioFile || !selectedCaseId || isProcessing}
                className={`px-8 py-3 rounded-md text-sm font-medium transition-all ${
                  audioFile && selectedCaseId
                    ? "bg-[#1a1a1a] text-white hover:bg-[#333] shadow-sm"
                    : "bg-[#e0e0d8] text-[#999] cursor-not-allowed"
                }`}
              >
                Process with AI →
              </button>
            </div>

            {/* Feature Cards */}
            <div className="grid grid-cols-3 gap-4 mt-10">
              {[
                {
                  icon: "🎙",
                  title: "Whisper Transcription",
                  desc: "Hindi + English mixed speech support via Groq Whisper API",
                },
                {
                  icon: "🧠",
                  title: "LLM Classification",
                  desc: "Every sentence classified into Action Items, Decisions, Risks & Dates",
                },
                {
                  icon: "⚡",
                  title: "Auto Action Items",
                  desc: "Tasks automatically extracted and linked to the case file",
                },
              ].map((f) => (
                <div
                  key={f.title}
                  className="bg-white border border-[#e0e0d8] rounded-lg p-5 hover:shadow-sm transition-shadow"
                >
                  <div className="text-xl mb-3">{f.icon}</div>
                  <p className="text-sm font-medium text-[#1a1a1a] mb-1">
                    {f.title}
                  </p>
                  <p className="text-xs text-[#888] leading-relaxed">
                    {f.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── HISTORY VIEW ─────────────────────────────────────── */}
        {activeTab === "history" && !selectedNote && (
          <div>
            {loadingNotes ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-6 h-6 border-2 border-[#1a1a1a] border-t-transparent rounded-full animate-spin" />
                <span className="ml-3 text-sm text-[#888]">
                  Loading meeting notes...
                </span>
              </div>
            ) : notes.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-16 h-16 rounded-full bg-[#f0f0ea] flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📝</span>
                </div>
                <p className="text-base text-[#1a1a1a] font-medium">
                  No meeting notes yet
                </p>
                <p className="text-sm text-[#888] mt-1">
                  Upload a recording to get started
                </p>
                <button
                  onClick={() => setActiveTab("upload")}
                  className="mt-4 px-5 py-2 bg-[#1a1a1a] text-white text-sm rounded-md hover:bg-[#333]"
                >
                  + New Recording
                </button>
              </div>
            ) : (
              <div className="grid gap-4">
                {notes.map((note: MeetingNote) => (
                  <div
                    key={note.id}
                    onClick={() => viewNote(note.id)}
                    className="bg-white border border-[#e0e0d8] rounded-lg p-5 cursor-pointer hover:shadow-md hover:border-[#ccc] transition-all group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-mono text-[#888]">
                            #{note.id}
                          </span>
                          <span className="text-xs px-2 py-0.5 bg-[#f0f0ea] text-[#666] rounded">
                            Case #{note.case_id}
                          </span>
                          {note.client_name && (
                            <span className="text-xs text-[#888]">
                              — {note.client_name}
                            </span>
                          )}
                          {note.case_type && (
                            <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded">
                              {note.case_type}
                            </span>
                          )}
                        </div>

                        <p className="text-sm text-[#1a1a1a] leading-relaxed mb-3 line-clamp-2">
                          {note.summary}
                        </p>

                        <div className="flex items-center gap-4 text-xs text-[#888]">
                          <span>🎵 {note.audio_filename}</span>
                          <span>
                            📅{" "}
                            {new Date(note.created_at).toLocaleDateString(
                              "en-IN",
                              {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2 ml-6">
                        {(note.action_items_count || 0) > 0 && (
                          <span
                            className="text-xs px-2 py-1 rounded-full"
                            style={{
                              background: LABEL_CONFIG.ACTION_ITEM.bg,
                              color: LABEL_CONFIG.ACTION_ITEM.color,
                            }}
                          >
                            {note.action_items_count} action items
                          </span>
                        )}
                        {(note.risk_flags_count || 0) > 0 && (
                          <span
                            className="text-xs px-2 py-1 rounded-full"
                            style={{
                              background: LABEL_CONFIG.RISK_FLAG.bg,
                              color: LABEL_CONFIG.RISK_FLAG.color,
                            }}
                          >
                            {note.risk_flags_count} risks
                          </span>
                        )}
                        <span className="text-xs text-[#ccc] opacity-0 group-hover:opacity-100 transition-opacity">
                          View details →
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── NOTE DETAIL VIEW ─────────────────────────────────── */}
        {selectedNote && (
          <div>
            {/* Back Button + Note Header */}
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => setSelectedNote(null)}
                className="flex items-center gap-2 text-sm text-[#888] hover:text-[#1a1a1a] transition-colors"
              >
                ← Back to {activeTab === "upload" ? "upload" : "history"}
              </button>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-[#888]">
                  Note #{selectedNote.id}
                </span>
                <span className="text-xs px-2 py-0.5 bg-[#f0f0ea] text-[#666] rounded">
                  Case #{selectedNote.case_id}
                </span>
                {selectedNote.client_name && (
                  <span className="text-xs text-[#888]">
                    — {selectedNote.client_name}
                  </span>
                )}
              </div>
            </div>

            {/* Summary Card */}
            <div className="bg-white border border-[#e0e0d8] rounded-xl p-6 mb-6">
              <div className="flex items-start gap-4">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                  style={{
                    background:
                      "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
                  }}
                >
                  <span className="text-white text-lg">📋</span>
                </div>
                <div>
                  <h3 className="text-xs font-medium text-[#888] uppercase tracking-wide mb-2">
                    AI Meeting Summary
                  </h3>
                  <p className="text-sm text-[#1a1a1a] leading-relaxed">
                    {selectedNote.summary}
                  </p>
                  <div className="flex items-center gap-4 mt-3 text-xs text-[#888]">
                    <span>🎵 {selectedNote.audio_filename}</span>
                    <span>
                      📅{" "}
                      {new Date(selectedNote.created_at).toLocaleDateString(
                        "en-IN",
                        {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-5 gap-3 mb-6">
              {Object.entries(LABEL_CONFIG).map(([key, cfg]) => {
                const count = countByLabel(key);
                return (
                  <div
                    key={key}
                    className="bg-white border rounded-lg p-4 cursor-pointer transition-all hover:shadow-sm"
                    style={{
                      borderColor:
                        transcriptFilter === key ? cfg.color : "#e0e0d8",
                    }}
                    onClick={() =>
                      setTranscriptFilter((prev: string) =>
                        prev === key ? "ALL" : key
                      )
                    }
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-lg">{cfg.icon}</span>
                      <span
                        className="text-xl font-semibold"
                        style={{ color: cfg.color }}
                      >
                        {count}
                      </span>
                    </div>
                    <p className="text-xs text-[#888]">{cfg.label}</p>
                  </div>
                );
              })}
            </div>

            {/* Two-Column Layout: Action Items & Risks + Transcript */}
            <div className="grid grid-cols-3 gap-6">
              {/* Left Column — Key Insights */}
              <div className="col-span-1 space-y-4">
                {/* Action Items */}
                {(selectedNote.action_items?.length || 0) > 0 && (
                  <div
                    className="bg-white border rounded-xl p-5"
                    style={{
                      borderColor: LABEL_CONFIG.ACTION_ITEM.border,
                    }}
                  >
                    <h4
                      className="text-xs font-medium uppercase tracking-wide mb-3 flex items-center gap-2"
                      style={{ color: LABEL_CONFIG.ACTION_ITEM.color }}
                    >
                      ⚡ Action Items
                    </h4>
                    <div className="space-y-2.5">
                      {selectedNote.action_items?.map((item: ActionItem, i: number) => (
                        <div
                          key={i}
                          className="flex items-start gap-2.5 p-2.5 rounded-lg"
                          style={{ background: LABEL_CONFIG.ACTION_ITEM.bg }}
                        >
                          <div
                            className="w-4 h-4 rounded border-2 shrink-0 mt-0.5"
                            style={{
                              borderColor: LABEL_CONFIG.ACTION_ITEM.color,
                            }}
                          />
                          <p className="text-xs text-[#1a1a1a] leading-relaxed">
                            {item.text}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Risk Flags */}
                {(selectedNote.risk_flags?.length || 0) > 0 && (
                  <div
                    className="bg-white border rounded-xl p-5"
                    style={{ borderColor: LABEL_CONFIG.RISK_FLAG.border }}
                  >
                    <h4
                      className="text-xs font-medium uppercase tracking-wide mb-3 flex items-center gap-2"
                      style={{ color: LABEL_CONFIG.RISK_FLAG.color }}
                    >
                      ⚠ Risk Flags
                    </h4>
                    <div className="space-y-2.5">
                      {selectedNote.risk_flags?.map((item: RiskFlagItem, i: number) => (
                        <div
                          key={i}
                          className="p-2.5 rounded-lg"
                          style={{ background: LABEL_CONFIG.RISK_FLAG.bg }}
                        >
                          <p className="text-xs text-[#1a1a1a] leading-relaxed">
                            {item.text}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Decisions */}
                {(selectedNote.decisions?.length || 0) > 0 && (
                  <div
                    className="bg-white border rounded-xl p-5"
                    style={{ borderColor: LABEL_CONFIG.DECISION.border }}
                  >
                    <h4
                      className="text-xs font-medium uppercase tracking-wide mb-3 flex items-center gap-2"
                      style={{ color: LABEL_CONFIG.DECISION.color }}
                    >
                      ✓ Decisions Made
                    </h4>
                    <div className="space-y-2.5">
                      {selectedNote.decisions?.map((item: DecisionItem, i: number) => (
                        <div
                          key={i}
                          className="p-2.5 rounded-lg"
                          style={{ background: LABEL_CONFIG.DECISION.bg }}
                        >
                          <p className="text-xs text-[#1a1a1a] leading-relaxed">
                            {item.text}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Dates */}
                {(selectedNote.dates_mentioned?.length || 0) > 0 && (
                  <div
                    className="bg-white border rounded-xl p-5"
                    style={{
                      borderColor: LABEL_CONFIG.DATE_MENTIONED.border,
                    }}
                  >
                    <h4
                      className="text-xs font-medium uppercase tracking-wide mb-3 flex items-center gap-2"
                      style={{ color: LABEL_CONFIG.DATE_MENTIONED.color }}
                    >
                      📅 Dates & Deadlines
                    </h4>
                    <div className="space-y-2.5">
                      {selectedNote.dates_mentioned?.map((item: DateMentionedItem, i: number) => (
                        <div
                          key={i}
                          className="p-2.5 rounded-lg"
                          style={{
                            background: LABEL_CONFIG.DATE_MENTIONED.bg,
                          }}
                        >
                          <p className="text-xs text-[#1a1a1a] leading-relaxed">
                            {item.text}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column — Full Transcript */}
              <div className="col-span-2">
                <div className="bg-white border border-[#e0e0d8] rounded-xl overflow-hidden">
                  {/* Transcript Header */}
                  <div className="px-5 py-4 border-b border-[#e0e0d8] flex items-center justify-between">
                    <h4 className="text-xs font-medium text-[#888] uppercase tracking-wide">
                      Classified Transcript
                    </h4>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setTranscriptFilter("ALL")}
                        className={`px-2.5 py-1 rounded text-xs transition-colors ${
                          transcriptFilter === "ALL"
                            ? "bg-[#1a1a1a] text-white"
                            : "text-[#888] hover:bg-[#f0f0ea]"
                        }`}
                      >
                        All
                      </button>
                      {Object.entries(LABEL_CONFIG)
                        .filter(([key]) => key !== "GENERAL")
                        .map(([key, cfg]) => (
                          <button
                            key={key}
                            onClick={() =>
                              setTranscriptFilter((prev: string) =>
                                prev === key ? "ALL" : key
                              )
                            }
                            className="px-2.5 py-1 rounded text-xs transition-colors"
                            style={{
                              background:
                                transcriptFilter === key ? cfg.bg : "transparent",
                              color:
                                transcriptFilter === key ? cfg.color : "#888",
                              border:
                                transcriptFilter === key
                                  ? `1px solid ${cfg.border}`
                                  : "1px solid transparent",
                            }}
                          >
                            {cfg.icon} {cfg.label}
                          </button>
                        ))}
                    </div>
                  </div>

                  {/* Transcript Body */}
                  <div className="p-5 max-h-[600px] overflow-y-auto space-y-2">
                    {filteredSentences.length === 0 ? (
                      <p className="text-sm text-[#888] text-center py-8">
                        {transcriptFilter === "ALL"
                          ? "No transcript data available"
                          : `No ${LABEL_CONFIG[transcriptFilter]?.label || ""} items found`}
                      </p>
                    ) : (
                      filteredSentences.map((s: ClassifiedSentence, i: number) => {
                        const cfg = LABEL_CONFIG[s.label] || LABEL_CONFIG.GENERAL;
                        return (
                          <div
                            key={i}
                            className="flex items-start gap-3 p-3 rounded-lg transition-all hover:shadow-sm"
                            style={{ background: cfg.bg }}
                          >
                            <span
                              className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs shrink-0 mt-0.5"
                              style={{
                                background: cfg.border,
                                color: cfg.color,
                              }}
                            >
                              {cfg.icon}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-[#1a1a1a] leading-relaxed">
                                {s.sentence}
                              </p>
                              <div className="flex items-center gap-2 mt-1.5">
                                <span
                                  className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                                  style={{
                                    background: cfg.border,
                                    color: cfg.color,
                                  }}
                                >
                                  {cfg.label}
                                </span>
                                {s.confidence && (
                                  <span className="text-[10px] text-[#aaa]">
                                    {Math.round(s.confidence * 100)}% confidence
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Raw Transcript Toggle */}
                {selectedNote.transcript && (
                  <details className="mt-4 bg-white border border-[#e0e0d8] rounded-xl overflow-hidden">
                    <summary className="px-5 py-4 text-xs font-medium text-[#888] uppercase tracking-wide cursor-pointer hover:bg-[#fafaf8]">
                      Raw Transcript
                    </summary>
                    <div className="px-5 pb-5">
                      <p className="text-sm text-[#444] leading-relaxed whitespace-pre-wrap font-mono bg-[#fafaf8] p-4 rounded-lg">
                        {selectedNote.transcript}
                      </p>
                    </div>
                  </details>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
