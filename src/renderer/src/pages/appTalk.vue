<script setup lang="ts">
import { ref } from 'vue'
import Recorder from '@renderer/components/Recorder.vue'

const text = ref('')
const getText = async () => {
  if (!text.value) return
  const response = await window.electron.ipcRenderer.invoke('text_message', text.value)
  console.log(response)
  text.value = ''
}
</script>

<template>
  <div class="flex justify-center align-center w-[100vw] h-[100vh]">
    <input
      v-model="text"
      class="w-full h-full px-[2ch] box-border border-none focus:border-none outline-none"
      placeholder="关注桐桐桐桐魚，关注桐桐桐桐魚谢谢喵！"
      @keydown.enter="getText"
    />
    <Recorder />
  </div>
</template>

<style scoped lang="scss"></style>
