export interface PrdSample {
  id: string;
  label: string;
  body: string;
}

export const PRD_SAMPLES: PrdSample[] = [
  {
    id: 'atlantic-star',
    label: 'MV Atlantic Star (default)',
    body: `Build a vessel monitoring dashboard for MV Atlantic Star.

Required widgets:
- Voyage progress tracker with route legs, ETA, and distance remaining
- Fuel gauge cards for HFO and MDO tanks with consumption rates
- Crew certification status panel (STCW compliance and expiry)
- Alert panel for critical machinery and navigation warnings

Layout: dashboard-grid. Priority: safety-critical.`,
  },
  {
    id: 'pacific-dawn',
    label: 'Bridge navigation',
    body: `Build a bridge navigation dashboard for MV Pacific Dawn.

Required widgets:
- Voyage progress tracker with AIS route, current leg, and ETA to next port
- Weather widget showing wind speed, wave height, and swell along the route
- Alert panel for navigation warnings, ECDIS notices, and CPA/TCPA alarms

Layout: bridge-split. Priority: safety-critical.`,
  },
  {
    id: 'nordic-spirit',
    label: 'Engine room',
    body: `Build an engine room monitoring dashboard for MV Nordic Spirit.

Required widgets:
- Engine monitor with main engine RPM, load percentage, and machinery health
- Fuel gauge cards for HFO and MDO with tank levels and daily consumption rates
- Alert panel for high exhaust temperature, lube oil pressure, and pump faults

Layout: dashboard-grid. Priority: operational.`,
  },
  {
    id: 'blue-horizon',
    label: 'Crew compliance',
    body: `Build a crew compliance dashboard for MV Blue Horizon.

Required widgets:
- Crew certification status panel with STCW validity, role, and expiry dates
- Alert panel for certificates expiring within 90 days and missing endorsements

Layout: dashboard-grid. Priority: operational.`,
  },
  {
    id: 'safe-harbour',
    label: 'Emergency ops',
    body: `Build an emergency operations dashboard for MV Safe Harbour.

Required widgets:
- Alert panel with critical, warning, and info tiers plus acknowledge actions
- Voyage progress tracker with current position and nearest port of refuge
- Crew certification status panel with muster readiness and valid STCW certs

Layout: alert-first. Priority: safety-critical.`,
  },
  {
    id: 'fleet-hq',
    label: 'Fleet KPI',
    body: `Build a fleet performance dashboard for operations HQ (multi-vessel view).

Required widgets:
- KPI dashboard with CII rating, fuel efficiency, and on-time arrival metrics
- Fuel gauge cards summarizing fleet-wide HFO and MDO consumption trends
- Voyage progress tracker for active voyages and delay indicators

Layout: dashboard-grid. Priority: informational.`,
  },
  {
    id: 'caribbean-express',
    label: 'Passenger ferry',
    body: `Build a passenger ferry monitoring dashboard for MV Caribbean Express.

Required widgets:
- Voyage progress tracker with scheduled legs, boarding windows, and ETA
- Crew certification status panel for bridge and safety officer compliance
- Alert panel for passenger safety, fire detection, and machinery alarms
- Weather widget for route conditions and berth approach limits

Layout: dashboard-grid. Priority: safety-critical.`,
  },
  {
    id: 'lng-pioneer',
    label: 'LNG carrier',
    body: `Build an LNG carrier monitoring dashboard for MV LNG Pioneer.

Required widgets:
- Fuel gauge cards for boil-off gas and bunker remaining with consumption rates
- Engine monitor with dual-fuel engine load, RPM, and reliquefaction status
- Alert panel for cargo tank pressure, gas detection, and machinery trips
- Voyage progress tracker with laden/ballast legs and canal transit ETA

Layout: dashboard-grid. Priority: safety-critical.`,
  },
];

export const DEFAULT_PRD_SAMPLE = PRD_SAMPLES[0];
