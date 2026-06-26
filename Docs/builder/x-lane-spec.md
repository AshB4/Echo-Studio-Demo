# X Lane Specification

## Purpose

Defines how PostPunk should implement support for X.

This document describes product behavior, not platform philosophy.

## Content Composer

- Support an optional Visibility Boost mode.
- Suggest CTA variants such as:
  - polls
  - questions
  - conversation starters

## Scheduler Rules

When enabled:

- prioritize scheduling during preferred windows
- support configurable posting cadence
- avoid hard-coded posting quotas

## Post Types

Support:

- single posts
- threads
- image attachments
- video attachments

Provide multiple CTA styles:
- curiosity-driven
- discussion-driven
- open-ended

## Engagement Hooks

Future capability:

- pre-post engagement workflows
- implemented through:
  - `prePostHooks/x-engagement.js`

These should remain optional.

## Pin Rotation Support

Future capability:

- pinned-post rotation
- configurable schedules
- opt-in only

## Tracking

Track:

- dwell-related metrics
- engagement outcomes
- CTA performance
- link placement performance

Store results alongside existing analytics systems.

## Status

Most functionality described here is aspirational and should not be treated as implemented unless reflected in project-state.md.