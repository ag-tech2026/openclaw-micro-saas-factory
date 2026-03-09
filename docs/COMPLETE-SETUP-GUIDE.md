# OpenClaw Autonomous Micro-SaaS Factory — Complete Setup Guide

This guide covers everything from a fresh machine to a fully running autonomous factory with Mission Control dashboard, ngrok public access, scheduled health checks, and background agents.

## Table of Contents

1. [Install OpenClaw](#install-openclaw)
2. [Configure OpenClaw](#configure-openclaw)
3. [Launch Gateway](#launch-gateway)
4. [Install Mission Control](#install-mission-control)
5. [Expose via Ngrok](#expose-via-ngrok)
6. [Auto-Start on Boot](#auto-start-on-boot)
7. [Run Initial Health Check](#run-initial-health-check)
8. [Start Autonomous Agent](#start-autonomous-agent)
9. [Verify & Monitor](#verify--monitor)
10. [Updates & Maintenance](#updates--maintenance)

---

## 1. Install OpenClaw

### Linux (amd64)

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
```

The installer puts `openclaw` in `/usr/local/bin` and configures `~/.openclaw`.

Verify:
```bash
openclaw --version
# Example output: openclaw 2026.3.8
```

---

## 2. Configure OpenClaw

First-time setup wizard:
```bash
openclaw config setup
```

Follow prompts to set:
- Gateway port (default 18789)
- Workspace location (default `~/workspace`)
- Model preferences (OpenRouter, local, etc.)
- Optional: Telegram/Discord channels

You can always reconfigure later:
```bash
openclaw config edit
```

---

## 3. Launch Gateway

Start the background gateway (required for Mission Control and agents):
```bash
openclaw gateway start
```

Check status:
```bash
openclaw gateway status
# Should show: bind=lan, port=18789, state=running
```

To auto-start gateway on boot:
```bash
# Linux with systemd
openclaw gateway install-systemd
# or macOS
openclaw gateway install-launchd
```

---

## 4. Install Mission Control

Clone into your OpenClaw config directory:
```bash
cd ~/.openclaw
git clone https://github.com/robsannaa/openclaw-mission-control.git
cd openclaw-mission-control
```

Install dependencies:
```bash
npm ci --include=optional --no-audit --no-fund
```

Build the dashboard:
```bash
npm run build
# Wait for "✓ Compiled successfully"
```

Test run:
```bash
PORT=9999 npm start
```

Open `http://localhost:9999` — you should see the dashboard.

Stop with `Ctrl+C`.

---

## 5. Expose via Ngrok

### Install ngrok

```bash
cd /tmp
wget -q https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.tgz
tar -xzf ngrok-v3-stable-linux-amd64.tgz
sudo mv ngrok /usr/local/bin/
sudo chmod +x /usr/local/bin/ngrok
ngrok version
```

### Add authtoken

Get your token from https://dashboard.ngrok.com/get-started/your-authtoken

```bash
ngrok config add-authtoken <YOUR_AUTHTOKEN>
```

### Start tunnel

```bash
ngrok http 9999
```

You’ll see:
```
Session Status                online
Account                       Your Name (Plan: Free)
Version                       3.37.1
Region                        United States (us)
Latency                       -
Web Interface                 http://127.0.0.1:4040
...
Tunnels                       https://abc123.ngrok-free.dev -> http://localhost:9999
```

Copy the `https://*.ngrok-free.dev` URL.

---

## 6. Auto-Start on Boot

### Option A: systemd services (Linux)

Create Mission Control service:

```bash
sudo tee /etc/systemd/system/mission-control.service > /dev/null <<'EOF'
[Unit]
Description=OpenClaw Mission Control Dashboard
After=network.target openclaw.service
Wants=openclaw.service

[Service]
Type=simple
WorkingDirectory=/root/.openclaw/openclaw-mission-control
Environment=PORT=9999
Environment=HOST=127.0.0.1
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=mission-control
EOF
```

Create ngrok service:

```bash
sudo tee /etc/systemd/system/ngrok-missioncontrol.service > /dev/null <<'EOF'
[Unit]
Description=Ngrok tunnel for Mission Control
After=network.target mission-control.service
Wants=mission-control.service

[Service]
Type=simple
WorkingDirectory=/root
ExecStart=/usr/local/bin/ngrok http 9999 --log=stdout
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=ngrok-missioncontrol
EOF
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now mission-control.service ngrok-missioncontrol.service
```

Check status:
```bash
sudo systemctl status mission-control.service ngrok-missioncontrol.service
```

Logs:
```bash
sudo journalctl -u mission-control -f
sudo journalctl -u ngrok-missioncontrol -f
```

### Option B: crontab @reboot (no systemd)

If your system lacks systemd (e.g., container), use this script:

Download: `/data/workspace/setup-mission-control-boot.sh` (from this repo) or create:

```bash
#!/bin/bash
export PATH="/usr/local/bin:$PATH"
cd /root/.openclaw/openclaw-mission-control || exit 1
PORT=9999 HOST=127.0.0.1 nohup npm start >> /var/log/mission-control.log 2>&1 &
sleep 5
/usr/local/bin/ngrok http 9999 --log=stdout >> /var/log/ngrok.log 2>&1 &
```

Make executable:
```bash
chmod +x /data/workspace/setup-mission-control-boot.sh
```

Add to root crontab:
```bash
crontab -e
# Add:
@reboot /data/workspace/setup-mission-control-boot.sh
```

---

## 7. Run Initial Health Check

OpenClaw includes a security audit. Run it now:

```bash
openclaw security audit
```

For a deeper audit:
```bash
openclaw security audit --deep
```

To auto-fix common issues:
```bash
openclaw security audit --fix
```

Save the output for your records.

### Schedule periodic health checks

```bash
openclaw cron add \
  --name "healthcheck:security-audit" \
  --schedule "0 9 * * *" \
  --command "openclaw security audit --json" \
  --output "/root/.openclaw/health-audit-$(date +\%Y-\%m-\%d).json"
```

Also schedule version checks:
```bash
openclaw cron add \
  --name "healthcheck:update-status" \
  --schedule "0 6 * * *" \
  --command "openclaw update status"
```

---

## 8. Start Autonomous Agent

You can now start your autonomous agent that will generate and execute tasks.

If you have an agent session already (e.g., via Telegram), just send:

```
AUTONOMOUS: Run hourly generation.
```

Or manually spawn a subagent that runs the autonomous loop:

```bash
openclaw task spawn --label autonomous -- "AUTONOMOUS: Begin hourly generation and task dispatch."
```

The agent will:
- Brain-dump goals from AUTONOMOUS.md
- Generate 4–5 tasks per batch
- Spawn subagents for each task
- Update memory and active-tasks.json
- Send summaries to configured channels (Telegram if set up)

---

## 9. Verify & Monitor

### Mission Control

Open your ngrok URL in a browser. You should see:

- Dashboard: system health, agent status, cron jobs
- Agents: hierarchy view
- Tasks: Kanban board synced with `memory/active-tasks.json`
- Usage: token costs per model
- Memory: long-term and daily notes
- Settings: models, channels, permissions

If connection fails:
- Ensure `openclaw gateway status` shows running
- Check that `OPENCLAW_HOME` and `OPENCLAW_BIN` are reachable
- Look at browser console and Mission Control logs

### Ngrok

View tunnel status:
```bash
curl -s http://localhost:4040/api/tunnels | python3 -m json.tool
```

Restart ngrok if needed:
```bash
sudo systemctl restart ngrok-missioncontrol
# or kill and rerun
pkill -f "ngrok http"
ngrok http 9999
```

### OpenClaw logs

```bash
openclaw logs -f
# or if using systemd gateway:
sudo journalctl -u openclaw -f
```

---

## 10. Updates & Maintenance

### Update OpenClaw

```bash
openclaw update check
openclaw update apply
```

Or use the GUI in Mission Control (Settings → Updates).

### Update Mission Control

```bash
cd ~/.openclaw/openclaw-mission-control
git pull
npm ci --include=optional --no-audit --no-fund
npm run build
# If using systemd:
sudo systemctl restart mission-control
```

### Update ngrok

```bash
ngrok update
sudo systemctl restart ngrok-missioncontrol
```

### Backup

Important data locations:
- `~/.openclaw/config.json` – gateway config
- `~/.openclaw/workspace/` – your agent files and memory
- `~/.openclaw/agents/` – agent definitions
- Neon database – backup via Neon console

Optional backup script:
```bash
openclaw backup create --only-config
openclaw backup create --no-include-workspace
```

Store backups offsite.

---

## Troubleshooting

| Problem | Likely Cause | Fix |
|---------|--------------|-----|
| Mission Control 500 error | Build corrupted | Rebuild: `npm run build` |
| Cannot connect to OpenClaw | Gateway not running | `openclaw gateway start` |
| Ngrok “no auth token” | Token missing | `ngrok config add-authtoken <token>` |
| Port 9999 already in use | Old process | `pkill -f "next start"` then restart |
| Config version mismatch | Config newer than binary | `openclaw update apply` or remove `config.json` to regenerate |
| Permission denied on ~/.openclaw | Wrong user | Run as the user who owns `~/.openclaw` |
| Health check cron not running | systemd/crontab not set | Verify `openclaw cron list` shows jobs |

---

## Next Steps

Once everything is up:

1. Open Mission Control → Settings → Models and add your OpenRouter API key
2. Configure your preferred Telegram/Discord channels in Settings → Channels
3. Review `AUTONOMOUS.md` and adjust goals/backlog
4. Check `docs/MISSION-CONTROL-SETUP.md` for advanced options (HTTPS, custom domains, Tailscale)
5. Set up Sentry/Plausible if desired (see BOOTSTRAP.md in workspace)

You now have a self-contained, remotely accessible AI agent factory. Let it run and it will build MVPs autonomously.

---

## Quick Reference

| Command | Purpose |
|---------|---------|
| `openclaw gateway status` | Check gateway health |
| `openclaw security audit` | Run security check |
| `openclaw cron list` | List scheduled jobs |
| `openclaw logs -f` | Follow logs |
| `sudo systemctl status mission-control` | Check Mission Control service |
| `curl -s http://localhost:4040/api/tunnels` | Get current ngrok URL |
| `cd ~/.openclaw/openclaw-mission-control && npm run build` | Rebuild dashboard |

---

**You’re ready to build your autonomous micro-SaaS empire. 🚀**