# 🌍 PollutionWatch

> **A multi-agent environmental auditing and localized pollution hotspot
> dispatch platform connecting citizens with municipal authorities.**

PollutionWatch turns citizen evidence, geolocation, air-quality
telemetry, satellite observations, and AI-driven analysis into an
actionable municipal workflow. The platform is split into two focused
experiences: **Citizen Access** for reporting and transparency, and
**Municipal Access** for environmental auditing, hotspot analysis,
forecasting, and resource dispatch.

------------------------------------------------------------------------

## ✨ What PollutionWatch Does

A pollution complaint should not disappear after submission.
PollutionWatch creates a complete flow from **citizen report →
environmental analysis → hotspot prioritization → municipal action →
citizen resolution update**.

``` text
Citizen Evidence / Public Data / Sensor Telemetry
                         │
                         ▼
              Multi-Agent Audit Pipeline
                         │
       ┌─────────────────┼─────────────────┐
       ▼                 ▼                 ▼
 Hotspot Detection   AQI Forecasting   Cause Analysis
       │                 │                 │
       └─────────────────┴─────────────────┘
                         │
                         ▼
              Municipal Dispatch Action
                         │
                         ▼
               Resolution & Citizen Update
```

------------------------------------------------------------------------

## 🧭 Two Access Modes

  -----------------------------------------------------------------------
  Access Mode             Built For               Main Purpose
  ----------------------- ----------------------- -----------------------
  👤 **Citizen Access**   Citizens and local      Submit pollution
                          communities             evidence, track
                                                  reports, receive
                                                  resolution messages,
                                                  and search public
                                                  complaints

  🛡️ **Municipal Access** Municipal officials     Run multi-agent
                                                  environmental scans,
                                                  identify pollution
                                                  hotspots, review
                                                  forecasts, and deploy
                                                  resources
  -----------------------------------------------------------------------

------------------------------------------------------------------------

# 👤 Citizen Access

Citizen Access provides a simple reporting and transparency portal with
**three main tabs: Submit Alert, Messages, and Public Dashboard**.

## 🚨 1. Submit Alert

Citizens can authenticate and submit localized pollution reports
directly to the municipality.

### Key capabilities

-   Secure citizen login and profile-based report history
-   Constituency, district, and state details
-   Exact geolocation capture and GPS recalibration
-   Mandatory citizen photo evidence upload
-   Support for up to **3 pollution photos**
-   Direct alert submission to the municipality
-   Reports are associated with the logged-in citizen profile

Typical evidence can include **smoke chimneys, open garbage fires,
vehicle exhaust, and other visible pollution sources**.

> The interface is designed to make environmental reporting quick,
> evidence-based, and location-aware.

------------------------------------------------------------------------

## 💬 2. Messages

The Messages tab acts as the citizen's **resolution inbox and report
history center**.

Citizens can:

-   View municipal resolution messages
-   See unread response status
-   Track their submitted reports
-   Receive action or solution updates from municipal authorities
-   Sync the inbox to retrieve the latest updates

When a municipality completes a complaint and responds, the resolution
message and available proof can be surfaced directly to the citizen.

------------------------------------------------------------------------

## 📊 3. Public Dashboard

The Public Dashboard provides a searchable view of regional complaints
and completed solutions.

Users can search using:

-   **Constituency Name**
-   **District Name**
-   **State Name**

The dashboard summarizes:

-   Total database complaints
-   Completed solutions
-   Pending resolution audits
-   Filtered complaint results

This creates a transparent public layer where citizens can inspect
environmental complaints and municipal resolution progress for a
selected region.

------------------------------------------------------------------------

# 🛡️ Municipal Access

Municipal Access is the environmental **action and auditing hub** for
authorized officials.

Officials authenticate using their municipal session details and
regional authority information. The selected constituency becomes the
enforced auditing region for the session.

## 🤖 Multi-Agent Environmental Audit Pipeline

PollutionWatch uses a specialized agent pipeline where each agent
handles a focused environmental analysis task.

  Agent                    Responsibility
  ------------------------ ----------------------------------------
  ⚙️ **Sensor Agent**      Fetches air-quality telemetry
  📷 **Vision Agent**      Scans citizen photo evidence
  🌐 **Satellite Agent**   Monitors aerosol observations
  📈 **Forecast Agent**    Produces 24-hour predictive trends
  🗂️ **Aggregator**        Fuses data representations
  🛡️ **Critique QA**       Validates audit quality and compliance

The Municipal Admin can trigger the workflow using **Run Multi-Agent
Scan** and monitor the status of every agent in the orchestration
pipeline.

------------------------------------------------------------------------

## 🔥 Pollution Hotspot Detection

After the audit pipeline completes, the platform categorizes detected
locations by risk level:

-   🔴 Critical Risk
-   🟠 High Risk
-   🟡 Medium Risk
-   🟢 Low Risk

The dashboard highlights the **worst hotspot** and displays detected
environmental locations on an interactive map.

Each hotspot can expose:

-   Current AQI
-   Risk score
-   Primary pollutant
-   Predicted AQI peak
-   Aerosol index
-   Dynamic pollution cause analysis
-   Recommended municipal dispatch action

------------------------------------------------------------------------

## 🗺️ Interactive Ground Sensor Map

Ground sensor stations and pollution hotspots are visualized using an
interactive map.

Municipal officials can inspect locations, compare AQI values, identify
critical regions, and open individual hotspot details before taking
action.

------------------------------------------------------------------------

## 🧠 Dynamic Pollution Cause Analysis

For each hotspot, PollutionWatch generates a localized cause analysis
based on the available environmental signals.

The system can connect observed conditions with possible local pollution
contributors and present a concise explanation to municipal officials
alongside a recommended response.

This helps officials move from **raw environmental values** to
**actionable operational context**.

------------------------------------------------------------------------

## 🚒 Municipal Dispatch Orders

Detected hotspots can be converted into municipal dispatch actions.

The system provides a recommended response for the selected hotspot and
allows officials to deploy resources to that location. Dispatch orders
are surfaced in the Municipal Action Hub for operational tracking.

------------------------------------------------------------------------

## 📈 24-Hour AQI Forecast

The Forecast Agent produces a **24-hour Air Quality Index trend** in
2-hour intervals.

The visualization highlights the predicted peak AQI and helps municipal
teams understand when pollution conditions may worsen, supporting
proactive resource deployment instead of purely reactive action.

------------------------------------------------------------------------

## 🛡️ Critique Agent Audit Verification

Before environmental analysis is treated as actionable, the Critique QA
layer validates the audit workflow.

The dashboard surfaces verification context including active citizen
photo inputs and ground sensor inputs, helping municipal users
understand the evidence available to the scan.

------------------------------------------------------------------------

## 📸 Citizen Evidence Inside Municipal Audits

Citizen-uploaded pollution photos and reports are integrated into the
municipal auditing experience for the relevant constituency.

This creates a direct bridge between **community observations** and
**municipal environmental decision-making**.

------------------------------------------------------------------------

# 🔄 End-to-End Workflow

1.  A citizen logs in to the **Citizen Portal**.
2.  The citizen provides regional details, geolocation, and pollution
    photo evidence.
3.  The alert is submitted and stored in the citizen's report history.
4.  Municipal officials authenticate into the **Municipal Action Hub**.
5.  The municipality runs the **Multi-Agent Scan** for its enforced
    auditing region.
6.  Sensor, vision, satellite, forecast, aggregation, and critique
    agents process the available inputs.
7.  Pollution hotspots are ranked by risk.
8.  Officials inspect the map, AQI metrics, predicted peak, pollutant
    data, and cause analysis.
9.  PollutionWatch recommends a dispatch action.
10. Municipal resources can be deployed to the hotspot.
11. Resolution updates can be surfaced back to citizens through the
    Messages portal.
12. Regional complaints and solutions remain searchable through the
    Public Dashboard.

------------------------------------------------------------------------

# 🧰 Technology & Architecture

PollutionWatch is a full-stack application with a **React/Vite client**
and a **secure Express/Node.js server**. API keys remain on the server
and are protected from browser exposure.

The application interface also identifies integrations and workflow
components including:

-   React + Vite
-   Express + Node.js
-   Gemini API
-   Firebase configuration support
-   Local JSON database fallback
-   OpenAQ environmental data
-   CPCB-related environmental context
-   Leaflet + OpenStreetMap
-   Multi-agent LangChain/LangGraph workflow

> Some environmental data and AI outputs depend on the configured
> services, API availability, and the data ingested by the running
> application.

------------------------------------------------------------------------

# 📁 Local Development Setup

This is a full-stack application with a client front-end
(**React/Vite**) and a secure server back-end (**Express/Node.js**) that
protects API keys from browser exposure.

## Prerequisites

-   Node.js (**v18 or higher**)
-   npm

## Installation & Configuration

### 1. Clone the repository and install dependencies

``` bash
git clone <your-repository-url>
cd PollutionWatch
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory of the project:

``` env
# Obtain a free key from https://aistudio.google.com/
GEMINI_API_KEY=your_free_gemini_api_key_here
OPENROUTER_API_KEY="go to https://openrouter.ai and get your api keys"

```

### 4. Run the App

Start the development server:

``` bash
npm run dev
```

Open your browser and navigate to:

``` text
http://localhost:3000
```
------------------------------------------------------------------------

# 🎯 Project Vision

PollutionWatch aims to reduce the gap between **pollution observation
and municipal action**.

Instead of treating citizen complaints, sensor telemetry, satellite
observations, and AQI forecasts as disconnected data sources, the
platform brings them into one environmental auditing workflow. The goal
is to help authorities identify **where the risk is, why it may be
happening, how conditions may change, and what action can be
taken**---while keeping citizens connected to the resolution process.

------------------------------------------------------------------------

## 🚀 Future Scope

-   Real-time IoT sensor streaming
-   Expanded municipal role-based access control
-   Push and email resolution notifications
-   Mobile citizen reporting
-   Historical AQI and hotspot trend analytics
-   Automated escalation for unresolved critical hotspots
-   Dispatch team GPS and field-status tracking
-   Wider multi-city and multi-state environmental data coverage
-   Public environmental transparency APIs

------------------------------------------------------------------------

<div align="center">
🌍 PollutionWatch

**Citizen evidence. Multi-agent intelligence. Municipal action.**

Built for smarter environmental auditing and localized pollution
response.
</div>
