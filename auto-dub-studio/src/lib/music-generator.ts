import * as Tone from 'tone';

// 古风五声调式 (Pentatonic Scale)
// 宫(C) 商(D) 角(E) 徵(G) 羽(A)
const PENTATONIC_SCALE = ["C4", "D4", "E4", "G4", "A4", "C5", "D5", "E5", "G5", "A5"];

// 情感预设
export type MusicEmotion = '宁静' | '欢快' | '悲伤' | '紧张' | '宏大';

interface GenerationParams {
  emotion: MusicEmotion;
  duration: number; // seconds
}

// 简单的 WAV 编码器 (Tone.js 返回的是 AudioBuffer，我们需要转成 WAV 文件)
function bufferToWav(abuffer: AudioBuffer, len: number) {
  let numOfChan = abuffer.numberOfChannels,
      length = len * numOfChan * 2 + 44,
      buffer = new ArrayBuffer(length),
      view = new DataView(buffer),
      channels = [], i, sample,
      offset = 0,
      pos = 0;

  // write WAVE header
  setUint32(0x46464952);                         // "RIFF"
  setUint32(length - 8);                         // file length - 8
  setUint32(0x45564157);                         // "WAVE"

  setUint32(0x20746d66);                         // "fmt " chunk
  setUint32(16);                                 // length = 16
  setUint16(1);                                  // PCM (uncompressed)
  setUint16(numOfChan);
  setUint32(abuffer.sampleRate);
  setUint32(abuffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
  setUint16(numOfChan * 2);                      // block-align
  setUint16(16);                                 // 16-bit (hardcoded in this writer)

  setUint32(0x61746164);                         // "data" - chunk
  setUint32(length - pos - 4);                   // chunk length

  // write interleaved data
  for(i = 0; i < abuffer.numberOfChannels; i++)
    channels.push(abuffer.getChannelData(i));

  while(pos < len) {
    for(i = 0; i < numOfChan; i++) {             // interleave channels
      sample = Math.max(-1, Math.min(1, channels[i][pos])); // clamp
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767)|0; // scale to 16-bit signed int
      view.setInt16(44 + offset, sample, true); // write 16-bit sample
      offset += 2;
    }
    pos++;
  }

  return buffer;

  function setUint16(data: any) {
    view.setUint16(pos, data, true);
    pos += 2;
  }

  function setUint32(data: any) {
    view.setUint32(pos, data, true);
    pos += 4;
  }
}

export class ToneGenerator {
  private static buffers: Map<string, Tone.ToneAudioBuffer> = new Map();
  private static isLoaded = false;

  // 预加载采样 (只需要执行一次)
  static async loadSamples() {
    if (this.isLoaded) return;

    const remoteSamples: Record<string, string> = {
      "C4": "https://raw.githubusercontent.com/NBros/tonejs-instruments/master/samples/guzheng/C4.mp3",
      "G4": "https://raw.githubusercontent.com/NBros/tonejs-instruments/master/samples/guzheng/G4.mp3",
      "C5": "https://raw.githubusercontent.com/NBros/tonejs-instruments/master/samples/guzheng/C5.mp3",
    };

    const localSamples: Record<string, string> = {
      "C4": "/samples/guzheng/C4.mp3",
      "G4": "/samples/guzheng/G4.mp3",
      "C5": "/samples/guzheng/C5.mp3",
    };

    console.log('正在加载乐器采样...');
    
    const keys = Object.keys(remoteSamples);
    for (const key of keys) {
        const remoteUrl = remoteSamples[key];
        const localUrl = localSamples[key];
        const buffer = new Tone.ToneAudioBuffer();
        try {
            await buffer.load(remoteUrl);
        } catch (e) {
            console.error('远程采样加载失败', remoteUrl, e);
            if (!localUrl) {
              throw new Error(`无法加载乐器采样文件: ${remoteUrl}`);
            }
            try {
              await buffer.load(localUrl);
            } catch (e2) {
              console.error('本地采样加载失败', localUrl, e2);
              throw new Error(`无法加载乐器采样文件: ${remoteUrl} 或 ${localUrl}`);
            }
        }
        this.buffers.set(key, buffer);
    }

    this.isLoaded = true;
    console.log('采样加载完成');
  }

  // 生成音乐并导出为 ArrayBuffer (WAV格式)
  static async generate(params: GenerationParams): Promise<ArrayBuffer> {
    if (!this.isLoaded) {
      await this.loadSamples();
    }

    const { emotion, duration } = params;

    // 根据情感调整参数
    let bpm = 80;
    let noteDensity = 0.2; // 20% 留白
    let scale = PENTATONIC_SCALE;

    switch (emotion) {
        case '宁静':
            bpm = 60;
            noteDensity = 0.3; // 更多留白
            break;
        case '欢快':
            bpm = 110;
            noteDensity = 0.1; // 密集
            break;
        case '悲伤':
            bpm = 55;
            // 小调五声 (近似)
            scale = ["A3", "C4", "D4", "E4", "G4", "A4", "C5"];
            break;
        case '紧张':
            bpm = 130;
            noteDensity = 0.0;
            break;
        case '宏大':
            bpm = 90;
            // 扩展音域
            scale = ["C3", "G3", "C4", "D4", "G4", "A4", "C5", "D5", "G5"];
            break;
    }

    // 使用 Tone.Offline 进行离线渲染 (比实时快得多)
    const audioBuffer = await Tone.Offline(({ transport }) => {
        // 1. 创建乐器 (在 Offline Context 中)
        // 使用预加载的 Buffer
        const guzheng = new Tone.Sampler({
            urls: {
                "C4": this.buffers.get("C4")!,
                "G4": this.buffers.get("G4")!,
                "C5": this.buffers.get("C5")!,
            },
            baseUrl: "" // URL 已经在 buffer 中处理了
        }).toDestination();

        // 添加混响
        const reverb = new Tone.Reverb({
            decay: 4,
            wet: 0.5
        }).toDestination();
        guzheng.connect(reverb);

        // 简单的合成器作为铺底 (Pad)
        const pad = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: "sine" },
            envelope: { attack: 2, decay: 1, sustain: 0.5, release: 2 }
        }).toDestination();
        pad.volume.value = -15; // 降低音量
        pad.connect(reverb);

        // 2. 编排乐曲
        transport.bpm.value = bpm;

        // 主旋律 Loop
        const loop = new Tone.Loop((time) => {
            if (Math.random() > noteDensity) {
                const note = scale[Math.floor(Math.random() * scale.length)];
                const noteDuration = Math.random() > 0.6 ? "4n" : "8n";
                // 增加一点人性化的时间偏移 (+0 ~ 0.05s)
                const humanize = Math.random() * 0.05;
                const velocity = 0.6 + Math.random() * 0.4;
                guzheng.triggerAttackRelease(note, noteDuration, time + humanize, velocity);
            }
        }, "8n");
        loop.start(0).stop(duration);

        // 铺底音 (Pad) - 每 4 小节换一个根音
        const padLoop = new Tone.Loop((time) => {
             const rootNote = scale[0]; // 简单点，用根音
             pad.triggerAttackRelease([rootNote, scale[2] || rootNote], "1m", time);
        }, "1m");
        padLoop.start(0).stop(duration);

        // 3. 启动 Transport
        transport.start();

    }, duration);

    // 转换为 WAV
    const wavData = bufferToWav(audioBuffer, audioBuffer.length);
    return wavData;
  }
}
