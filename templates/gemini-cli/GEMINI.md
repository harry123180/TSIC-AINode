# TSIC AINode — Gemini CLI Context

## Overview

This workspace may connect to a **TSIC AINode miniPC** at `192.168.1.100`.
Authentication uses the **AINODE USB Security Dongle** — a hardware key that stores
the SSH private key in AES-encrypted Flash. The key is only readable while the Dongle
is physically attached.

## Dongle Detection

Before any AINode operation, detect the Dongle:

| OS | Command | Expected Output |
|----|---------|-----------------|
| Windows | `(Get-WmiObject Win32_LogicalDisk \| Where-Object {$_.VolumeName -eq "AINODE"}).DeviceID` | `E:` (or similar) |
| macOS | `ls /Volumes/AINODE 2>/dev/null && echo found` | `found` |
| Linux | `blkid -L AINODE 2>/dev/null` | `/dev/sdX` |

Set `DONGLE_PATH` to the mount point: `E:\` / `/Volumes/AINODE` / `/media/user/AINODE`.

## SSH Connection

```bash
# Dongle present
ssh -F "${DONGLE_PATH}/SSHCFG" -i "${DONGLE_PATH}/ID_ED255" AINode

# Dongle absent (fallback)
ssh AINode   # requires Host AINode in ~/.ssh/config
```

## Deployment Workflow

1. Detect Dongle → set `DONGLE_PATH`
2. Test connectivity: `ssh -F ... AINode "echo ok"`
3. Archive project: `tar -czf /tmp/svc.tar.gz --exclude='.git' --exclude='node_modules' .`
4. Upload: `scp -F ... /tmp/svc.tar.gz AINode:~/services/<name>/`
5. Deploy: `ssh -F ... AINode "cd ~/services/<name> && tar -xzf svc.tar.gz && docker compose up -d --build"`
6. Verify: `ssh -F ... AINode "docker ps | grep <name>"`

## Useful Commands

```bash
# Service logs
ssh [...] AINode "docker logs -f <service>"

# Resource usage
ssh [...] AINode "docker stats --no-stream"

# Disk space
ssh [...] AINode "df -h /"

# All running services
ssh [...] AINode "docker compose ls"
```

## Upcoming Features

> Under development — will be enabled in a future AINode update.

### MCP Integration
AINode will provide an MCP (Model Context Protocol) server accessible over SSH,
allowing Gemini CLI and other AI agents to query AINode state directly:
```
# MCP server (coming soon)
# Transport: SSH tunnel
# Capabilities: service management, log streaming, resource monitoring, deployment
```

### AI-Optimized REST API
```
Base URL: http://192.168.1.100:8080/api/v1/

GET  /status           — system snapshot (CPU, RAM, disk, uptime)
GET  /services         — list all Docker services with health status
POST /deploy           — trigger deployment pipeline
GET  /logs/{service}   — structured, AI-friendly log output
GET  /metrics          — Prometheus-compatible metrics
```
