/**
 * HTML5 Canvas 2D Viewport & Rendering Configuration
 * Maintained by: Subhankari Mondal (Frontend & Canvas Viewport Engineer)
 */
export const VIEWPORT_CONFIG = {
  // Target refresh rate for ultra-smooth live rendering
  TARGET_FPS: 60,

  // Default projection scale & geographic center coordinates (Bengaluru region)
  DEFAULT_SCALE: 6500,
  CENTER_LATITUDE: 12.9716,
  CENTER_LONGITUDE: 77.5946,

  // Theme palettes
  COLORS: {
    background: '#090d16',
    gridLines: 'rgba(255, 255, 255, 0.04)',
    vehicleNormal: '#10b981',    // Emerald
    vehicleFast: '#f59e0b',      // Amber
    vehicleBreach: '#f43f5e',    // Rose/Red
    vehicleSelected: '#38bdf8'   // Sky Blue
  }
};
