
# JHPCIC Project Deployment Guide (Cloudflare Edition)

**当前架构**: Stage 2 (Vite + Pages Functions + KV)

## 1. Cloudflare Pages 界面配置步骤

### 步骤 A: 构建配置 (Build Settings)
- **Framework preset**: `None`
- **Build command**: `npm run build`
- **Build output directory**: `dist`

### 步骤 B: 环境变量 (Environment Variables)
- **API_KEY**: 填写您的 Google Gemini API 密钥。

### 步骤 C: KV 绑定 (Functions KV Bindings)
1. 前往 **Settings** -> **Functions** -> **KV namespace bindings**。
2. 点击 **Add binding**。
3. **Variable name**: 必须填写 `KV_BINDING`。
4. **KV namespace**: 选择您创建的 KV 数据库 (ID: e6478c164fde49789c9cf3d1ee142617)。
5. **保存并重新部署**。

## 2. 为什么需要 KV 绑定？
- **微信兼容性**: 微信不允许过长的 URL（Base64 模式）。
- **短链方案**: 通过 KV 存储，生成的 URL 仅包含一个短 ID，确保在微信扫码时 100% 成功跳转。
- **持久化**: 保单数据将在 KV 中安全存储 30 天。
