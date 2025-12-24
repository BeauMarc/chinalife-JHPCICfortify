
# AI Changelog

## [Fix & Enhancement] - 2024-05-24

### 核心修复 (Bug Fixes)
- **签名 Canvas 触摸支持**: 解决了移动端浏览器（微信/Safari）无法在签名页书写姓名的问题。增加了 `onTouchStart`, `onTouchMove`, `onTouchEnd` 事件支持，并修正了绘图路径逻辑。
- **强制条款阅读确认**: 确保用户在进入手机号验证页之前，必须点击阅读全部 3 份 PDF 文档。

### UI 优化 (UI Optimization)
- **Logo 统一**: 支付选择卡片中的渠道图标统一使用官方 Logo (`jhic.jpeg`)。
- **绘图平滑度**: 调整了 Canvas 的 `lineJoin` 和 `lineCap` 属性，使签名线条更加圆润真实。
