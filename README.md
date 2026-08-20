<p align="center">
  <strong>兼容 OneBot 的非官方网页 QQ 客户端</strong>
</p>

<p align="center">
  本网页应用仅供学习交流使用，请勿用于其他用途
</p>

<div align="center">
如果这个项目对您有帮助，请给我一个 ⭐️ Star！

**QQ 群**: [855571375](https://qm.qq.com/q/PdLMx9Jowq) - 用户交流、问题反馈
</div>

<p align="center">
  <a href="https://github.com/YisRime/RimeQ/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/YisRime/RimeQ?style=flat-square&color=42b883" alt="License">
  </a>
  <a href="https://github.com/YisRime/RimeQ/actions/workflows/deploy.yml">
    <img src="https://img.shields.io/github/actions/workflow/status/YisRime/RimeQ/deploy.yml?style=flat-square" alt="Status">
  </a>
  <img src="https://img.shields.io/github/package-json/v/YisRime/RimeQ?style=flat-square" alt="Version">
  <a href="https://github.com/YisRime/RimeQ/stargazers">
    <img src="https://img.shields.io/github/stars/YisRime/RimeQ?style=flat-square&color=blue" alt="Stars">
  </a>
</p>

# RimeQ

一个支持完善、功能丰富、界面美观的网页版 QQ 客户端。

支持连接到兼容 [OneBot](https://github.com/botuniverse/onebot-11) 协议的后端（[NapCat](https://github.com/NapNeko/NapCat), [LLOneBot](https://github.com/LLOneBot/LuckyLilliaBot), [Lagrange](https://github.com/LagrangeDev/Lagrange.OneBot)）。

## 功能特性

- **消息渲染**：
  - 支持艾特、引用、图片、视频、语音、文件等基础类型。
  - 支持渲染 QQ 表情，播放超级表情动画。
  - 支持卡片消息与 Markdown 消息，可展开查看转发消息。
  - 支持显示成员角色（群主或管理）与群头衔。
- **消息交互**：
  - 提供 +1、引用、撤回、设精、**收藏**、**戳一戳**、**预览 Markdown**等功能。
  - 支持批量选择消息并**逐条转发**或**合并转发**多个对象。
  - 点击引用消息可快速定位原文，点击艾特消息可快速插入对象。
- **原生输入**：
  - 支持富文本编辑，支持混合输入图片、表情等内容。
  - 支持 **@艾特** 成员，并展示可供选择的艾特列表。
  - 支持普通表情、超级表情、收藏表情和本地表情的输入。
  - 支持**粘贴或拖拽**图片和文件，可实现图文混排。
- **功能支持**：
  - 支持群信息和群成员，可设置群相关信息、对群成员进行操作。
  - 支持群文件，对不同类型文件显示不同图标，并提供快速操作。
  - 支持群公告与群精华，完整显示内容，支持编辑，公告支持置顶。
  - 支持群相册，适配不同后端，支持编辑与点赞等操作。

- **其它特性**：
  - 响应式设计，适配不同宽度设备，并支持 PWA。
  - 可选防撤回，本地缓存历史消息，支持搜索消息历史。
  - 支持使用 HTTP SSE 与 Websocket 进行连接。

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=YisRime/RimeQ&type=Date)](https://star-history.com/#YisRime/RimeQ&Date)
