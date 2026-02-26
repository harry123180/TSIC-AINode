---
name: tsic-ainode
description: 連線到 TSIC AINode miniPC 並管理服務。偵測 AINODE USB Security Dongle，透過 SSH 部署 Docker 服務、查詢日誌、設定 Cloudflare Tunnel。未來支援 MCP 端點與 AI 優化查詢接入口。觸發詞：「連線 AINode」「部署到 AINode」「AINode 上跑」「AINode ssh」「deploy to AINode」。
---

# TSIC AINode Skill

透過 **AINODE USB Security Dongle** 安全連線到 AINode miniPC（192.168.1.100）。
私鑰儲存在 Dongle 的加密 Flash 中，拔除 Dongle 即無法連線。

---

## Step 0：偵測 AINODE Dongle

### Windows（PowerShell）
```powershell
$disk = Get-WmiObject Win32_LogicalDisk | Where-Object { $_.VolumeName -eq "AINODE" }
$disk.DeviceID   # e.g. "E:"
```

### macOS
```bash
ls /Volumes/AINODE 2>/dev/null && echo found || echo not_found
```

### Linux
```bash
blkid -L AINODE 2>/dev/null || findmnt -l | grep AINODE | awk '{print $1}'
```

**找到 Dongle（卷標 AINODE）：**
```
DONGLE_PATH = <掛載路徑>      # e.g. E:\ (Windows) / /Volumes/AINODE (macOS)
SSH_KEY_SRC  = {DONGLE_PATH}/ID_ED255
SSH_CONFIG   = {DONGLE_PATH}/SSHCFG
```

**找不到 Dongle → Fallback：**
```
SSH_CMD = ssh AINode          # 使用 ~/.ssh/config 中的 AINode alias
SCP_CMD = scp                 # 同上
```

---

## Step 0.5：私鑰暫存（重要 — FAT 磁碟權限問題）

OpenSSH 拒絕使用 FAT 磁碟上的私鑰（權限過於開放），**必須先複製到本地 temp 並限制權限**。

### macOS / Linux
```bash
AINODE_TMP_KEY=$(mktemp /tmp/ainode_key_XXXXX)
cp "$SSH_KEY_SRC" "$AINODE_TMP_KEY"
chmod 600 "$AINODE_TMP_KEY"
SSH_KEY="$AINODE_TMP_KEY"
SSH_CMD="ssh -F $SSH_CONFIG -i $SSH_KEY AINode"
SCP_CMD="scp -F $SSH_CONFIG -i $SSH_KEY"
# 連線結束後清除：rm -f "$AINODE_TMP_KEY"
```

### Windows（PowerShell）
```powershell
$tmpKey = "$env:TEMP\ainode_key_$([System.IO.Path]::GetRandomFileName())"
Copy-Item "$SSH_KEY_SRC" $tmpKey

# 限制只有目前使用者可讀
icacls $tmpKey /inheritance:r /grant "${env:USERNAME}:(R)" | Out-Null

$SSH_KEY = $tmpKey
$SSH_CMD = "ssh -F `"$SSH_CONFIG`" -i `"$SSH_KEY`" AINode"
# 連線結束後清除：Remove-Item $tmpKey
```

---

## Step 0.6：首次使用新電腦 — 網路設定

AINode 固定 IP：`192.168.1.100`（RJ45 直連 LAN2 埠）。

新電腦第一次連線需確認筆電網卡設定：

### macOS
```bash
# 查看 RJ45 介面名稱（通常是 en0 或 en1~en5）
networksetup -listallnetworkservices
# 設定靜態 IP（將 "USB 10/100/1000 LAN" 換成實際介面名稱）
networksetup -setmanual "USB 10/100/1000 LAN" 192.168.1.101 255.255.255.0
# 確認連通
ping -c 2 192.168.1.100
```

### Linux
```bash
# 查 RJ45 介面（通常是 eth0 / enp3s0 / enx...）
ip link show
# 暫時設定 IP
sudo ip addr add 192.168.1.101/24 dev eth0
sudo ip link set eth0 up
ping -c 2 192.168.1.100
```

### Windows（PowerShell，以系統管理員執行）
```powershell
# 查 RJ45 介面
Get-NetAdapter | Where-Object { $_.Status -eq "Up" -or $_.MediaType -eq "802.3" }
# 設定靜態 IP（InterfaceAlias 換成實際介面名稱）
New-NetIPAddress -InterfaceAlias "乙太網路" -IPAddress 192.168.1.101 -PrefixLength 24
ping 192.168.1.100
```

> 若 AINode 接在同一路由器/交換器且有 DHCP，則跳過此步驟。

---

## Step 1：確認 SSH 連線

```bash
{SSH_CMD} -o ConnectTimeout=5 -o BatchMode=yes "echo ok && whoami && uptime"
```

若失敗排查：
- `WARNING: UNPROTECTED PRIVATE KEY FILE` → 沒做 Step 0.5，key 仍在 FAT 磁碟
- `Connection refused` / `No route to host` → 網路未設定（見 Step 0.6）
- `Permission denied (publickey)` → Dongle 尚未與此 AINode 配對（插入 AINode USB 孔完成首次配對）

---

## Step 2：部署 Docker 服務

```bash
# 打包並上傳專案
tar -czf /tmp/{service}.tar.gz --exclude='.git' --exclude='node_modules' --exclude='.env' .
{SCP_CMD} /tmp/{service}.tar.gz AINode:~/services/{service}/

# 解壓並啟動
{SSH_CMD} "cd ~/services/{service} && tar -xzf {service}.tar.gz && docker compose up -d --build"

# 確認狀態
{SSH_CMD} "docker ps | grep {service}"
```

---

## Step 3：常用操作

```bash
# 查看容器 log
{SSH_CMD} "docker logs -f {service}"

# 重新部署
{SSH_CMD} "cd ~/services/{service} && docker compose up -d --build"

# 停止服務
{SSH_CMD} "docker compose -f ~/services/{service}/docker-compose.yml down"

# 系統資源
{SSH_CMD} "df -h && free -h && docker stats --no-stream"
```

---

## Step 4：Cloudflare Tunnel（選用）

```bash
# 快速臨時 URL（測試用）
{SSH_CMD} "nohup cloudflared tunnel --url http://localhost:{port} > ~/cf.log 2>&1 &"
{SSH_CMD} "sleep 3 && grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' ~/cf.log | head -1"
```

---

## 連線結束：清除暫存私鑰

```bash
# macOS / Linux
rm -f "$AINODE_TMP_KEY"
```
```powershell
# Windows
Remove-Item $tmpKey -ErrorAction SilentlyContinue
```

---

## 【預留】AINode AI 接入口（即將推出）

> 以下功能正在開發中，未來版本會在此 Skill 更新。

### MCP Server
```
AINode 內建 MCP Server，AI Agent 可直接查詢：
  - 服務狀態（Docker containers）
  - 系統資源（CPU / RAM / Disk）
  - 部署歷史
  - 網路設定

連線方式（待更新）：
  mcp connect ainode --via-ssh --key {SSH_KEY}
```

### AI 優化 API 端點
```
未來將提供 REST / gRPC 端點，針對 AI Agent 查詢優化：
  http://192.168.1.100:8080/api/v1/
  - GET  /status          系統狀態快照
  - GET  /services        所有 Docker 服務列表
  - POST /deploy          觸發部署流程
  - GET  /logs/{service}  結構化 log 輸出
```

---

## AINode 規格參考

| 項目 | 規格 |
|------|------|
| 主機 IP | 192.168.1.100 |
| 連線方式 | RJ45 直連（LAN2）或同網段 |
| SSH Port | 22 |
| 預設使用者 | 見 Dongle SSHCFG |
| Docker | docker compose v2 |
| Tunnel | cloudflared |
