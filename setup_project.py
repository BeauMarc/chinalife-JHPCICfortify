# 1. 创建更新脚本
cat << 'EOF' > update_ai_features.py
import os

updates = {
    "utils/ai.ts": r"""import { GoogleGenAI, Type } from "@google/genai";

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
}""",

    "pages/Admin.tsx": r"""import React, { useState, useEffect, useRef } from 'react';
import { encodeData, InsuranceData, CoverageItem } from '../utils/codec';
import { scanPersonImage, scanVehicleImage } from '../utils/ai';
import QRCode from 'qrcode';

// Types for Profiles
interface PersonProfile {
  id: string; 
  name: string;
  idType: string;
  idCard: string;
  mobile: string;
  address: string;
}

interface VehicleProfile {
  id: string; 
  plate: string;
  vin: string;
  engineNo: string;
  brand: string;
  vehicleOwner: string;
  registerDate: string;
  curbWeight: string;
  approvedLoad: string;
}

const INITIAL_DATA: InsuranceData = {
  orderId: `JH-${Math.floor(Math.random() * 100000)}`,
  status: 'pending',
  proposer: { name: '张三', idType: '身份证', idCard: '110101199001011234', mobile: '13800138000', address: '北京市朝阳区建国路88号' },
  insured: { name: '张三', idType: '身份证', idCard: '110101199001011234', mobile: '13800138000', address: '北京市朝阳区建国路88号' },
  vehicle: { plate: '京A88888', vin: 'LFV...', engineNo: '123456', brand: '特斯拉 Model 3', vehicleOwner: '张三', registerDate: '2023-01-01', curbWeight: '1800KG', approvedLoad: '5人' },
  project: { region: '北京', period: '2024-05-20 至 2025-05-19', premium: '15333.84', coverages: [{ name: '机动车损失保险', amount: '300,000.00', deductible: '/', premium: '4,500.00' }, { name: '机动车第三者责任保险', amount: '1,000,000.00', deductible: '/', premium: '10,833.84' }] },
  payment: { alipayUrl: 'https://alipay.com/example', wechatUrl: 'https://wechat.com/example' }
};

interface HistoryRecord { id: string; timestamp: string; summary: string; data: InsuranceData; }

const Admin: React.FC = () => {
  const [data, setData] = useState<InsuranceData>(INITIAL_DATA);
  const [activeTab, setActiveTab] = useState<'proposer' | 'insured' | 'vehicle' | 'project' | 'generate' | 'history'>('proposer');
  const [qrCode, setQrCode] = useState<string>('');
  const [generatedLink, setGeneratedLink] = useState<string>('');
  const [isPaidMode, setIsPaidMode] = useState(false);
  const [isCloudLoading, setIsCloudLoading] = useState(false);
  const [isAIScanning, setIsAIScanning] = useState(false);
  
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [personProfiles, setPersonProfiles] = useState<PersonProfile[]>([]);
  const [vehicleProfiles, setVehicleProfiles] = useState<VehicleProfile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isLocal = window.location.protocol === 'file:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  useEffect(() => {
    const total = data.project.coverages.reduce((sum, item) => {
      const val = parseFloat(item.premium.replace(/,/g, ''));
      return sum + (isNaN(val) ? 0 : val);
    }, 0);
    setData(prev => ({ ...prev, project: { ...prev.project, premium: total.toFixed(2) } }));
  }, [data.project.coverages]);

  const handleInputChange = (section: keyof InsuranceData, field: string, value: string) => {
    setData(prev => ({ ...prev, [section]: { ...(prev[section] as any), [field]: value } }));
  };

  const triggerAIScan = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsAIScanning(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      try {
        if (activeTab === 'proposer' || activeTab === 'insured') {
          const result = await scanPersonImage(base64);
          if (result) setData(prev => ({ ...prev, [activeTab]: { ...prev[activeTab as 'proposer' | 'insured'], ...result } }));
        } else if (activeTab === 'vehicle') {
          const result = await scanVehicleImage(base64);
          if (result) setData(prev => ({ ...prev, vehicle: { ...prev.vehicle, ...result } }));
        }
      } catch (err) { alert("AI 扫描失败"); }
      finally { setIsAIScanning(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
    };
    reader.readAsDataURL(file);
  };

  const savePersonProfile = (person: InsuranceData['proposer']) => {
    const newProfile: PersonProfile = { id: `${person.name}-${person.mobile}`, ...person };
    setPersonProfiles(prev => [...prev.filter(p => p.id !== newProfile.id), newProfile]);
    alert("已保存联系人");
  };

  const generateLink = async () => {
    setIsCloudLoading(true);
    const payload = { ...data, status: isPaidMode ? 'paid' : 'pending' };
    let finalUrl = '';
    const baseUrl = window.location.href.split('#')[0];
    try {
      const res = await fetch('/api/save', { method: 'POST', body: JSON.stringify(payload) });
      const resData = await res.json();
      if (resData.id) finalUrl = `${baseUrl}#/buffer?id=${resData.id}`;
    } catch (e) {}
    if (!finalUrl) finalUrl = `${baseUrl}#/buffer?data=${encodeData(payload)}`;
    setGeneratedLink(finalUrl);
    setQrCode(await QRCode.toDataURL(finalUrl));
    setIsCloudLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 font-sans">
      <header className="bg-jh-green text-white p-6 shadow-lg sticky top-0 z-20">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">中国人寿财险 | AI 智能录入端</h1>
          <span className="text-xs opacity-70">Stage 2 + Gemini AI</span>
        </div>
      </header>

      <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleFileChange} />

      {isAIScanning && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
           <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-jh-green border-t-transparent rounded-full animate-spin"></div>
              <p className="font-bold">✨ AI 正在提取信息...</p>
           </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto p-4 md:p-8">
        <div className="flex overflow-x-auto gap-3 mb-8">
          {['proposer', 'insured', 'vehicle', 'project', 'generate', 'history'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab as any)} className={`px-6 py-3 rounded-xl whitespace-nowrap text-sm font-bold ${activeTab === tab ? 'bg-jh-green text-white' : 'bg-white text-gray-400 border'}`}>
              {tab}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-10 min-h-[400px]">
          {(activeTab === 'proposer' || activeTab === 'insured' || activeTab === 'vehicle') && (
            <div className="mb-8 flex justify-between items-center border-b pb-4">
               <h2 className="text-xl font-bold">信息录入 - {activeTab}</h2>
               <button onClick={triggerAIScan} className="bg-jh-green/10 text-jh-green px-4 py-2 rounded-lg font-bold border border-jh-green/20 hover:bg-jh-green/20 transition-all">✨ AI 拍照识别</button>
            </div>
          )}

          {activeTab === 'proposer' && (
            <div className="grid grid-cols-2 gap-6">
              <FloatingInput label="名称" value={data.proposer.name} onChange={(v:any) => handleInputChange('proposer', 'name', v)} />
              <FloatingInput label="手机号" value={data.proposer.mobile} onChange={(v:any) => handleInputChange('proposer', 'mobile', v)} />
              <FloatingInput label="证件号" value={data.proposer.idCard} onChange={(v:any) => handleInputChange('proposer', 'idCard', v)} />
              <FloatingInput label="住址" value={data.proposer.address} onChange={(v:any) => handleInputChange('proposer', 'address', v)} />
            </div>
          )}
          
          {activeTab === 'vehicle' && (
            <div className="grid grid-cols-2 gap-6">
              <FloatingInput label="车牌号" value={data.vehicle.plate} onChange={(v:any) => handleInputChange('vehicle', 'plate', v)} />
              <FloatingInput label="车架号" value={data.vehicle.vin} onChange={(v:any) => handleInputChange('vehicle', 'vin', v)} />
              <FloatingInput label="所有人" value={data.vehicle.vehicleOwner} onChange={(v:any) => handleInputChange('vehicle', 'vehicleOwner', v)} />
              <FloatingInput label="品牌型号" value={data.vehicle.brand} onChange={(v:any) => handleInputChange('vehicle', 'brand', v)} />
            </div>
          )}

          {activeTab === 'generate' && (
            <div className="flex flex-col items-center">
               <button onClick={generateLink} className="bg-jh-green text-white px-10 py-4 rounded-xl font-bold shadow-lg">生成并同步云端</button>
               {qrCode && <div className="mt-10 flex flex-col items-center"><img src={qrCode} className="w-48 h-48 border p-2" /><p className="mt-2 text-xs text-gray-400">扫码打开客户端流程</p></div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const FloatingInput = ({ label, value, onChange }: any) => (
  <div className="relative border rounded-lg p-2">
    <label className="text-[10px] text-gray-400 uppercase">{label}</label>
    <input className="block w-full outline-none font-medium" value={value} onChange={e => onChange(e.target.value)} />
  </div>
);

export default Admin;"""
}

for path, content in updates.items():
    dir_name = os.path.dirname(path)
    if dir_name: os.makedirs(dir_name, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f: f.write(content)
    print(f"✅ Updated: {path}")

EOF

# 2. 运行脚本进行更新
python3 update_ai_features.py