export const BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "https://easylaw-production.up.railway.app";

export function getWebSocketUrl(path = "/ws/dashboard"): string {
  if (process.env.NEXT_PUBLIC_WS_URL) {
    return `${process.env.NEXT_PUBLIC_WS_URL}${path}`;
  }
  const isHttps = BASE_URL.startsWith("https://");
  const wsProto = isHttps ? "wss://" : "ws://";
  const host = BASE_URL.replace(/^https?:\/\//, "");
  return `${wsProto}${host}${path}`;
}

export async function submitIntakeForm(formData: Record<string, unknown>) {
  const res = await fetch(`${BASE_URL}/api/module1/intake`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(formData),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Intake submission failed" }));
    throw new Error(error.detail || "Intake submission failed");
  }
  return res.json();
}

export async function getAllCases() {
  const res = await fetch(`${BASE_URL}/api/module1/cases`);
  if (!res.ok) {
    throw new Error("Failed to fetch cases");
  }
  return res.json();
}

// ─── Module 2 — Meeting Notetaker ───────────────────────────────────

export async function uploadMeetingAudio(file: File, caseId: number) {
  const formData = new FormData();
  formData.append("audio", file);
  formData.append("case_id", caseId.toString());

  const res = await fetch(`${BASE_URL}/api/module2/notetaker/upload`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Upload failed" }));
    throw new Error(error.detail || "Upload failed");
  }

  return res.json();
}

export async function getMeetingNotes(caseId: number) {
  const res = await fetch(`${BASE_URL}/api/module2/notetaker/notes/${caseId}`);
  if (!res.ok) {
    throw new Error("Failed to fetch meeting notes");
  }
  return res.json();
}

export async function getAllMeetingNotes() {
  const res = await fetch(`${BASE_URL}/api/module2/notetaker/all`);
  if (!res.ok) {
    throw new Error("Failed to fetch all meeting notes");
  }
  return res.json();
}

export async function getSingleNote(noteId: number) {
  const res = await fetch(`${BASE_URL}/api/module2/notetaker/note/${noteId}`);
  if (!res.ok) {
    throw new Error("Failed to fetch note details");
  }
  return res.json();
}