"use client";

import { useState, useEffect } from "react";
import { QRCodeCanvas as QRCode } from "qrcode.react";

export default function SharePage() {
  const [intakeUrl, setIntakeUrl] = useState("");

  useEffect(() => {
    setIntakeUrl(`${window.location.origin}/module1/intake`);
  }, []);

  return (
    <div className="min-h-screen bg-[#f5f5f0]">
      <div className="border-b border-[#e0e0d8] px-10 py-6">
        <h1 className="text-2xl font-semibold text-[#1a1a1a]">Share Intake Form</h1>
        <p className="text-sm text-[#888] mt-1">
          Show this QR code to your client — they scan it to fill the intake form
        </p>
      </div>

      <div className="px-10 py-8 flex gap-8">
        {/* QR Code */}
        <div className="bg-white border border-[#e0e0d8] rounded-lg p-8 text-center">
          {intakeUrl && (
            <QRCode value={intakeUrl} size={200} />
          )}
          <p className="text-xs text-[#888] mt-4 max-w-[200px] mx-auto">
            Client scans this with their phone camera
          </p>
        </div>

        {/* Instructions */}
        <div className="flex-1">
          <h2 className="text-base font-medium text-[#1a1a1a] mb-4">How it works</h2>
          <div className="space-y-4">
            {[
              { step: "01", text: "Show this QR code to your client on your laptop or print it" },
              { step: "02", text: "Client scans it with their phone camera" },
              { step: "03", text: "They fill in their case details and submit" },
              { step: "04", text: "Case appears on your dashboard instantly" },
            ].map((item) => (
              <div key={item.step} className="flex gap-4">
                <span className="text-xs font-mono text-[#888] mt-0.5">{item.step}</span>
                <p className="text-sm text-[#444]">{item.text}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-white border border-[#e0e0d8] rounded-md">
            <p className="text-xs text-[#888] mb-1">Direct link</p>
            <p className="text-sm text-[#1a1a1a] font-mono break-all">{intakeUrl}</p>
          </div>
        </div>
      </div>
    </div>
  );
}