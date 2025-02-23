<script setup lang="ts">
import { ref } from 'vue'

const isRecording = ref(false)
let mediaStream: MediaStream | null = null
let mediaRecorder: MediaRecorder | null = null
let recordedChunks: Blob[] = []

const startRecording = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: 16000, // 强制指定采样率
        channelCount: 1 // 强制单声道
      }
    })
    mediaStream = stream
    console.log(mediaStream)
    mediaRecorder = new MediaRecorder(stream)
    mediaRecorder.addEventListener('dataavailable', (e) => {
      if (e.data.size > 0) {
        recordedChunks.push(e.data)
      }
    })
    mediaRecorder.addEventListener('stop', async () => {
      const blob = new Blob(recordedChunks, { type: 'audio/wav' })
      const audioData = await preprocessAudio(blob)
      console.log(audioData)
      window.electron.ipcRenderer.invoke('recognize-audio', audioData)
    })
    mediaRecorder.start()
    isRecording.value = true
    console.log('开始录音...')
  } catch (e) {
    console.error('无法获取麦克风权限：', e)
  }
}

// 音频预处理函数
async function preprocessAudio(blob: Blob): Promise<Float32Array> {
  const arrayBuffer = await blob.arrayBuffer()
  const audioContext = new AudioContext({ sampleRate: 16000 })

  // 解码音频
  const decoded = await audioContext.decodeAudioData(arrayBuffer)

  // 单声道处理
  const channelData = decoded.getChannelData(0)

  // 采样率验证
  if (decoded.sampleRate !== 16000) {
    console.warn(`采样率异常: ${decoded.sampleRate}, 将执行重采样`)
    return await resampleAudio(channelData, decoded.sampleRate, 16000)
  }

  return channelData
}

// 重采样函数
async function resampleAudio(
  original: Float32Array,
  originalRate: number,
  targetRate: number
): Promise<Float32Array> {
  const offlineContext = new OfflineAudioContext(
    1,
    Math.floor((original.length * targetRate) / originalRate),
    targetRate
  )

  const buffer = offlineContext.createBuffer(1, original.length, originalRate)
  buffer.copyToChannel(original, 0)

  const source = offlineContext.createBufferSource()
  source.buffer = buffer
  source.connect(offlineContext.destination)
  source.start()

  const resampled = await offlineContext.startRendering()
  return resampled.getChannelData(0)
}

const stopRecording = () => {
  if (isRecording.value) {
    mediaRecorder?.stop()
    mediaStream?.getTracks().forEach((track) => track.stop())
    isRecording.value = false
    recordedChunks = []
    console.log('录音完成！')
  }
}

const clickRecording = () => {
  if (isRecording.value) {
    stopRecording()
  } else {
    startRecording()
  }
}
</script>

<template>
  <div @click="clickRecording">
    {{ isRecording ? '结束录音' : '开始录音' }}
  </div>
</template>

<style scoped lang="scss"></style>
