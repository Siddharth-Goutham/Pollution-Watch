/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { 
  Cpu, Camera, Globe, LineChart, Layers, ShieldCheck, 
  AlertTriangle, Flame, ShieldAlert, Sparkles, MapPin, 
  Send, RefreshCw, CheckCircle2, Clock, Map, Target, ExternalLink, X
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { MunicipalDashboardData, Hotspot, CitizenReport, AgentStatus } from "../types";
import LiveMap from "./LiveMap";
import LiveChart from "./LiveChart";

// Robust helper to check for random nonsense/gibberish input
function isGibberish(str: string): boolean {
  const text = (str || "").trim();
  if (text.length < 3) return true;
  
  // 1. Only numbers or symbols or punctuation
  if (/^[0-9\W_]+$/.test(text)) return true;
  
  // 2. High density of repeated characters, e.g. "aaaaa", "asdfff"
  if (/(.)\1{3,}/.test(text)) return true;
  
  // Split into words to check each word individually
  const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 0);
  
  for (const word of words) {
    // 3. No vowels at all in a word of length >= 4 (excluding common local acronyms)
    if (word.length >= 4 && !/[aeiouy]/i.test(word) && !["hsr", "ncr", "cpcb", "aqi"].includes(word)) {
      return true;
    }
    
    // 4. Keyboard walks / random letters
    const patterns = [
      "asdf", "sdfg", "dfgh", "fghj", "ghjk", "hjkl", 
      "qwerty", "werty", "ertyu", "rtyui", "tyuio", "yuiop", 
      "zxcv", "xcvb", "cvbn", "vbnm", "1234", "abcd", "qwer",
      "asda", "asds", "qweq", "zxzx"
    ];
    for (const pat of patterns) {
      if (word.includes(pat)) return true;
    }
    
    // 5. Too many consecutive consonants in a word (e.g. "rtxpqsd")
    const hasVowel = /[aeiouy]/.test(word);
    if (word.length >= 5 && hasVowel) {
      const consecutiveConsonants = word.match(/[^aeiouy\s]{5,}/g);
      if (consecutiveConsonants) return true;
    } else if (word.length >= 5 && !hasVowel) {
      return true;
    }
  }
  
  return false;
}

interface MunicipalityPortalProps {
  onRefreshTriggered: () => void;
  refreshTrigger?: number;
  key?: string;
  defaultConstituency?: string;
  defaultDistrict?: string;
  defaultState?: string;
  onRegionChange?: (constituency: string, district: string, state: string) => void;
}

export default function MunicipalityPortal({
  onRefreshTriggered,
  refreshTrigger,
  defaultConstituency = "Bangalore Urban",
  defaultDistrict = "Bangalore",
  defaultState = "Karnataka",
  onRegionChange
}: MunicipalityPortalProps) {
  // Login Session State: Session starts signed out initially
  const [user, setUser] = useState<{ username: string; constituency: string; district: string; state: string } | null>(null);

  const [usernameInput, setUsernameInput] = useState<string>("");
  const [passwordInput, setPasswordInput] = useState<string>("");
  const [constituencyInput, setConstituencyInput] = useState<string>("");
  const [districtInput, setDistrictInput] = useState<string>("");
  const [stateInput, setStateInput] = useState<string>("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState<boolean>(false);

  const [constituency, setConstituency] = useState<string>(() => user?.constituency || defaultConstituency);

  const [data, setData] = useState<MunicipalDashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedHotspotId, setSelectedHotspotId] = useState<string | null>(null);
  const [scanning, setScanning] = useState<boolean>(false);

  const [hasScanned, setHasScanned] = useState<boolean>(false);

  const [scanSteps, setScanSteps] = useState<{ [key: string]: AgentStatus["status"] }>(() => {
    return {
      sensor: "Standby",
      vision: "Standby",
      satellite: "Standby",
      forecast: "Standby",
      aggregator: "Standby",
      critique: "Standby"
    };
  });

  const [completingId, setCompletingId] = useState<string | null>(null);
  const [evidenceImage, setEvidenceImage] = useState<string | null>(null);
  const [resMessageInput, setResMessageInput] = useState<string>("");
  const [isEvidenceUploading, setIsEvidenceUploading] = useState<boolean>(false);
  const [flashMessage, setFlashMessage] = useState<string | null>(null);
  const [completionError, setCompletionError] = useState<string | null>(null);

  // Sync region to parent component
  useEffect(() => {
    if (onRegionChange && user) {
      onRegionChange(constituency, user.district, user.state);
    }
  }, [user, constituency, onRegionChange]);

  // Sync user session to incoming props safely to prevent cursor jumping loops
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
    }
    if (defaultConstituency) {
      if (defaultConstituency !== constituency) {
        setConstituency(defaultConstituency);
      }

      if (user && (user.constituency !== defaultConstituency || user.district !== defaultDistrict || user.state !== defaultState)) {
        const updatedUser = {
          ...user,
          constituency: defaultConstituency,
          district: defaultDistrict || user.district,
          state: defaultState || user.state
        };
        setUser(updatedUser);
      }
    }
  }, [defaultConstituency, defaultDistrict, defaultState]);

  const handleCompleteTask = async (reportId: string, base64Image: string | null) => {
    setCompletionError(null);
    if (!resMessageInput.trim()) {
      setCompletionError("Resolution Message is required. Please fill in the resolution message.");
      return;
    }
    try {
      setIsEvidenceUploading(true);
      const res = await fetch("/api/complete-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          reportId, 
          evidencePhoto: base64Image || "simulated-resolution-check",
          resolutionMessage: resMessageInput
        })
      });
      if (res.ok) {
        setCompletingId(null);
        setEvidenceImage(null);
        setResMessageInput("");
        setCompletionError(null);
        
        // Optimistically set completed: true to instantly make the report card disappear
        setData(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            reports: (prev.reports || []).map(r => r.id === reportId ? { ...r, completed: true } : r)
          };
        });

        await fetchDashboardData(constituency, hasScanned, true);
        onRefreshTriggered();
        setFlashMessage("Task resolved and completed successfully!");
        setTimeout(() => {
          setFlashMessage(null);
        }, 4000);
      } else {
        const errJson = await res.json();
        setCompletionError(errJson.error || "Failed to submit evidence.");
      }
    } catch (e) {
      console.error(e);
      alert("Error submitting task resolution.");
    } finally {
      setIsEvidenceUploading(false);
    }
  };

  // Fetch dashboard data
  const fetchDashboardData = async (selectedConst: string, currentHasScanned: boolean, keepSelectedId?: boolean) => {
    try {
      setLoading(true);
      const dist = user?.district || districtInput || "Dakshin Kannada";
      const st = user?.state || stateInput || "Karnataka";
      const url = `/api/municipal-dashboard?constituency=${encodeURIComponent(selectedConst)}&district=${encodeURIComponent(dist)}&state=${encodeURIComponent(st)}&hasScanned=${currentHasScanned}`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setData(json);
        
        // Retain current selection if valid and requested
        if (keepSelectedId && selectedHotspotId && json.hotspots && json.hotspots.some((h: any) => h.id === selectedHotspotId)) {
          // Do nothing, retain selection
        } else {
          // Default select first hotspot if available
          if (json.hotspots && json.hotspots.length > 0) {
            setSelectedHotspotId(json.hotspots[0].id);
          } else {
            setSelectedHotspotId(null);
          }
        }
      }
    } catch (e) {
      console.error("Error fetching dashboard data", e);
    } finally {
      setLoading(false);
    }
  };

  // Reset scan state on constituency change to enforce manual scan per region
  useEffect(() => {
    setHasScanned(false);
    setScanSteps({
      sensor: "Standby",
      vision: "Standby",
      satellite: "Standby",
      forecast: "Standby",
      aggregator: "Standby",
      critique: "Standby"
    });
  }, [constituency]);

  // Fetch dashboard data reactively based on scan status
  useEffect(() => {
    if (user) {
      fetchDashboardData(constituency, hasScanned);
    }
  }, [constituency, user, refreshTrigger, hasScanned]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalUsername = usernameInput.trim();
    const finalPassword = passwordInput.trim();
    const finalConstituency = constituencyInput.trim();
    const finalDistrict = districtInput.trim();
    const finalState = stateInput.trim();

    if (!finalUsername || !finalPassword || !finalConstituency || !finalDistrict || !finalState) {
      setLoginError("All fields are mandatory. Please fill in all fields.");
      return;
    }

    if (isGibberish(finalConstituency) || isGibberish(finalDistrict) || isGibberish(finalState)) {
      setLoginError("Please enter valid, real regional names. Gibberish values are not allowed.");
      return;
    }

    try {
      setLoginLoading(true);
      setLoginError(null);
      const res = await fetch("/api/municipality/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          username: finalUsername, 
          password: finalPassword,
          constituency: finalConstituency,
          district: finalDistrict,
          state: finalState
        })
      });
      if (res.ok) {
        const json = await res.json();
        setUser(json.user);
        localStorage.setItem("municipality_user", JSON.stringify(json.user));
        setHasScanned(false);
        setScanSteps({
          sensor: "Standby",
          vision: "Standby",
          satellite: "Standby",
          forecast: "Standby",
          aggregator: "Standby",
          critique: "Standby"
        });
        setConstituency(json.user.constituency);
        await fetchDashboardData(json.user.constituency, false);
      } else {
        const json = await res.json();
        setLoginError(json.error || "Login failed. Check admin password.");
      }
    } catch (e) {
      console.error(e);
      setLoginError("Network connection error. Please try again.");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("municipality_user");
    localStorage.removeItem("municipality_has_scanned");
    setConstituency("Bangalore Urban");
    setUsernameInput("");
    setPasswordInput("");
    setConstituencyInput("Bangalore Urban");
    setDistrictInput("Bangalore");
    setStateInput("Karnataka");
    setData(null);
    setHasScanned(false);
    setScanSteps({
      sensor: "Standby",
      vision: "Standby",
      satellite: "Standby",
      forecast: "Standby",
      aggregator: "Standby",
      critique: "Standby"
    });
  };

  // Run timed Agent Orchestration simulation for the hackathon demo
  const handleMultiAgentScan = async () => {
    if (scanning) return;
    setScanning(true);

    // Sequence of agents to animate
    const agentsSequence = ["sensor", "vision", "satellite", "forecast", "aggregator", "critique"];
    
    // Set all to Standby first
    const initialSteps = { ...scanSteps };
    agentsSequence.forEach(agent => {
      initialSteps[agent] = "Standby";
    });
    setScanSteps(initialSteps);

    // Sequentially activate and finish each agent
    for (let i = 0; i < agentsSequence.length; i++) {
      const activeAgent = agentsSequence[i];
      
      // Mark active
      setScanSteps(prev => ({ ...prev, [activeAgent]: "Active" }));
      await new Promise(resolve => setTimeout(resolve, 800)); // Time spent scanning

      // Mark finished
      setScanSteps(prev => ({ ...prev, [activeAgent]: "Finished" }));
    }

    try {
      // Hit backend API to create a fresh hotspot for the scanned area
      const scanRes = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          constituency,
          district: user?.district || districtInput || "Dakshin Kannada",
          state: user?.state || stateInput || "Karnataka"
        })
      });

      if (scanRes.ok) {
        setHasScanned(true);
        await fetchDashboardData(constituency, true);
        onRefreshTriggered();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setScanning(false);
    }
  };

  // Deploy resources to hotspot
  const handleDeploy = async (id: string) => {
    try {
      const hotspots = data?.hotspots || [];
      const spot = hotspots.find(h => h.id === id);

      const res = await fetch("/api/deploy-resource", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, hotspot: spot })
      });

      if (res.ok) {
        // Optimistically update local data to mark report or hotspot as dispatched
        setData(prev => {
          if (!prev) return prev;
          const updatedReports = (prev.reports || []).map(r => r.id === id ? { ...r, dispatched: true } : r);
          const updatedHotspots = (prev.hotspots || []).map(h => h.id === id ? { ...h, dispatched: true } : h);
          return {
            ...prev,
            reports: updatedReports,
            hotspots: updatedHotspots
          };
        });

        // Re-fetch to update state and preserve our current selection
        await fetchDashboardData(constituency, hasScanned, true);
        onRefreshTriggered();
        setFlashMessage("Resources deployed!");
        setTimeout(() => {
          setFlashMessage(null);
        }, 4000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (!user) {
    return (
      <div className="max-w-md mx-auto my-12 px-4 animate-fade-in">
        <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto border border-indigo-100 shadow-2xs">
              <ShieldCheck className="w-8 h-8 stroke-[1.5]" />
            </div>
            <h2 className="font-display font-bold text-slate-800 text-xl tracking-tight">
              Municipal Portal Access
            </h2>
            <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
              Authenticate with your municipal official username and admin password to access local telemetry and citizen evidence.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {loginError && (
              <div className="bg-red-50 border border-red-100 text-red-600 text-xs font-semibold px-4 py-3 rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Official Username <span className="text-red-500 font-bold">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. leader"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                disabled={loginLoading}
                required
                className="w-full bg-slate-50 border border-slate-100 text-slate-800 text-xs font-medium rounded-xl px-4 py-3 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/15 focus:bg-white transition-all placeholder:text-slate-400"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Admin Password <span className="text-red-500 font-bold">*</span>
              </label>
              <input
                type="password"
                placeholder="Enter password (e.g., admin)"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                disabled={loginLoading}
                required
                className="w-full bg-slate-50 border border-slate-100 text-slate-800 text-xs font-medium rounded-xl px-4 py-3 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/15 focus:bg-white transition-all placeholder:text-slate-400"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Constituency Name <span className="text-red-500 font-bold">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Bangalore Urban"
                value={constituencyInput}
                onChange={(e) => setConstituencyInput(e.target.value)}
                disabled={loginLoading}
                required
                className="w-full bg-slate-50 border border-slate-100 text-slate-800 text-xs font-medium rounded-xl px-4 py-3 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/15 focus:bg-white transition-all placeholder:text-slate-400"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                District <span className="text-red-500 font-bold">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Bangalore"
                value={districtInput}
                onChange={(e) => setDistrictInput(e.target.value)}
                disabled={loginLoading}
                required
                className="w-full bg-slate-50 border border-slate-100 text-slate-800 text-xs font-medium rounded-xl px-4 py-3 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/15 focus:bg-white transition-all placeholder:text-slate-400"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                State <span className="text-red-500 font-bold">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Karnataka"
                value={stateInput}
                onChange={(e) => setStateInput(e.target.value)}
                disabled={loginLoading}
                required
                className="w-full bg-slate-50 border border-slate-100 text-slate-800 text-xs font-medium rounded-xl px-4 py-3 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/15 focus:bg-white transition-all placeholder:text-slate-400"
              />
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-indigo-100 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loginLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Verifying Official Session...
                </>
              ) : (
                "Authorize & Enter Portal"
              )}
            </button>
          </form>

          <div className="border-t border-slate-100 pt-5 text-center">
            <p className="text-[10px] text-slate-400 leading-normal">
              * The admin password for verification is <strong className="text-slate-600">admin</strong>. Fill in your official username along with your constituency name, district, and state to dynamically register or load that region for auditing!
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 text-sm">Aggregating municipal telemetry...</p>
      </div>
    );
  }

  const hotspots = data?.hotspots || [];
  const reports = (data?.reports || []).filter(r => !r.completed);
  const selectedHotspot = hotspots.find(h => h.id === selectedHotspotId) || hotspots[0];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 relative">
      <AnimatePresence>
        {flashMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl border border-emerald-500/50 font-sans text-xs font-semibold"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-100 flex-shrink-0 animate-bounce" />
            <span>{flashMessage}</span>
            <button 
              onClick={() => setFlashMessage(null)} 
              className="ml-2 hover:bg-emerald-700/50 p-1 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-4 h-4 text-emerald-100" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Official Audit Session Info Header */}
      {user && (
        <div className="bg-indigo-50/50 border border-indigo-100 rounded-3xl p-5 md:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <h2 className="text-xs font-bold tracking-widest uppercase text-indigo-800">
                MUNICIPAL SECURITY AUDITING PORTAL
              </h2>
            </div>
            <p className="text-sm font-semibold text-slate-800">
              Official Session: <span className="text-indigo-600">{user.username}</span>
            </p>
            <p className="text-xs text-slate-500">
              Authority Lock: <strong className="text-slate-800">{user.constituency} Constituency</strong> | {user.district} | {user.state}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 text-xs font-bold rounded-xl border border-slate-200 transition-all cursor-pointer self-start md:self-auto shadow-2xs"
          >
            Sign Out Session
          </button>
        </div>
      )}

      {/* Search Filter & Trigger Row */}
      <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Auditing Region (Enforced):
          </label>
          <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold rounded-xl px-4 py-2">
            {user?.constituency || constituency}
          </span>
        </div>

        <button
          onClick={handleMultiAgentScan}
          disabled={scanning}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-100 cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${scanning ? 'animate-spin' : ''}`} />
          {scanning ? "Orchestrating Agent Sequence..." : "Run Multi-Agent Scan"}
        </button>
      </div>

      {/* 1. AGENT PIPELINE ORCHESTRATION ANALYTICS */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-50 pb-3">
          <Cpu className="w-4 h-4 text-slate-500" />
          <h3 className="font-display font-semibold text-slate-700 text-xs tracking-wider uppercase">
            AGENT PIPELINE ORCHESTRATION ANALYTICS
          </h3>
        </div>

        {/* 6 Agents cards row */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3.5">
          {[
            { key: "sensor", label: "Sensor Agent", icon: Cpu, desc: "Fetches OpenAQ telemetry" },
            { key: "vision", label: "Vision Agent", icon: Camera, desc: "Scans citizen photo feeds" },
            { key: "satellite", label: "Satellite Agent", icon: Globe, desc: "Monitors Sentinel-5P aerosols" },
            { key: "forecast", label: "Forecast Agent", icon: LineChart, desc: "Plots 24h predictive lines" },
            { key: "aggregator", label: "Aggregator", icon: Layers, desc: "Fuses data representations" },
            { key: "critique", label: "Critique QA", icon: ShieldCheck, desc: "Validates audit compliance" }
          ].map(agent => {
            const status = scanSteps[agent.key];
            let badgeColor = "bg-slate-100 text-slate-500";
            if (status === "Active") badgeColor = "bg-amber-100 text-amber-700 animate-pulse";
            if (status === "Finished") badgeColor = "bg-green-100 text-green-700 font-bold";

            return (
              <div
                key={agent.key}
                className={`border rounded-2xl p-4 text-center flex flex-col items-center justify-between transition-all space-y-2 ${
                  status === "Active" 
                    ? "border-amber-400 shadow-md shadow-amber-50" 
                    : "border-slate-100 hover:border-slate-200 bg-slate-50/50"
                }`}
              >
                <div className="w-10 h-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center shadow-2xs">
                  <agent.icon className={`w-5 h-5 ${status === "Active" ? 'text-amber-500' : 'text-slate-600'}`} />
                </div>
                <div>
                  <h4 className="font-display font-semibold text-slate-800 text-xs whitespace-nowrap">
                    {agent.label}
                  </h4>
                  <p className="text-[9px] text-slate-400 mt-0.5 line-clamp-1">{agent.desc}</p>
                </div>
                <span className={`text-[9px] px-2.5 py-0.5 rounded-full font-semibold ${badgeColor}`}>
                  {status}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {!hasScanned ? (
        <div className="bg-white border border-slate-100 rounded-3xl p-10 text-center flex flex-col items-center justify-center gap-5 shadow-2xs">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center border border-indigo-100/50 shadow-xs">
            <Cpu className="w-8 h-8 animate-pulse text-indigo-600" />
          </div>
          <div className="space-y-1.5 max-w-md">
            <h3 className="font-display font-bold text-slate-800 text-base">
              Telemetry Scanning Required
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              No audit records, maps, or citizen reports are loaded for the <strong>{user?.constituency || constituency}</strong> constituency. Press the <strong>Run Multi-Agent Scan</strong> button above to trigger our multi-agent sensor sweep.
            </p>
          </div>
          <button
            onClick={handleMultiAgentScan}
            disabled={scanning}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-100 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${scanning ? 'animate-spin' : ''}`} />
            {scanning ? "Orchestrating Pipeline..." : "Run Multi-Agent Scan Now"}
          </button>
        </div>
      ) : (
        <>
          {/* 2. STATS ROW */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Critical Risk */}
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-2xs flex items-center gap-4 hover:border-red-100 transition-colors">
              <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center border border-red-100 flex-shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-bold font-display text-red-600">
                  {data?.stats.criticalCount || 0}
                </div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  🚨 Critical Risk
                </div>
              </div>
            </div>

            {/* High Risk */}
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-2xs flex items-center gap-4 hover:border-orange-100 transition-colors">
              <div className="w-12 h-12 bg-orange-50 text-orange-500 rounded-full flex items-center justify-center border border-orange-100 flex-shrink-0">
                <Flame className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-bold font-display text-orange-600">
                  {data?.stats.highCount || 0}
                </div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  🔥 High Risk
                </div>
              </div>
            </div>

            {/* Medium Risk */}
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-2xs flex items-center gap-4 hover:border-amber-100 transition-colors">
              <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center border border-amber-100 flex-shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-bold font-display text-amber-600">
                  {data?.stats.mediumCount || 0}
                </div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  ⚠️ Medium Risk
                </div>
              </div>
            </div>

            {/* Low Risk */}
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-2xs flex items-center gap-4 hover:border-emerald-100 transition-colors">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center border border-emerald-100 flex-shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-bold font-display text-emerald-600">
                  {data?.stats.lowCount || 0}
                </div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  🌿 Low Risk
                </div>
              </div>
            </div>

            {/* Worst Hotspot Indicator Card */}
            <div className="bg-white border-2 border-red-500 rounded-2xl p-4.5 shadow-xs col-span-1 sm:col-span-2 lg:col-span-1 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-red-500 text-white text-[8px] font-bold px-2 py-0.5 rounded-bl uppercase tracking-wider">
                Worst Hotspot
              </div>
              <h4 className="font-display font-bold text-slate-800 text-xs truncate mt-1">
                {hotspots.length > 0 
                  ? hotspots.reduce((worst, current) => current.aqi > worst.aqi ? current : worst, hotspots[0]).locationName 
                  : "No Active Hotspots"}
              </h4>
              <div className="flex items-center gap-4 mt-3 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">AQI</span>
                  <span className="font-mono font-bold text-red-600">
                    {hotspots.length > 0 
                      ? Math.max(...hotspots.map(h => h.aqi)) 
                      : "--"}
                  </span>
                </div>
                <div className="border-l border-slate-100 pl-4">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Score</span>
                  <span className="font-mono font-bold text-red-600">
                    {hotspots.length > 0 
                      ? Math.max(...hotspots.map(h => h.riskScore)) 
                      : "--"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. SPLIT LAYOUT (MAP ON LEFT, LOGS/OVERVIEWS ON RIGHT) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Side: Map */}
            <div className="lg:col-span-7 h-full">
              <LiveMap
                hotspots={hotspots}
                selectedHotspotId={selectedHotspotId}
                onSelectHotspot={setSelectedHotspotId}
                districtName={data?.district || "Dakshin Kannada"}
              />
            </div>

            {/* Right Side: Dispatch orders and Hotspots lists */}
            <div className="lg:col-span-5 space-y-6 flex flex-col justify-start">
              
              {/* MUNICIPAL DISPATCH ORDERS */}
              <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs flex-1">
                <div className="flex items-center gap-2 border-b border-slate-50 pb-2.5 mb-3">
                  <Sparkles className="w-4 h-4 text-slate-500" />
                  <h3 className="font-display font-semibold text-slate-700 text-xs tracking-wider uppercase">
                    🚨 MUNICIPAL DISPATCH ORDERS
                  </h3>
                </div>

                <div className="space-y-3 max-h-[160px] overflow-y-auto custom-scrollbar pr-1">
                  {data?.dispatchLogs && data.dispatchLogs.length > 0 ? (
                    data.dispatchLogs.map(log => (
                      <div key={log.id} className="border border-amber-300 bg-amber-50/40 rounded-xl p-3.5 relative">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-display font-bold text-amber-950 text-xs truncate max-w-[70%]">
                            📍 {log.locationName}
                          </h4>
                          <span className="text-[8px] bg-amber-500 text-white font-bold px-1.5 py-0.5 rounded uppercase">
                            Priority 2
                          </span>
                        </div>
                        <p className="text-[11px] text-amber-900 leading-relaxed font-medium">
                          💦 {log.resourceType}: Emergency dispatch of water mist cannon to combat active particulate emission spikes.
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-[9px] text-slate-400 font-mono">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Response within 60 mins
                          </span>
                          <span>•</span>
                          <span>{new Date(log.dispatchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-slate-400 text-xs font-medium bg-slate-50 rounded-xl">
                      No resource dispatch dispatches yet.
                    </div>
                  )}
                </div>
              </div>

              {/* HOTSPOTS OVERVIEW */}
              <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs flex-1">
                <div className="flex items-center gap-2 border-b border-slate-50 pb-2.5 mb-3">
                  <Target className="w-4 h-4 text-slate-500" />
                  <h3 className="font-display font-semibold text-slate-700 text-xs tracking-wider uppercase">
                    🎯 HOTSPOTS OVERVIEW
                  </h3>
                </div>

                <div className="space-y-2.5 max-h-[160px] overflow-y-auto custom-scrollbar pr-1">
                  {hotspots.map(spot => {
                    let badgeStyle = "bg-emerald-50 text-emerald-700 border-emerald-100";
                    if (spot.risk === "CRITICAL") badgeStyle = "bg-red-50 text-red-700 border-red-100";
                    else if (spot.risk === "HIGH") badgeStyle = "bg-orange-50 text-orange-700 border-orange-100";
                    else if (spot.risk === "MEDIUM") badgeStyle = "bg-amber-50 text-amber-700 border-amber-100";

                    return (
                      <div
                        key={spot.id}
                        onClick={() => setSelectedHotspotId(spot.id)}
                        className={`border p-3 rounded-xl flex items-center justify-between transition-all cursor-pointer ${
                          selectedHotspotId === spot.id
                            ? "border-indigo-400 bg-indigo-50/20"
                            : "border-slate-100 hover:border-slate-200"
                        }`}
                      >
                        <div className="space-y-1 max-w-[65%]">
                          <h4 className="font-display font-bold text-slate-800 text-xs truncate">
                            {spot.locationName}
                          </h4>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500">
                            <span className="font-semibold text-indigo-600 font-mono">AQI: {spot.aqi}</span>
                            <span>•</span>
                            <span className="truncate">{spot.recommendedAction}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] font-bold border px-1.5 py-0.5 rounded ${badgeStyle}`}>
                            {spot.risk} ({spot.riskScore})
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeploy(spot.id);
                            }}
                            disabled={spot.dispatched}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                              spot.dispatched
                                ? "bg-slate-100 text-slate-400 border border-slate-200"
                                : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs cursor-pointer"
                            }`}
                          >
                            {spot.dispatched ? "Dispatched" : "Deploy"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>

          {/* 4. DETAILED HOTSPOT INFO CARD (AT THE BOTTOM OF MAP) */}
          {selectedHotspot && (
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-5 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-50 pb-4">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-red-500" />
                  <h3 className="font-display font-bold text-slate-800 text-sm">
                    {selectedHotspot.locationName}
                  </h3>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ml-2 ${
                    selectedHotspot.risk === "CRITICAL" ? "bg-red-50 text-red-700" :
                    selectedHotspot.risk === "HIGH" ? "bg-orange-50 text-orange-700" :
                    selectedHotspot.risk === "MEDIUM" ? "bg-amber-50 text-amber-700" :
                    "bg-emerald-50 text-emerald-700"
                  }`}>
                    {selectedHotspot.risk} - Risk Score: {selectedHotspot.riskScore}
                  </span>
                </div>
                
                {selectedHotspot.dispatched && (
                  <span className="text-[10px] bg-green-50 text-green-700 font-bold px-2.5 py-1 rounded-full border border-green-100 flex items-center gap-1 self-start sm:self-auto">
                    <CheckCircle2 className="w-3.5 h-3.5 animate-pulse" /> Resource Active
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Dynamic Cause analysis */}
                <div className="md:col-span-2 space-y-4">
                  <div className="bg-amber-50/30 border border-amber-200/50 rounded-2xl p-4">
                    <h4 className="font-display font-semibold text-amber-900 text-xs uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5" /> Dynamic Pollution Cause Analysis
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                      {selectedHotspot.analysis}
                    </p>
                  </div>

                  {/* AQI HUD stats grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 text-center">
                    <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3">
                      <span className="text-[9px] font-bold text-slate-400 block uppercase mb-1">AQI</span>
                      <span className="text-lg font-bold font-mono text-emerald-600">
                        {selectedHotspot.aqi}
                      </span>
                    </div>
                    <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3">
                      <span className="text-[9px] font-bold text-slate-400 block uppercase mb-1">Predicted Peak</span>
                      <span className="text-lg font-bold font-mono text-red-500">
                        {selectedHotspot.predictedPeak}
                      </span>
                    </div>
                    <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3">
                      <span className="text-[9px] font-bold text-slate-400 block uppercase mb-1">Primary Pollutant</span>
                      <span className="text-xs font-bold text-slate-700 block mt-1">
                        {selectedHotspot.primaryPollutant}
                      </span>
                    </div>
                    <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3">
                      <span className="text-[9px] font-bold text-slate-400 block uppercase mb-1">Aerosol Index</span>
                      <span className="text-xs font-mono font-bold text-indigo-600 block mt-1">
                        {selectedHotspot.aerosolIndex}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Recommended Dispatch */}
                <div className="space-y-4">
                  <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4 flex flex-col justify-between h-full">
                    <div>
                      <h4 className="font-display font-semibold text-slate-500 text-[10px] uppercase tracking-wider mb-2 flex items-center gap-1">
                        📋 Recommended Dispatch Action
                      </h4>
                      <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                        {selectedHotspot.recommendedAction}
                      </p>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-4 text-[10px] text-slate-400 font-mono">
                      <span className="bg-slate-900 text-white font-bold px-2 py-0.5 rounded text-[8px]">
                        💦 {selectedHotspot.dispatchType.toUpperCase()}
                      </span>
                      <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[8px] uppercase font-bold">
                        OpenAQ/CPCB
                      </span>
                    </div>
                  </div>
                </div>

              </div>

              <button
                onClick={() => handleDeploy(selectedHotspot.id)}
                disabled={selectedHotspot.dispatched}
                className={`w-full py-3.5 rounded-xl font-display font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                  selectedHotspot.dispatched
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                    : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-100 cursor-pointer"
                }`}
              >
                {selectedHotspot.dispatched ? (
                  <>
                    <CheckCircle2 className="w-4.5 h-4.5" /> Resource successfully dispatched and actively regulating ambient air quality
                  </>
                ) : (
                  <>
                    🚀 Deploy Resources to this Location
                  </>
                )}
              </button>
            </div>
          )}

          {/* 5. 24-HOUR AQI FORECAST */}
          <LiveChart currentAqi={selectedHotspot?.aqi || 33} />

          {/* 6. CRITIQUE AGENT AUDIT VERIFICATION */}
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 shadow-2xs space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <h4 className="font-display font-semibold text-slate-700 text-xs tracking-wider uppercase">
                Critique Agent Audit Verification
              </h4>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              {data?.critiqueVerification}
            </p>
            <div className="flex items-center gap-4 text-[10px] text-slate-400 font-mono">
              <span className="flex items-center gap-1">
                <Camera className="w-3.5 h-3.5" /> {reports.length} active citizen photo inputs
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> {hotspots.length} active ground sensor inputs
              </span>
            </div>
          </div>

          {/* 7. CITIZEN UPLOADED EVIDENCE FOR ACTIVE CONSTITUENCY */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-50 pb-3">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-indigo-600" />
                <h3 className="font-display font-semibold text-slate-800 text-sm tracking-tight">
                  📸 Citizen Uploaded Photos & Reports for {user?.constituency || constituency}
                </h3>
              </div>
              <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2.5 py-1 rounded-full border border-indigo-100">
                {reports.length} Reports
              </span>
            </div>

            {reports.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {reports.map((report) => (
                  <div key={report.id} className="bg-slate-50/50 border border-slate-100 rounded-2xl overflow-hidden shadow-2xs hover:shadow-xs hover:border-slate-200 transition-all flex flex-col justify-between">
                    <div>
                      {/* Image Container */}
                      <div className="relative bg-slate-900 h-48 flex items-center justify-center overflow-hidden">
                        {report.photos && report.photos.length > 0 ? (
                          <div className="w-full h-full relative group">
                            <img
                              src={report.photos[0]}
                              alt={`Citizen photo evidence ${report.id}`}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                            {report.photos.length > 1 && (
                              <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
                                +{report.photos.length - 1} more
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent flex flex-col justify-end p-4">
                              <span className="text-white text-xs font-bold drop-shadow-xs truncate">
                                📍 {user?.constituency || constituency}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center text-slate-500 gap-2 p-4 text-center">
                            <Camera className="w-8 h-8 text-slate-600 stroke-[1.5]" />
                            <span className="text-xs font-medium">No Image Uploaded</span>
                          </div>
                        )}
                        
                        <div className="absolute top-2 left-2">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase shadow-xs ${
                            report.risk === "CRITICAL" ? "bg-red-500 text-white" :
                            report.risk === "HIGH" ? "bg-orange-500 text-white" :
                            report.risk === "MEDIUM" ? "bg-amber-500 text-white" :
                            "bg-emerald-500 text-white"
                          }`}>
                            {report.risk} ({report.riskScore})
                          </span>
                        </div>
                      </div>

                      {/* Report Body */}
                      <div className="p-4.5 space-y-3">
                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                          <span>ID: {report.id}</span>
                          <span>{new Date(report.createdAt).toLocaleDateString()}</span>
                        </div>
                        
                        <div className="space-y-1">
                          <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Analysis:</h4>
                          <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                            {report.analysis}
                          </p>
                        </div>

                        <div className="bg-indigo-50/40 border border-indigo-100/40 rounded-xl p-3 space-y-1">
                          <h4 className="text-[9px] font-bold text-indigo-900 uppercase tracking-wider">Recommended Dispatch:</h4>
                          <p className="text-[11px] text-indigo-950 font-medium leading-normal">
                            {report.recommendedAction}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Task Resolution Section */}
                    <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-3">
                      {report.completed ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-1.5 bg-green-50 text-green-700 border border-green-100 px-3 py-1.5 rounded-xl text-xs font-bold">
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                            Task Done
                          </div>
                          {report.evidencePhoto && (
                            <div className="space-y-1">
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Evidence Photo:</span>
                              <div className="relative h-24 rounded-lg overflow-hidden border border-emerald-100 shadow-3xs">
                                <img src={report.evidencePhoto} alt="Evidence" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {/* Deploy Resource & Task Done Actions */}
                          {completingId === report.id ? (
                            <div className="space-y-3 text-left">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Attach Resolution Evidence</span>
                                <button
                                  onClick={() => {
                                    setCompletingId(null);
                                    setEvidenceImage(null);
                                  }}
                                  className="text-[10px] text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>

                              {evidenceImage ? (
                                <div className="relative h-28 rounded-lg overflow-hidden border border-slate-200 bg-black">
                                  <img src={evidenceImage} alt="Evidence Preview" className="w-full h-full object-cover" />
                                  <button
                                    onClick={() => setEvidenceImage(null)}
                                    className="absolute top-1.5 right-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 cursor-pointer"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <label className="flex flex-col items-center justify-center h-20 border-2 border-dashed border-indigo-200 rounded-xl bg-white hover:bg-indigo-50/10 cursor-pointer transition-all">
                                  <Camera className="w-5 h-5 text-indigo-500 mb-1" />
                                  <span className="text-[9px] font-bold text-slate-500">Upload Evidence Photo</span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        const reader = new FileReader();
                                        reader.onloadend = () => {
                                          setEvidenceImage(reader.result as string);
                                        };
                                        reader.readAsDataURL(file);
                                      }
                                    }}
                                  />
                                </label>
                              )}

                              <div className="space-y-1">
                                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
                                  Resolution Message to Citizen <span className="text-red-500 font-bold">*</span>
                                </span>
                                <textarea
                                  placeholder="Describe the action taken (e.g. Deployed street sweepers and cleared the dust. Thank you!)"
                                  value={resMessageInput}
                                  onChange={(e) => setResMessageInput(e.target.value)}
                                  required
                                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-colors h-16 resize-none"
                                />
                              </div>

                              {completionError && (
                                <p className="text-[10px] font-bold text-red-500 bg-red-50 border border-red-100 rounded-lg p-2">
                                  {completionError}
                                </p>
                              )}

                              <button
                                onClick={() => handleCompleteTask(report.id, evidenceImage)}
                                disabled={isEvidenceUploading}
                                className="w-full py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 text-white text-[11px] font-bold rounded-lg transition-all cursor-pointer"
                              >
                                {isEvidenceUploading ? "Submitting..." : "Submit Resolution"}
                              </button>
                            </div>
                          ) : (
                            <div className="flex flex-col sm:flex-row gap-2">
                              {/* Deploy Button */}
                              <button
                                onClick={() => handleDeploy(report.id)}
                                disabled={report.dispatched}
                                className={`flex-1 py-2 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                  report.dispatched
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-100/50"
                                    : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs"
                                }`}
                              >
                                {report.dispatched ? (
                                  <>
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                    Resource Dispatched
                                  </>
                                ) : (
                                  <>
                                    <Send className="w-3.5 h-3.5" />
                                    Deploy Resource
                                  </>
                                )}
                              </button>

                              {/* Task Done Trigger */}
                              <button
                                onClick={() => {
                                  setCompletingId(report.id);
                                  setEvidenceImage(null);
                                  setCompletionError(null);
                                }}
                                className="flex-1 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-800 text-[11px] font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                                Task Done
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Footer thumbnail strip for multi-photo viewer */}
                    {report.photos && report.photos.length > 0 && (
                      <div className="p-4.5 pt-0 border-t border-slate-100/50 flex items-center gap-1.5 overflow-x-auto">
                        {report.photos.map((photo, pIdx) => (
                          <a
                            key={pIdx}
                            href={photo}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-10 h-10 rounded-lg border border-slate-200 overflow-hidden flex-shrink-0 hover:border-indigo-400 transition-colors"
                          >
                            <img src={photo} alt="thumbnail" className="w-full h-full object-cover" />
                          </a>
                        ))}
                        <span className="text-[9px] text-slate-400 ml-1 font-mono">Click thumbnail for full-res</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200 flex flex-col items-center justify-center gap-2">
                <Camera className="w-8 h-8 text-slate-400 stroke-[1.5]" />
                <h4 className="text-xs font-bold text-slate-700">No Citizen Submissions Found</h4>
                <p className="text-[11px] text-slate-400 max-w-sm">
                  No citizen reports with uploaded photos exist in the <strong>{user?.constituency || constituency}</strong> constituency yet. You can submit one in the Citizen Portal to visualize citizen uploads here.
                </p>
              </div>
            )}
          </div>
        </>
      )}

    </div>
  );
}
