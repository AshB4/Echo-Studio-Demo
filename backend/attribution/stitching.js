/**
 * Customer Journey Stitching Service
 * Links touchpoints to conversions to build complete user journeys for attribution modeling
 */

import { v4 as uuidv4 } from "uuid";

/**
 * Stitch touchpoints and conversions into user journeys
 * @param {Array} touchpoints - Array of touchpoint events
 * @param {Array} conversions - Array of conversion events
 * @param {Object} options - Stitching options
 * @returns {Array} Array of stitched user journeys
 */
export function stitchUserJourneys(touchpoints, conversions, options = {}) {
  const {
    timeWindowHours = 24 * 30, // Default 30 days
    idFields = ['user_id', 'email', 'visitor_id'] // Fields to use for identifying users
  } = options;

  // Group touchpoints and conversions by user identifier
  const groupedTouchpoints = groupByIdentifier(touchpoints, idFields);
  const groupedConversions = groupByIdentifier(conversions, idFields);

  const journeys = [];

  // For each user identifier that has either touchpoints or conversions
  const allIdentifiers = new Set([
    ...Object.keys(groupedTouchpoints),
    ...Object.keys(groupedConversions)
  ]);

  for (const identifier of allIdentifiers) {
    const userTouchpoints = groupedTouchpoints[identifier] || [];
    const userConversions = groupedConversions[identifier] || [];

    // Sort by timestamp
    userTouchpoints.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    userConversions.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    // For each conversion, find touchpoints that occurred before it within the time window
    for (const conversion of userConversions) {
      const conversionTime = new Date(conversion.timestamp);
      const windowStart = new Date(conversionTime.getTime() - (timeWindowHours * 60 * 60 * 1000));

      // Find touchpoints within the attribution window
      const relevantTouchpoints = userTouchpoints.filter(touchpoint => {
        const touchpointTime = new Date(touchpoint.timestamp);
        return touchpointTime >= windowStart && touchpointTime <= conversionTime;
      });

      if (relevantTouchpoints.length > 0 || userConversions.length === 1) {
        // Create a journey for this conversion
        journeys.push({
          journeyId: uuidv4(),
          userIdentifier: identifier,
          conversion: { ...conversion },
          touchpoints: [...relevantTouchpoints],
          timestamp: conversion.timestamp,
          attributionModel: options.attributionModel || 'linear',
          touchpointCount: relevantTouchpoints.length
        });
      }
    }

    // Handle touchpoints that didn't lead to conversions (assisted conversions)
    if (userConversions.length === 0 && userTouchpoints.length > 0) {
      const latestTouchpoint = userTouchpoints[userTouchpoints.length - 1];
      const touchpointTime = new Date(latestTouchpoint.timestamp);
      const windowStart = new Date(touchpointTime.getTime() - (timeWindowHours * 60 * 60 * 1000));
      
      // Only include recent touchpoints (within time window)
      const recentTouchpoints = userTouchpoints.filter(tp => {
        const tpTime = new Date(tp.timestamp);
        return tpTime >= windowStart;
      });

      if (recentTouchpoints.length > 0) {
        journeys.push({
          journeyId: uuidv4(),
          userIdentifier: identifier,
          conversion: null, // No conversion
          touchpoints: [...recentTouchpoints],
          timestamp: recentTouchpoints[recentTouchpoints.length - 1].timestamp,
          attributionModel: options.attributionModel || 'linear',
          touchpointCount: recentTouchpoints.length,
          isAssistedOnly: true
        });
      }
    }
  }

  return journeys;
}

/**
 * Group events by user identifier
 * @param {Array} events - Array of events (touchpoints or conversions)
 * @param {Array} idFields - Fields to use for identifying users
 * @returns {Object} Object with identifiers as keys and arrays of events as values
 */
function groupByIdentifier(events, idFields) {
  const grouped = {};

  for (const event of events) {
    // Try to find a user identifier in the event
    let userId = null;
    
    for (const field of idFields) {
      if (event[field] !== undefined && event[field] !== null && event[field] !== '') {
        userId = String(event[field]);
        break;
      }
    }
    
    // If no explicit user ID, use anonymous ID based on session or fingerprint
    if (!userId) {
      // Create a pseudo-anonymous ID from available data
      const anonParts = [
        event.channel || 'unknown',
        event.source || 'unknown',
        event.ip_address || 'unknown',
        event.user_agent || 'unknown'
      ].filter(part => part !== 'unknown');
      
      if (anonParts.length > 0) {
        userId = `anon_${anonParts.join('_')}`;
      } else {
        // Last resort: use timestamp bucketed by hour
        const hourBucket = new Date(event.timestamp).getTime() - (new Date(event.timestamp).getTime() % (60 * 60 * 1000));
        userId = `anon_hour_${hourBucket}`;
      }
    }

    if (!grouped[userId]) {
      grouped[userId] = [];
    }
    grouped[userId].push(event);
  }

  return grouped;
}

/**
 * Apply attribution model to a journey to calculate credit distribution
 * @param {Object} journey - A stitched user journey
 * @returns {Object} Journey with attribution credits applied
 */
export function applyAttributionModel(journey) {
  const { touchpoints, attributionModel = 'linear' } = journey;
  
  if (!touchpoints || touchpoints.length === 0) {
    return {
      ...journey,
      attributionCredits: []
    };
  }

  let credits = [];
  
  switch (attributionModel) {
    case 'first_touch':
      // 100% credit to first touchpoint
      credits = touchpoints.map((tp, index) => ({
        ...tp,
        attributionCredit: index === 0 ? 1 : 0
      }));
      break;
      
    case 'last_touch':
      // 100% credit to last touchpoint
      credits = touchpoints.map((tp, index) => ({
        ...tp,
        attributionCredit: index === touchpoints.length - 1 ? 1 : 0
      }));
      break;
      
    case 'linear':
      // Equal credit to all touchpoints
      const linearCredit = 1 / touchpoints.length;
      credits = touchpoints.map(tp => ({
        ...tp,
        attributionCredit: linearCredit
      }));
      break;
      
    case 'time_decay':
      // More credit to touchpoints closer to conversion
      // Using half-life of 7 days as default
      const halfLifeHours = 7 * 24; // 7 days in hours
      const conversionTime = new Date(journey.timestamp).getTime();
      
      const timeWeights = touchpoints.map(tp => {
        const touchpointTime = new Date(tp.timestamp).getTime();
        const hoursBeforeConversion = (conversionTime - touchpointTime) / (60 * 60 * 1000);
        // Time decay formula: 0.5^(hours/halfLife)
        return Math.pow(0.5, hoursBeforeConversion / halfLifeHours);
      });
      
      const totalWeight = timeWeights.reduce((sum, weight) => sum + weight, 0);
      credits = touchpoints.map((tp, index) => ({
        ...tp,
        attributionCredit: totalWeight > 0 ? timeWeights[index] / totalWeight : 0
      }));
      break;
      
    case 'position_based':
      // 40% first, 40% last, 20% distributed among middle
      const firstCredit = 0.4;
      const lastCredit = 0.4;
      const middleCredit = 0.2;
      
      if (touchpoints.length === 1) {
        credits = [{ ...touchpoints[0], attributionCredit: 1 }];
      } else if (touchpoints.length === 2) {
        credits = [
          { ...touchpoints[0], attributionCredit: firstCredit + middleCredit/2 },
          { ...touchpoints[1], attributionCredit: lastCredit + middleCredit/2 }
        ];
      } else {
        const middleTouchpoints = touchpoints.slice(1, -1);
        const middleCreditEach = middleCredit / Math.max(1, middleTouchpoints.length);
        
        credits = [
          { ...touchpoints[0], attributionCredit: firstCredit },
          ...middleTouchpoints.map(tp => ({ ...tp, attributionCredit: middleCreditEach })),
          { ...touchpoints[touchpoints.length - 1], attributionCredit: lastCredit }
        ];
      }
      break;
      
    case 'data_driven':
      // Placeholder for data-driven attribution
      // In a real implementation, this would use machine learning
      // For now, fall back to linear
      credits = touchpoints.map(tp => ({
        ...tp,
        attributionCredit: 1 / touchpoints.length
      }));
      break;
      
    default:
      // Default to linear
      const defaultCredit = 1 / touchpoints.length;
      credits = touchpoints.map(tp => ({
        ...tp,
        attributionCredit: defaultCredit
      }));
  }

  return {
    ...journey,
    attributionCredits: credits
  };
}

/**
 * Calculate attribution reporting metrics
 * @param {Array} journeys - Array of stitched user journeys
 * @returns {Object} Attribution reporting data
 */
export function calculateAttributionReporting(journeys) {
  // Filter to only journeys with conversions
  const conversionJourneys = journeys.filter(j => j.conversion !== null);
  
  // Aggregate touchpoint credits by channel/source/campaign
  const channelCredits = {};
  const sourceCredits = {};
  const campaignCredits = {};
  
  for (const journey of conversionJourneys) {
    for (const touchpointCredit of journey.attributionCredits) {
      const credit = touchpointCredit.attributionCredit;
      
      // Channel credits
      const channel = touchpointCredit.channel || 'unknown';
      channelCredits[channel] = (channelCredits[channel] || 0) + credit;
      
      // Source credits
      const source = touchpointCredit.source || 'unknown';
      sourceCredits[source] = (sourceCredits[source] || 0) + credit;
      
      // Campaign credits
      const campaign = touchpointCredit.campaign || 'unknown';
      campaignCredits[campaign] = (campaignCredits[campaign] || 0) + credit;
    }
  }
  
  // Calculate assisted vs direct conversions
  const directConversions = conversionJourneys.filter(journey => 
    journey.touchpoints.length === 1
  ).length;
  
  const assistedConversions = conversionJourneys.length - directConversions;
  
  // Calculate conversion value attribution (if available)
  let revenueAttribution = 0;
  let conversionCount = 0;
  
  for (const journey of conversionJourneys) {
    const conversionValue = journey.conversion?.value || 1; // Default to 1 if no value
    conversionCount += 1;
    
    for (const touchpointCredit of journey.attributionCredits) {
      revenueAttribution += touchpointCredit.attributionCredit * conversionValue;
    }
  }
  
  return {
    summary: {
      totalJourneys: journeys.length,
      conversionJourneys: conversionJourneys.length,
      assistedOnlyJourneys: journeys.filter(j => j.isAssistedOnly).length,
      directConversions,
      assistedConversions,
      conversionRate: journeys.length > 0 ? (conversionJourneys.length / journeys.length) * 100 : 0,
      averageTouchpointsPerJourney: 
        journeys.reduce((sum, j) => sum + j.touchpointCount, 0) / Math.max(1, journeys.length)
    },
    channelAttribution: Object.entries(channelCredits).map(([channel, credit]) => ({
      channel,
      credit: parseFloat(credit.toFixed(4)),
      percentage: journeys.length > 0 ? parseFloat((credit / journeys.length) * 100).toFixed(2) : 0
    })).sort((a, b) => b.credit - a.credit),
    sourceAttribution: Object.entries(sourceCredits).map(([source, credit]) => ({
      source,
      credit: parseFloat(credit.toFixed(4)),
      percentage: journeys.length > 0 ? parseFloat((credit / journeys.length) * 100).toFixed(2) : 0
    })).sort((a, b) => b.credit - a.credit),
    campaignAttribution: Object.entries(campaignCredits).map(([campaign, credit]) => ({
      campaign,
      credit: parseFloat(credit.toFixed(4)),
      percentage: journeys.length > 0 ? parseFloat((credit / journeys.length) * 100).toFixed(2) : 0
    })).sort((a, b) => b.credit - a.credit),
    valueAttribution: {
      totalConversionValue: conversionCount, // Simplified - would sum actual conversion values
      attributedRevenue: parseFloat(revenueAttribution.toFixed(2)),
      revenuePerConversion: conversionCount > 0 ? parseFloat((revenueAttribution / conversionCount).toFixed(2)) : 0
    }
  };
}