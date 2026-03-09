# Mission Control + Ngrok Auto-Start Setup

This guide covers installing Mission Control, configuring it as a systemd service, and setting up ngrok to expose it to the internet automatically on boot.

## Prerequisites

- OpenClaw installed and running (`openclaw --version`)
- Linux with systemd (or macOS with launchd)
- Git, Node.js, npm

---

## 1. Install Mission Control

```bash
cd ~/.openclaw
git clone https://github.com/robsannaa/openclaw-mission-control.git
cd openclaw-mission-control
```

---

## 2. Install Dependencies and Build

```bash
npm ci --include=optional --no-audit --no-fund
npm run build
```

Wait for `✓ Compiled successfully`. If `lightningcss` fails, run:
```bash
npm install --include=optional --no-audit --no-fund --no-save lightningcss
```

---

## 3. Test Run

```bash
PORT=9999 npm start
```

Open `http://localhost:9999` in your browser. Should see Mission Control dashboard.

Press `Ctrl+C` to stop.

---

## 4. Set Environment Variables (optional)

If your OpenClaw install is non-standard, set these before starting:

```bash
export OPENCLAW_HOME="$HOME/.openclaw"
export OPENCLAW_BIN="$(which openclaw)"
export OPENCLAW_WORKSPACE="$HOME/workspace"
```

---

## 5. Create Systemd Service for Mission Control

Create `/etc/systemd/system/mission-control.service` (requires sudo):

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

# Security
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/root/.openclaw/openclaw-mission-control/.cache /root/.openclaw/openclaw-mission-control/.next
ProtectKernelTunables=true
ProtectKernelModules=true
ProtectControlGroups=true
RestrictAddressFamilies=AF_INET AF_INET6 AF_UNIX
RestrictNamespaces=true
RestrictRealtime=true
RestrictSUIDSGID=true
PrivateDevices=true
EOF
```

Reload systemd and enable:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now mission-control.service
```

Check status:
```bash
sudo systemctl status mission-control.service
```

Logs:
```bash
sudo journalctl -u mission-control -f
```

---

## 6. Install Ngrok

Download and install:
```bash
cd /tmp
wget -q https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.tgz
tar -xzf ngrok-v3-stable-linux-amd64.tgz
sudo mv ngrok /usr/local/bin/
sudo chmod +x /usr/local/bin/ngrok
ngrok version
```

---

## 7. Configure Ngrok Authtoken (one-time)

Get your authtoken from https://dashboard.ngrok.com/get-started/your-authtoken

```bash
ngrok config add-authtoken <YOUR_AUTHTOKEN>
```

This saves to `~/.ngrok2/ngrok.yml`.

---

## 8. Create Ngrok Systemd Service

Create `/etc/systemd/system/ngrok-missioncontrol.service`:

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

# Security
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/root/.ngrok2
RestrictAddressFamilies=AF_INET AF_INET6 AF_UNIX
RestrictNamespaces=true
RestrictRealtime=true
RestrictSUIDSGID=true
EOF
```

Reload and enable:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now ngrok-missioncontrol.service
```

Check status:
```bash
sudo systemctl status ngrok-missioncontrol.service
```

---

## 9. Get Your Public URL

 Ngrok logs show the URL on startup. Or query the API:

```bash
curl -s http://localhost:4040/api/tunnels | python3 -m json.tool | grep public_url
```

Or view the dashboard at `http://localhost:4040`.

Save the `https://*.ngrok-free.dev` URL; that’s your public Mission Control link.

---

## 10. Verify Everything Works

1. Ensure both services are running:
   ```bash
   sudo systemctl is-active mission-control ngrok-missioncontrol
   ```
   Both should return `active`.

2. Test Mission Control locally:
   ```bash
   curl -s -o /dev/null -w "%{http_code}" http://localhost:9999
   # Should output: 200
   ```

3. Test the ngrok tunnel:
   Use the public URL from step 9 in your browser. You should see the Mission Control login/agents page.

---

## 11. Troubleshooting

### Mission Control fails to connect to OpenClaw
- Ensure OpenClaw gateway is running: `sudo systemctl status openclaw` or `openclaw gateway status`
- Check that `OPENCLAW_HOME` and `OPENCLAW_BIN` are correct in the service environment if needed
- Look at logs: `sudo journalctl -u mission-control -n 50`

### Ngrok dies with “no auth token”
- Run `ngrok config add-authtoken <token>` as root
- Verify `~/.ngrok2/ngrok.yml` exists and contains the token

### Port 9999 already in use
- Stop the old manual process: `pkill -f "next start"`
- Then `sudo systemctl restart mission-control`

### Systemd not available (container/sandbox)
Run Mission Control in background manually and add to crontab:
```bash
@reboot cd /root/.openclaw/openclaw-mission-control && PORT=9999 npm start >> /var/log/mission-control.log 2>&1
```
For ngrok:
```bash
@rebook /usr/local/bin/ngrok http 9999 >> /var/log/ngrok.log 2>&1
```

---

## 12. Updates

When you pull updates to Mission Control:

```bash
cd ~/.openclaw/openclaw-mission-control
git pull
npm ci --include=optional --no-audit --no-fund
npm run build
sudo systemctl restart mission-control
```

Ngrok auto-updates separately via `ngrok update`.

---

## 13. Security Notes

- Ngrok URL is public; treat it like a password-protected admin interface. Mission Control has no built-in auth — it relies on OpenClaw’s gateway auth (if enabled) and network-level controls.
- Consider restricting access via:
  - Ngrok password: `ngrok http 9999 --basic-auth "user:pass"`
  - Firewall: only allow your IP
  - SSH tunnel instead of ngrok for private use
- Mission Control runs as root in this setup. If you prefer a non-root user, adjust service `User=` and file permissions.

---

## Done

Your Mission Control dashboard is now auto-starting and accessible from anywhere via ngrok.