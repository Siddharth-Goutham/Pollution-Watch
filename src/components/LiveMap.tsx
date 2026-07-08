/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from "react";
import L from "leaflet";
import { Hotspot } from "../types";

interface LiveMapProps {
  hotspots: Hotspot[];
  selectedHotspotId: string | null;
  onSelectHotspot: (id: string) => void;
  districtName: string;
}

// Helper to find coordinates for Indian districts offline
function getDistrictCoordinates(districtName: string): [number, number] {
  const norm = (districtName || "").toLowerCase();
  if (norm.includes("nagpur") || norm.includes("vidharbha") || norm.includes("vidharba") || norm.includes("vidarbha")) {
    return [21.1458, 79.0882];
  }
  if (norm.includes("dakshin kannada") || norm.includes("mangalore")) {
    return [12.9141, 74.8560];
  }
  if (norm.includes("bengaluru") || norm.includes("bangalore") || norm.includes("hsr") || norm.includes("koramangala")) {
    return [12.9716, 77.5946];
  }
  if (norm.includes("mumbai") || norm.includes("thane")) {
    return [19.0760, 72.8777];
  }
  if (norm.includes("pune")) {
    return [18.5204, 73.8567];
  }
  if (norm.includes("delhi") || norm.includes("pitampura")) {
    return [28.6990, 77.1384]; // Precise coordinates for Pitampura Delhi center
  }
  if (norm.includes("kolkata")) {
    return [22.5726, 88.3639];
  }
  if (norm.includes("chennai")) {
    return [13.0827, 80.2707];
  }
  if (norm.includes("hyderabad")) {
    return [17.3850, 78.4867];
  }
  if (norm.includes("jaipur")) {
    return [26.9124, 75.7873];
  }
  if (norm.includes("lucknow")) {
    return [26.8467, 80.9462];
  }
  if (norm.includes("ahmedabad")) {
    return [23.0225, 72.5714];
  }
  
  // Basic deterministic hash/fallback coordinate based on letters of district to keep it in India
  let hash = 0;
  for (let i = 0; i < norm.length; i++) {
    hash = norm.charCodeAt(i) + ((hash << 5) - hash);
  }
  const lat = 15 + Math.abs(hash % 13);
  const lng = 73 + Math.abs((hash >> 2) % 12);
  return [lat, lng];
}

export default function LiveMap({
  hotspots,
  selectedHotspotId,
  onSelectHotspot,
  districtName
}: LiveMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Get dynamic coordinates for the selected districtName
    const initialCenter = getDistrictCoordinates(districtName);

    // Initialize map
    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: 12,
      layers: [
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
        })
      ],
      zoomControl: true,
      scrollWheelZoom: false
    });

    mapInstanceRef.current = map;

    // Cleanup on unmount
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update map view center when districtName changes and there are no active hotspots
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (hotspots.length === 0) {
      const center = getDistrictCoordinates(districtName);
      map.setView(center, 12, { animate: true });
    }
  }, [districtName, hotspots.length]);

  // Sync markers with hotspots
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Remove existing markers
    (Object.values(markersRef.current) as L.Marker[]).forEach(marker => {
      marker.remove();
    });
    markersRef.current = {};

    const validHotspots = hotspots.filter(spot => 
      spot && 
      typeof spot.lat === 'number' && !isNaN(spot.lat) && 
      typeof spot.lng === 'number' && !isNaN(spot.lng)
    );

    if (validHotspots.length === 0) return;

    // Add new markers
    validHotspots.forEach(spot => {
      const isSelected = spot.id === selectedHotspotId;
      
      // Determine marker color based on risk and selection
      let colorClass = "bg-indigo-600 border-indigo-200";
      let pingClass = "bg-indigo-400";
      
      if (spot.risk === "CRITICAL") {
        colorClass = "bg-red-600 border-red-200";
        pingClass = "bg-red-400";
      } else if (spot.risk === "HIGH") {
        colorClass = "bg-orange-600 border-orange-200";
        pingClass = "bg-orange-400";
      } else if (spot.risk === "MEDIUM") {
        colorClass = "bg-amber-500 border-amber-200";
        pingClass = "bg-amber-300";
      } else if (spot.risk === "LOW") {
        colorClass = "bg-emerald-600 border-emerald-200";
        pingClass = "bg-emerald-400";
      }

      const pulseHtml = isSelected 
        ? `<div class="absolute -inset-2 rounded-full ${pingClass} opacity-30 animate-ping"></div>`
        : "";

      const icon = L.divIcon({
        html: `
          <div class="relative flex items-center justify-center w-8 h-8">
            ${pulseHtml}
            <div class="w-5 h-5 ${colorClass} rounded-full border-2 border-white shadow-lg flex items-center justify-center text-[9px] font-mono font-bold text-white transition-all duration-300 transform ${isSelected ? 'scale-125' : 'hover:scale-110'}">
              ${spot.aqi}
            </div>
            <div class="absolute -bottom-1 w-2 h-2 ${colorClass} rotate-45 border-r border-b border-white"></div>
          </div>
        `,
        className: "custom-marker-wrapper",
        iconSize: [32, 32],
        iconAnchor: [16, 28]
      });

      const marker = L.marker([spot.lat, spot.lng], { icon })
        .addTo(map)
        .bindPopup(`
          <div class="p-1 font-sans">
            <h4 class="font-bold text-slate-800 text-xs">${spot.locationName}</h4>
            <div class="flex items-center gap-1.5 mt-1">
              <span class="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded font-mono">AQI: ${spot.aqi}</span>
              <span class="text-[10px] font-bold text-slate-600">${spot.risk} RISK</span>
            </div>
          </div>
        `);

      marker.on("click", () => {
        onSelectHotspot(spot.id);
      });

      markersRef.current[spot.id] = marker;
    });

    // Fit map bounds to contain all markers if there are multiple, or center on the single one
    if (validHotspots.length === 1) {
      map.setView([validHotspots[0].lat, validHotspots[0].lng], 13);
    } else if (validHotspots.length > 1) {
      const group = L.featureGroup(Object.values(markersRef.current));
      map.fitBounds(group.getBounds().pad(0.15));
    }
  }, [hotspots, onSelectHotspot]);

  // Handle selected hotspot zooming
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedHotspotId) return;

    const validHotspots = hotspots.filter(spot => 
      spot && 
      typeof spot.lat === 'number' && !isNaN(spot.lat) && 
      typeof spot.lng === 'number' && !isNaN(spot.lng)
    );

    const targetSpot = validHotspots.find(h => h.id === selectedHotspotId);
    if (targetSpot) {
      map.setView([targetSpot.lat, targetSpot.lng], 14, { animate: true });
      const marker = markersRef.current[selectedHotspotId];
      if (marker && !marker.isPopupOpen()) {
        marker.openPopup();
      }
    }
  }, [selectedHotspotId, hotspots]);

  return (
    <div id="live-map-card" className="w-full bg-white border border-slate-100 rounded-2xl p-4 shadow-xs flex flex-col h-full min-h-[380px]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-medium text-slate-700 text-sm flex items-center gap-2">
          🗺️ Ground Sensor Stations inside {districtName}
        </h3>
        <span className="text-[10px] bg-indigo-50 text-indigo-600 border border-indigo-100 font-medium px-2 py-0.5 rounded-full flex items-center gap-1">
          <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></span>
          Live Ingestion
        </span>
      </div>

      <div className="relative flex-1 rounded-xl overflow-hidden border border-slate-100 bg-slate-50 min-h-[320px]">
        <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />
      </div>
    </div>
  );
}
