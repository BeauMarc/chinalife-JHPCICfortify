
import { GoogleGenAI, Type } from "@google/genai";

/**
 * 获取并验证 API Key
 * 增加脱敏日志，帮助用户在控制台确认 Key 是否正确注入
 */
const getApiKey = () => {
  const key = process.env.API_KEY;
  
  // 打印调试信息到控制台 (F12 查看)
  if (!key || key === "undefined" || key === "") {
    console.error("AI_CONFIG_ERROR: 环境变量 API_KEY 为空或未定义。");
    return null;
  }

  // 脱敏打印，用于核对
  console.log(`AI_CONFIG_CHECK: Key已检测 (长度: ${key.length}, 开头: ${key.substring(0, 4)}..., 结尾: ...${key.substring(key.length - 4)})`);
  
  return key;
};

/**
 * 格式化 AI 错误信息
 */
const handleAIError = (e: any) => {
  console.error("AI_DEBUG_FULL_ERROR:", e);
  const errorStr = e.toString();
  
  if (errorStr.includes("API key not valid") || errorStr.includes("400")) {
    return "API Key 无效。请检查 Cloudflare Pages 后台变量值是否包含了多余的空格或引号，并确保在修改变量后点击了 'Retry deployment' 重新构建项目。";
  }
  if (errorStr.includes("quota exceeded")) {
    return "API 额度已耗尽。请检查 Google AI Studio 的使用额度。";
  }
  
  return `识别服务异常: ${e.message || "未知错误"}`;
};

/**
 * 提取图片中的投保人信息
 */
export async function scanPersonImage(base64Image: string) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("缺少 API 密钥。请在 Cloudflare 后台配置 API_KEY 并重新部署 (Retry Deployment)。");

  const ai = new GoogleGenAI({ apiKey });
  const base64Data = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { inlineData: { data: base64Data, mimeType: "image/jpeg" } },
          { text: "识别这张证件，提取姓名(name)、证件号(idCard)、手机号(mobile)、详细地址(address)。返回 JSON 格式。证件类型标注为 idType。" }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            idCard: { type: Type.STRING },
            mobile: { type: Type.STRING },
            address: { type: Type.STRING },
            idType: { type: Type.STRING }
          },
          required: ["name", "idCard"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("AI 响应内容为空");
    return JSON.parse(text.trim());
  } catch (e) {
    throw new Error(handleAIError(e));
  }
}

/**
 * 提取图片中的车辆信息
 */
export async function scanVehicleImage(base64Image: string) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("缺少 API 密钥。");

  const ai = new GoogleGenAI({ apiKey });
  const base64Data = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { inlineData: { data: base64Data, mimeType: "image/jpeg" } },
          { text: "识别这张行驶证，提取车牌号(plate)、车架号(vin)、发动机号(engineNo)、品牌型号(brand)、所有人(vehicleOwner)、登记日期(registerDate)。返回 JSON 格式。" }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            plate: { type: Type.STRING },
            vin: { type: Type.STRING },
            engineNo: { type: Type.STRING },
            brand: { type: Type.STRING },
            vehicleOwner: { type: Type.STRING },
            registerDate: { type: Type.STRING }
          },
          required: ["plate", "vin"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("AI 响应内容为空");
    return JSON.parse(text.trim());
  } catch (e) {
    throw new Error(handleAIError(e));
  }
}
