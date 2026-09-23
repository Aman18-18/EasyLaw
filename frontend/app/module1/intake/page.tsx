"use client";

import { useState } from "react";

const CASE_TYPES = [
  "Property Dispute",
  "Cheque Bounce (NI Act Section 138)",
  "Divorce / Matrimonial",
  "Criminal (IPC)",
  "Consumer Complaint",
  "Labour / Employment",
  "Civil Suit",
  "Land Acquisition",
  "Family / Succession",
  "Contract Dispute",
  "Motor Accident Claim",
  "Cyber Crime",
  "Other",
];

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Delhi", "Jammu & Kashmir", "Ladakh", "Puducherry", "Chandigarh",
];

export default function IntakePage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    full_name: "",
    date_of_birth: "",
    aadhar_last4: "",
    address: "",
    city: "",
    state: "",
    pin_code: "",
    phone: "",
    email: "",
    case_type: "",
    incident_date: "",
    opposing_party: "",
    claim_amount: "",
    court_preference: "",
    case_description: "",
    fir_number: "",
fir_date: "",
police_station: "",
has_documents: false,
  });

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("https://easylaw-production.up.railway.app/api/module1/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed");
      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#f5f5f0] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-12 h-12 rounded-full bg-[#1a1a1a] flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-[#1a1a1a] mb-2">Submitted Successfully</h2>
          <p className="text-sm text-[#888]">
            Your case details have been received. Our legal team will contact you shortly.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f0] py-10 px-4">
      <div className="w-full max-w-xl mx-auto">

        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-[#1a1a1a]">EasyLaw</h1>
          <p className="text-sm text-[#888] mt-1">Client Intake Form</p>

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 mt-4">
            {[1, 2].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium
                  ${step === s ? "bg-[#1a1a1a] text-white" : step > s ? "bg-[#888] text-white" : "bg-[#e0e0d8] text-[#888]"}`}>
                  {s}
                </div>
                {s < 2 && <div className={`w-8 h-px ${step > s ? "bg-[#888]" : "bg-[#e0e0d8]"}`} />}
              </div>
            ))}
          </div>
          <p className="text-xs text-[#888] mt-2">
            {step === 1 ? "Personal Details" : "Case Details"}
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white border border-[#e0e0d8] rounded-lg p-8">

          {/* Step 1 — Personal Details */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#888] uppercase tracking-wide mb-1">Full Name *</label>
                <input
                  type="text"
                  value={form.full_name}
                  onChange={(e) => update("full_name", e.target.value)}
                  placeholder="As per Aadhar Card"
                  className="w-full border border-[#e0e0d8] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#1a1a1a]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#888] uppercase tracking-wide mb-1">Date of Birth *</label>
                  <input
                    type="date"
                    value={form.date_of_birth}
                    onChange={(e) => update("date_of_birth", e.target.value)}
                    className="w-full border border-[#e0e0d8] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#1a1a1a]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#888] uppercase tracking-wide mb-1">Aadhar Last 4 Digits *</label>
                  <input
                    type="text"
                    value={form.aadhar_last4}
                    onChange={(e) => update("aadhar_last4", e.target.value.slice(0, 4))}
                    placeholder="XXXX"
                    maxLength={4}
                    className="w-full border border-[#e0e0d8] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#1a1a1a]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#888] uppercase tracking-wide mb-1">Address *</label>
                <textarea
                  value={form.address}
                  onChange={(e) => update("address", e.target.value)}
                  placeholder="House No., Street, Locality"
                  rows={2}
                  className="w-full border border-[#e0e0d8] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#1a1a1a] resize-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#888] uppercase tracking-wide mb-1">City *</label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => update("city", e.target.value)}
                    placeholder="City"
                    className="w-full border border-[#e0e0d8] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#1a1a1a]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#888] uppercase tracking-wide mb-1">State *</label>
                  <select
                    value={form.state}
                    onChange={(e) => update("state", e.target.value)}
                    className="w-full border border-[#e0e0d8] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#1a1a1a] bg-white"
                  >
                    <option value="">State</option>
                    {INDIAN_STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#888] uppercase tracking-wide mb-1">PIN Code *</label>
                  <input
                    type="text"
                    value={form.pin_code}
                    onChange={(e) => update("pin_code", e.target.value.slice(0, 6))}
                    placeholder="110001"
                    maxLength={6}
                    className="w-full border border-[#e0e0d8] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#1a1a1a]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#888] uppercase tracking-wide mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => update("phone", e.target.value)}
                    placeholder="+91 XXXXX XXXXX"
                    className="w-full border border-[#e0e0d8] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#1a1a1a]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#888] uppercase tracking-wide mb-1">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => update("email", e.target.value)}
                    placeholder="optional"
                    className="w-full border border-[#e0e0d8] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#1a1a1a]"
                  />
                </div>
              </div>

              <button
                onClick={() => {
                  if (!form.full_name || !form.date_of_birth || !form.aadhar_last4 || !form.address || !form.city || !form.state || !form.pin_code || !form.phone) {
                    setError("Please fill all required fields.");
                    return;
                  }
                  if (form.aadhar_last4.length !== 4) {
                    setError("Please enter exactly 4 digits of Aadhar.");
                    return;
                  }
                  setError("");
                  setStep(2);
                }}
                className="w-full bg-[#1a1a1a] text-white text-sm py-2.5 rounded-md hover:bg-[#333] transition-colors mt-2"
              >
                Next — Case Details
              </button>
              {error && <p className="text-xs text-red-500 text-center">{error}</p>}
            </div>
          )}

          {/* Step 2 — Case Details */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#888] uppercase tracking-wide mb-1">Type of Case *</label>
                <select
                  value={form.case_type}
                  onChange={(e) => update("case_type", e.target.value)}
                  className="w-full border border-[#e0e0d8] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#1a1a1a] bg-white"
                >
                  <option value="">Select case type</option>
                  {CASE_TYPES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#888] uppercase tracking-wide mb-1">Incident Date *</label>
                  <input
                    type="date"
                    value={form.incident_date}
                    onChange={(e) => update("incident_date", e.target.value)}
                    className="w-full border border-[#e0e0d8] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#1a1a1a]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#888] uppercase tracking-wide mb-1">Opposing Party</label>
                  <input
                    type="text"
                    value={form.opposing_party}
                    onChange={(e) => update("opposing_party", e.target.value)}
                    placeholder="Name of opposite party"
                    className="w-full border border-[#e0e0d8] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#1a1a1a]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#888] uppercase tracking-wide mb-1">Claim Amount (₹)</label>
                  <input
                    type="text"
                    value={form.claim_amount}
                    onChange={(e) => update("claim_amount", e.target.value)}
                    placeholder="e.g. 5,00,000"
                    className="w-full border border-[#e0e0d8] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#1a1a1a]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#888] uppercase tracking-wide mb-1">Court Preference</label>
                  <input
                    type="text"
                    value={form.court_preference}
                    onChange={(e) => update("court_preference", e.target.value)}
                    placeholder="e.g. Delhi High Court"
                    className="w-full border border-[#e0e0d8] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#1a1a1a]"
                  />
                </div>
              </div>

              <div>
                
                  {/* FIR Section */}
<div className="border border-[#e0e0d8] rounded-md p-4 space-y-3">
  <p className="text-xs font-medium text-[#888] uppercase tracking-wide">FIR Details (if applicable)</p>

  <div className="grid grid-cols-2 gap-4">
    <div>
      <label className="block text-xs text-[#888] mb-1">FIR Number</label>
      <input
        type="text"
        value={form.fir_number}
        onChange={(e) => update("fir_number", e.target.value)}
        placeholder="e.g. 123/2024"
        className="w-full border border-[#e0e0d8] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#1a1a1a]"
      />
    </div>
    <div>
      <label className="block text-xs text-[#888] mb-1">FIR Date</label>
      <input
        type="date"
        value={form.fir_date}
        onChange={(e) => update("fir_date", e.target.value)}
        className="w-full border border-[#e0e0d8] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#1a1a1a]"
      />
    </div>
  </div>

  <div>
    <label className="block text-xs text-[#888] mb-1">Police Station Name</label>
    <input
      type="text"
      value={form.police_station}
      onChange={(e) => update("police_station", e.target.value)}
      placeholder="e.g. Connaught Place Police Station, New Delhi"
      className="w-full border border-[#e0e0d8] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#1a1a1a]"
    />
  </div>

  <label className="flex items-center gap-2 cursor-pointer">
    <input
      type="checkbox"
      checked={form.has_documents}
      onChange={(e) => update("has_documents", e.target.checked.toString())}
      className="w-4 h-4 rounded border-[#e0e0d8]"
    />
    <span className="text-sm text-[#444]">I have supporting documents to share with the lawyer</span>
  </label>
</div>

                <label className="block text-xs font-medium text-[#888] uppercase tracking-wide mb-1">Case Description *</label>
                <textarea
                  value={form.case_description}
                  onChange={(e) => update("case_description", e.target.value)}
                  rows={5}
                  placeholder="Describe your case in detail. Include relevant dates, events, witnesses, and any legal sections you are aware of (e.g. IPC 420, CrPC 138)..."
                  className="w-full border border-[#e0e0d8] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#1a1a1a] resize-none"
                />
              </div>

              {error && <p className="text-xs text-red-500">{error}</p>}

              <div className="flex gap-3">
                <button
                  onClick={() => { setStep(1); setError(""); }}
                  className="flex-1 border border-[#e0e0d8] text-[#1a1a1a] text-sm py-2.5 rounded-md hover:bg-[#f5f5f0] transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => {
                    if (!form.case_type || !form.incident_date || !form.case_description) {
                      setError("Please fill all required fields.");
                      return;
                    }
                    setError("");
                    handleSubmit();
                  }}
                  disabled={loading}
                  className="flex-1 bg-[#1a1a1a] text-white text-sm py-2.5 rounded-md hover:bg-[#333] disabled:opacity-40 transition-colors"
                >
                  {loading ? "Submitting..." : "Submit Case"}
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-[#aaa] mt-6">
          Your information is secure and confidential — EasyLaw
        </p>
      </div>
    </div>
  );
}