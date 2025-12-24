
import { GoogleGenAI, Type } from "@google/genai";

/**
 * 获取并验证 API Key
 */
const getApiKey = () => {
  const key = process.env.API_KEY;
  // Vite 在构建时如果没找到变量，可能会将其字符串化为 "undefined"
  if (!key || key === "undefined" || key === "") {
    console.error("AI_DEBUG: API_KEY is missing. Ensure it is set in Cloudflare Build Environment Variables.");
    return null;
  }
  return key;
};

/**
 * 提取图片中的投保人信息
 */
export async function scanPersonImage(base64Image: string) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("缺少 API 密钥。请在 Cloudflare 控制台配置环境变量 API_KEY 并重新部署。");

  const ai = new GoogleGenAI({ apiKey });
  const base64Data = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;

  try {
    console.log("AI_DEBUG: 发起证件识别请求...");
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
    console.error("AI_DEBUG: 证件识别失败:", e);
    throw e;
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
    console.log("AI_DEBUG: 发起行驶证识别请求...");
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
    console.error("AI_DEBUG: 行驶证识别失败:", e);
    throw e;
  }
}
