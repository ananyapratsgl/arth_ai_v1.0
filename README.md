# ARTH — AI Report Translator for Health

**Version:** 1.0.0  
**Project type:** Student-built AI web application  
**Status:** v1.0 baseline; future enhancements are planned for v2.0.

ARTH helps people understand the wording and values in medical reports through clearer explanations. It includes a report-analysis experience and an **Ask ARTH** question-and-answer experience.

> **Medical safety:** ARTH is an educational support prototype, not a doctor or a medical device. It does not replace a qualified healthcare professional, diagnose a disease, or prescribe treatment. AI output can be incomplete or incorrect. Discuss results and health decisions with a qualified clinician.

## Quick start on Ananya's MacBook

After the one-time setup below has been completed, daily startup is designed to be simple. Open Terminal and run:

```bash
cd ~/Documents/Projects/arth_ai_v1.0
./scripts/arth.sh start
```

Then open:

- Home: http://localhost:3000/
- Report analysis: http://localhost:3000/analyze
- Ask ARTH: http://localhost:3000/ask-arth
- Backend health: http://127.0.0.1:8000/health

Check whether both services are running:

```bash
./scripts/arth.sh status
```

Stop both services at the end of the day:

```bash
./scripts/arth.sh stop
```

The script writes logs and PID files to `.arth-run/` at the project root. These are local runtime files and should not be committed. The script binds the development servers to loopback addresses for local use.

### Daily use notes

- Run `start` once after logging in or rebooting. If a service is already running, the script reports that rather than intentionally starting a duplicate.
- Keep the Mac awake while using the app; closing the lid or shutting down stops local development servers.
- If `status` says a service is running but the page does not load, inspect its log files as described below.
- Do not run the script from a backup folder. Run it from the active `arth_ai_v1.0` project.
- The script does not start a hosted AI provider; it starts only the local frontend and backend.

## 1. What ARTH does

- **Report analysis:** submit a supported medical report for an AI-generated explanation.
- **Result summaries:** display extracted report values and explanations when available.
- **Ask ARTH:** ask general questions about a report or health-related terminology.
- **Backend API:** a Python FastAPI service handles requests and communicates with the configured AI provider.
- **Safety messaging:** encourages professional medical review.

Features depend on the current implementation and provider response. Do not use ARTH for emergencies or as the basis for treatment decisions.

## 2. Architecture and folders

```text
arth_ai_v1.0/
├── README.md
├── scripts/
│   └── arth.sh              # Start, status, and stop local services
├── arth-backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── routes.py
│   │   └── schemas.py
│   ├── tests/
│   ├── requirements.txt
│   └── .env.example
└── arth-frontend/
    ├── app/
    │   ├── page.tsx
    │   ├── analyze/page.tsx
    │   ├── ask-arth/page.tsx
    │   ├── layout.tsx
    │   └── globals.css
    ├── package.json
    └── next.config.ts
```

The local `.env`, `.env.local`, `.venv`, `node_modules`, build output, and `.arth-run` are machine-specific and must not be committed.

## 3. One-time prerequisites

Install and verify:

```bash
git --version
python3 --version
node --version
npm --version
```

You need Git, a compatible Python 3 installation, Node.js/npm, and access to the AI provider configured for the backend. A hosted AI API means the model runs with the provider; no separate local model installation is required.

## 4. One-time setup on macOS

Run these commands from the project root.

### Backend environment

```bash
cd ~/Documents/Projects/arth_ai_v1.0/arth-backend
python3 -m venv .venv
./.venv/bin/python -m pip install --upgrade pip
./.venv/bin/python -m pip install -r requirements.txt
```

If `.venv` already exists and backend tests pass, do not recreate it just for daily startup.

### Backend configuration

Ensure `arth-backend/.env` exists and contains the **variable names and provider values expected by the current backend code**. The example file contains placeholders, not working credentials. Check `arth-backend/app/routes.py` and `.env.example` to confirm the exact provider configuration before changing it.

Never paste real API keys into README files, source code, chat messages, screenshots, or Git commits. Do not print `.env` values into Terminal output. Each teammate should use their own authorized key in a local `.env`.

### Frontend dependencies

```bash
cd ~/Documents/Projects/arth_ai_v1.0/arth-frontend
npm ci
```

Use `npm ci` when a `package-lock.json` exists and you want dependencies installed from that lockfile. If dependencies are already installed and the frontend builds, this step is not needed every day.

### Install the start/stop script

The `scripts/arth.sh` file should be present and executable. If needed:

```bash
cd ~/Documents/Projects/arth_ai_v1.0
chmod +x scripts/arth.sh
```

## 5. Start, check, and stop

From the project root:

```bash
./scripts/arth.sh start
./scripts/arth.sh status
./scripts/arth.sh stop
```

### What each command does

- `start`: launches the FastAPI backend on `127.0.0.1:8000` and Next.js on `localhost:3000` in the background.
- `status`: checks the recorded processes and probes the backend health endpoint and frontend URL.
- `stop`: stops the processes started by the script and removes their PID files.

### Logs and troubleshooting

Logs are stored locally at:

```text
.arth-run/backend.log
.arth-run/frontend.log
```

If startup fails, inspect the last lines:

```bash
tail -50 .arth-run/backend.log
tail -50 .arth-run/frontend.log
```

If the backend is unavailable, confirm its environment is installed and configured, then run the backend tests:

```bash
cd arth-backend
./.venv/bin/python -m pytest -q
```

If the frontend is unavailable, check the frontend log and run:

```bash
cd arth-frontend
npm run build
```

If port 8000 or 3000 is already in use, check what owns the port before stopping it. Do not kill an unrelated process simply to make ARTH start.

## 6. Manual startup (alternative)

If the helper script is unavailable, use two Terminal tabs/windows.

**Backend:**

```bash
cd ~/Documents/Projects/arth_ai_v1.0/arth-backend
./.venv/bin/python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

**Frontend:**

```bash
cd ~/Documents/Projects/arth_ai_v1.0/arth-frontend
npm run dev -- --hostname 127.0.0.1
```

Leave both commands running while using the app. Press `Control+C` in each terminal to stop the respective server.

## 7. Quick test checklist

- [ ] `http://127.0.0.1:8000/health` responds.
- [ ] `http://localhost:3000/` loads.
- [ ] Report Analysis opens.
- [ ] Ask ARTH opens.
- [ ] A fabricated or properly de-identified test report can be submitted.
- [ ] Ask ARTH returns a response.
- [ ] Medical-safety messages remain visible.
- [ ] No API key or patient information appears in Git, logs, screenshots, or public issues.

Backend tests:

```bash
cd ~/Documents/Projects/arth_ai_v1.0/arth-backend
./.venv/bin/python -m pytest -q
```

## 8. Common issues

**`python` or `pytest` uses the wrong interpreter:** use the explicit project interpreter `./.venv/bin/python` from `arth-backend`. A shell alias can override `python`; the explicit path avoids that issue.

**`uvicorn` not found:** run `./.venv/bin/python -m pip install -r requirements.txt` from `arth-backend`.

**`npm` not found:** install Node.js, reopen Terminal, and check `node --version` and `npm --version`.

**Frontend loads but API requests fail:** confirm the backend is running, check `/health`, and verify the API URL/CORS configuration used by the frontend.

**AI requests fail:** check the local provider endpoint, model name, and API key against the actual backend code and provider configuration. Keep secrets private.

**Report upload or analysis fails intermittently:** the configured AI provider may be temporarily busy, rate-limited, or timing out. Wait a few seconds and try the upload again. Avoid repeatedly clicking Upload in quick succession. If it keeps failing, refresh the page, check that the backend health endpoint responds, and inspect the backend log for the actual error:

```bash
tail -50 ~/Documents/Projects/arth_ai_v1.0/.arth-run/backend.log
```

A repeated failure may require checking the configured provider's service status, usage limits, API key, model, and endpoint. Do not share API keys or unredacted logs. The retry advice is a troubleshooting step; it does not guarantee that a provider-side outage or quota issue will resolve immediately.

**Port already in use:** use `lsof -nP -iTCP:8000 -sTCP:LISTEN` or `lsof -nP -iTCP:3000 -sTCP:LISTEN` to identify the process before taking action.

## 9. Safety and privacy

- ARTH is a prototype for learning and explanation, not a medical device.
- AI may misread a report, omit context, or produce incorrect information.
- Reference ranges vary by laboratory and patient context.
- Do not use ARTH to diagnose conditions, change medicines, or decide treatment.
- Urgent or concerning symptoms require appropriate professional or emergency care.
- Never commit `.env`, `.env.local`, API keys, patient reports, private keys, or other sensitive information.
- Use fictional or de-identified test data whenever possible.

## 10. Versioning and roadmap

### v1.0.0 — Initial team baseline

The `v1.0` tag identifies the first shared project baseline. It does not mean the application is clinically validated or production-ready.

### v2.0 — Future ideas

- More robust report extraction and validation.
- Better handling of missing, ambiguous, or unreadable values.
- Expanded file-format support and clearer upload errors.
- Improved language and accessibility options.
- More automated tests and clearer diagnostics.
- Stronger privacy controls and deployment documentation.
- Transparent AI model/provider configuration and evaluation.

Update this README whenever setup commands, endpoints, dependencies, or features change.

## 11. Team contribution workflow

1. Create a branch for your work.
2. Make a focused change.
3. Run the relevant frontend build or backend tests.
4. Review `git diff`.
5. Never commit secrets or real patient data.
6. Open a pull request for review.

```bash
git switch -c feature/short-description
git status
git diff
git add <files-you-intend-to-commit>
git commit -m "Describe the change"
git push -u origin feature/short-description
```

---

**ARTH v1.0.0 — Built as a student learning project.**  
Treat every AI-generated explanation as something to verify, not as a medical conclusion.
