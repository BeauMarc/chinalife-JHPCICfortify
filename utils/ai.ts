
import { GoogleGenAI, Type } from "@google/genai";

/**
 * 获取并验证 API Key
 */
export const getApiKey = () => {
  // 这里读取的是 vite.config.ts 中 define 进去的值
  let key = process.env.API_KEY;
  
  if (!key || key === "undefined" || key === "" || key === "null") {
    return { error: "MISSING", msg: "环境变量注入失败。请在 Cloudflare 后台将 API_KEY 设为 'Text' 模式并重试构建。" };
  }

  // 严格清洗
  key = key.trim().replace(/['"]/g, '');

  if (key.length < 10) {
    return { error: "INVALID_FORMAT", msg: "检测到的 Key 长度过短，注入可能不完整。" };
  }

  return { 
    key, 
    masked: `${key.substring(0, 4)}...${key.substring(key.length - 4)}`,
    length: key.length 
  };
};

/**
 * 格式化 AI 错误信息
 */
const handleAIError = (e: any) => {
  console.error("AI_DEBUG_FULL_ERROR:", e);
  const errorMsg = e.message || e.toString();
  
  // 识别特定状态码
  if (errorMsg.includes("API key not valid") || errorMsg.includes("invalid API key")) {
    return "Google 验证失败：该 Key 无效或已被封禁。";
  }
  if (errorMsg.includes("403")) {
    return "Google 权限错误 (403)：请在 AI Studio 中确认是否启用了 'Generative Language API'。";
  }
  if (errorMsg.includes("429")) {
    return "配额超限 (429)：当前 Key 访问过于频繁。";
  }
  
  return `AI 接口返回错误: ${errorMsg}`;
};

/**
 * 提取图片中的投保人信息
 */
export async function scanPersonImage(base64Image: string) {
  const config = getApiKey();
  if (config.error) throw new Error(config.msg);

  const ai = new GoogleGenAI({ apiKey: config.key! });
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
  const config = getApiKey();
  if (config.error) throw new Error(config.msg);

  const ai = new GoogleGenAI({ apiKey: config.key! });
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
