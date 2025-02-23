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
      const audioBlob = new Blob(recordedChunks, { type: 'audio/wav' })
      await processAudio(audioBlob)
      // exportRecording()
    })
    mediaRecorder.start()
    isRecording.value = true
    console.log('开始录音...')
  } catch (e) {
    console.error('无法获取麦克风权限：', e)
  }
}

const writeString = (view: DataView, offset: number, str: string) => {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i))
  }
}

const createWavHeader = (sampleRate: number, dataLength: number): Uint8Array => {
  const bytesPerSample = 2 // 16-bit
  const buffer = new ArrayBuffer(44)
  const view = new DataView(buffer)

  // RIFF标识
  writeString(view, 0, 'RIFF')
  view.setUint32(4, 36 + dataLength * bytesPerSample, true)
  writeString(view, 8, 'WAVE')
  writeString(view, 12, 'fmt ')
  view.setUint32(16, 16, true) // fmt块长度
  view.setUint16(20, 1, true) // PCM格式
  view.setUint16(22, 1, true) // 单声道
  view.setUint32(24, sampleRate, true) // 采样率
  view.setUint32(28, sampleRate * bytesPerSample, true) // 字节率
  view.setUint16(32, bytesPerSample, true) // 块对齐
  view.setUint16(34, 16, true) // 位深度
  writeString(view, 36, 'data')
  view.setUint32(40, dataLength * bytesPerSample, true)

  return new Uint8Array(buffer)
}

// 转换Float32Array到16位PCM
const floatTo16BitPCM = (input: Float32Array): Int16Array => {
  const output = new Int16Array(input.length)
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]))
    output[i] = s < 0 ? s * 0x8000 : s * 0x7fff
  }
  return output
}

// 音频处理流水线
async function processAudio(blob: Blob) {
  try {
    // 1. 预处理音频
    const audioData = await preprocessAudio(blob)
    // 转换到WAV格式
    const pcmData = floatTo16BitPCM(audioData)
    const wavHeader = createWavHeader(16000, pcmData.length)
    const wavBlob = new Blob([wavHeader, pcmData], { type: 'audio/wav' })
    exportRecording(wavBlob)
  } catch (error) {
    console.error('处理失败:', error)
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

// 导出录制的音频文件
function exportRecording(blob) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `pear-rec_${+new Date()}.wav`
  link.click()
  recordedChunks = []
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
