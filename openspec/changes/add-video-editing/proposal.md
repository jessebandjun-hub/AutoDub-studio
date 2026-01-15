# Change: Add basic video trimming and concatenation

## Why
AutoDub Studio 目前只支持整段视频配音与导出，缺少简单的视频剪辑与多段拼接能力，用户需要频繁借助外部剪辑工具，打断工作流。

## What Changes
- 新增单视频剪辑能力：按起止时间导出当前视频的子片段
- 新增多视频拼接能力：将多个片段按顺序合成为一个新视频
- 在 Electron 主进程中增加对应 IPC 接口，并通过 preload 暴露给前端
- 在主界面增加剪辑/拼接操作区域，与现有导出流程打通

## Impact
- Affected specs: video-editing
- Affected code:
  - electron/main.ts
  - electron/preload.ts
  - src/App.tsx

