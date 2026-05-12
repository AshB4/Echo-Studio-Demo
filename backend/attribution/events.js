/**
 * Attribution Events Tracking System
 * Captures conversion events from external sources for attribution modeling
 */

import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ATTRIBUTION_EVENTS_PATH = path.join(__dirname, "..", "stats", "attribution-events.json");
const ATTRIBUTION_CONVERSIONS_PATH = path.join(__dirname, "..", "stats", "attribution-conversions.json");

/**
 * Initialize attribution storage files
 */
export async function initAttributionStorage() {
  try {
    const statsDir = path.dirname(ATTRIBUTION_EVENTS_PATH);
    await mkdir(statsDir, { recursive: true });
    
    // Initialize events file if it doesn't exist
    try {
      await readFile(ATTRIBUTION_EVENTS_PATH, "utf-8");
    } catch {
      await writeFile(ATTRIBUTION_EVENTS_PATH, JSON.stringify([], null, 2));
    }
    
    // Initialize conversions file if it doesn't exist
    try {
      await readFile(ATTRIBUTION_CONVERSIONS_PATH, "utf-8");
    } catch {
      await writeFile(ATTRIBUTION_CONVERSIONS_PATH, JSON.stringify([], null, 2));
    }
  } catch (error) {
    console.error("Failed to initialize attribution storage:", error);
  }
}

/**
 * Record a touchpoint event (view, click, etc.) for attribution
 * @param {Object} eventData - The touchpoint event data
 * @returns {Promise<Object>} The recorded event
 */
export async function recordTouchpoint(eventData) {
  try {
    await initAttributionStorage();
    
    const events = await readFile(ATTRIBUTION_EVENTS_PATH, "utf-8");
    const eventsArray = JSON.parse(events);
    
    const touchpoint = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      type: "touchpoint",
      ...eventData
    };
    
    eventsArray.push(touchpoint);
    await writeFile(ATTRIBUTION_EVENTS_PATH, JSON.stringify(eventsArray, null, 2));
    
    return touchpoint;
  } catch (error) {
    console.error("Failed to record touchpoint:", error);
    throw error;
  }
}

/**
 * Record a conversion event for attribution
 * @param {Object} conversionData - The conversion event data
 * @returns {Promise<Object>} The recorded conversion
 */
export async function recordConversion(conversionData) {
  try {
    await initAttributionStorage();
    
    const conversions = await readFile(ATTRIBUTION_CONVERSIONS_PATH, "utf-8");
    const conversionsArray = JSON.parse(conversions);
    
    const conversion = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      type: "conversion",
      ...conversionData
    };
    
    conversionsArray.push(conversion);
    await writeFile(ATTRIBUTION_CONVERSIONS_PATH, JSON.stringify(conversionsArray, null, 2));
    
    return conversion;
  } catch (error) {
    console.error("Failed to record conversion:", error);
    throw error;
  }
}

/**
 * Get all touchpoint events
 * @returns {Promise<Array>} Array of touchpoint events
 */
export async function getTouchpoints() {
  try {
    await initAttributionStorage();
    const events = await readFile(ATTRIBUTION_EVENTS_PATH, "utf-8");
    const eventsArray = JSON.parse(events);
    return eventsArray.filter(event => event.type === "touchpoint");
  } catch (error) {
    console.error("Failed to get touchpoints:", error);
    return [];
  }
}

/**
 * Get all conversion events
 * @returns {Promise<Array>} Array of conversion events
 */
export async function getConversions() {
  try {
    await initAttributionStorage();
    const conversions = await readFile(ATTRIBUTION_CONVERSIONS_PATH, "utf-8");
    const conversionsArray = JSON.parse(conversions);
    return conversionsArray.filter(event => event.type === "conversion");
  } catch (error) {
    console.error("Failed to get conversions:", error);
    return [];
  }
}

/**
 * Get attribution data for a specific time period
 * @param {Object} options - Filter options
 * @returns {Promise<Object>} Attribution data
 */
export async function getAttributionData(options = {}) {
  try {
    const [touchpoints, conversions] = await Promise.all([
      getTouchpoints(),
      getConversions()
    ]);
    
    // Filter by date if provided
    const filteredTouchpoints = options.startDate || options.endDate
      ? touchpoints.filter(tp => {
          const tpDate = new Date(tp.timestamp);
          const start = options.startDate ? new Date(options.startDate) : null;
          const end = options.endDate ? new Date(options.endDate) : null;
          return (!start || tpDate >= start) && (!end || tpDate <= end);
        })
      : touchpoints;
    
    const filteredConversions = options.startDate || options.endDate
      ? conversions.filter(conv => {
          const convDate = new Date(conv.timestamp);
          const start = options.startDate ? new Date(options.startDate) : null;
          const end = options.endDate ? new Date(options.endDate) : null;
          return (!start || convDate >= start) && (!end || convDate <= end);
        })
      : conversions;
    
    return {
      touchpoints: filteredTouchpoints,
      conversions: filteredConversions,
      summary: {
        totalTouchpoints: filteredTouchpoints.length,
        totalConversions: filteredConversions.length,
        conversionRate: filteredTouchpoints.length > 0 
          ? (filteredConversions.length / filteredTouchpoints.length) * 100 
          : 0
      }
    };
  } catch (error) {
    console.error("Failed to get attribution data:", error);
    return {
      touchpoints: [],
      conversions: [],
      summary: {
        totalTouchpoints: 0,
        totalConversions: 0,
        conversionRate: 0
      }
    };
  }
}

/**
 * Clear all attribution data (for testing/reset)
 * @returns {Promise<void>}
 */
export async function clearAttributionData() {
  try {
    await initAttributionStorage();
    await writeFile(ATTRIBUTION_EVENTS_PATH, JSON.stringify([], null, 2));
    await writeFile(ATTRIBUTION_CONVERSIONS_PATH, JSON.stringify([], null, 2));
  } catch (error) {
    console.error("Failed to clear attribution data:", error);
    throw error;
  }
}