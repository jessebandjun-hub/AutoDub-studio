# AutoDub Studio

AutoDub Studio 是一个基于 Electron + React + TypeScript 的桌面应用，用于快速完成「视频剪辑 + 字幕生成/编辑 + TTS 配音 + 导出成品视频」的一站式工作流，适合短视频创作者、解说类视频创作者等使用。

## 功能特性

- 字幕配音工作流  
  - 选择本地视频文件并预览播放  
  - 一键触发「AI 处理」获取字幕片段（当前为模拟数据，后续可接入 Whisper 等模型）  
  - 在右侧面板中编辑字幕文本、起止时间等信息  
  - 支持按片段导出带字幕的视频，或同时生成 TTS 配音并混入视频
- 字幕导出  
  - 可将当前字幕列表导出为标准 `.srt` 文件  
  - 导出文件名包含时间戳，方便归档管理
- TTS 配音  
  - 基于 `node-edge-tts`，使用微软 Edge TTS 接口生成中文语音  
  - 内置多种中文/粤语/台湾语音可选（如：晓晓、云希、云扬等）  
  - 支持调节语速（rate）、音高（pitch）、部分语音的情感风格（style）  
  - 可以只生成音频预览，或导出为独立的 mp3 文件
- 背景音乐与音量控制  
  - 支持为配音视频添加 BGM 音轨，并设置背景音音量比例  
  - 自动与 TTS 语音进行混音，保证人声清晰、BGM 不抢声
- 视频剪辑  
  - 使用下方时间轴拖动选择「开始/结束」时间段  
  - 仅导出选中时间范围的新视频片段
- 视频拼接  
  - 在「视频拼接」标签页中添加多个视频文件  
  - 支持拖拽调整顺序  
  - 导出拼接后的单个视频文件
- 输出目录与自动保存  
  - 可在界面中配置默认输出目录  
  - 开启「自动保存」后，剪辑/导出/拼接等操作会跳过保存对话框，直接写入指定目录

## 技术栈

- 桌面框架：Electron  
- 前端框架：React 18 + TypeScript  
- 构建工具：Vite 5  
- 音视频处理：`fluent-ffmpeg`（依赖本地 `ffmpeg` 可执行文件）  
- 语音合成：`node-edge-tts`（微软 Edge TTS 接口）  
- 其他：`vite-plugin-electron` 用于集成主进程与预加载脚本

## 环境要求

- Node.js：建议 18 及以上版本  
- npm：建议 9 及以上版本  
- 操作系统：当前主要在 Windows 上开发和测试  
- FFmpeg：需要本地存在 `ffmpeg` 可执行文件
  - 开发环境：将 `ffmpeg.exe` 放在项目根目录下的 `resources/ffmpeg.exe`  
  - 打包后：Electron 会从应用的 `resources/resources/ffmpeg.exe` 位置自动查找（构建时会将 `resources` 目录打包进去）

## 快速开始

1. 安装依赖

```bash
cd auto-dub-studio
npm install
```

2. 启动开发环境

```bash
npm run dev
```

启动后会同时运行 Vite 开发服务器和 Electron 主进程，自动弹出应用窗口。

3. 基本使用流程（字幕配音）

- 点击「选择视频文件」，选择本地视频  
- 点击「开始 AI 处理」获取初始字幕片段（当前为模拟数据）  
- 在右侧字幕表格中调整每条字幕的文本与时间  
- 选择合适的 TTS 语音/语速/音高等参数  
- 可选：在「背景音乐」区域选择一首 BGM  
- 点击「导出字幕视频」或「导出配音视频」，选择保存路径或使用自动保存目录  
- 完成后可直接在文件管理器中打开导出文件位置

4. 视频剪辑

- 在视频下方拖动剪辑条，设定开始与结束时间  
- 点击「开始剪辑」，选择输出位置（或自动保存至默认目录）  
- 程序会使用 FFmpeg 导出指定时间段的视频片段

5. 视频拼接

- 切换到顶部的「视频拼接」标签页  
- 点击「添加视频」，选择多个需要拼接的文件  
- 按需拖拽列表中的条目调整顺序  
- 点击「开始拼接」，等待导出完成

## 构建与打包

项目使用 `electron-builder` 进行打包，配置位于 `package.json` 的 `build` 字段中。

1. 运行打包命令：

```bash
npm run build
```

2. 生成内容：

- 构建完成后，安装包会输出到 `release/<version>/` 目录  
- Windows 平台默认生成 NSIS 安装包  
- macOS 配置了 dmg 目标（需在对应平台上打包）

## 目录结构概览

```text
auto-dub-studio/
├─ src/                # React 前端页面与组件
│  ├─ App.tsx          # 应用入口，包含字幕配音/视频拼接逻辑
│  ├─ VideoPanel.tsx   # 视频预览与剪辑区域
│  ├─ SubtitleTab.tsx  # 字幕编辑与 TTS 配置
│  └─ ConcatTab.tsx    # 视频拼接页面
├─ electron/
│  ├─ main.ts          # Electron 主进程，负责 FFmpeg/TTS/导出等
│  ├─ preload.ts       # 预加载脚本，暴露安全的 `window.electronAPI`
│  └─ lib/edge-tts.ts  # Edge TTS 封装
├─ resources/
│  └─ ffmpeg.exe       # 本地 FFmpeg 可执行文件（需自行放入）
├─ vite.config.ts      # Vite 与 vite-plugin-electron 配置
├─ package.json        # 脚本、依赖与 electron-builder 配置
└─ README.md           # 项目说明
```

## 注意事项

- 当前字幕识别逻辑仍为模拟数据，仅用于展示 UI 及工作流，后续可替换为真实的语音识别（如 Whisper 等）  
- 语音合成依赖 Edge TTS 在线服务，若请求过于频繁可能触发限流，请适当控制批量生成次数  
- 部分语音在官方接口中不再支持特定情感风格，代码中已对部分语音禁用 `style` 参数，以避免服务端报错  
- 如遇到导出失败或 TTS 生成失败，请先检查：  
  - `resources/ffmpeg.exe` 是否存在且可执行  
  - 当前网络是否可以正常访问 Edge TTS 服务

欢迎根据自身需求继续扩展更多功能，例如：接入真实语音识别、支持多轨字幕、多语言配音等。
