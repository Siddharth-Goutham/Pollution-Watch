/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Shield, Users } from "lucide-react";

interface HeaderProps {
  currentPortal: "citizen" | "municipality";
  onPortalChange: (portal: "citizen" | "municipality") => void;
  constituencyName: string;
  districtName: string;
}

export default function Header({
  currentPortal,
  onPortalChange,
  constituencyName,
  districtName
}: HeaderProps) {
  return (
    <header className="bg-white border-b border-slate-100 py-3.5 px-6 shadow-2xs sticky top-0 z-50 transition-colors duration-200">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Brand details */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-indigo-100">
            {/* Seedling logo as described in screenshot */}
            <svg
              className="w-5.5 h-5.5 text-white"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 3v18M12 3a9 9 0 0 0-9 9m9-9a9 9 0 0 1 9 9M3 12h18"
              />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display font-bold text-slate-800 text-lg tracking-tight">
                PollutionWatch
              </h1>
              <span className="text-slate-300 font-light text-sm">|</span>
              <span className="text-indigo-600 font-display font-medium text-sm">
                {currentPortal === "citizen" ? "Citizen Report Terminal" : "Municipal Action Hub"}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Multi-agent environmental auditing & localized hotspot dispatches
            </p>
          </div>
        </div>

        {/* Portal switcher and live context */}
        <div className="flex flex-wrap items-center gap-3.5 ml-auto md:ml-0">
          {/* Segmented switcher (Portal change) */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200">
            <button
              id="citizen-portal-btn"
              onClick={() => onPortalChange("citizen")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                currentPortal === "citizen"
                  ? "bg-white text-indigo-600 shadow-xs font-semibold"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Citizen Portal
            </button>
            <button
              id="municipality-portal-btn"
              onClick={() => onPortalChange("municipality")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                currentPortal === "municipality"
                  ? "bg-white text-indigo-600 shadow-xs font-semibold"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              Municipal Admin
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
