
import { GoogleGenAI, Type } from "@google/genai";

/**
 * 获取并验证 API Key
 */
const getApiKey = () => {
  let key = process.env.API_KEY;
  
  if (!key || key === "undefined" || key === "") {
    console.error("AI_CONFIG_ERROR: 环境变量 API_KEY 未定义。");
    return null;
  }

  // 移除可能存在的首尾空格
  key = key.trim();

  // 常见错误检查：如果 Key 以引号开头和结尾，说明用户在 Cloudflare 后台填错了
  if ((key.startsWith("'") && key.endsWith("'")) || (key.startsWith('"') && key.endsWith('"'))) {
    console.error("AI_CONFIG_ERROR: 检测到 API_KEY 包含了多余的引号！请前往 Cloudflare 删掉 Value 框里的引号。");
    return null;
  }

  // 脱敏打印首尾，方便核对
  console.log(`AI_CONFIG_CHECK: 已加载 (长度: ${key.length}, 开头: ${key.substring(0, 4)}..., 结尾: ...${key.substring(key.length - 4)})`);
  
  return key;
};

/**
 * 格式化 AI 错误信息
 */
const handleAIError = (e: any) => {
  console.error("AI_DEBUG_FULL_ERROR:", e);
  const errorStr = e.toString();
  
  // 识别具体的 400 错误类型
  if (errorStr.includes("API key not valid") || errorStr.includes("INVALID_ARGUMENT")) {
    return "API Key 无效。请检查：1. Cloudflare 后台变量值是否有引号或空格；2. 是否点击了 'Retry deployment'；3. Key 是否在 Google AI Studio 中被停用。";
  }
  
  return `识别服务异常: ${e.message || "未知错误"}`;
};

/**
 * 提取图片中的投保人信息
 */
export async function scanPersonImage(base64Image: string) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API 密钥未配置或格式错误。请查看浏览器控制台 (F12) 的错误详情。");

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
  if (!apiKey) throw new Error("API 密钥未配置或格式错误。");

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
