<script setup>
import { ref, onMounted, onUnmounted, nextTick } from "vue";
import { marked } from "marked";

// 配置 marked 選項
marked.setOptions({
  breaks: true, // 將換行符轉換為 <br>
  gfm: true, // 啟用 GitHub 風格的 Markdown
});

const messages = ref([]);
const messageInput = ref("");
const messagesContainer = ref(null);
const ws = ref(null);
const isConnecting = ref(false);
const reconnectAttempts = ref(0);
const maxReconnectAttempts = 5;
const reconnectDelay = 3000; // 3 秒

// 將文本轉換為 HTML
const parseMarkdown = (text) => {
  return marked(text);
};

// 添加訊息到列表
const addMessage = async (message) => {
  messages.value.push(message);
  // 等待 DOM 更新後滾動到底部
  await nextTick();
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
};

// 更新最後一條訊息
const updateLastMessage = async (content) => {
  if (messages.value.length > 0) {
    const lastMessage = messages.value[messages.value.length - 1];
    lastMessage.content += content;
    // 等待 DOM 更新後滾動到底部
    await nextTick();
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
  }
};

// 發送訊息
const sendMessage = () => {
  if (!messageInput.value.trim() || ws.value?.readyState !== WebSocket.OPEN) {
    return;
  }

  addMessage({
    role: "user",
    content: messageInput.value,
  });

  ws.value.send(messageInput.value);
  messageInput.value = "";
};

// 初始化 WebSocket 連線
const initWebSocket = () => {
  if (isConnecting.value) {
    console.log("已經在嘗試連線中...");
    return;
  }

  console.log("開始建立 WebSocket 連線到:", import.meta.env.VITE_WS_URL);
  isConnecting.value = true;

  try {
    ws.value = new WebSocket(import.meta.env.VITE_WS_URL);

    ws.value.onopen = () => {
      console.log("WebSocket 連線已成功建立");
      isConnecting.value = false;
      reconnectAttempts.value = 0;
    };

    ws.value.onmessage = (event) => {
      console.log("收到訊息:", event.data);
      try {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case "chunk":
            // 如果是第一個片段，創建新訊息
            if (
              messages.value.length === 0 ||
              messages.value[messages.value.length - 1].role !== "assistant"
            ) {
              addMessage({
                role: "assistant",
                content: data.content,
              });
            } else {
              // 否則更新最後一條訊息
              updateLastMessage(data.content);
            }
            break;

          case "complete":
            // 如果有內容，添加為新訊息
            if (data.content) {
              addMessage({
                role: data.role,
                content: data.content,
              });
            }
            break;

          case "error":
            addMessage({
              role: "system",
              content: data.content,
            });
            break;

          default:
            // 處理舊版格式或其他類型的訊息
            addMessage({
              role: data.role,
              content: data.content,
            });
        }
      } catch (error) {
        console.error("解析訊息時發生錯誤：", error);
        console.log("原始訊息:", event.data);
        addMessage({
          role: "system",
          content: "接收訊息時發生錯誤",
        });
      }
    };

    ws.value.onclose = (event) => {
      console.log("WebSocket 連線已關閉", {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean,
      });
      isConnecting.value = false;

      // 嘗試重新連線
      if (reconnectAttempts.value < maxReconnectAttempts) {
        reconnectAttempts.value++;
        const message = `連線已斷開 (代碼: ${event.code})，${
          reconnectDelay / 1000
        } 秒後嘗試重新連線... (${
          reconnectAttempts.value
        }/${maxReconnectAttempts})`;
        console.log(message);
        addMessage({
          role: "system",
          content: message,
        });
        setTimeout(initWebSocket, reconnectDelay);
      } else {
        const message = `無法建立連線 (代碼: ${event.code})，請重新整理頁面試試。`;
        console.log(message);
        addMessage({
          role: "system",
          content: message,
        });
      }
    };

    ws.value.onerror = (error) => {
      console.error("WebSocket 錯誤：", error);
      addMessage({
        role: "system",
        content: `連線發生錯誤: ${error.message || "未知錯誤"}`,
      });
    };
  } catch (error) {
    console.error("建立 WebSocket 時發生錯誤：", error);
    isConnecting.value = false;
    addMessage({
      role: "system",
      content: `建立連線時發生錯誤: ${error.message}`,
    });
  }
};

// 組件掛載時建立連線
onMounted(() => {
  initWebSocket();
});

// 組件卸載時關閉連線
onUnmounted(() => {
  if (ws.value) {
    ws.value.close();
  }
});
</script>

<template>
  <div class="chat-container">
    <div class="messages" ref="messagesContainer">
      <div
        v-for="(message, index) in messages"
        :key="index"
        :class="['message', message.role]"
      >
        <div
          class="message-content"
          v-if="message.role === 'assistant'"
          v-html="parseMarkdown(message.content)"
        ></div>
        <div class="message-content" v-else>{{ message.content }}</div>
      </div>
    </div>
    <div class="input-container">
      <input
        v-model="messageInput"
        @keyup.enter="sendMessage"
        placeholder="輸入訊息"
        type="text"
      />
      <button
        @click="sendMessage"
        :disabled="!messageInput.trim() || ws?.readyState !== 1"
      >
        發送
      </button>
    </div>
  </div>
</template>

<style scoped>
.chat-container {
  max-width: 800px;
  width: 100%;
  margin: 0 auto;
  padding: 20px;
  height: 100vh;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

.messages {
  flex: 1;
  overflow-y: auto;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  background: #f9f9f9;
  width: 100%;
  box-sizing: border-box;
}

.message {
  margin: 8px 0;
  padding: 12px;
  border-radius: 8px;
  max-width: 80%;
  word-wrap: break-word;
  overflow-wrap: break-word;
  width: fit-content;
}

.message-content {
  white-space: pre-wrap;
  text-align: left;
  overflow-wrap: break-word;
  word-break: break-word;
}

.message-content :deep(p) {
  margin: 0.5em 0;
}

.message-content :deep(strong) {
  font-weight: 600;
  color: #2c3e50;
}

.message-content :deep(ul),
.message-content :deep(ol) {
  margin: 0.5em 0;
  padding-left: 1.5em;
}

.message-content :deep(li) {
  margin: 0.3em 0;
}

.message.user {
  background: #dcf8c6;
  margin-left: auto;
}

.message.assistant {
  background: white;
  margin-right: auto;
}

.message.system {
  background: #f1f1f1;
  color: #666;
  font-size: 0.9em;
  text-align: left;
  margin: 8px auto;
  width: 90%;
}

.input-container {
  display: flex;
  gap: 10px;
  padding: 10px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  width: 100%;
  box-sizing: border-box;
}

input {
  flex: 1;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 16px;
  outline: none;
  min-width: 0;
}

input:focus {
  border-color: #4caf50;
}

button {
  padding: 12px 24px;
  background: #4caf50;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  transition: background 0.2s;
  white-space: nowrap;
}

button:hover:not(:disabled) {
  background: #45a049;
}

button:disabled {
  background: #cccccc;
  cursor: not-allowed;
}
</style>
