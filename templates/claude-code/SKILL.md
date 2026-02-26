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
Get-WmiObject Win32_LogicalDisk | Where-Object { $_.VolumeName -eq "AINODE" } | Select-Object DeviceID
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
DONGLE_PATH = <掛載路徑>          # e.g. E:\ (Windows) / /Volumes/AINODE (macOS)
SSH_KEY     = {DONGLE_PATH}/ID_ED255
SSH_CONFIG  = {DONGLE_PATH}/SSHCFG
SSH_CMD     = ssh -F {SSH_CONFIG} -i {SSH_KEY} AINode
SCP_CMD     = scp -F {SSH_CONFIG} -i {SSH_KEY}
```

**找不到 Dongle → Fallback：**
```
SSH_CMD = ssh AINode   # 使用 ~/.ssh/config 中的 AINode alias
```

---

## Step 1：確認連線

```bash
{SSH_CMD} -o BatchMode=yes "echo ok && whoami && uptime"
```

若失敗：
- 有 Dongle → 確認 Dongle 已掛載，`ID_ED255` 檔案存在
- 無 Dongle → 確認 `~/.ssh/config` 有 `Host AINode` 設定

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
| 連線方式 | RJ45 直連（LAN2）|
| SSH Port | 22 |
| 預設使用者 | 見 Dongle SSHCFG |
| Docker | docker compose v2 |
| Tunnel | cloudflared |
