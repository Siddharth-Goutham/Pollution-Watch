/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import Header from "./components/Header";
import CitizenPortal from "./components/CitizenPortal";
import MunicipalityPortal from "./components/MunicipalityPortal";

export default function App() {
  const [currentPortal, setCurrentPortal] = useState<"citizen" | "municipality">("citizen");
  const [activeConstituency, setActiveConstituency] = useState<string>("Bangalore Urban");
  const [activeDistrict, setActiveDistrict] = useState<string>("Bangalore");
  const [activeState, setActiveState] = useState<string>("Karnataka");
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  // Force Light UI: remove dark class and saved theme preference
  useEffect(() => {
    document.documentElement.classList.remove("dark");
    localStorage.removeItem("theme");
  }, []);

  // Simple, ultra-stable routing logic based on window.location.pathname
  useEffect(() => {
    const handleLocationChange = () => {
      const path = window.location.pathname.toLowerCase();
      if (path.includes("municipality")) {
        setCurrentPortal("municipality");
      } else {
        setCurrentPortal("citizen"); // Default to citizen portal
      }
    };

    // Run once on load
    handleLocationChange();

    // Listen to back/forward button clicks
    window.addEventListener("popstate", handleLocationChange);
    return () => {
      window.removeEventListener("popstate", handleLocationChange);
    };
  }, []);

  // Update browser URL on manual segmented control switch
  const handlePortalChange = (portal: "citizen" | "municipality") => {
    setCurrentPortal(portal);
    const newPath = portal === "municipality" ? "/municipality" : "/citizen";
    window.history.pushState({}, "", newPath);
  };

  // Callback to sync region details typed or selected by citizen/admin in real-time
  const handleRegionChange = (constituency: string, district: string, state: string) => {
    if (constituency !== undefined) {
      setActiveConstituency(prev => prev !== constituency ? constituency : prev);
    }
    if (district !== undefined) {
      setActiveDistrict(prev => prev !== district ? district : prev);
    }
    if (state !== undefined) {
      setActiveState(prev => prev !== state ? state : prev);
    }
  };

  // Helper to sync latest added constituency to pre-fill across portals
  const handleReportCreated = (newReport: any) => {
    if (newReport && newReport.constituency) {
      setActiveConstituency(newReport.constituency);
      setActiveDistrict(newReport.district);
      if (newReport.state) {
        setActiveState(newReport.state);
      }
      // Increment refresh trigger to update the municipality dashboard if open
      setRefreshTrigger(prev => prev + 1);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col justify-between transition-colors duration-200">
      
      {/* Platform Header */}
      <Header
        currentPortal={currentPortal}
        onPortalChange={handlePortalChange}
        constituencyName={activeConstituency}
        districtName={activeDistrict}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {currentPortal === "citizen" ? (
          <CitizenPortal
            onReportCreated={handleReportCreated}
            defaultConstituency={activeConstituency}
            defaultDistrict={activeDistrict}
            defaultState={activeState}
            onRegionChange={handleRegionChange}
          />
        ) : (
          <MunicipalityPortal
            refreshTrigger={refreshTrigger}
            onRefreshTriggered={() => setRefreshTrigger(prev => prev + 1)}
            defaultConstituency={activeConstituency}
            defaultDistrict={activeDistrict}
            defaultState={activeState}
            onRegionChange={handleRegionChange}
          />
        )}
      </main>

      {/* Platform Footer */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 py-5 px-6 mt-12 transition-colors duration-200">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-[11px] text-slate-400 dark:text-slate-500 font-medium">
          <div>
            Data Ingested: OpenAQ CPCB, Leaflet OpenStreetMap, Multi-Agent LangChain/LangGraph workflow
          </div>
          <div className="font-mono">
            PollutionWatch v3.0 • Powered by Flask & Python
          </div>
        </div>
      </footer>

    </div>
  );
}
