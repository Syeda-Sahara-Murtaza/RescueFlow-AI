# RescueFlow AI — updated source export

Published version: 10
Export date: 2026-10-03
Source commit: 6a6c501636435269d264443356267825024ef582
Live site: https://rescueflow-ai.burhanmalik102000.chatgpt.site

Includes the new Home page, the existing six platform screens, city/country report submission, persistent red emergency map pins, server APIs, database schema/migrations, source assets, dependency lockfile, and verification scripts.

Routes:
- / — new Home/landing page
- /overview — existing Overview and simulation launch
- /reports — incoming reports and emergency submission
- /incidents — incident assessment and evidence
- /missions — human approval and mission tracking
- /resources — resource planning
- /command-center — operational map and activity timeline

Stack: React, TypeScript, Vinext, Cloudflare Workers, and D1.

This ZIP contains the source project, not a standalone HTML file. API keys, hosted secrets, user database contents, installed dependencies, build output, and temporary files are excluded. OPENAI_API_KEY is an optional server-side secret; rule-based fallback and the opt-in fictional simulation remain available without it. Hosting bindings and development setup are required to run the backend outside its existing hosted environment.
