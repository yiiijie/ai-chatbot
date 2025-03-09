# AI 聊天機器人 (AI Chatbot)

使用 Vue 3 + Vite 開發的 AI 聊天機器人，整合了 Google Gemini API 實現與 AI 對話的功能。

## 技術棧

- 前端：Vue 3 + Vite
- 後端：Node.js WebSocket Server
- AI 服務：Google Gemini API

## 功能特點

- 即時對話：使用 WebSocket 實現即時通訊
- 串流回應：支援 AI 回應串流輸出
- Markdown 支援：支援 Markdown 格式的訊息顯示
- 繁體中文：預設使用繁體中文進行對話

## 開發環境設置

### 系統要求

- Node.js 版本：22.x 或以上
- 建議使用 nvm 進行 Node.js 版本管理

```bash
# 使用 nvm 安裝並切換到 Node.js 22
nvm install 22
nvm use 22
```

### 安裝與設置

1. 安裝依賴：

```bash
npm install
```

2. 設置環境變數：

- 複製 `.env.example` 到 `.env`
- 填入您的 Gemini API 金鑰

3. 啟動開發伺服器：

```bash
# 啟動 WebSocket 伺服器
node server.js

# 啟動 Vue 開發伺服器
npm run dev
```
