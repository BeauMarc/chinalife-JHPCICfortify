import { GoogleGenAI, Type } from "@google/genai";

// Initialize AI Client
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * 提取图片中的投保人信息
 */
export async function scanPersonImage(base64Image: string) {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        parts: [
          { inlineData: { data: base64Image.split(',')[1] || base64Image, mimeType: "image/jpeg" } },
          { text: "这是一个投保人的证件照片。请提取其中的姓名、证件号、手机号（如果存在）和详细地址。请以 JSON 格式返回。" }
        ]
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          idCard: { type: Type.STRING },
          mobile: { type: Type.STRING },
          address: { type: Type.STRING },
          idType: { type: Type.STRING, description: "证件类型，如：身份证" }
        }
      }
    }
  });

  try {
    return JSON.parse(response.text || "{}");
  } catch (e) {
    console.error("AI JSON Parse Error", e);
    return null;
  }
}

/**
 * 提取图片中的车辆信息（行驶证/车辆照片）
 */
export async function scanVehicleImage(base64Image: string) {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        parts: [
          { inlineData: { data: base64Image.split(',')[1] || base64Image, mimeType: "image/jpeg" } },
          { text: "这是一个车辆行驶证或车辆照片。请提取车牌号、车架号(VIN)、发动机号、品牌型号、车辆所有人、初次登记日期。请以 JSON 格式返回。" }
        ]
      }
    ],
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
          registerDate: { type: Type.STRING, description: "YYYY-MM-DD 格式" },
          curbWeight: { type: Type.STRING },
          approvedLoad: { type: Type.STRING }
        }
      }
    }
  });

  try {
    return JSON.parse(response.text || "{}");
  } catch (e) {
    console.error("AI JSON Parse Error", e);
    return null;
  }
}
