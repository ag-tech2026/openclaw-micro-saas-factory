#!/bin/bash
# Auto-start script for Mission Control and ngrok
# Place in ~/.local/bin/mission-control-boot.sh and add to crontab @reboot

set -e

export PATH="/usr/local/bin:$PATH"

# Start Mission Control
cd /root/.openclaw/openclaw-mission-control || exit 1
PORT=9999 HOST=127.0.0.1 nohup npm start >> /var/log/mission-control.log 2>&1 &
echo $! > /var/run/mission-control.pid

# Wait for port to be ready
sleep 5

# Start ngrok
/usr/local/bin/ngrok http 9999 --log=stdout >> /var/log/ngrok.log 2>&1 &
echo $! > /var/run/ngrok-missioncontrol.pid

echo "Mission Control and ngrok started"