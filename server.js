import { WebSocketServer } from "ws";
import { config } from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

// 載入環境變數
config();

// 初始化 Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// 系統提示
const SYSTEM_PROMPT =
  "請使用繁體中文回答，不要使用簡體字。請保持友善、活潑的對話風格。";

try {
  // 建立 WebSocket 伺服器
  const wss = new WebSocketServer({ port: 8080 });

  console.log("WebSocket 伺服器已啟動在 ws://localhost:8080");
  console.log("使用的 API 金鑰：", process.env.GEMINI_API_KEY);

  // 處理伺服器錯誤
  wss.on("error", (error) => {
    console.error("WebSocket 伺服器錯誤：", error);
  });

  // 當有新的連線時
  wss.on("connection", (ws) => {
    console.log("新的客戶端連線");

    // 發送歡迎訊息
    ws.send(
      JSON.stringify({
        role: "assistant",
        content: "你好！我是 AI 助手，很高興為您服務。",
        type: "complete",
      })
    );

    // 處理 WebSocket 錯誤
    ws.on("error", (error) => {
      console.error("WebSocket 連線錯誤：", error);
    });

    // 當收到訊息時
    ws.on("message", async (message) => {
      const messageText = message.toString();
      console.log("收到訊息：", messageText);

      try {
        console.log("正在生成回應...");

        // 使用流式生成
        const result = await model.generateContentStream([
          { text: SYSTEM_PROMPT }, // 系統指令：告訴 AI 要用什麼方式回答
          { text: messageText }, // 用戶的實際問題
        ]);

        let fullResponse = "";

        // 處理每個流式片段
        for await (const chunk of result.stream) {
          const chunkText = chunk.text();
          fullResponse += chunkText;

          // 發送部分回應
          ws.send(
            JSON.stringify({
              role: "assistant",
              content: chunkText,
              type: "chunk",
            })
          );
        }

        // 發送完成訊號
        ws.send(
          JSON.stringify({
            role: "assistant",
            content: "",
            type: "complete",
          })
        );

        console.log("生成的完整回應：", fullResponse);
      } catch (error) {
        console.error("Gemini API 錯誤詳情：", {
          message: error.message,
          stack: error.stack,
          details: error.details,
          status: error.status,
          statusText: error.statusText,
        });

        ws.send(
          JSON.stringify({
            role: "assistant",
            content: `抱歉，處理您的訊息時發生錯誤。錯誤類型：${error.message}`,
            type: "error",
          })
        );
      }
    });

    // 當連線關閉時
    ws.on("close", () => {
      console.log("客戶端斷開連線");
    });
  });
} catch (error) {
  console.error("啟動 WebSocket 伺服器時發生錯誤：", error);
}
