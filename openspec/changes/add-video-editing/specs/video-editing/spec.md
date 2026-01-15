## ADDED Requirements

### Requirement: Basic Video Trimming
应用应支持针对单个视频文件按起止时间导出新的视频片段。

#### Scenario: Trim current video by start/end seconds
- **WHEN** 用户已选择源视频并设置开始时间和结束时间（单位秒）
- **THEN** 系统导出仅包含该时间范围的新视频文件
- **AND** 导出文件保存到默认输出目录或用户选择的位置

### Requirement: Multi-Video Concatenation
应用应支持选择多个视频文件，并按用户定义顺序拼接为一个新的视频文件。

#### Scenario: Concatenate multiple videos into one file
- **WHEN** 用户在拼接列表中添加两个及以上视频，并确认执行拼接
- **THEN** 系统按列表顺序将视频合并为一个连续的视频文件
- **AND** 输出文件的封装格式为 MP4，音视频轨道在整个时轴上连续可播放

### Requirement: Video Editing UI Tabs
应用应通过顶层 Tab 提供“字幕配音”和“视频拼接”两种模式，并分别承载单视频剪辑与多视频拼接能力。

#### Scenario: Subtitle dubbing tab with single-video trimming
- **WHEN** 用户选择“字幕配音”Tab
- **THEN** 界面展示当前模式下的视频上传/预览区域以及字幕编辑与导出区域
- **AND** 未选择视频前仅展示“选择视频文件”的入口
- **AND** 单视频剪辑能力基于当前上传的视频进行起止时间裁剪导出

#### Scenario: Video concatenation tab with independent video list
- **WHEN** 用户选择“视频拼接”Tab
- **THEN** 界面展示多视频拼接列表和相关操作控件
- **AND** 拼接所用的视频列表通过该 Tab 内的“添加视频到拼接列表”维护，不依赖“字幕配音”Tab 中当前加载的视频
- **AND** 当前版本中拼接为无转场的直接拼接，界面内的转场类型配置为未来扩展预留项，对输出结果不产生实际影响
