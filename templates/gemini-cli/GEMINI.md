# TSIC AINode — Gemini CLI Context

## Overview

This workspace may connect to a **TSIC AINode miniPC** at `192.168.1.100`.
Authentication uses the **AINODE USB Security Dongle** — a hardware key that stores
the SSH private key in AES-encrypted Flash. The key is only readable while the Dongle
is physically attached.

---

## Step 1: Dongle Detection

Before any AINode operation, detect the Dongle:

| OS | Command | Expected Output |
|----|---------|-----------------|
| Windows | `(Get-WmiObject Win32_LogicalDisk \| Where-Object {$_.VolumeName -eq "AINODE"}).DeviceID` | `E:` (or similar) |
| macOS | `ls /Volumes/AINODE 2>/dev/null && echo found` | `found` |
| Linux | `blkid -L AINODE 2>/dev/null` | `/dev/sdX` |

Set `DONGLE_PATH` to the mount point: `E:\` / `/Volumes/AINODE` / `/media/user/AINODE`.

---

## Step 2: Copy Key to Temp (Required)

OpenSSH refuses private keys on FAT drives (too-open permissions). **Always copy to temp first:**

```bash
# macOS / Linux
AINODE_TMP_KEY=$(mktemp /tmp/ainode_key_XXXXX)
cp "$DONGLE_PATH/ID_ED255" "$AINODE_TMP_KEY"
chmod 600 "$AINODE_TMP_KEY"
SSH_CMD="ssh -F $DONGLE_PATH/SSHCFG -i $AINODE_TMP_KEY AINode"
SCP_CMD="scp -F $DONGLE_PATH/SSHCFG -i $AINODE_TMP_KEY"
```

```powershell
# Windows
$tmpKey = "$env:TEMP\ainode_key_$([System.IO.Path]::GetRandomFileName())"
Copy-Item "$DONGLE_PATH\ID_ED255" $tmpKey
icacls $tmpKey /inheritance:r /grant "${env:USERNAME}:(R)" | Out-Null
$SSH_CMD = "ssh -F `"$DONGLE_PATH\SSHCFG`" -i `"$tmpKey`" AINode"
```

Dongle absent fallback: `SSH_CMD = "ssh AINode"` (requires `Host AINode` in `~/.ssh/config`)

---

## Step 3: First-Time Network Setup

AINode is at fixed IP `192.168.1.100` via RJ45 direct connection.
New computers need the LAN adapter set to the same subnet:

```bash
# macOS
networksetup -setmanual "USB 10/100/1000 LAN" 192.168.1.101 255.255.255.0
# Linux
sudo ip addr add 192.168.1.101/24 dev eth0 && sudo ip link set eth0 up
```

```powershell
# Windows
New-NetIPAddress -InterfaceAlias "乙太網路" -IPAddress 192.168.1.101 -PrefixLength 24
```

---

## Step 4: Deployment Workflow

1. Detect Dongle → set `DONGLE_PATH` → copy key to temp
2. Test connectivity: `$SSH_CMD -o ConnectTimeout=5 "echo ok && whoami"`
3. Archive: `tar -czf /tmp/svc.tar.gz --exclude='.git' --exclude='node_modules' .`
4. Upload: `$SCP_CMD /tmp/svc.tar.gz AINode:~/services/<name>/`
5. Deploy: `$SSH_CMD "cd ~/services/<name> && tar -xzf svc.tar.gz && docker compose up -d --build"`
6. Verify: `$SSH_CMD "docker ps | grep <name>"`
7. Cleanup: `rm -f "$AINODE_TMP_KEY"` / `Remove-Item $tmpKey`

---

## Useful Commands

```bash
# Service logs
$SSH_CMD "docker logs -f <service>"

# Resource usage
$SSH_CMD "docker stats --no-stream"

# Disk space
$SSH_CMD "df -h /"

# All running services
$SSH_CMD "docker compose ls"
```

---

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| `UNPROTECTED PRIVATE KEY FILE` | Key used directly from FAT Dongle | Copy to temp (Step 2) |
| `No route to host` | Laptop not on 192.168.1.x subnet | Set static IP (Step 3) |
| `Permission denied (publickey)` | Dongle not paired with this AINode | Insert Dongle into AINode USB first |

---

## Upcoming Features

> Under development — will be enabled in a future AINode update.

### MCP Integration
AINode will provide an MCP (Model Context Protocol) server over SSH:
```
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
```
