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

