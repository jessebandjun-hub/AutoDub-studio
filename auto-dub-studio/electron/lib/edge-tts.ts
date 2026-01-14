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
        // Use wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1
        // Note: The original URL might be strict about headers or token format.
        // Let's try to remove Sec-MS-GEC for now as it might be causing issues if calculated incorrectly, 
        // OR fix the calculation if needed. But first, let's try a simpler approach often used by other libraries.
        
        // Actually, the error 1006/1007 often comes from invalid headers or payload.
        // The log shows garbage characters in the SSML: "鏂板瓧骞曠墖娈?" which is Mojibake (UTF-8 interpreted as GBK or similar).
        // This suggests the Chinese text is not being handled correctly in the SSML string interpolation or transmission.
        
        const url = `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}&Sec-MS-GEC=${generateSecMsGecToken()}&Sec-MS-GEC-Version=1-${CHROMIUM_FULL_VERSION}`;
        console.log(`[TTS DEBUG] Connecting to WebSocket: ${url}`);
        const wsConnect = new WebSocket(url, {
            host: 'speech.platform.bing.com',
            origin: 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0',
            },
            agent: this.proxy ? new HttpsProxyAgent(this.proxy) : undefined
        });

        return new Promise((resolve, reject) => {
            wsConnect.on('open', () => {
                console.log('[TTS DEBUG] WebSocket Connected');
                resolve(wsConnect);
            });
            wsConnect.on('error', (err) => {
                console.error('[TTS DEBUG] WebSocket Error:', err);
                reject(err);
            });
            wsConnect.on('close', (code, reason) => {
                console.log(`[TTS DEBUG] WebSocket Closed. Code: ${code}, Reason: ${reason}`);
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

            _wsConnect.on('close', (code, reason) => {
                console.log(`[TTS DEBUG] WebSocket Closed. Code: ${code}, Reason: ${reason}`);
                if (code === 1007) {
                    // Invalid payload usually means SSML error or unsupported style
                    reject(`TTS Error: Server rejected request (1007). Possibly unsupported style '${this.style}' for voice '${this.voice}'.`);
                } else if (code !== 1000 && code !== 1005 && code !== 1006) {
                     // 1000: Normal, 1005: No Status Recvd, 1006: Abnormal (but handled below)
                    reject(`TTS Socket Closed: ${code} ${reason}`);
                }
                // If 1006 happens but we got data, we might want to ignore it, 
                // but usually turn.end handles the success case. 
                // If we are here and promise is not settled, it's likely an error.
            });

            _wsConnect.on('message', async (data: any, isBinary: boolean) => {
                if (isBinary) {
                    let separator = 'Path:audio\r\n';
                    let index = data.indexOf(separator);
                    console.log(`[TTS DEBUG] Binary data received. Size: ${data.length}, Separator Index: ${index}`);
                    if (index >= 0) {
                        let audioData = data.subarray(index + separator.length);
                        console.log(`[TTS DEBUG] Writing audio chunk. Size: ${audioData.length}`);
                        audioStream.write(audioData);
                    } else {
                        console.log('[TTS DEBUG] Binary message received but no audio separator found.');
                    }
                }
                else {
                    let message = data.toString();
                    console.log('[TTS DEBUG] Text Message:', message); // Debug log
                    if (message.includes('Path:turn.end')) {
                        console.log('[TTS DEBUG] Turn end received. Closing stream.');
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
            // Minify SSML to avoid potential whitespace issues
            const xmlEscape = (str: string) => str.replace(/[<>&'"]/g, (c) => {
                switch (c) {
                    case '<': return '&lt;';
                    case '>': return '&gt;';
                    case '&': return '&amp;';
                    case '\'': return '&apos;';
                    case '"': return '&quot;';
                    default: return c;
                }
            });

            // Use http for mstts namespace as widely compatible with Azure TTS
            // Content-Type without charset is crucial for some endpoints
            let ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="http://www.w3.org/2001/mstts" xml:lang="${this.lang}"><voice name="${this.voice}">`;
            
            // NOTE: express-as MUST wrap the voice content directly
            
            if (this.style) {
                ssml += `<mstts:express-as style="${this.style}">`;
            }
            
            ssml += `<prosody rate="${this.rate}" pitch="${this.pitch}" volume="${this.volume}">${xmlEscape(text)}</prosody>`;
          
            if (this.style) {
                ssml += `</mstts:express-as>`;
            }
            
            ssml += `</voice></speak>`;
            
            console.log(`[TTS DEBUG] Sending SSML: ${ssml}`); // Debug log

            // 1. Send speech.config
            const configData = JSON.stringify({
                context: {
                    synthesis: {
                        audio: {
                            metadataOptions: {
                                sentenceBoundaryEnabled: "false",
                                wordBoundaryEnabled: "true"
                            },
                            outputFormat: this.outputFormat
                        }
                    }
                }
            });
            const configMessage = `X-RequestId:${requestId}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n${configData}`;
            _wsConnect.send(configMessage);

            // 2. Send SSML
            // Ensure Content-Type is exactly application/ssml+xml
            const requestData = `X-RequestId:${requestId}\r\nContent-Type:application/ssml+xml\r\nPath:ssml\r\n\r\n${ssml}`;
            _wsConnect.send(requestData);
        });
    }
}
