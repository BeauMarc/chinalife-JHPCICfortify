
# AI Changelog

## [UI/UX Enhancement] - 2024-05-24

### 核心变更 (Core Changes)
- **条款强制阅读**: 在 `ClientIndex.tsx` 的条款页引入了三个 PDF 文件的阅读确认逻辑。用户必须依次点击阅读《保险条款》、《互联网平台用戶个人信息保护政策》及《缴费实名认证授权书》后，"我已阅读并同意"按钮才会激活。
- **Logo 统一化**: 将微信支付和支付宝支付前面的图标统一替换为官方品牌 Logo (`jhic.jpeg`)，增强品牌一致性与信任感。

### 文件路径 (New Assets Reference)
- PDFs 存放路径: `/pdfs/`
- 官方 Logo 路径: `/jhic.jpeg`

### 技术细节
- 使用 React `useState` 追踪各个文档的阅读状态。
- 通过样式反馈（Emerald 绿与 Gray 灰）清晰展示阅读进度。
- 支付选择按钮样式微调，图标容器增加阴影与圆角。
