import path from 'path'
import { WaveFile } from 'wavefile'
import * as os from 'node:os'
import * as fs from 'node:fs'
import { transcribe } from 'whisper-node-addon/dist'

const modelPath = path.resolve('./resources/models/ggml-base.bin')

export const useWhisper = async (audioData: Uint8Array) => {
  console.log('Received audio length:', audioData.length)
  console.log('First 4 bytes:', Buffer.from(audioData.slice(0, 4)).toString('hex')) // 应输出"52494646"（RIFF）
  // 1. 创建 Wave 文件对象
  const file = new WaveFile(audioData)

  // 2. 转换为 WAV 格式缓冲区
  const wavBuffer = file.toBuffer()

  // 3. 生成唯一临时文件路径（防冲突）
  const tempFilePath = path.join(
    os.tmpdir(), // 使用系统临时目录
    `whisper-${Date.now()}-${Math.random().toString(36).slice(2)}.wav` // 随机文件名
  )
  console.log(tempFilePath)
  // 4. 将音频数据写入临时文件
  fs.writeFileSync(tempFilePath, wavBuffer)

  console.log('model_path', modelPath)
  console.log('fname_inp', tempFilePath)

  try {
    const result = await transcribe({
      language: 'zh',
      model: modelPath,
      fname_inp: tempFilePath,
      translate: false
    })
    console.log('这是', result)
    return result.reduce((pre, cur) => pre + (cur[2] || ''), '')
  } catch (err) {
    console.error('Error:', err)
    return ''
  }
}
