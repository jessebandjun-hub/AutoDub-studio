# 项目上下文 (Project Context)

## 目标 (Purpose)
AutoDub Studio 是一个自动化的视频配音和翻译工具。它旨在通过集成语音识别、机器翻译和文本转语音 (TTS) 技术，帮助用户快速生成多语言配音视频。主要功能包括视频导入、字幕提取与编辑、AI 配音生成以及最终的视听合成。

## 技术栈 (Tech Stack)
- **Core**: Electron 30.0.0
- **Frontend**: React 18, TypeScript, Vite 5
- **Backend/Node**: Node.js (Electron Main Process)
- **Media Processing**: fluent-ffmpeg
- **TTS**: node-edge-tts (Edge TTS 接口)
- **Build Tools**: electron-builder, rimraf

## 项目规范 (Project Conventions)

### 代码风格 (Code Style)
- 使用 TypeScript 进行强类型约束。
- React 组件采用函数式组件 (Functional Components) 和 Hooks。
- 遵循 ESLint 和 Prettier 的默认配置（如果存在）。
- 变量和函数命名使用 camelCase，组件命名使用 PascalCase。

### 架构模式 (Architecture Patterns)
- **Electron 双进程模型**:
  - **主进程 (Main Process)**: 负责系统级操作，如文件读写、FFmpeg 调用、TTS 生成、IPC 通信管理。
  - **渲染进程 (Renderer Process)**: 负责 UI 交互、状态管理 (React State)、用户配置。
- **IPC 通信**: 使用 `ipcMain` 和 `ipcRenderer` 进行前后端数据交换。
- **资源管理**: 外部资源（如 ffmpeg binary）放置在 `resources/` 目录，通过 `extraResources` 打包。

### 测试策略 (Testing Strategy)
- 目前主要依赖手动测试 (Manual Testing) 和开发环境预览。
- 建议添加单元测试 (Jest/Vitest) 用于关键逻辑（如字幕解析、时间轴计算）。

### Git 工作流 (Git Workflow)
- **main**: 主分支，保持稳定可发布状态。
- **feature/*** : 功能开发分支。
- 提交信息应清晰描述更改内容。

## 领域上下文 (Domain Context)
- **SRT 字幕**: 理解 SRT 文件格式 (序号, 时间轴, 文本) 是核心。
- **TTS (Text-to-Speech)**: 涉及语速 (Rate)、音量 (Volume)、语音角色 (Voice) 的配置。
- **FFmpeg**: 音视频合成、混音、字幕压制是关键处理步骤。
- **Edge TTS**: 微软 Edge 浏览器的免费 TTS 接口，依赖网络连接。

## 重要约束 (Important Constraints)
- **网络依赖**: Edge TTS 需要互联网连接才能工作。
- **FFmpeg 路径**: 在打包后需要正确处理 FFmpeg 可执行文件的路径引用。
- **文件权限**: Windows 下的文件读写权限，特别是系统盘或受保护目录。

## 外部依赖 (External Dependencies)
- **Microsoft Edge TTS Service**: 核心语音生成服务。
