const BASE_URL = "http://localhost:8000";

export async function submitIntakeForm(rawText: string) {
  const res = await fetch(`${BASE_URL}/api/module1/intake`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ raw_text: rawText }),
  });
  return res.json();
}

export async function getAllCases() {
  const res = await fetch(`${BASE_URL}/api/module1/cases`);
  return res.json();
}