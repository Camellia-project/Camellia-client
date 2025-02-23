import path from 'path'
import { nodewhisper } from 'nodejs-whisper'

// Need to provide exact path to your audio file.
const filePath = path.resolve('./resources/mother_teresa.wav')

export const useWhisper = async () => {
  return await nodewhisper(filePath, {
    modelName: 'base', //Downloaded models name
    autoDownloadModelName: 'base', // (optional) autodownload a model if model is not present
    removeWavFileAfterTranscription: false, // (optional) remove wav file once transcribed
    withCuda: false, // (optional) use cuda for faster processing
    logger: console, // (optional) Logging instance, defaults to console
    whisperOptions: {
      outputInCsv: false, // get output result in csv file
      outputInJson: false, // get output result in json file
      outputInJsonFull: false, // get output result in json file including more information
      outputInLrc: false, // get output result in lrc file
      outputInSrt: false, // get output result in srt file
      outputInText: false, // get output result in txt file
      outputInVtt: false, // get output result in vtt file
      outputInWords: false, // get output result in wts file for karaoke
      translateToEnglish: false, // translate from source language to english
      wordTimestamps: false, // word-level timestamps
      timestamps_length: 20, // amount of dialogue per timestamp pair
      splitOnWord: false // split on word rather than on token
    }
  })
}
