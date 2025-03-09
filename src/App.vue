<script setup>
import WebSocketChat from "./components/WebSocketChat.vue";
</script>

<template>
  <div class="app">
    <h1>WebSocket 聊天室</h1>
    <WebSocketChat />
  </div>
</template>

<style>
.app {
  font-family: Arial, sans-serif;
  padding: 20px;
}

h1 {
  text-align: center;
  color: #333;
  margin-bottom: 30px;
}
</style>
