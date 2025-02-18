<script setup lang="ts">
import { onMounted } from 'vue'
import type { Socket } from 'socket.io-client'
import io from 'socket.io-client'
import Typed from 'typed.js'

let socket: Socket | null = null
let typeJS: Typed | null = null
onMounted(() => {
  socket = io('http://localhost:5000')
  socket.on('connect', () => {
    console.log('connected')
  })
  socket.on('socket_message', (data) => {
    console.log(data)
    typeJS?.destroy()
    typeJS = new Typed('#typed', {
      strings: [data],
      typeSpeed: 50, //打字的速度
      cursorChar: ' ▼',
    })
  })
  typeJS = new Typed('#typed', {
    strings: ['Hello world'],
    typeSpeed: 50,
    cursorChar: ' ▼',
  })
})
</script>

<template>
  <div class="home_view">
    <span id="typed"></span>
  </div>
</template>

<style scoped lang="scss">
.home_view{
  box-sizing: border-box;
  display: flex;
  height: 200px;
  width: 100%;
  background: skyblue;
  padding: 20px;
}
</style>
