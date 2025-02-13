<script setup lang="ts">
import { onMounted, ref } from 'vue'
import type { Socket } from 'socket.io-client'
import io from 'socket.io-client'
const message = ref('hello world')
let socket: Socket | null = null
onMounted(() => {
  socket = io('http://localhost:5000')
  socket.on('connect', () => {
    console.log('connected')
  })
  socket.on('socket_message', (data) => {
    console.log(data)
    message.value = data
  })
})
</script>

<template>
  <div>{{ message }}</div>
</template>
