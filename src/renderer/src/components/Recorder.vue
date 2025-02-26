<script setup lang="ts">
import { ref } from 'vue'

const isRecording = ref(false)
let mediaStream: MediaStream | null = null
let mediaRecorder: MediaRecorder | null = null
let recordedChunks: Blob[] = []

// WAV文件头生成器
const encodeWAV = (samples: Float32Array, sampleRate: number): ArrayBuffer => {
  const buffer = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(buffer)

  // RIFF标识
  writeString(view, 0, 'RIFF')
  view.setUint32(4, 36 + samples.length * 2, true)
  writeString(view, 8, 'WAVE')
  writeString(view, 12, 'fmt ')
  view.setUint32(16, 16, true) // fmt chunk长度
  view.setUint16(20, 1, true) // PCM格式
  view.setUint16(22, 1, true) // 单声道
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true) // 字节率
  view.setUint16(32, 2, true) // 块对齐
  view.setUint16(34, 16, true) // 位深度
  writeString(view, 36, 'data')
  view.setUint32(40, samples.length * 2, true)

  // 写入PCM数据
  floatTo16BitPCM(view, 44, samples)

  return buffer
}

function floatTo16BitPCM(dataview: DataView, offset: number, input: Float32Array) {
  for (let i = 0; i < input.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, input[i]))
    dataview.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }
}

function writeString(dataview: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    dataview.setUint8(offset + i, string.charCodeAt(i))
  }
}

const startRecording = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: 16000, // 强制指定采样率
        channelCount: 1, // 强制单声道
        // 新增详细约束
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false
      }
    })
    mediaStream = stream
    mediaRecorder = new MediaRecorder(stream)

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        recordedChunks.push(e.data)
      }
    }

    mediaRecorder.onstop = async () => {
      try {
        // 转换为WAV格式
        const blob = new Blob(recordedChunks, { type: 'audio/webm' })
        const arrayBuffer = await blob.arrayBuffer()
        const audioContext = new AudioContext({ sampleRate: 16000 })

        // 解码音频
        const decoded = await audioContext.decodeAudioData(arrayBuffer)
        const processed = await processAudioData(decoded)

        // 生成标准WAV文件
        const wavBuffer = encodeWAV(processed, 16000)
        const wavBlob = new Blob([wavBuffer], { type: 'audio/wav' })

        // 转换为Uint8Array
        const reader = new FileReader()
        reader.onload = () => {
          const array = new Uint8Array(reader.result as ArrayBuffer)
          window.electron.ipcRenderer.invoke('recognize-audio', array)
        }
        reader.readAsArrayBuffer(wavBlob)
      } catch (e) {
        console.error('音频处理失败:', e)
      }
    }

    mediaRecorder.start()
    isRecording.value = true
    console.log('开始录音...')
  } catch (e) {
    console.error('无法获取麦克风权限：', e)
  }
}

async function processAudioData(decoded: AudioBuffer): Promise<Float32Array> {
  // 单声道处理
  let channelData = decoded.getChannelData(0)

  // 自动增益控制
  const maxVal = Math.max(...channelData.map(Math.abs))
  if (maxVal < 0.5) {
    const multiplier = 0.5 / maxVal
    channelData = channelData.map((x) => x * multiplier)
  }

  // 降噪处理（简单阈值）
  const threshold = 0.02
  return new Float32Array(channelData.map((x) => (Math.abs(x) > threshold ? x : 0)))
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
