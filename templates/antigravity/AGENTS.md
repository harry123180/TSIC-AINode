# TSIC AINode — Antigravity Agent Instructions

## AINode Connection Context

When working with this project, you may need to connect to a **TSIC AINode miniPC**
(`192.168.1.100`) — a local edge server running Docker and Cloudflare Tunnel.

Authentication is hardware-based: the **AINODE USB Security Dongle** contains the
SSH private key in AES-128-CBC encrypted Flash. The key decrypts to RAM at boot;
removing the Dongle immediately revokes access.

## Detecting the Dongle

```bash
# Windows (PowerShell)
(Get-WmiObject Win32_LogicalDisk | Where-Object { $_.VolumeName -eq "AINODE" }).DeviceID

# macOS
DONGLE=$(ls /Volumes | grep -x AINODE && echo /Volumes/AINODE || echo "")

# Linux
DONGLE=$(blkid -L AINODE 2>/dev/null | xargs -I{} findmnt -n -o TARGET {})
```

## Connecting

```bash
# With Dongle
ssh -F "$DONGLE/SSHCFG" -i "$DONGLE/ID_ED255" AINode

# Fallback (no Dongle)
ssh AINode
```

## Service Deployment

```bash
# 1. Build archive
tar -czf /tmp/service.tar.gz \
  --exclude='.git' --exclude='node_modules' \
  --exclude='__pycache__' --exclude='.env' .

# 2. Transfer
scp -F "$DONGLE/SSHCFG" -i "$DONGLE/ID_ED255" \
  /tmp/service.tar.gz AINode:~/services/$(basename $PWD)/

# 3. Deploy
ssh -F "$DONGLE/SSHCFG" -i "$DONGLE/ID_ED255" AINode \
  "cd ~/services/$(basename $PWD) && \
   tar -xzf *.tar.gz && \
   docker compose up -d --build && \
   docker ps"
```

## Key Rules

- Always detect Dongle **before** attempting SSH operations
- Never copy or persist `ID_ED255` outside the Dongle
- Ask the user before uploading `.env` files
- If connection fails: check Dongle is mounted, not just plugged in

## Future: MCP & AI Endpoints (Coming Soon)

AINode is being extended with AI-native access interfaces:

```
MCP Server
  Transport : SSH (no extra network exposure)
  Auth      : AINODE Dongle key
  Tools     : list_services, get_logs, deploy, get_metrics

REST API (http://192.168.1.100:8080/api/v1/)
  GET  /status
  GET  /services
  POST /deploy  { service, image, env }
  GET  /logs/{service}?tail=100
  WS   /logs/{service}/stream
```

These will be documented in future versions of this skill file.
