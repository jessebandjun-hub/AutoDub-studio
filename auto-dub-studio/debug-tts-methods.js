const { EdgeTTS } = require('node-edge-tts');
const tts = new EdgeTTS();
if (tts.ttsPromise) {
    console.log('ttsPromise exists');
} else {
    console.log('ttsPromise DOES NOT exist');
    console.log('Keys:', Object.keys(tts));
    // 尝试打印原型链上的键
    let proto = Object.getPrototypeOf(tts);
    console.log('Proto Keys:', Object.getOwnPropertyNames(proto));
}
