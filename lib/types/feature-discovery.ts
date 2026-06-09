export type MaritimeDomain =
  | 'Navigation'
  | 'Weather'
  | 'Machinery'
  | 'Safety'
  | 'Compliance'
  | 'Crew'
  | 'Cargo'
  | 'Fleet'
  | 'Security'
  | 'Sustainability';

export type VesselType =
  | 'LNG Carrier'
  | 'Passenger Ferry'
  | 'Container Vessel'
  | 'Tanker'
  | 'Bulk Carrier'
  | 'General';

export type FeaturePriority = 'critical' | 'high' | 'medium' | 'low';

export interface RequirementExtraction {
  vesselType: VesselType;
  voyageInformation: boolean;
  navigationData: boolean;
  fleetData: boolean;
  engineData: boolean;
  fuelData: boolean;
  weatherData: boolean;
  crewData: boolean;
  cargoData: boolean;
  complianceData: boolean;
  safetyData: boolean;
}

export interface FeatureRecommendation {
  feature: string;
  widget: string;
  domain: MaritimeDomain;
  businessValue: string;
  priority: FeaturePriority;
  confidence: number;
  reason: string;
}

export interface DomainCoverage {
  domain: MaritimeDomain;
  covered: boolean;
  widgets: string[];
  metrics: string[];
}

export interface DashboardHealth {
  coverageScore: number;
  navigationCoverage: number;
  operationalCoverage: number;
  safetyCoverage: number;
  complianceCoverage: number;
  fleetCoverage: number;
  missingCapabilities: MaritimeDomain[];
  recommendedFeatures: FeatureRecommendation[];
}

export interface WidgetExplainability {
  widget: string;
  generatedBecause: string;
  dataSource: string;
  confidence: number;
  businessValue: string;
}

export interface FeatureDiscoveryResult {
  requirements: RequirementExtraction;
  domainCoverage: DomainCoverage[];
  dashboardHealth: DashboardHealth;
  vesselTypeRecommendations: FeatureRecommendation[];
  predictiveFeatures: FeatureRecommendation[];
  widgetExplainability: WidgetExplainability[];
  autoExpandedWidgets: string[];
}
