
import React, { useState, useEffect, useRef } from 'react';
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

// Initial default state
const INITIAL_DATA: InsuranceData = {
  orderId: `JH-${Math.floor(Math.random() * 100000)}`,
  status: 'pending',
  proposer: { 
    name: '张三', 
    idType: '身份证', 
    idCard: '110101199001011234', 
    mobile: '13800138000', 
    address: '北京市朝阳区建国路88号' 
  },
  insured: { 
    name: '张三', 
    idType: '身份证', 
    idCard: '110101199001011234', 
    mobile: '13800138000', 
    address: '北京市朝阳区建国路88号' 
  },
  vehicle: { 
    plate: '京A88888', 
    vin: 'LFV...', 
    engineNo: '123456', 
    brand: '特斯拉 Model 3',
    vehicleOwner: '张三',
    registerDate: '2023-01-01',
    curbWeight: '1800KG',
    approvedLoad: '5人'
  },
  project: { 
    region: '北京', 
    period: '2024-05-20 至 2025-05-19', 
    premium: '15333.84', 
    coverages: [
      { name: '机动车损失保险', amount: '300,000.00', deductible: '/', premium: '4,500.00' },
      { name: '机动车第三者责任保险', amount: '1,000,000.00', deductible: '/', premium: '10,833.84' }
    ]
  },
  payment: { alipayUrl: 'https://alipay.com/example', wechatUrl: 'https://wechat.com/example' }
};

interface HistoryRecord {
  id: string;
  timestamp: string;
  summary: string;
  data: InsuranceData;
}

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
    
    setData(prev => ({
      ...prev,
      project: {
        ...prev.project,
        premium: total.toFixed(2)
      }
    }));
  }, [data.project.coverages]);

  const handleInputChange = (section: keyof InsuranceData, field: string, value: string) => {
    setData(prev => ({
      ...prev,
      [section]: {
        ...(prev[section] as any),
        [field]: value
      }
    }));
  };

  const triggerAIScan = () => {
    fileInputRef.current?.click();
  };

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
          if (result) {
            setData(prev => ({
              ...prev,
              [activeTab]: {
                ...prev[activeTab as 'proposer' | 'insured'],
                ...result
              }
            }));
          }
        } else if (activeTab === 'vehicle') {
          const result = await scanVehicleImage(base64);
          if (result) {
            setData(prev => ({
              ...prev,
              vehicle: {
                ...prev.vehicle,
                ...result
              }
            }));
          }
        }
      } catch (err) {
        alert("AI 扫描失败，请检查网络或手动录入。");
      } finally {
        setIsAIScanning(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsDataURL(file);
  };

  const handleStartDateChange = (startDate: string) => {
    if (!startDate) return;
    const start = new Date(startDate);
    const end = new Date(start);
    end.setFullYear(end.getFullYear() + 1);
    end.setDate(end.getDate() - 1);
    const endDate = end.toISOString().split('T')[0];
    setData(prev => ({ ...prev, project: { ...prev.project, period: `${startDate} 至 ${endDate}` } }));
  };

  const handleEndDateChange = (endDate: string) => {
    const currentPeriodParts = data.project.period.split(' 至 ');
    const startDate = currentPeriodParts[0] || '';
    setData(prev => ({ ...prev, project: { ...prev.project, period: `${startDate} 至 ${endDate}` } }));
  };

  const handleCoverageChange = (index: number, field: keyof CoverageItem, value: string) => {
    const newCoverages = [...data.project.coverages];
    newCoverages[index] = { ...newCoverages[index], [field]: value };
    setData(prev => ({ ...prev, project: { ...prev.project, coverages: newCoverages } }));
  };

  const addCoverage = () => {
    setData(prev => ({ ...prev, project: { ...prev.project, coverages: [...prev.project.coverages, { name: '', amount: '', deductible: '/', premium: '0.00' }] } }));
  };

  const removeCoverage = (index: number) => {
    const newCoverages = data.project.coverages.filter((_, i) => i !== index);
    setData(prev => ({ ...prev, project: { ...prev.project, coverages: newCoverages } }));
  };

  const generateLink = async () => {
    const payload = { ...data, status: isPaidMode ? 'paid' : 'pending' };
    
    const newRecord: HistoryRecord = {
      id: Date.now().toString(),
      timestamp: new Date().toLocaleString(),
      summary: `${data.proposer.name} - ${data.vehicle.plate}`,
      data: JSON.parse(JSON.stringify(payload))
    };
    setHistory(prev => [newRecord, ...prev]);

    let finalUrl = '';
    const baseUrl = window.location.href.split('#')[0];

    setIsCloudLoading(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    try {
      const response = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal 
      });
      
      clearTimeout(timeoutId); 

      if (response.ok) {
        const resData = await response.json();
        if (resData.id) {
           finalUrl = `${baseUrl}#/buffer?id=${resData.id}`;
        }
      } else {
        const errJson = await response.json();
        console.error("API Error:", errJson.error);
      }
    } catch (e) {
      console.warn("Cloudflare KV Save failed, falling back to Base64.", e);
    } finally {
      setIsCloudLoading(false);
    }

    if (!finalUrl) {
      const base64 = encodeData(payload);
      finalUrl = `${baseUrl}#/buffer?data=${base64}`;
    }

    setGeneratedLink(finalUrl);
    
    try {
      const qr = await QRCode.toDataURL(finalUrl, { margin: 2, width: 600 });
      setQrCode(qr);
    } catch (err) {
      console.error(err);
    }
  };

  const loadRecord = (record: HistoryRecord) => {
    if (!window.confirm(`确认加载 "${record.summary}"？`)) return;
    const freshData: InsuranceData = { ...record.data, orderId: `JH-${Math.floor(Math.random() * 100000)}`, status: 'pending' };
    setData(freshData);
    setQrCode('');
    setGeneratedLink('');
    setActiveTab('proposer');
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 font-sans">
      <header className="bg-gradient-to-r from-jh-green to-emerald-700 text-white p-6 shadow-lg sticky top-0 z-20">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">中国人寿财险</h1>
            <p className="text-sm opacity-90 font-light tracking-wider">业务员录入系统 (Autopay)</p>
          </div>
          <div className="text-right hidden md:block">
            <span className="bg-white/10 px-3 py-1 rounded-full text-xs backdrop-blur-sm border border-white/20">KV_BINDING Mode</span>
          </div>
        </div>
      </header>

      <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleFileChange} />

      {isAIScanning && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
           <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-6 animate-fade-in">
              <div className="w-20 h-20 border-4 border-jh-green/20 border-t-jh-green rounded-full animate-spin"></div>
              <div className="text-center">
                <p className="text-xl font-bold text-gray-800">AI 正在扫描提取...</p>
              </div>
           </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto p-4 md:p-8">
        
        <div className="flex overflow-x-auto gap-3 mb-8 pb-2 hide-scrollbar">
          {(['proposer', 'insured', 'vehicle', 'project', 'generate', 'history'] as const).map(tab => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 rounded-xl whitespace-nowrap text-sm font-bold transition-all duration-300 shadow-sm border ${
                  isActive 
                    ? 'bg-jh-green text-white border-jh-green shadow-md transform scale-105' 
                    : 'bg-white text-gray-500 border-gray-100 hover:bg-gray-50 hover:border-gray-200'
                }`}
              >
                {tab === 'proposer' && '1. 投保人'}
                {tab === 'insured' && '2. 被保险人'}
                {tab === 'vehicle' && '3. 车辆信息'}
                {tab === 'project' && '4. 投保方案'}
                {tab === 'generate' && '5. 生成链接'}
                {tab === 'history' && '6. 历史'}
              </button>
            );
          })}
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 md:p-10 transition-all">
          
          {activeTab === 'proposer' && (
            <div className="animate-fade-in space-y-8">
              <div className="border-b border-gray-100 pb-4 flex justify-between items-end">
                <h2 className="text-2xl font-bold text-gray-800">投保人信息</h2>
                <button onClick={triggerAIScan} className="bg-jh-green/10 text-jh-green px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2"><span>✨</span> AI 识别</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <FloatingInput label="名称" value={data.proposer.name} onChange={(v: string) => handleInputChange('proposer', 'name', v)} />
                <FloatingInput label="手机号" value={data.proposer.mobile} onChange={(v: string) => handleInputChange('proposer', 'mobile', v)} type="tel" />
                <FloatingInput label="证件类型" value={data.proposer.idType} onChange={(v: string) => handleInputChange('proposer', 'idType', v)} />
                <FloatingInput label="证件号" value={data.proposer.idCard} onChange={(v: string) => handleInputChange('proposer', 'idCard', v)} />
                <div className="md:col-span-2"><FloatingInput label="住址" value={data.proposer.address} onChange={(v: string) => handleInputChange('proposer', 'address', v)} /></div>
              </div>
            </div>
          )}

          {activeTab === 'insured' && (
            <div className="animate-fade-in space-y-8">
               <div className="border-b border-gray-100 pb-4 flex justify-between items-end">
                <h2 className="text-2xl font-bold text-gray-800">被保险人信息</h2>
                <button onClick={triggerAIScan} className="bg-jh-green/10 text-jh-green px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2"><span>✨</span> AI 识别</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <FloatingInput label="名称" value={data.insured.name} onChange={(v: string) => handleInputChange('insured', 'name', v)} />
                <FloatingInput label="手机号" value={data.insured.mobile} onChange={(v: string) => handleInputChange('insured', 'mobile', v)} type="tel" />
                <FloatingInput label="证件类型" value={data.insured.idType} onChange={(v: string) => handleInputChange('insured', 'idType', v)} />
                <FloatingInput label="证件号" value={data.insured.idCard} onChange={(v: string) => handleInputChange('insured', 'idCard', v)} />
                <div className="md:col-span-2"><FloatingInput label="住址" value={data.insured.address} onChange={(v: string) => handleInputChange('insured', 'address', v)} /></div>
              </div>
            </div>
          )}

          {activeTab === 'vehicle' && (
            <div className="animate-fade-in space-y-8">
              <div className="border-b border-gray-100 pb-4 flex justify-between items-end">
                 <h2 className="text-2xl font-bold text-gray-800">车辆信息</h2>
                 <button onClick={triggerAIScan} className="bg-jh-green/10 text-jh-green px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2"><span>✨</span> 行驶证识别</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <FloatingInput label="车牌号" value={data.vehicle.plate} onChange={(v: string) => handleInputChange('vehicle', 'plate', v)} />
                <FloatingInput label="车辆所有人" value={data.vehicle.vehicleOwner} onChange={(v: string) => handleInputChange('vehicle', 'vehicleOwner', v)} />
                <FloatingInput label="品牌型号" value={data.vehicle.brand} onChange={(v: string) => handleInputChange('vehicle', 'brand', v)} />
                <FloatingInput label="车架号 (VIN)" value={data.vehicle.vin} onChange={(v: string) => handleInputChange('vehicle', 'vin', v)} />
                <FloatingInput label="发动机号" value={data.vehicle.engineNo} onChange={(v: string) => handleInputChange('vehicle', 'engineNo', v)} />
                <FloatingInput label="初次登记日期" value={data.vehicle.registerDate} onChange={(v: string) => handleInputChange('vehicle', 'registerDate', v)} type="date" />
                <FloatingInput label="整备质量" value={data.vehicle.curbWeight} onChange={(v: string) => handleInputChange('vehicle', 'curbWeight', v)} />
                <FloatingInput label="核定载质量" value={data.vehicle.approvedLoad} onChange={(v: string) => handleInputChange('vehicle', 'approvedLoad', v)} />
              </div>
            </div>
          )}

          {activeTab === 'project' && (
             <div className="animate-fade-in space-y-6">
              <div className="border-b border-gray-100 pb-4 mb-6">
                 <h2 className="text-2xl font-bold text-gray-800">投保方案</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <FloatingInput label="投保地区" value={data.project.region} onChange={(v: string) => handleInputChange('project', 'region', v)} />
                <div className="bg-white rounded-xl border border-gray-300 p-4 relative">
                    <label className="absolute -top-3 left-3 bg-white px-1 text-sm text-jh-green font-medium">保险期间</label>
                    <div className="flex items-center gap-2">
                        <input type="date" className="flex-1 outline-none" value={data.project.period.split(' 至 ')[0]||''} onChange={(e) => handleStartDateChange(e.target.value)}/>
                        <span className="text-gray-300">至</span>
                        <input type="date" className="flex-1 outline-none text-right" value={data.project.period.split(' 至 ')[1]||''} onChange={(e) => handleEndDateChange(e.target.value)}/>
                    </div>
                </div>
              </div>
              <div className="bg-gray-50 rounded-2xl p-4 overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead><tr className="text-gray-400 border-b border-gray-200">
                    <th className="p-3">险种</th><th className="p-3">保额</th><th className="p-3">免赔</th><th className="p-3">保费</th><th className="p-3 text-center">操作</th>
                  </tr></thead>
                  <tbody>
                      {data.project.coverages.map((item, idx) => (
                        <tr key={idx} className="border-b border-gray-100">
                          <td className="p-3"><input className="w-full bg-transparent outline-none" value={item.name} onChange={(e) => handleCoverageChange(idx, 'name', e.target.value)} /></td>
                          <td className="p-3"><input className="w-full bg-transparent font-mono outline-none" value={item.amount} onChange={(e) => handleCoverageChange(idx, 'amount', e.target.value)} /></td>
                          <td className="p-3"><input className="w-full bg-transparent outline-none" value={item.deductible} onChange={(e) => handleCoverageChange(idx, 'deductible', e.target.value)} /></td>
                          <td className="p-3"><input className="w-full bg-transparent font-mono outline-none" value={item.premium} onChange={(e) => handleCoverageChange(idx, 'premium', e.target.value)} /></td>
                          <td className="p-3 text-center"><button onClick={() => removeCoverage(idx)} className="text-red-300 hover:text-red-500 font-bold">&times;</button></td>
                        </tr>
                      ))}
                    </tbody>
                </table>
                <button onClick={addCoverage} className="mt-4 w-full py-2 bg-white border border-dashed border-gray-300 text-gray-400 rounded-lg">+ 添加险种</button>
              </div>
              <div className="text-right p-4">
                 <span className="text-gray-500 font-bold mr-4">保险费合计</span>
                 <span className="text-2xl font-bold text-jh-green font-mono">¥ {data.project.premium}</span>
              </div>
            </div>
          )}

          {activeTab === 'generate' && (
            <div className="animate-fade-in flex flex-col items-center max-w-lg mx-auto py-8 text-center">
              <h2 className="text-2xl font-bold text-gray-800 mb-8">生成支付二维码</h2>
              
              <div className="bg-jh-green/5 p-6 rounded-2xl text-left text-sm text-jh-green mb-8 border border-jh-green/10">
                 <p className="font-bold mb-2">💡 Cloudflare KV 短链模式</p>
                 <p className="opacity-80">系统将优先把保单同步至云端。生成的二维码将包含一个唯一的短 ID，确保在微信中 100% 成功跳转。若同步失败，将自动回退到 Base64 模式。</p>
              </div>

              <button 
                onClick={generateLink}
                disabled={isCloudLoading}
                className={`w-full bg-jh-green text-white font-bold py-4 rounded-xl shadow-lg transition-all active:scale-[0.98] text-lg flex items-center justify-center gap-2 ${isCloudLoading ? 'opacity-70 cursor-wait' : ''}`}
              >
                {isCloudLoading ? "正在同步至 KV_BINDING..." : "立即生成短链二维码"}
              </button>

              {qrCode && (
                <div className="mt-10 p-8 bg-white border border-gray-100 rounded-3xl shadow-2xl flex flex-col items-center w-full animate-fade-in-up">
                  <img src={qrCode} alt="Client QR Code" className="w-64 h-64 shadow-inner p-2 border border-gray-50 rounded-lg" />
                  <p className="text-gray-500 font-medium mt-6">请客户使用微信/支付宝扫码</p>
                  <div className="mt-6 w-full p-3 bg-gray-50 rounded-lg text-[10px] break-all text-gray-300 font-mono">
                     {generatedLink}
                  </div>
                  <a href={generatedLink} target="_blank" rel="noreferrer" className="mt-4 text-jh-green font-bold text-sm underline">预览客户端</a>
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
             <div className="animate-fade-in space-y-6">
               <div className="border-b border-gray-100 pb-4"><h2 className="text-2xl font-bold text-gray-800">历史归档</h2></div>
               {history.length === 0 ? <div className="text-center py-20 text-gray-400">暂无记录</div> : 
                 <div className="space-y-4">
                    {history.map(r => (
                       <div key={r.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl hover:bg-jh-green/5 transition-colors group">
                          <div><p className="font-bold text-gray-800">{r.summary}</p><p className="text-xs text-gray-400">{r.timestamp}</p></div>
                          <button onClick={() => loadRecord(r)} className="text-jh-green font-bold opacity-0 group-hover:opacity-100 transition-opacity">重新加载</button>
                       </div>
                    ))}
                 </div>
               }
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface FloatingInputProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}

const FloatingInput: React.FC<FloatingInputProps> = ({ label, value, onChange, type = "text" }) => {
  const id = React.useId();
  return (
    <div className="relative">
      <input 
        type={type} 
        id={id} 
        className="block px-4 pb-2.5 pt-6 w-full text-base bg-white rounded-xl border border-gray-300 focus:ring-1 focus:ring-jh-green focus:border-jh-green peer outline-none transition-all" 
        placeholder=" " 
        value={value} 
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)} 
      />
      <label htmlFor={id} className="absolute text-sm text-gray-500 duration-300 transform -translate-y-3 scale-75 top-4 left-4 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-3 pointer-events-none">{label}</label>
    </div>
  );
};

export default Admin;
