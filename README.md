# 🧃 PostPunk aka N8tiveFlow

## PostPunk is not open source. 
It is licensed under BSD 2-Clause for private, non-commercial use only. Commercial use requires a paid license.

PostPunk is a discoverability-oriented publishing operations system. It manages workflows, metadata intelligence, lifecycle tracking, syndication decisions, and evergreen resurfacing while Astro remains the canonical publishing layer for rendering, SEO presentation, and archive structure.

For the guiding product boundary and discoverability operating model, see [PostPunk Core Vision](./Docs/PostPunk_Core_Vision.md).

---

## 🚀 What It Does
| Feature                     | Purpose                                                |
|----------------------------|--------------------------------------------------------|
| 🧭 Lifecycle Tracking       | Model content as seed, fragment, note, experiment, article, syndicated, refreshed, archived |
| 🧠 Metadata Intelligence    | Track discoverability metadata, canonical source, related content, and repurpose priority |
| 🔁 Syndication Operations   | Coordinate platform-aware derivatives without confusing them with canonical ownership |
| ♻️ Evergreen Systems        | Support resurfacing, refresh reminders, and content decay awareness |
| 🧩 Platform-Aware Lanes     | Treat Pinterest, Reddit, Dev.to, Facebook, Ko-fi, and similar lanes by behavior, not as interchangeable outputs |
| 📊 Operational Analytics    | Review queue health, campaign metrics, and tracked funnel events |
| 🖼️ Media + Asset Support    | Store supporting assets, alt text, and platform-specific payload metadata |
| 🧾 Astro Export Readiness   | Generate Astro-compatible markdown/frontmatter from PostPunk content records |
| 🧠 Local First Design       | Runs from terminal or always-on service (launchd/systemd) |

---

## 📦 Tech Stack
| Tech                | Purpose                          | License  |
|---------------------|----------------------------------|----------|
| React + Zustand     | Frontend UI + lightweight state  | MIT      |
| Tailwind + Vite     | Fast, styled build system        | MIT      |
| Playwright + launchd/systemd | Browser automation + scheduled worker | Apache / OS built-in |
| JSON-based analytics | Funnel and campaign summaries   | Built-in |

---

## 🧠 Core Concepts
### Responsibility Split
Astro owns canonical publishing, rendering, SEO presentation, and archive structure.

PostPunk owns workflows, metadata intelligence, lifecycle tracking, syndication, publishing operations, and discoverability systems.

### Queue Rules
Only posts with `"status": "approved"` in the `postQueue.json` are eligible for publishing.
- Platforms must match `active_platforms` in `settings.json`
- After posting, system updates `status` to `"posted"`
- Posts can be rejected or recycled via logs

Publishing `status` is not the same thing as content `lifecycleState`.
`status` answers "can this target publish now?"
`lifecycleState` answers "what stage of evolution is this content artifact in?"

---

## 🔐 Account Secrets
Keep platform credentials in environment variables, not in tracked JSON.

1. Copy `backend/config/accounts.template.json` to `backend/config/accounts.json`
2. Set the referenced env vars in your local `.env`
3. Start backend normally; account placeholders like `${X_API_KEY}` are resolved at runtime

## 📘 Operations Guide
For full runbooks (macOS launchd, Linux systemd, queue/worker ops, backups, health checks), see:

- [`README-OPERATIONS.md`](./README-OPERATIONS.md)

---

## 🧠 Discoverability Model
PostPunk is not:
- a generic social media scheduler
- a giant CMS
- an AI spam engine
- a productivity app
- an all-platform autoposter

PostPunk is:
- discoverability infrastructure
- metadata-aware publishing operations
- evergreen content workflow tooling
- canonical-aware syndication infrastructure
- operational publishing intelligence

See [PostPunk Core Vision](./Docs/PostPunk_Core_Vision.md) for the full operating model.

---

## 🧾 Licensing
This system is licensed under **BSD 2-Clause** for **personal use only**. 

You **may not**:
- Resell this system
- Sublicense or publicly post modified versions

To obtain a commercial license or team edition:
📬 Contact: `fleurdeviefarmsllc@gmail.com`

Includes third-party libraries under MIT, BSD, and Apache 2.0 — see [Licenses.txt](./Docs/Licenses.txt)

---

## 🧃 Run It Like a Ghost
```bash
cd backend && npm install
cd ../frontend && npm install

# terminal 1
cd backend && npm run start

# terminal 2
cd frontend && npm run dev

# run worker manually (or via launchd/systemd timer)
cd backend && npm run worker
```
---

## 🛠 Roadmap Highlights
- [ ] Replace file-backed analytics with a persistent metrics store
- [ ] Add richer posting/API integration tests
- [ ] Expand credential health checks into preflight UI warnings
- [ ] Add revenue-source integrations for conversion reporting

---

🧃 _Post like a ghost. Track like a boss.  Remix like an automation nerd with a thing for good buttons._

🛒 Want to license PostPunk for your team or product?
Email fleurdeviefarmsllc@gmail.com to get early access + pricing.
