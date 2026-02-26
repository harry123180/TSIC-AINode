# TSIC AINode Skill Installer

為你的 AI 工具安裝 **AINode Dongle SSH 連線技能**，讓 Claude Code、Cursor、Codex、Gemini CLI、Antigravity 等 AI Agent 能自動偵測 AINODE USB Dongle 並安全連線到 AINode miniPC。

## 安裝

```bash
npx tsic-ainode@latest
```

互動式安裝器會：
1. 偵測你已安裝的 AI 工具
2. 詢問語言（繁中 / English）
3. 詢問安裝範圍（全域 / 目前專案）
4. 安裝對應的 Skill 設定檔

## 支援的 AI 工具

| 工具 | 安裝位置（全域） | 安裝位置（專案） |
|------|----------------|----------------|
| Claude Code | `~/.claude/skills/tsic-ainode/SKILL.md` | 同左 |
| Cursor | `~/.cursor/rules/tsic-ainode.mdc` | `.cursor/rules/tsic-ainode.mdc` |
| OpenAI Codex CLI | `~/.codex/AGENTS.md` | `./AGENTS.md` |
| Gemini CLI | `~/.gemini/GEMINI.md` | `./GEMINI.md` |
| Antigravity | `~/.antigravity/AGENTS.md` | `./.antigravity/AGENTS.md` |

## 使用方式

安裝後，插入 **AINODE USB Dongle**，對你的 AI 工具說：

- 「部署到 AINode」
- 「連線 AINode」
- 「把服務跑在 AINode 上」
- "deploy to AINode"
- "connect to AINode"

AI Agent 會自動：
1. 偵測 AINODE 磁碟（Windows: `E:\`、macOS: `/Volumes/AINODE`、Linux: `blkid -L AINODE`）
2. 使用 Dongle 上的私鑰（`ID_ED255`）透過 `SSHCFG` 設定連線
3. 執行部署、查詢日誌、管理 Docker 服務等操作

## AINode Dongle 安全設計

```
Dongle Flash (加密)
  [AES-128-CBC 加密私鑰]  ← 開機時解密到 RAM
  [公鑰]                  ← 首次配對時寫入 AINode authorized_keys

Dongle 磁碟 (AINODE, FAT12 64KB)
  SSHCFG      ← SSH 設定（Host / HostName / Port）
  ID_ED255    ← 私鑰（RAM，拔除即消失）
  ID_ED255.PUB ← 公鑰
  README.TXT
```

私鑰只存在 Dongle 的 RAM 中，拔除即無法連線 — 這是設計行為。

## 即將推出

- **MCP Server**：AINode 將提供 MCP 接入口，AI Agent 可直接查詢服務狀態、觸發部署
- **AI 優化 REST API**：`http://192.168.1.100:8080/api/v1/` 結構化端點
- **Skill 自動更新**：重新執行 `npx tsic-ainode@latest` 即可更新

## 手動安裝（不用 npx）

```bash
git clone https://github.com/TSIC-tech/TSIC-AINode.git
cd TSIC-AINode
node bin/index.js
```

## License

MIT
