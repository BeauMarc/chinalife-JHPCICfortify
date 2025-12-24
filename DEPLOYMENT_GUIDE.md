
# JHPCIC Project Deployment & Handover Guide (beaumarc Edition)

**Version**: Stage 2 (Cloudflare Integration)
**User**: beaumarc

## 1. 核心架构变更 (Architecture Overview)

本系统采用 **Cloudflare Pages + Functions + KV** 架构，解决了长链接在微信中无法访问的问题。

---

## 2. 部署指南 (beaumarc 专用)

### 步骤 A: 推送代码到 GitHub
请在本地终端执行以下指令，将代码推送到你的新仓库：

```bash
# 1. 初始化
git init

# 2. 关联远程仓库 (用户: beaumarc)
git remote add origin https://github.com/beaumarc/jhpcic.git

# 3. 提交代码
git add .
git commit -m "feat: complete Stage 2 architecture with Gemini AI & KV storage"

# 4. 推送
git branch -M main
git push -u origin main
```

### 步骤 B: 构建与部署
1. **构建项目**:
   ```bash
   npm install
   npm run build
   ```

2. **上传至 Cloudflare**:
   ```bash
   # 这里的项目名建议与仓库一致
   npx wrangler pages deploy dist --project-name jhpcic
   ```

### 步骤 C: 关键配置 (必做)
在 Cloudflare 后台配置以下两项，否则功能无法生效：

1. **绑定 KV**: 
   - 变量名: `JHPCIC_STORE`
   - 命名空间: 选择你的 KV 实例。
2. **配置 API Key**:
   - 在 **Settings -> Environment Variables** 中添加变量：
   - **Variable name**: `API_KEY`
   - **Value**: *[填入你的 Google Gemini API Key]*

---

## 3. 故障排查
- **API 500**: 通常是因为 KV 未绑定或变量名 `JHPCIC_STORE` 写错。
- **AI 无法识别**: 请检查是否在 Cloudflare 后台设置了 `API_KEY` 环境变量。
