/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { 
  Upload, Trash2, Camera, Compass, Send, CheckCircle2, AlertCircle,
  MessageSquare, Search, User, Lock, LayoutDashboard, Bell, FileText,
  LogOut, Check, Eye, MapPin, ListFilter, ShieldCheck
} from "lucide-react";

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

interface CitizenPortalProps {
  onReportCreated: (report: any) => void;
  defaultConstituency?: string;
  defaultDistrict?: string;
  defaultState?: string;
  onRegionChange?: (constituency: string, district: string, state: string) => void;
}

export default function CitizenPortal({
  onReportCreated,
  defaultConstituency = "Bangalore Urban",
  defaultDistrict = "Bangalore",
  defaultState = "Karnataka",
  onRegionChange
}: CitizenPortalProps) {
  // Tabs: 'submit' (original flow), 'inbox' (login + inbox), 'public' (dashboard search)
  const [activeTab, setActiveTab] = useState<"submit" | "inbox" | "public">("submit");

  // Citizen Authentication & Inbox state
  const [citizenUser, setCitizenUser] = useState<{ username: string } | null>(() => {
    const saved = localStorage.getItem("citizen_session");
    return saved ? JSON.parse(saved) : null;
  });
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // User Inbox records
  const [myReports, setMyReports] = useState<any[]>([]);
  const [myMessages, setMyMessages] = useState<any[]>([]);
  const [fetchingInbox, setFetchingInbox] = useState(false);

  // Public Dashboard States
  const [searchConstituency, setSearchConstituency] = useState("");
  const [searchDistrict, setSearchDistrict] = useState("");
  const [searchState, setSearchState] = useState("");
  const [publicReports, setPublicReports] = useState<any[]>([]);
  const [searchingPublic, setSearchingPublic] = useState(false);
  const [publicError, setPublicError] = useState<string | null>(null);

  // Original Report Form states
  const [constituency, setConstituency] = useState("");
  const [district, setDistrict] = useState("");
  const [state, setState] = useState("");
  
  const [photos, setPhotos] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<{ report: any; hotspot: any } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Exact coordinates state
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<"idle" | "fetching" | "success" | "error">("idle");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Detect location automatically on submit flow
  useEffect(() => {
    detectLocation();
  }, []);

  // Fetch Public Database on load & tab switch to public
  useEffect(() => {
    if (activeTab === "public") {
      fetchPublicDatabase();
    }
  }, [activeTab]);

  // Sync Inbox messages when logged in and active
  useEffect(() => {
    if (citizenUser && activeTab === "inbox") {
      fetchInboxData();
    }
  }, [citizenUser, activeTab]);

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setGpsStatus("error");
      return;
    }
    setGpsStatus("fetching");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setGpsStatus("success");
      },
      (error) => {
        console.warn("Geolocation permission or retrieval error:", error);
        setGpsStatus("error");
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Report change to parent whenever inputs are updated and fully populated
  useEffect(() => {
    if (onRegionChange) {
      const finalConstituency = constituency.trim() || defaultConstituency || "Bangalore Urban";
      const finalDistrict = district.trim() || defaultDistrict || "Bangalore";
      const finalState = state.trim() || defaultState || "Karnataka";
      onRegionChange(finalConstituency, finalDistrict, finalState);
    }
  }, [constituency, district, state, onRegionChange, defaultConstituency, defaultDistrict, defaultState]);

  // Convert File to Base64 String
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleFiles = async (fileList: FileList) => {
    const validPhotos = Array.from(fileList).filter(file => file.type.startsWith("image/"));
    
    if (validPhotos.length === 0) return;

    if (photos.length + validPhotos.length > 3) {
      alert("You can attach up to 3 photos maximum.");
      return;
    }

    const base64Promises = validPhotos.map(file => fileToBase64(file));
    try {
      const base64Images = await Promise.all(base64Promises);
      setPhotos(prev => [...prev, ...base64Images]);
      setErrorMessage(null);
    } catch (e) {
      console.error("Error reading image files", e);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const removePhoto = (indexToRemove: number) => {
    setPhotos(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Submit report to the municipal agent server
  const handleSendAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalConstituency = constituency.trim();
    const finalDistrict = district.trim();
    const finalState = state.trim();

    if (!finalConstituency || !finalDistrict || !finalState) {
      setErrorMessage("All regional fields are mandatory. Please enter constituency, district, and state.");
      return;
    }

    if (isGibberish(finalConstituency) || isGibberish(finalDistrict) || isGibberish(finalState)) {
      setErrorMessage("Please enter valid, real regional names. Gibberish values are not allowed.");
      return;
    }

    if (photos.length === 0) {
      setErrorMessage("Please upload at least one image of the pollution event. Photo evidence is mandatory.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    let reportLat = gpsCoords ? gpsCoords.lat : 12.884 + (Math.random() - 0.5) * 0.03;
    let reportLng = gpsCoords ? gpsCoords.lng : 74.856 + (Math.random() - 0.5) * 0.03;

    if (!gpsCoords && finalConstituency.toLowerCase().includes("hsr")) {
      reportLat = 12.9116 + (Math.random() - 0.5) * 0.01;
      reportLng = 77.6388 + (Math.random() - 0.5) * 0.01;
    }

    try {
      const res = await fetch("/api/citizen-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          constituency: finalConstituency,
          district: finalDistrict,
          state: finalState,
          photos,
          lat: reportLat,
          lng: reportLng,
          citizenUsername: citizenUser ? citizenUser.username : undefined
        })
      });

      if (res.ok) {
        const result = await res.json();
        setSuccessData(result);
        onReportCreated(result.report);
        setPhotos([]);
        // Optimistically refresh inbox if logged in
        if (citizenUser) {
          fetchInboxData();
        }
      } else {
        const errJson = await res.json();
        setErrorMessage(errJson.error || "Failed to submit report.");
      }
    } catch (err) {
      console.error(err);
      setErrorMessage("Network error occurred while submitting. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Auth Operations: Login / Register
  const handleAuthSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!usernameInput.trim()) {
      setAuthError("Username is required.");
      return;
    }
    setAuthLoading(true);
    setAuthError(null);
    setAuthSuccess(null);

    const endpoint = authMode === "login" ? "/api/citizen/login" : "/api/citizen/register";
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: usernameInput.trim(), password: passwordInput })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const userSession = data.user;
        setCitizenUser(userSession);
        localStorage.setItem("citizen_session", JSON.stringify(userSession));
        setAuthSuccess(data.message || `${authMode === "login" ? "Logged in" : "Registered"} successfully!`);
        setUsernameInput("");
        setPasswordInput("");
      } else {
        setAuthError(data.error || "Authentication failed.");
      }
    } catch (err) {
      console.error("Auth error:", err);
      setAuthError("Network connection error. Please try again.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setCitizenUser(null);
    localStorage.removeItem("citizen_session");
    setMyReports([]);
    setMyMessages([]);
  };

  // Fetch Reports and Message Inbox for authenticated citizen
  const fetchInboxData = async () => {
    if (!citizenUser) return;
    try {
      setFetchingInbox(true);
      const [reportsRes, msgRes] = await Promise.all([
        fetch(`/api/citizen/reports?username=${encodeURIComponent(citizenUser.username)}`),
        fetch(`/api/citizen/messages?username=${encodeURIComponent(citizenUser.username)}`)
      ]);
      if (reportsRes.ok) {
        const reportsData = await reportsRes.json();
        setMyReports(reportsData.reports || []);
      }
      if (msgRes.ok) {
        const msgData = await msgRes.json();
        setMyMessages(msgData.messages || []);
      }
    } catch (err) {
      console.error("Error fetching inbox data:", err);
    } finally {
      setFetchingInbox(false);
    }
  };

  // Mark message as read
  const handleMarkMessageRead = async (msgId: string) => {
    try {
      const res = await fetch("/api/citizen/messages/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId: msgId })
      });
      if (res.ok) {
        setMyMessages(prev => prev.map(m => m.id === msgId ? { ...m, read: true } : m));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch public complaints and solutions for search dashboard
  const fetchPublicDatabase = async () => {
    if (!searchConstituency.trim() && !searchDistrict.trim() && !searchState.trim()) {
      setPublicReports([]);
      setSearchingPublic(false);
      return;
    }
    try {
      setSearchingPublic(true);
      setPublicError(null);
      const query = new URLSearchParams({
        constituency: searchConstituency || "",
        district: searchDistrict || "",
        state: searchState || ""
      }).toString();
      
      const res = await fetch(`/api/public/complaints?${query}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setPublicReports(data.reports || []);
      } else {
        setPublicError(data.error || "Failed to retrieve public complaints.");
      }
    } catch (err) {
      console.error("Public complaints lookup error:", err);
      setPublicError("Network error querying public complaints database.");
    } finally {
      setSearchingPublic(false);
    }
  };

  // Calculate unread count for messages badge
  const unreadCount = myMessages.filter(m => !m.read).length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Tab bar header */}
      <div className="flex flex-col sm:flex-row items-center justify-between border-b border-slate-200 pb-5 mb-8 gap-4">
        <div>
          <h2 className="font-display font-bold text-slate-800 text-xl tracking-tight">Citizen Portal</h2>
          <p className="text-xs text-slate-500 mt-0.5">Submit alerts, track resolutions, and search public database</p>
        </div>
        <div className="bg-slate-100 p-1.5 rounded-2xl flex items-center gap-1 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab("submit")}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
              activeTab === "submit"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-100"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            Submit Alert
          </button>
          
          <button
            onClick={() => setActiveTab("inbox")}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all relative ${
              activeTab === "inbox"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-100"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            Messages
            {citizenUser && unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white font-mono text-[9px] font-bold h-4 w-4 rounded-full flex items-center justify-center animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("public")}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
              activeTab === "public"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-100"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            Public Dashboard
          </button>
        </div>
      </div>

      {/* SUBMIT COMPLAINT TAB */}
      {activeTab === "submit" && (
        <div className="max-w-3xl mx-auto">
          {successData ? (
            <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-lg text-center animate-fade-in">
              <div className="w-16 h-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-5 border border-green-100">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h2 className="font-display font-bold text-slate-800 text-2xl mb-2">
                Alert Sent to Municipality
              </h2>
              <p className="text-slate-500 text-sm max-w-md mx-auto mb-6">
                Thank you! Your pollution report in <span className="font-semibold">{successData.report.constituency}</span> has been processed. 
                Our multi-agent pipeline fused ground sensor records with your report.
              </p>

              <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-5 mb-8 text-left max-w-lg mx-auto">
                <h4 className="font-display font-semibold text-indigo-950 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5" /> Fused AI Audit Findings
                </h4>
                <div className="space-y-1.5 text-xs text-slate-600">
                  <p><strong className="text-slate-800">Hotspot Location:</strong> {successData.hotspot.locationName}</p>
                  <p><strong className="text-slate-800">Registered Exact Coordinates:</strong> {Number(successData.report.lat).toFixed(6)}° N, {Number(successData.report.lng).toFixed(6)}° E</p>
                  <p><strong className="text-slate-800">Assessed Risk Score:</strong> {successData.hotspot.riskScore} ({successData.hotspot.risk} Risk)</p>
                  <p><strong className="text-slate-800">Cause Analysis:</strong> {successData.hotspot.analysis}</p>
                  <p><strong className="text-slate-800">Recommended Dispatch:</strong> {successData.hotspot.recommendedAction}</p>
                </div>
              </div>

              <div className="flex justify-center gap-3">
                <button
                  onClick={() => {
                    setSuccessData(null);
                    setConstituency("");
                    setDistrict("");
                    setState("");
                  }}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-all shadow-md cursor-pointer"
                >
                  Submit Another Report
                </button>
                <button
                  onClick={() => setActiveTab("public")}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all cursor-pointer"
                >
                  View Public complaints
                </button>
              </div>
            </div>
          ) : !citizenUser ? (
            <div className="max-w-md mx-auto bg-white border border-slate-100 rounded-3xl p-8 shadow-md">
              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 border border-indigo-100/50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <User className="w-6 h-6" />
                </div>
                <h3 className="font-display font-bold text-slate-800 text-lg">Citizen Login Required</h3>
                <p className="text-xs text-slate-500 mt-1">
                  You must be logged in with a password to submit a pollution report.
                </p>
              </div>

              <form onSubmit={handleAuthSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                    Citizen Username <span className="text-red-500 font-bold">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. citizen_jack"
                      value={usernameInput}
                      onChange={e => setUsernameInput(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-10 pr-4 py-2.5 text-slate-800 text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 flex justify-between items-center">
                    <span>Password <span className="text-red-500 font-bold">*</span></span>
                    <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-md">Temporary Password: citizen</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type="password"
                      required
                      placeholder="Enter 'citizen'"
                      value={passwordInput}
                      onChange={e => setPasswordInput(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-10 pr-4 py-2.5 text-slate-800 text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-colors"
                    />
                  </div>
                </div>

                {authError && (
                  <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs flex gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <p>{authError}</p>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-xs font-semibold rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {authLoading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <User className="w-3.5 h-3.5" />
                        Log In / Enter Portal
                      </>
                    )}
                  </button>
                </div>
              </form>

              <div className="mt-5 pt-4 border-t border-slate-100 text-center">
                <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
                  💡 Secure Access: If the username doesn't exist, it will register your profile automatically with the password provided.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-100 rounded-3xl shadow-md p-6 sm:p-8">
              <div className="mb-6 bg-emerald-50 border border-emerald-100 px-4 py-2.5 rounded-xl flex items-center justify-between animate-fade-in">
                <span className="text-[11px] font-medium text-emerald-800 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> Logged in as <strong className="font-bold">{citizenUser.username}</strong>. Report automatically saved to your profile history.
                </span>
                <button type="button" onClick={handleLogout} className="text-[10px] text-red-600 hover:underline font-bold cursor-pointer">
                  Logout
                </button>
              </div>

              <div className="flex items-center gap-2 mb-6 border-b border-slate-50 pb-4">
                <span className="text-lg">📢</span>
                <h2 className="font-display font-semibold text-slate-700 text-xs sm:text-sm tracking-wider uppercase">
                  CONSTITUENCY DETAILS & CITIZEN CONTRIBUTIONS
                </h2>
              </div>

              <form onSubmit={handleSendAlert} className="space-y-6">
                {/* Input Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                      Constituency name <span className="text-red-500 font-bold">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={constituency}
                      onChange={e => setConstituency(e.target.value)}
                      placeholder="eg, Bangalore Urban"
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-slate-800 text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                      District <span className="text-red-500 font-bold">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={district}
                      onChange={e => setDistrict(e.target.value)}
                      placeholder="eg, Bangalore"
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-slate-800 text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                      State <span className="text-red-500 font-bold">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={state}
                      onChange={e => setState(e.target.value)}
                      placeholder="eg, Karnataka"
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-slate-800 text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Geolocation Detector */}
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl transition-all ${
                      gpsCoords 
                        ? "bg-emerald-50 text-emerald-600 border border-emerald-100/50" 
                        : gpsStatus === "fetching"
                          ? "bg-indigo-50 text-indigo-600 border border-indigo-100/50 animate-pulse"
                          : "bg-amber-50 text-amber-600 border border-amber-100/50"
                    }`}>
                      <Compass className={`w-5 h-5 ${gpsStatus === "fetching" ? "animate-spin" : ""}`} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Exact Geolocation Sensor</h4>
                      <p className="text-[11px] text-slate-500 font-medium leading-relaxed mt-0.5">
                        {gpsCoords
                          ? `Anchored: ${gpsCoords.lat.toFixed(6)}° N, ${gpsCoords.lng.toFixed(6)}° E`
                          : gpsStatus === "fetching"
                            ? "Pinging GPS satellites..."
                            : "Ready to capture exact location on citizen submission."}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={detectLocation}
                    disabled={gpsStatus === "fetching"}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider border transition-all cursor-pointer ${
                      gpsCoords
                        ? "bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100/50"
                        : "bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border-indigo-100"
                    }`}
                  >
                    {gpsStatus === "fetching" ? "Detecting..." : gpsCoords ? "📍 Recalibrate GPS" : "📍 Detect Location"}
                  </button>
                </div>

                {/* Photo Contribution */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                      📷 Citizen Photo Contributions <span className="text-red-500 font-bold">(Mandatory, max 3)</span>
                    </span>
                    {photos.length > 0 && (
                      <span className="text-[10px] font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full font-medium">
                        {photos.length}/3 attached
                      </span>
                    )}
                  </div>

                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={triggerFileSelect}
                    className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all ${
                      isDragging
                        ? "border-indigo-500 bg-indigo-50/50"
                        : "border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300"
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    
                    <div className="w-10 h-10 bg-indigo-50 border border-indigo-100 text-indigo-500 rounded-xl flex items-center justify-center mb-3">
                      <Upload className="w-5 h-5" />
                    </div>
                    
                    <p className="text-slate-700 font-display font-medium text-xs mb-1">
                      Drop pollution photos here or click to upload
                    </p>
                    <p className="text-slate-400 text-[10px] text-center max-w-xs">
                      Smoke chimneys, open garbage fires, or vehicle exhaust
                    </p>
                  </div>

                  {photos.length > 0 && (
                    <div className="grid grid-cols-3 gap-4 mt-4">
                      {photos.map((src, index) => (
                        <div key={index} className="relative group rounded-xl overflow-hidden aspect-video border border-slate-100 shadow-2xs">
                          <img src={src} alt="pollution preview" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removePhoto(index);
                            }}
                            className="absolute top-1.5 right-1.5 p-1 bg-red-500 text-white rounded-md opacity-90 hover:opacity-100 transition-opacity cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Error Display */}
                {errorMessage && (
                  <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 rounded-xl p-3.5 text-xs text-red-600">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <p>{errorMessage}</p>
                  </div>
                )}

                {/* Submit Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-100 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Spawning Multi-Agent Fusion Audit...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Send Alert to Municipality
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* CITIZEN ACCESS & INBOX TAB */}
      {activeTab === "inbox" && (
        <div className="space-y-6">
          {!citizenUser ? (
            /* Login Form */
            <div className="max-w-md mx-auto bg-white border border-slate-100 rounded-3xl p-8 shadow-md">
              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 border border-indigo-100/50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <User className="w-6 h-6" />
                </div>
                <h3 className="font-display font-bold text-slate-800 text-lg">Citizen Login & Access</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Track your submitted complaints and read direct resolution messages from the municipality
                </p>
              </div>

              <form onSubmit={handleAuthSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                    Citizen Username <span className="text-red-500 font-bold">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. citizen_jack"
                      value={usernameInput}
                      onChange={e => setUsernameInput(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-10 pr-4 py-2.5 text-slate-800 text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 flex justify-between items-center">
                    <span>Password <span className="text-red-500 font-bold">*</span></span>
                    <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-md">Temporary Password: citizen</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type="password"
                      required
                      placeholder="Enter 'citizen' to login"
                      value={passwordInput}
                      onChange={e => setPasswordInput(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-10 pr-4 py-2.5 text-slate-800 text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-colors"
                    />
                  </div>
                </div>

                {authError && (
                  <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs flex gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <p>{authError}</p>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-xs font-semibold rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {authLoading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <User className="w-3.5 h-3.5" />
                        Log In / Enter Portal
                      </>
                    )}
                  </button>
                </div>
              </form>

              <div className="mt-5 pt-4 border-t border-slate-100 text-center">
                <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
                  💡 Secure Access: If the username doesn't exist, it will register your profile automatically with the password provided.
                </p>
              </div>
            </div>
          ) : (
            /* Logged in Citizen Dashboard Hub */
            <div className="space-y-6">
              {/* Profile Bar */}
              <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center border border-indigo-100/50 font-bold">
                    {citizenUser.username.slice(0,2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-slate-800 text-sm">Citizen Profile: {citizenUser.username}</h3>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">Secure Civic Token Session Active</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={fetchInboxData}
                    disabled={fetchingInbox}
                    className="px-3.5 py-1.5 border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold text-xs rounded-xl cursor-pointer transition-all disabled:opacity-50"
                  >
                    {fetchingInbox ? "Syncing..." : "🔄 Force Sync Inbox"}
                  </button>
                  <button
                    onClick={handleLogout}
                    className="px-3.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 font-semibold text-xs rounded-xl cursor-pointer transition-all flex items-center gap-1"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Logout
                  </button>
                </div>
              </div>

              {/* Grid: Inbox messages on left, Reports on right */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Resolution Inbox Column */}
                <div className="lg:col-span-7 bg-white border border-slate-100 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col">
                  <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-50">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Bell className="w-4 h-4 text-indigo-500" />
                      Resolution Message Inbox
                    </span>
                    <span className="bg-indigo-50 text-indigo-600 font-bold font-mono text-[10px] px-2 py-0.5 rounded-full">
                      {unreadCount} unread
                    </span>
                  </div>

                  {fetchingInbox ? (
                    <div className="py-20 text-center">
                      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                      <p className="text-xs text-slate-400">Loading resolutions inbox...</p>
                    </div>
                  ) : myMessages.length === 0 ? (
                    <div className="py-16 text-center border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/50 flex flex-col items-center justify-center">
                      <MessageSquare className="w-8 h-8 text-slate-300 mb-2" />
                      <p className="text-xs font-bold text-slate-700">Inbox is empty</p>
                      <p className="text-[10px] text-slate-400 mt-1 max-w-xs px-4">
                        When the municipality marks your submitted complaint as "Done" and replies, the direct message and solutions proof photo will arrive here instantly.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {myMessages.map((msg) => (
                        <div 
                          key={msg.id} 
                          className={`border rounded-2xl p-4.5 transition-all relative ${
                            msg.read ? "border-slate-100 bg-white" : "border-indigo-200 bg-indigo-50/20 shadow-xs"
                          }`}
                        >
                          {!msg.read && (
                            <span className="absolute top-4 right-4 h-2.5 w-2.5 bg-indigo-500 rounded-full"></span>
                          )}

                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-green-50 text-green-600 rounded-xl flex-shrink-0">
                              <ShieldCheck className="w-4 h-4" />
                            </div>
                            <div className="space-y-1.5 flex-1 text-left">
                              <div className="flex items-center justify-between">
                                <h4 className="text-xs font-bold text-slate-800">{msg.title}</h4>
                                <span className="text-[10px] font-mono text-slate-400">
                                  {new Date(msg.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                                {msg.text}
                              </p>

                              {msg.evidencePhoto && msg.evidencePhoto !== "simulated-resolution-check" && (
                                <div className="space-y-1 mt-3">
                                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Corrective Action Evidence:</span>
                                  <div className="relative h-28 rounded-lg overflow-hidden border border-emerald-100/50 bg-slate-50">
                                    <img src={msg.evidencePhoto} alt="Corrective action proof" className="w-full h-full object-cover" />
                                  </div>
                                </div>
                              )}

                              {!msg.read && (
                                <button
                                  onClick={() => handleMarkMessageRead(msg.id)}
                                  className="mt-2 text-[10px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  Mark as Read
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* My Reports Column */}
                <div className="lg:col-span-5 bg-white border border-slate-100 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col">
                  <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-50">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-indigo-500" />
                      My Submitted Reports
                    </span>
                    <span className="bg-slate-100 text-slate-600 font-bold font-mono text-[10px] px-2 py-0.5 rounded-full">
                      {myReports.length} total
                    </span>
                  </div>

                  {fetchingInbox ? (
                    <div className="py-20 text-center">
                      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    </div>
                  ) : myReports.length === 0 ? (
                    <div className="py-12 text-center border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/50 flex flex-col items-center justify-center">
                      <FileText className="w-8 h-8 text-slate-300 mb-2" />
                      <p className="text-xs font-bold text-slate-700">No reports logged</p>
                      <p className="text-[10px] text-slate-400 mt-1 max-w-xs px-4">
                        Any alerts you submit while logged in will show up in this panel.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                      {myReports.map((report) => (
                        <div key={report.id} className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4 space-y-3 text-left">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-mono text-slate-400 font-bold uppercase">ID: {report.id}</span>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                              report.completed
                                ? "bg-green-50 text-green-700 border border-green-100"
                                : "bg-indigo-50 text-indigo-700 border border-indigo-100 animate-pulse"
                            }`}>
                              {report.completed ? "Resolved" : "Analyzing / Active"}
                            </span>
                          </div>

                          <div className="space-y-1">
                            <h4 className="text-xs font-bold text-slate-800">{report.constituency}</h4>
                            <p className="text-[10px] text-slate-500 font-medium">District: {report.district} • State: {report.state}</p>
                          </div>

                          {report.photos && report.photos.length > 0 && (
                            <div className="flex gap-1.5 h-10 overflow-hidden">
                              {report.photos.map((ph: string, i: number) => (
                                <img key={i} src={ph} alt="Attachment thumbnail" className="h-full aspect-video rounded-md object-cover border border-slate-100" />
                              ))}
                            </div>
                          )}

                          <div className="text-[10px] bg-white border border-slate-100/50 rounded-xl p-2.5 text-slate-500 leading-relaxed font-medium">
                            <strong className="text-slate-700">Recommended Action:</strong> {report.recommendedAction}
                          </div>

                          {report.completed && report.resolutionMessage && (
                            <div className="text-[10px] bg-green-50/50 border border-green-100/30 rounded-xl p-2.5 text-green-800 leading-relaxed font-medium">
                              <strong className="text-green-950 block mb-0.5 font-bold">✓ Resolution Solution Notes:</strong>
                              {report.resolutionMessage}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}
        </div>
      )}

      {/* PUBLIC COMPLAINTS & SOLUTIONS DASHBOARD TAB */}
      {activeTab === "public" && (
        <div className="space-y-6">
          {/* Public search details container */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-md">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-50">
              <span className="text-lg">📊</span>
              <h3 className="font-display font-semibold text-slate-700 text-xs sm:text-sm tracking-wider uppercase">
                PUBLIC REGIONAL COMPLAINTS & SOLUTIONS SEARCH
              </h3>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); fetchPublicDatabase(); }} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                    Constituency Name
                  </label>
                  <input
                    type="text"
                    value={searchConstituency}
                    onChange={e => setSearchConstituency(e.target.value)}
                    placeholder="e.g. Bangalore Urban"
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-slate-800 text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                    District Name
                  </label>
                  <input
                    type="text"
                    value={searchDistrict}
                    onChange={e => setSearchDistrict(e.target.value)}
                    placeholder="e.g. Bangalore"
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-slate-800 text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                    State Name
                  </label>
                  <input
                    type="text"
                    value={searchState}
                    onChange={e => setSearchState(e.target.value)}
                    placeholder="e.g. Karnataka"
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-slate-800 text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="submit"
                  disabled={searchingPublic}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5" />
                  {searchingPublic ? "Searching Database..." : "Search Complaints"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSearchConstituency("");
                    setSearchDistrict("");
                    setSearchState("");
                    setPublicReports([]);
                  }}
                  className="px-4 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold rounded-xl cursor-pointer transition-colors"
                >
                  Clear Fields
                </button>
              </div>
            </form>
          </div>

          {/* Quick Metrics Statistics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="bg-white border border-slate-100 rounded-2xl p-4.5 shadow-xs text-left">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Database Complaints</span>
              <span className="text-2xl font-bold text-slate-800 block mt-1.5 font-mono">{publicReports.length}</span>
            </div>
            <div className="bg-white border border-slate-100 rounded-2xl p-4.5 shadow-xs text-left">
              <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider block">Completed Solutions</span>
              <span className="text-2xl font-bold text-emerald-600 block mt-1.5 font-mono">
                {publicReports.filter(r => r.completed).length}
              </span>
            </div>
            <div className="bg-white border border-slate-100 rounded-2xl p-4.5 shadow-xs text-left">
              <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider block">Pending Resolution Audit</span>
              <span className="text-2xl font-bold text-indigo-600 block mt-1.5 font-mono">
                {publicReports.filter(r => !r.completed).length}
              </span>
            </div>
          </div>

          {/* Public Complaints List with Solutions details */}
          <div className="space-y-6">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold uppercase tracking-wider px-1">
              <ListFilter className="w-3.5 h-3.5" /> Query Results ({publicReports.length} Complaints Found)
            </div>

            {publicError && (
              <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-xs flex gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <p>{publicError}</p>
              </div>
            )}

            {searchingPublic ? (
              <div className="bg-white border border-slate-100 rounded-3xl p-16 text-center shadow-xs">
                <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-xs text-slate-500">Querying localized municipal databases...</p>
              </div>
            ) : publicReports.length === 0 ? (
              <div className="bg-white border border-slate-100 rounded-3xl p-16 text-center shadow-xs">
                {(!searchConstituency.trim() && !searchDistrict.trim() && !searchState.trim()) ? (
                  <>
                    <p className="text-slate-500 text-xs font-semibold">Enter a constituency, district, or state to search public database entries.</p>
                    <p className="text-[10px] text-slate-400 mt-1.5 max-w-xs mx-auto leading-relaxed">
                      For example, search for <span className="text-indigo-600 font-bold">"Bangalore Urban"</span>, <span className="text-indigo-600 font-bold">"Bangalore"</span>, or <span className="text-indigo-600 font-bold">"Karnataka"</span> to pull up simulated complaints.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-slate-400 text-xs">No reports found matching your selected filters.</p>
                    <p className="text-[10px] text-slate-400 mt-1 max-w-xs mx-auto">
                      Try clearing the filters or searching "Bangalore Urban", "Bangalore", "Karnataka" to view simulated database entries.
                    </p>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {publicReports.map((report) => (
                  <div key={report.id} className="bg-white border border-slate-100 rounded-3xl shadow-xs overflow-hidden flex flex-col md:grid md:grid-cols-12">
                    
                    {/* Left Panel: Complaint Details */}
                    <div className="p-6 md:col-span-7 space-y-4 text-left border-b md:border-b-0 md:border-r border-slate-100">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                          COMPLAINT REF: {report.id}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {new Date(report.createdAt).toLocaleString()}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <h4 className="font-display font-bold text-slate-800 text-sm flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 text-slate-400" />
                          {report.constituency}
                        </h4>
                        <p className="text-[11px] text-slate-500 font-medium">
                          {report.district}, {report.state} • Coordinates: {Number(report.lat).toFixed(6)}° N, {Number(report.lng).toFixed(6)}° E
                        </p>
                      </div>

                      {/* Problem and AI Analysis */}
                      <div className="space-y-2">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">🚨 The Complaint & AI Analysis</span>
                        <div className="bg-slate-50/70 rounded-xl p-3.5 border border-slate-100/50 text-xs leading-relaxed text-slate-600 font-medium space-y-2">
                          <p>{report.analysis}</p>
                          <div className="flex items-center gap-3 pt-1 border-t border-slate-100 text-[10px] text-slate-500">
                            <span><strong className="text-slate-700">Assessed Risk Score:</strong> {report.riskScore}</span>
                            <span className="h-3 w-px bg-slate-200"></span>
                            <span><strong className="text-slate-700">Priority Level:</strong> {report.risk}</span>
                          </div>
                        </div>
                      </div>

                      {/* Photo evidence from complainant */}
                      {report.photos && report.photos.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Complainant Evidence Photos:</span>
                          <div className="grid grid-cols-3 gap-2.5">
                            {report.photos.map((ph: string, i: number) => (
                              <div key={i} className="relative aspect-video rounded-lg overflow-hidden border border-slate-100 bg-slate-50">
                                <img src={ph} alt={`Citizen evidence ${i}`} className="w-full h-full object-cover" />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right Panel: Solution Details */}
                    <div className={`p-6 md:col-span-5 flex flex-col justify-between text-left ${
                      report.completed ? "bg-emerald-50/10" : "bg-indigo-50/10"
                    }`}>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Solution Status</span>
                          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                            report.completed
                              ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                              : "bg-amber-50 text-amber-700 border-amber-100 animate-pulse"
                          }`}>
                            {report.completed ? "✓ Resolved" : "⚠ Pending Resolution"}
                          </span>
                        </div>

                        {report.completed ? (
                          <div className="space-y-3">
                            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">✓ Corrective Solution Deployed</span>
                            <div className="bg-emerald-50/40 border border-emerald-100/50 rounded-2xl p-4 space-y-3">
                              <p className="text-xs text-emerald-900 leading-relaxed font-medium">
                                {report.resolutionMessage}
                              </p>

                              {report.evidencePhoto && report.evidencePhoto !== "simulated-resolution-check" && (
                                <div className="space-y-1">
                                  <span className="text-[8px] font-bold text-emerald-600/70 uppercase tracking-wider block">Verification Evidence Photo:</span>
                                  <div className="relative h-28 rounded-lg overflow-hidden border border-emerald-100 shadow-3xs bg-white">
                                    <img src={report.evidencePhoto} alt="Solution evidence photo" className="w-full h-full object-cover" />
                                  </div>
                                </div>
                              )}
                              
                              <div className="text-[9px] text-emerald-600 font-mono">
                                Resolved on: {new Date(report.completedAt || report.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">⚠ Corrective Action Plan</span>
                            <div className="bg-indigo-50/40 border border-indigo-100/50 rounded-2xl p-4 space-y-2">
                              <p className="text-xs text-indigo-900 leading-relaxed font-medium">
                                The municipal agent pipeline has scheduled the deployment of corrective resources.
                              </p>
                              <div className="text-[10px] bg-white border border-indigo-100/40 rounded-xl p-2.5 text-indigo-950 font-medium">
                                <strong className="font-bold text-indigo-800">Target Dispatch:</strong> {report.recommendedAction}
                              </div>
                              <div className="text-[9px] text-indigo-500 font-mono">
                                Audit Status: Scheduled for Dispatch
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {report.citizenUsername && (
                        <div className="pt-4 border-t border-slate-100/40 text-[9.5px] text-slate-400 font-medium">
                          Submitted by user: <strong className="text-slate-600 font-semibold">{report.citizenUsername}</strong>
                        </div>
                      )}
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
