# 📊 Post Punk Attribution System

Implements comprehensive marketing attribution to track the full customer journey from social posts to conversions, enabling data-driven marketing decisions.

## 🎯 Overview

This system addresses the critical limitation mentioned in the UTM tracking docs: *"You can track what was posted — but not clicks or sales unless you connect to: Gumroad analytics export, Google Analytics, or your own webhook/server log endpoint"*

Now Post Punk can:
- Track touchpoints (views, clicks, engagements) from social posts
- Record conversions (purchases, sign-ups, etc.) from external sources
- Stitch together complete customer journeys
- Apply multiple attribution models for different insights
- Measure content effectiveness beyond vanity metrics
- Optimize marketing spend based on actual ROI

## 🏗️ Architecture

```
Social Posts → UTM-tagged Links → Website/App → 
    ↓
Attribution Events System ← Conversions (Gumroad, etc.)
    ↓
Journey Stitching → Attribution Modeling → Insights Dashboard
```

## 🔧 Components

### 1. Attribution Events Tracking (`/backend/attribution/events.js`)
Captures two types of events:
- **Touchpoints**: Marketing interactions (views, clicks, engagements)
- **Conversions**: Business outcomes (purchases, sign-ups, leads)

### 2. Customer Journey Stitching (`/backend/attribution/stitching.js`)
Links touchpoints to conversions using:
- Anonymous user identification (when no explicit ID available)
- Time window analysis (default 30 days)
- Journey reconstruction for reporting

### 3. Attribution Modeling
Supports multiple models for different business questions:
- **First-touch**: Which channel gets awareness credit?
- **Last-touch**: Which channel gets conversion credit?
- **Linear**: Fair distribution across all touchpoints
- **Time-decay**: More credit to recent interactions
- **Position-based (U-shaped)**: 40% first, 40% last, 20% middle
- **Data-driven**: Placeholder for future ML implementation

### 4. REST API Endpoints
All endpoints available under `/api/attribution/`:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/touchpoint` | POST | Record a marketing touchpoint |
| `/conversion` | POST | Record a conversion event |
| `/data` | GET | Get raw touchpoints and conversions |
| `/journeys` | GET | View stitched customer journeys |
| `/report` | GET | Attribution reporting with model selection |
| `/dashboard` | GET | Executive dashboard with KPIs |
| `/reset` | DELETE | Clear all attribution data (testing) |

## 📋 Usage Examples

### Recording Touchpoints
```bash
curl -X POST http://localhost:3001/api/attribution/touchpoint \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "facebook",
    "source": "post", 
    "campaign": "goblin-affirmations",
    "page": "/products/goblin-coloring",
    "event_type": "content_view"
  }'
```

### Recording Conversions
```bash
curl -X POST http://localhost:3001/api/attribution/conversion \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "gumroad",
    "source": "purchase",
    "campaign": "goblin-affirmations",
    "value": 29.99,
    "product_id": "goblin-coloring-affirmations"
  }'
```

### Getting Attribution Insights
```bash
# Get dashboard with all KPIs
curl http://localhost:3001/api/attribution/dashboard

# Get report with specific attribution model
curl "http://localhost:3001/api/attribution/report?attributionModel=position_based&timeWindowDays=7"

# Get raw journey data
curl http://localhost:3001/api/attribution/journeys
```

## 📈 Dashboard Metrics

The attribution dashboard (`/api/attribution/dashboard`) provides:

### Core Metrics
- **Total Conversions**: Number of conversion events in time period
- **Assisted Conversions**: Conversions with multiple touchpoints
- **Direct Conversions**: Single-touchpoint conversions  
- **Conversion Rate**: (Conversions ÷ Touchpoints) × 100
- **Avg Touchpoints Per Journey**: Average journey length

### Content ROI
```
Content ROI = (Attributed Revenue - Content Cost) ÷ Content Cost
```
- Estimates content cost per piece ($50 placeholder)
- Calculates attributed revenue from conversion values
- Shows ROI percentage and absolute values

### Channel Efficiency
```
Channel Efficiency = Attributed Conversions ÷ Channel Spend
```
- Uses estimated spend per channel (configurable)
- Identifies most efficient marketing channels
- Helps optimize budget allocation

### Attribution Scores
- **First Touch Score**: Credit for awareness-building content
- **Middle Touch Score**: Credit for nurturing/consideration content  
- **Last Touch Score**: Credit for conversion-focused content
- **Position-Based Score**: (0.4 × First) + (0.2 × Middle) + (0.4 × Last)

### Content Influence Score
```
Content Influence Score = (Assisted + Direct Conversions) ÷ Content Views
```
- Measures how effectively content influences conversions
- Higher scores = better content-to-conversion efficiency

## 🔒 Privacy Considerations

- Uses anonymous identifiers when no explicit user ID available
- Does not collect personally identifiable information (PII)
- All data is first-party and stored locally
- Compliant with privacy-first marketing principles

## 🔗 Integration with Existing Features

### UTM Validation
The post creation endpoint (`POST /api/posts`) now validates that:
- Product links contain UTM parameters
- Required parameters: utm_source, utm_medium, utm_campaign
- Returns clear error messages for missing UTMs

### Posted Log Enhancement
While the existing `posted-log.json` tracks what was posted, the attribution system:
- Tracks what actually happened (engagements, conversions)
- Connects posts to business outcomes
- Measures assisted conversions that posted-log alone cannot see

### Analytics Integration
Works alongside existing analytics endpoints:
- `/api/analytics/summary` - Platform-specific metrics
- `/api/attribution/dashboard` - Cross-platform journey insights
- Together provide complete marketing performance picture

## 🚀 Getting Started

1. **Start recording touchpoints** from your social posts:
   - Add UTM parameters to all product links
   - Record views/clicks as touchpoint events
   - Use consistent campaign naming

2. **Record conversions** from your sales platforms:
   - Gumroad purchases
   - Email sign-ups
   - Form submissions
   - Any business outcome

3. **Review insights** regularly:
   - Daily: Check dashboard for performance trends
   - Weekly: Review attribution reports
   - Monthly: Optimize based on channel efficiency scores

4. **Iterate and improve**:
   - Test different attribution models
   - Adjust time windows based on sales cycles
   - Refine UTM taxonomy for better granularity

## 📝 Implementation Notes

### Data Storage
- Touchpoints stored in `/backend/stats/attribution-events.json`
- Conversions stored in `/backend/stats/attribution-conversions.json`
- Both are JSON arrays for simplicity and portability

### Extensibility
- Easy to add new attribution models
- Simple to integrate with additional conversion sources
- Designed to work with existing Post Punk architecture
- Minimal performance impact on core posting functionality

### Future Enhancements
- Google Analytics integration
- Gumroad webhook automation
- Machine learning for data-driven attribution
- A/B testing framework for content optimization
- Customer lifetime value (LTV) tracking

## 📚 References

Based on principles from:
- Deep Research Report: "Attribution Models for Marketing Analytics"
- Marketing attribution best practices
- Multi-touch attribution (MTA) frameworks
- Privacy-first measurement approaches

---

*Implementation completed: May 2026*  
*Part of Post Punk's evolution toward data-driven marketing excellence*