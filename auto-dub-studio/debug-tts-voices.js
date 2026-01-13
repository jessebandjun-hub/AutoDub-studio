const { EdgeTTS } = require('node-edge-tts');
const tts = new EdgeTTS();
// 尝试查找获取语音列表的方法
console.log('Proto:', Object.getOwnPropertyNames(Object.getPrototypeOf(tts)));

// 很多库通过静态方法获取
if (EdgeTTS.getVoices) {
    console.log('EdgeTTS.getVoices exists');
}

// 或者实例化后
try {
    // 假设 getVoices 是异步的
    // tts.getVoices().then(v => console.log(v.slice(0, 5)));
} catch (e) {}
