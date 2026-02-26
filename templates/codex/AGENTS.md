# TSIC AINode — OpenAI Codex Agent Instructions

## AINode Connection

This project may interact with a **TSIC AINode miniPC** (192.168.1.100) via SSH.
Authentication uses an **AINODE USB Security Dongle** — private key lives on the Dongle's
encrypted Flash. The key is only accessible while the Dongle is physically connected.

---

### Step 1: Detect Dongle

```bash
# Windows
(Get-WmiObject Win32_LogicalDisk | Where-Object {$_.VolumeName -eq "AINODE"}).DeviceID

# macOS
ls /Volumes/AINODE 2>/dev/null && echo "found" || echo "not_found"

# Linux
blkid -L AINODE 2>/dev/null
```

Set `DONGLE_PATH` to the mount point found above.

---

### Step 2: Copy Key to Temp (Required)

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
# Windows PowerShell
$tmpKey = "$env:TEMP\ainode_key_$([System.IO.Path]::GetRandomFileName())"
Copy-Item "$DONGLE_PATH\ID_ED255" $tmpKey
icacls $tmpKey /inheritance:r /grant "${env:USERNAME}:(R)" | Out-Null
$SSH_CMD = "ssh -F `"$DONGLE_PATH\SSHCFG`" -i `"$tmpKey`" AINode"
```

Without Dongle (fallback — requires `Host AINode` in `~/.ssh/config`):
```bash
SSH_CMD="ssh AINode"
SCP_CMD="scp"
```

---

### Step 3: First-Time Network Setup (New Computer)

AINode is at fixed IP `192.168.1.100` via RJ45 direct connection (LAN2 port).
The laptop must be on the same subnet:

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

Skip this step if connected via a router/switch with DHCP.

---

### Step 4: Deploy a Service

```bash
# Verify connection
$SSH_CMD -o ConnectTimeout=5 -o BatchMode=yes "echo ok && whoami"

# Package project
tar -czf /tmp/app.tar.gz --exclude='.git' --exclude='node_modules' --exclude='.env' .

# Upload
$SCP_CMD /tmp/app.tar.gz AINode:~/services/app/

# Start with Docker Compose
$SSH_CMD "cd ~/services/app && tar -xzf app.tar.gz && docker compose up -d --build"

# Cleanup temp key
rm -f "$AINODE_TMP_KEY"   # or: Remove-Item $tmpKey
```

---

### Common Operations

```bash
# Check running services
$SSH_CMD "docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'"

# Tail logs
$SSH_CMD "docker logs -f <service> --tail 50"

# System health
$SSH_CMD "df -h / && free -h"
```

---

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| `WARNING: UNPROTECTED PRIVATE KEY FILE` | Key used directly from FAT drive | Do Step 2 (copy to temp) |
| `Connection refused` / `No route to host` | Laptop not on 192.168.1.x | Do Step 3 (set IP) |
| `Permission denied (publickey)` | Dongle not paired with this AINode | Insert Dongle into AINode USB port first |

## Security Notes

- The private key is only readable while the Dongle is physically connected.
- The temp key copy should be deleted after the session.
- Never hardcode or cache the private key.

## Upcoming: MCP & AI Endpoints

> Under development — available in a future AINode firmware update.

```
# MCP Server (coming soon)
# AINode will expose an MCP server over SSH for AI agent integration

# REST API (coming soon)
GET  http://192.168.1.100:8080/api/v1/status
GET  http://192.168.1.100:8080/api/v1/services
POST http://192.168.1.100:8080/api/v1/deploy
GET  http://192.168.1.100:8080/api/v1/logs/{service}
```
