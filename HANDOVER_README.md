
# 📂 Project Handover: JHPCIC (Stage 2)

## 1. 核心变更
本项目已从纯前端 Base64 方案升级为 **Cloudflare KV 短链方案**。

## 2. 部署关键点 (DevOps)
在 Cloudflare Pages 的 **Settings -> Functions** 路径下，必须建立以下映射：
- **变量名**: `KV_BINDING`
- **命名空间**: 指向生产环境的 KV 数据库。

## 3. 容错机制
- **双链路模式**: `Admin.tsx` 生成链接时会优先请求接口存入 KV。如果接口超时或未绑定 KV，系统会自动回退到 Base64 长链接模式，确保业务不中断。
- **AI 识别**: 集成了 Gemini-3-Flash 视觉模型，支持行驶证和身份证自动录入。
