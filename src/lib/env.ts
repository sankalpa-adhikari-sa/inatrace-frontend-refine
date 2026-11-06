const ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services";


function satellite() {
  const custom = import.meta.env.VITE_MAP_SATELLITE_TILES;
  if (custom) {
    return {
      mapSatelliteTiles: custom as string,
      mapSatelliteAttribution: (import.meta.env.VITE_MAP_SATELLITE_ATTRIBUTION ?? "") as string,
      mapSatelliteLabels: "",
    };
  }
  const mapbox = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
  if (mapbox) {
    return {
      mapSatelliteTiles: `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/256/{z}/{x}/{y}@2x?access_token=${mapbox}`,
      mapSatelliteAttribution:
        '© <a href="https://www.mapbox.com/about/maps/">Mapbox</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      mapSatelliteLabels: "",
    };
  }
  return {
    mapSatelliteTiles: `${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`,
    mapSatelliteAttribution: "Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community",
    mapSatelliteLabels: `${ESRI}/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}`,
  };
}


export const env = {
  apiUrl: import.meta.env.VITE_API_URL ?? "",
  /** Shown on printed farmer / collector cards. */
  appName: import.meta.env.VITE_APP_NAME || "INATrace",
  /** Public base URL used in QR codes; defaults to this app's origin. */
  appBaseUrl: import.meta.env.VITE_APP_BASE_URL || window.location.origin,
  qrCodeBasePath: import.meta.env.VITE_QR_CODE_BASE_PATH || "q-cd",
  /** Raster tiles for maps (default: OpenStreetMap; see its tile usage policy for production). */
  mapTiles: import.meta.env.VITE_MAP_TILES || "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  mapAttribution: import.meta.env.VITE_MAP_ATTRIBUTION || '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  /** Satellite imagery behind the maps' Map / Satellite switch (see `satellite` below). */
  ...satellite(),
  beycoAuthUrl: import.meta.env.VITE_BEYCO_AUTH_URL ?? "",
  beycoClientId: import.meta.env.VITE_BEYCO_CLIENT_ID ?? "",
  publicLogToken: import.meta.env.VITE_PUBLIC_LOG_TOKEN ?? "",
  environmentName: import.meta.env.VITE_ENVIRONMENT_NAME ?? import.meta.env.MODE,
  version: __APP_VERSION__,
  /** Google Analytics measurement ID; loaded only after cookie consent. */
  googleAnalyticsId: import.meta.env.VITE_GOOGLE_ANALYTICS_ID ?? "",
  chatApp: (import.meta.env.VITE_CHAT_APP ?? "") as "" | "rocket" | "intercom",
  rocketChatServer: import.meta.env.VITE_ROCKET_CHAT_SERVER ?? "",
};
