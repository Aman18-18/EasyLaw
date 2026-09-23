"use client";

import { useEffect, useState } from "react";
import { getAllCases } from "@/lib/api";

interface Case {
  id: number;
  full_name: string;
  date_of_birth: string;
  aadhar_last4: string;
  address: string;
  city: string;
  state: string;
  pin_code: string;
  phone: string;
  email: string;
  case_type: string;
  incident_date: string;
  opposing_party: string;
  claim_amount: string;
  court_preference: string;
  case_description: string;
  fir_number?: string;
  fir_date?: string;
  police_station?: string;
  has_documents?: boolean;
  additional_entities: any;
  created_at: string;
}

export default function DashboardPage() {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Case | null>(null);
  const [newCase, setNewCase] = useState<Case | null>(null);

  useEffect(() => {
    getAllCases().then((data) => {
      setCases(data.cases || []);
      setLoading(false);
    });

    const ws = new WebSocket("wss://easylaw-production.up.railway.app/ws/dashboard");
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.event === "NEW_CASE") {
        setCases((prev) => [msg.data, ...prev]);
        setNewCase(msg.data);
        setTimeout(() => setNewCase(null), 4000);
      }
    };
    return () => ws.close();
  }, []);

  return (
    <div className="min-h-screen bg-[#f5f5f0]">
      {/* Header */}
      <div className="border-b border-[#e0e0d8] px-10 py-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#1a1a1a]">Cases</h1>
          <p className="text-sm text-[#888] mt-1">All intake submissions — updates in real time</p>
        </div>
      </div>

      {/* Live notification */}
      {newCase && (
        <div className="mx-10 mt-4 p-3 bg-[#1a1a1a] text-white text-sm rounded-md flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          New case received — {newCase.full_name} ({newCase.case_type})
        </div>
      )}

      <div className="px-10 py-6 flex gap-6">
        {/* Table */}
        <div className={`${selected ? "w-1/2" : "w-full"} transition-all`}>
          {loading ? (
            <p className="text-sm text-[#888]">Loading cases...</p>
          ) : cases.length === 0 ? (
            <p className="text-sm text-[#888]">No cases yet.</p>
          ) : (
            <div className="bg-white border border-[#e0e0d8] rounded-md overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#e0e0d8] bg-[#fafaf8]">
                    <th className="text-left px-4 py-3 text-xs text-[#888] font-medium uppercase tracking-wide">ID</th>
                    <th className="text-left px-4 py-3 text-xs text-[#888] font-medium uppercase tracking-wide">Client</th>
                    <th className="text-left px-4 py-3 text-xs text-[#888] font-medium uppercase tracking-wide">Case Type</th>
                    <th className="text-left px-4 py-3 text-xs text-[#888] font-medium uppercase tracking-wide">City</th>
                    <th className="text-left px-4 py-3 text-xs text-[#888] font-medium uppercase tracking-wide">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {cases.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => setSelected(selected?.id === c.id ? null : c)}
                      className={`border-b border-[#e0e0d8] last:border-0 cursor-pointer transition-colors ${
                        selected?.id === c.id ? "bg-[#f0f0e8]" : "hover:bg-[#fafaf8]"
                      }`}
                    >
                      <td className="px-4 py-3 text-[#888] font-mono">#{c.id}</td>
                      <td className="px-4 py-3 font-medium text-[#1a1a1a]">{c.full_name || "—"}</td>
                      <td className="px-4 py-3 text-[#444]">{c.case_type || "—"}</td>
                      <td className="px-4 py-3 text-[#444]">{c.city || "—"}</td>
                      <td className="px-4 py-3 text-[#888] text-xs">
                        {new Date(c.created_at).toLocaleDateString("en-IN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {selected && (
          <div className="w-1/2 bg-white border border-[#e0e0d8] rounded-md p-6 h-fit">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-base font-semibold text-[#1a1a1a]">Case #{selected.id}</h2>
              <button
                onClick={() => setSelected(null)}
                className="text-[#888] hover:text-[#1a1a1a] text-xs"
              >
                Close ✕
              </button>
            </div>

            {/* Personal Details */}
            <div className="mb-6">
              <p className="text-xs font-medium text-[#888] uppercase tracking-wide mb-3">Personal Details</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Full Name", value: selected.full_name },
                  { label: "Date of Birth", value: selected.date_of_birth },
                  { label: "Aadhar (Last 4)", value: selected.aadhar_last4 ? `XXXX-XXXX-${selected.aadhar_last4}` : "—" },
                  { label: "Phone", value: selected.phone },
                  { label: "Email", value: selected.email || "—" },
                  { label: "City", value: selected.city },
                  { label: "State", value: selected.state },
                  { label: "PIN Code", value: selected.pin_code },
                ].map((item) => (
                  <div key={item.label}>
                    <p className="text-xs text-[#888] mb-0.5">{item.label}</p>
                    <p className="text-sm text-[#1a1a1a]">{item.value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3">
                <p className="text-xs text-[#888] mb-0.5">Address</p>
                <p className="text-sm text-[#1a1a1a]">{selected.address}</p>
              </div>
            </div>

            <div className="border-t border-[#e0e0d8] my-4" />

            {/* Case Details */}
            <div className="mb-6">
              <p className="text-xs font-medium text-[#888] uppercase tracking-wide mb-3">Case Details</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Case Type", value: selected.case_type },
                  { label: "Incident Date", value: selected.incident_date },
                  { label: "Opposing Party", value: selected.opposing_party || "—" },
                  { label: "Claim Amount", value: selected.claim_amount ? `₹${selected.claim_amount}` : "—" },
                  { label: "Court Preference", value: selected.court_preference || "—" },
                ].map((item) => (
                  <div key={item.label}>
                    <p className="text-xs text-[#888] mb-0.5">{item.label}</p>
                    <p className="text-sm text-[#1a1a1a]">{item.value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3">
                <p className="text-xs text-[#888] mb-0.5">Case Description</p>
                <p className="text-sm text-[#1a1a1a] leading-relaxed">{selected.case_description}</p>
              </div>
            </div>
                  {/* FIR Details */}
{(selected.fir_number || selected.police_station) && (
  <>
    <div className="border-t border-[#e0e0d8] my-4" />
    <div>
      <p className="text-xs font-medium text-[#888] uppercase tracking-wide mb-3">FIR Details</p>
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "FIR Number", value: selected.fir_number || "—" },
          { label: "FIR Date", value: selected.fir_date || "—" },
          { label: "Police Station", value: selected.police_station || "—" },
          { label: "Has Documents", value: selected.has_documents ? "Yes" : "No" },
        ].map((item) => (
          <div key={item.label}>
            <p className="text-xs text-[#888] mb-0.5">{item.label}</p>
            <p className="text-sm text-[#1a1a1a]">{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  </>
)}
            {/* AI Extracted */}
            {selected.additional_entities && Object.keys(selected.additional_entities).length > 0 && (
              <>
                <div className="border-t border-[#e0e0d8] my-4" />
                <div>
                  <p className="text-xs font-medium text-[#888] uppercase tracking-wide mb-3">AI Extracted Details</p>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(selected.additional_entities).map(([key, value]) => (
                      <div key={key}>
                        <p className="text-xs text-[#888] mb-0.5">{key.replace(/_/g, " ")}</p>
                        <p className="text-sm text-[#1a1a1a]">{String(value)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}