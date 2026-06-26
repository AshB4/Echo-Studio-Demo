# PostPunk AI Tooling

This directory contains project-scoped AI tooling used by PostPunk to improve content quality, maintain brand consistency, and assist with architecture and maintenance.

---

# Tool Overview

| Tool        | Purpose                                       | Status             |
| ----------- | --------------------------------------------- | ------------------ |
| Stop Slop   | Content quality enforcement                   | Active             |
| Taste Skill | Brand voice consistency                       | Active             |
| Graphify    | Architecture analysis and dead-code detection | Active             |
| Remotion    | Video generation                              | Future Integration |

---

# Stop Slop

Location:

```text
tools/stop-slop/
```

Purpose:

* Enforce writing rules.
* Prevent duplicate phrasing.
* Reduce AI-sounding content.
* Enforce PostPunk brand constraints.
* Catch repetitive hooks, CTAs, and endings.

Typical Workflow:

```text
Generate Content
↓
Run Stop Slop
↓
Review Warnings
↓
Revise Content
↓
Schedule/Publish
```

Rules We Care About:

* No em dashes unless explicitly requested.
* Avoid repeated hooks.
* Avoid repeated endings.
* Avoid generic AI phrases.
* Avoid duplicate content structures.
* Prefer clear, direct language.

Future Goal:

Stop Slop should become an automated quality gate before any content is scheduled.

Example Pipeline:

```text
Draft
→ Stop Slop Validation
→ Human Review
→ Publish
```

---

# Taste Skill

Location:

```text
tools/taste-skill/
```

Purpose:

Teach AI how Ash writes.

Goals:

* Preserve Ash's voice.
* Maintain consistent tone across platforms.
* Avoid generic AI output.
* Learn preferred formatting and stylistic choices.

Reference Content:

Store style examples in:

```text
content/style/
```

Suggested files:

```text
content/style/
├── ash-blog-style.md
├── ash-linkedin-style.md
├── ash-facebook-style.md
├── ash-devto-style.md
```

Workflow:

```text
Generate Draft
↓
Apply Taste Skill
↓
Review Voice Consistency
↓
Run Stop Slop
↓
Publish
```

Voice Principles:

* Direct.
* Practical.
* Occasionally humorous.
* Minimal fluff.
* Human-sounding.
* Business-aware.
* Experience-driven.

Future Goal:

Automatically apply Taste Skill during all content generation workflows.

---

# Graphify

Location:

```text
tools/graphify/
```

Purpose:

Architecture understanding and repository analysis.

Use Cases:

* Understand project architecture.
* Detect dead code.
* Discover dependencies.
* Identify cleanup candidates.
* Analyze refactors safely.

Typical Commands:

```bash
graphify update .
graphify explain "filename"
graphify affected "filename"
graphify query "question"
```

Questions Graphify Should Help Answer:

* Can this file be deleted?
* What depends on this module?
* Which code paths are active?
* What systems are legacy?
* What should be archived?

Typical Workflow:

```text
Refactor
↓
Graphify Analysis
↓
Impact Review
↓
Code Changes
↓
Validation
```

Future Goal:

Use Graphify before major refactors and cleanup operations.

---

# Remotion (Future)

Purpose:

Generate:

* Video pins.
* Reels.
* Shorts.
* Animated quote videos.
* Blog-to-video workflows.

Planned Workflow:

```text
Markdown Article
↓
Taste Skill
↓
Stop Slop
↓
Generate Social Snippets
↓
Remotion Video
↓
Schedule Publishing
```

Status:

Approved for future implementation.

---

# Recommended Content Pipeline

```text
Draft Content
↓
Taste Skill
↓
Stop Slop
↓
Human Review
↓
Schedule
↓
Publish
```

---

# Notes For Future Contributors

* Do not remove these tools without letting the human know and then documenting why.
* Always prefer architecture analysis before large refactors.
* Content quality and voice consistency are core PostPunk requirements.
* Human review remains the final approval step.
