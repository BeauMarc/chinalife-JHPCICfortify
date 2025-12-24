# Cloudflare Serverless Architecture (Stage 2)

本系统采用 **Cloudflare Pages + Functions + KV** 架构。

## 1. 架构组件
*   **Frontend**: React SPA，部署在 Cloudflare Pages。
*   **Backend**: Cloudflare Pages Functions (`functions/`)。
*   **Database**: Workers KV，用于存储保单数据以生成短链接。

## 2. 部署配置 (必须操作)

为了使微信扫码正常工作，您必须在 Cloudflare Dashboard 完成以下绑定：

1.  进入 **Workers & Pages** -> 选择您的项目。
2.  点击 **Settings** (设置) -> **Functions** (函数)。
3.  找到 **KV Namespace Bindings**。
4.  点击 **Add binding**：
    *   **Variable name**: `KV_BINDING`  <-- 必须与您的设置一致
    *   **KV Namespace**: 选择 ID 为 `e6478c164fde49789c9cf3d1ee142617` 的空间。
5.  点击 **Save** 并 **重新部署**。

## 3. 数据流
1.  **Admin 端**: 录入数据 -> 调用 `/api/save` -> 数据存入 KV -> 获得 UUID。
2.  **二维码**: 包含 `?id=UUID` 的超短链接。
3.  **Client 端**: 扫码 -> 调用 `/api/get?id=UUID` -> 获取数据渲染。