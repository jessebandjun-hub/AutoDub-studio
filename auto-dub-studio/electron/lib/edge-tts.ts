import { randomBytes, createHash } from 'node:crypto';
import { createWriteStream, writeFileSync } from 'node:fs';
import { WebSocket } from 'ws';
import { HttpsProxyAgent } from 'https-proxy-agent';

// --- DRM Logic ---
const CHROMIUM_FULL_VERSION = '130.0.2849.68';
const TRUSTED_CLIENT_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';
const WINDOWS_FILE_TIME_EPOCH = 11644473600n;

function generateSecMsGecToken() {
    const ticks = BigInt(Math.floor((Date.now() / 1000) + Number(WINDOWS_FILE_TIME_EPOCH))) * 10000000n;
    const roundedTicks = ticks - (ticks % 3000000000n);
    const strToHash = `${roundedTicks}${TRUSTED_CLIENT_TOKEN}`;
    const hash = createHash('sha256');
    hash.update(strToHash, 'ascii');
    return hash.digest('hex').toUpperCase();
}

// --- EdgeTTS Class ---
export interface EdgeTTSOptions {
    voice?: string;
    lang?: string;
    outputFormat?: string;
    saveSubtitles?: boolean;
    proxy?: string;
    rate?: string;
    pitch?: string;
    volume?: string;
    style?: string; // Added style support
    timeout?: number;
}

export class EdgeTTS {
    voice: string;
    lang: string;
    outputFormat: string;
    saveSubtitles: boolean;
    proxy?: string;
    rate: string;
    pitch: string;
    volume: string;
    style?: string;
    timeout: number;

    constructor({
        voice = 'zh-CN-XiaoyiNeural',
        lang = 'zh-CN',
        outputFormat = 'audio-24khz-48kbitrate-mono-mp3',
        saveSubtitles = false,
        proxy,
        rate = 'default',
        pitch = 'default',
        volume = 'default',
        style,
        timeout = 10000
    }: EdgeTTSOptions = {}) {
        this.voice = voice;
        this.lang = lang;
        this.outputFormat = outputFormat;
        this.saveSubtitles = saveSubtitles;
        this.proxy = proxy;
        this.rate = rate;
        this.pitch = pitch;
        this.volume = volume;
        this.style = style;
        this.timeout = timeout;
    }

    async _connectWebSocket(): Promise<WebSocket> {
        const wsConnect = new WebSocket(`wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}&Sec-MS-GEC=${generateSecMsGecToken()}&Sec-MS-GEC-Version=1-${CHROMIUM_FULL_VERSION}`, {
            host: 'speech.platform.bing.com',
            origin: 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0',
            },
            agent: this.proxy ? new HttpsProxyAgent(this.proxy) : undefined
        });

        return new Promise((resolve, reject) => {
            wsConnect.on('open', () => {
                wsConnect.send(`Content-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n
          {
            "context": {
              "synthesis": {
                "audio": {
                  "metadataoptions": {
                    "sentenceBoundaryEnabled": "false",
                    "wordBoundaryEnabled": "true"
                  },
                  "outputFormat": "${this.outputFormat}"
                  }
                }
              }
            }
          }
        `);
                resolve(wsConnect);
            });
            wsConnect.on('error', (err) => {
                reject(err);
            });
        });
    }

    _saveSubFile(subFile: any[], text: string, audioPath: string) {
        let subPath = audioPath + '.json';
        let subChars = text.split('');
        let subCharIndex = 0;
        subFile.forEach((cue, index) => {
            let fullPart = '';
            let stepIndex = 0;
            for (let sci = subCharIndex; sci < subChars.length; sci++) {
                if (subChars[sci] === cue.part[stepIndex]) {
                    fullPart = fullPart + subChars[sci];
                    stepIndex += 1;
                }
                else if (subChars[sci] === subFile?.[index + 1]?.part?.[0]) {
                    subCharIndex = sci;
                    break;
                }
                else {
                    fullPart = fullPart + subChars[sci];
                }
            }
            cue.part = fullPart;
        });
        writeFileSync(subPath, JSON.stringify(subFile, null, '  '), { encoding: 'utf-8' });
    }

    async ttsPromise(text: string, audioPath: string) {
        const _wsConnect = await this._connectWebSocket();
        return new Promise<void>((resolve, reject) => {
            let audioStream = createWriteStream(audioPath);
            let subFile: any[] = [];
            let timeout = setTimeout(() => reject('Timed out'), this.timeout);

            _wsConnect.on('message', async (data: any, isBinary: boolean) => {
                if (isBinary) {
                    let separator = 'Path:audio\r\n';
                    let index = data.indexOf(separator) + separator.length;
                    let audioData = data.subarray(index);
                    audioStream.write(audioData);
                }
                else {
                    let message = data.toString();
                    if (message.includes('Path:turn.end')) {
                        audioStream.end();
                        _wsConnect.close();
                        if (this.saveSubtitles) {
                            this._saveSubFile(subFile, text, audioPath);
                        }
                        clearTimeout(timeout);
                        resolve();
                    }
                    else if (message.includes('Path:audio.metadata')) {
                        let splitTexts = message.split('\r\n');
                        try {
                            let metadata = JSON.parse(splitTexts[splitTexts.length - 1]);
                            metadata['Metadata'].forEach((element: any) => {
                                subFile.push({
                                    part: element['Data']['text']['Text'],
                                    start: Math.floor(element['Data']['Offset'] / 10000),
                                    end: Math.floor((element['Data']['Offset'] + element['Data']['Duration']) / 10000)
                                });
                            });
                        }
                        catch { }
                    }
                }
            });

            let requestId = randomBytes(16).toString('hex');
            
            // Construct SSML with Style support
            let ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="${this.lang}">
        <voice name="${this.voice}">`;
            
            if (this.style) {
                ssml += `<mstts:express-as style="${this.style}">`;
            }
            
            ssml += `<prosody rate="${this.rate}" pitch="${this.pitch}" volume="${this.volume}">
            ${text}
          </prosody>`;
          
            if (this.style) {
                ssml += `</mstts:express-as>`;
            }
            
            ssml += `</voice></speak>`;

            _wsConnect.send(`X-RequestId:${requestId}\r\nContent-Type:application/ssml+xml\r\nPath:ssml\r\n\r\n${ssml}`);
        });
    }
}
