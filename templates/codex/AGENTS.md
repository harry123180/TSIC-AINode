# TSIC AINode — OpenAI Codex Agent Instructions

## AINode Connection

This project may interact with a **TSIC AINode miniPC** (192.168.1.100) via SSH.
The AINode uses an **AINODE USB Security Dongle** for authentication — the private key
lives on the Dongle's encrypted Flash and never exists as a plain file on disk.

### Detect Dongle

```bash
# Windows
(Get-WmiObject Win32_LogicalDisk | Where-Object {$_.VolumeName -eq "AINODE"}).DeviceID

# macOS
ls /Volumes/AINODE 2>/dev/null && echo "found" || echo "not_found"

# Linux
blkid -L AINODE 2>/dev/null
```

### SSH Commands

```bash
# With Dongle (preferred)
DONGLE=/Volumes/AINODE          # macOS example; adjust per OS
ssh -F "$DONGLE/SSHCFG" -i "$DONGLE/ID_ED255" AINode "<command>"

# Without Dongle (fallback — requires ~/.ssh/config Host AINode entry)
ssh AINode "<command>"
```

### Deploy a Service

```bash
# Package project
tar -czf /tmp/app.tar.gz --exclude='.git' --exclude='node_modules' --exclude='.env' .

# Upload
scp -F "$DONGLE/SSHCFG" -i "$DONGLE/ID_ED255" /tmp/app.tar.gz AINode:~/services/app/

# Start with Docker Compose
ssh -F "$DONGLE/SSHCFG" -i "$DONGLE/ID_ED255" AINode \
  "cd ~/services/app && tar -xzf app.tar.gz && docker compose up -d --build"
```

### Common Operations

```bash
# Check running services
ssh [...] AINode "docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'"

# Tail logs
ssh [...] AINode "docker logs -f <service> --tail 50"

# System health
ssh [...] AINode "df -h / && free -h"
```

## Security Notes

- The private key (`ID_ED255`) is **only accessible when the Dongle is physically connected**.
- Never attempt to copy or cache the private key file.
- If the Dongle is not detected, fall back to `ssh AINode` (requires local SSH config).

## Upcoming: MCP & AI Endpoints

> These features are under development and will be available in a future AINode firmware update.

```
# MCP Server (coming soon)
# AINode will expose an MCP server over SSH for AI agent integration
# Capabilities: service status, deployment, log query, resource monitoring

# REST API (coming soon)
GET  http://192.168.1.100:8080/api/v1/status
GET  http://192.168.1.100:8080/api/v1/services
POST http://192.168.1.100:8080/api/v1/deploy
GET  http://192.168.1.100:8080/api/v1/logs/{service}
```
