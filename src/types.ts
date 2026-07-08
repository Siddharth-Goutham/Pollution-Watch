/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface CitizenReport {
  id: string;
  constituency: string;
  district: string;
  state: string;
  photos: string[]; // Base64 data or image paths
  createdAt: string;
  lat: number;
  lng: number;
  verified: boolean;
  risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskScore: number;
  analysis: string;
  recommendedAction: string;
  dispatched: boolean;
  dispatchedAt?: string;
  completed?: boolean;
  completedAt?: string;
  evidencePhoto?: string;
  citizenUsername?: string;
  resolutionMessage?: string;
}

export interface Hotspot {
  id: string;
  constituency: string;
  district: string;
  state: string;
  locationName: string;
  aqi: number;
  predictedPeak: number;
  primaryPollutant: string;
  aerosolIndex: string;
  risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskScore: number;
  analysis: string;
  recommendedAction: string;
  dispatchType: string; // e.g., 'Water Mist Cannon', 'Smog Tower'
  lat: number;
  lng: number;
  dispatched: boolean;
  dispatchedAt?: string;
}

export interface AgentStatus {
  name: string;
  status: 'Standby' | 'Active' | 'Finished' | 'Failed';
  details?: string;
}

export interface DispatchLog {
  id: string;
  hotspotId: string;
  locationName: string;
  resourceType: string;
  dispatchedAt: string;
  constituency: string;
  notes: string;
}

export interface MunicipalDashboardData {
  constituency: string;
  district: string;
  state: string;
  reports: CitizenReport[];
  hotspots: Hotspot[];
  agents: {
    sensor: AgentStatus;
    vision: AgentStatus;
    satellite: AgentStatus;
    forecast: AgentStatus;
    aggregator: AgentStatus;
    critique: AgentStatus;
  };
  stats: {
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
  };
  critiqueVerification: string;
  dispatchLogs: DispatchLog[];
}
