"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const modules = [
  { name: "Intake Portal", path: "/module1/dashboard", number: "01" },
{ name: "Share Intake Form", path: "/module1/share", number: "" },
  { name: "Meeting Notetaker", path: "/module2", number: "02" },
  { name: "Document Drafting", path: "/module3", number: "03" },
  { name: "Risk Analyser", path: "/module4", number: "04" },
  { name: "Case Dashboard", path: "/module5", number: "05" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-[#111111] h-screen flex flex-col flex-shrink-0">
      {/* Logo */}
      <div className="px-6 py-8 border-b border-[#2a2a2a]">
        <h1 className="text-white text-xl font-semibold tracking-tight">
          EasyLaw
        </h1>
        <p className="text-[#666] text-xs mt-1">Legal Operating System</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-1">
        {modules.map((mod) => {
          const isActive = pathname.startsWith(
            mod.path.split("/").slice(0, 2).join("/")
          );
          return (
            <Link
              key={mod.path}
              href={mod.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                isActive
                  ? "bg-[#2a2a2a] text-white"
                  : "text-[#888] hover:text-white hover:bg-[#1a1a1a]"
              }`}
            >
              <span className="text-[#444] text-xs font-mono">{mod.number}</span>
              <span>{mod.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-6 py-4 border-t border-[#2a2a2a]">
        <p className="text-[#444] text-xs">v1.0.0 — Beta</p>
      </div>
    </aside>
  );
}