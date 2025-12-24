
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

  // Storage
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [personProfiles, setPersonProfiles] = useState<PersonProfile[]>([]);
  const [vehicleProfiles, setVehicleProfiles] = useState<VehicleProfile[]>([]);

  // Ref for hidden file input
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Environment Check
  const isLocal = window.location.protocol === 'file:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  // Auto-calculate total premium
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

  // --- Profile Management Logic ---
  const savePersonProfile = (person: InsuranceData['proposer']) => {
    if (!person.name || !person.mobile) { alert("请至少填写名称和手机号才能保存"); return; }
    const newProfile: PersonProfile = { id: `${person.name}-${person.mobile}`, ...person };
    setPersonProfiles(prev => {
      const exists = prev.findIndex(p => p.id === newProfile.id);
      if (exists >= 0) { const updated = [...prev]; updated[exists] = newProfile; return updated; }
      return [...prev, newProfile];
    });
    alert(`已保存联系人：${person.name}`);
  };

  const loadPersonProfile = (profileId: string, target: 'proposer' | 'insured') => {
    const profile = personProfiles.find(p => p.id === profileId);
    if (!profile) return;
    setData(prev => ({ ...prev, [target]: { name: profile.name, idType: profile.idType, idCard: profile.idCard, mobile: profile.mobile, address: profile.address } }));
  };

  const saveVehicleProfile = (vehicle: InsuranceData['vehicle']) => {
    if (!vehicle.plate) { alert("请填写车牌号才能保存"); return; }
    const newProfile: VehicleProfile = { id: vehicle.plate, ...vehicle };
    setVehicleProfiles(prev => {
      const exists = prev.findIndex(p => p.id === newProfile.id);
      if (exists >= 0) { const updated = [...prev]; updated[exists] = newProfile; return updated; }
      return [...prev, newProfile];
    });
    alert(`已保存车辆：${vehicle.plate}`);
  };

  const loadVehicleProfile = (profileId: string) => {
    const profile = vehicleProfiles.find(p => p.id === profileId);
    if (!profile) return;
    setData(prev => ({ ...prev, vehicle: { ...profile } }));
  };

  // --- AI Scan Logic ---
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

  // --- Date Logic ---
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

  // --- GENERATE LINK LOGIC (Cloudflare Integrated) ---
  const generateLink = async () => {
    const payload = { ...data, status: isPaidMode ? 'paid' : 'pending' };

    // Save to Local History immediately
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

    // Setup Timeout Controller (3 Seconds)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    // Try Cloudflare Save first (Stage 2)
    try {
      const response = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal // Bind abort signal
      });

      clearTimeout(timeoutId); // Clear timeout if successful response

      if (response.ok) {
        const resData = await response.json();
        if (resData.id) {
          finalUrl = `${baseUrl}#/buffer?id=${resData.id}`;
        }
      } else {
        console.warn("Cloudflare API returned error, falling back to Base64");
      }
    } catch (e) {
      console.warn("Offline, Local mode, or Timeout. Using Base64 fallback.", e);
    } finally {
      setIsCloudLoading(false);
    }

    // Fallback to Base64 (Stage 1) if Cloudflare failed/timed out
    if (!finalUrl) {
      const base64 = encodeData(payload);
      finalUrl = `${baseUrl}#/buffer?data=${base64}`;
    }

    setGeneratedLink(finalUrl);

    try {
      const qr = await QRCode.toDataURL(finalUrl);
      setQrCode(qr);
    } catch (err) {
      console.error(err);
    }
  };

  const loadRecord = (record: HistoryRecord) => {
    if (!window.confirm(`确认要复用 "${record.summary}" 的信息吗？\n当前未保存的修改将会丢失。`)) return;
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
            <span className="bg-white/10 px-3 py-1 rounded-full text-xs backdrop-blur-sm border border-white/20">Stage 2: Cloudflare Ready</span>
          </div>
        </div>
      </header>

      {/* Hidden File Input for AI Scan */}
      <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleFileChange} />

      {/* AI Scanning Overlay */}
      {isAIScanning && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-6 animate-fade-in">
            <div className="relative">
              <div className="w-20 h-20 border-4 border-jh-green/20 border-t-jh-green rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl animate-pulse">✨</span>
              </div>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-gray-800">AI 正在精准提取信息</p>
              <p className="text-sm text-gray-500 mt-2">基于 Gemini 3 视觉模型构建</p>
            </div>
          </div>
        </div>
      )}

      {/* Environment Warning Banner */}
      {isLocal && (
        <div className="bg-red-50 border-b border-red-100 p-2 text-center text-red-600 text-xs font-bold">
          ⚠️ 检测到本地环境 (Localhost/File)。生成的二维码无法被手机扫描。请将项目部署至 Cloudflare Pages 以使用在线功能。
        </div>
      )}

      <div className="max-w-5xl mx-auto p-4 md:p-8">

        {/* Navigation Tabs */}
        <div className="flex overflow-x-auto gap-3 mb-8 pb-2 hide-scrollbar">
          {['proposer', 'insured', 'vehicle', 'project', 'generate', 'history'].map(tab => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`px-6 py-3 rounded-xl whitespace-nowrap text-sm font-bold transition-all duration-300 shadow-sm border ${isActive
                  ? 'bg-jh-green text-white border-jh-green shadow-md transform scale-105'
                  : 'bg-white text-gray-500 border-gray-100 hover:bg-gray-50 hover:border-gray-200'
                  }`}
              >
                {tab === 'proposer' && '1. 投保人'}
                {tab === 'insured' && '2. 被保险人'}
                {tab === 'vehicle' && '3. 车辆信息'}
                {tab === 'project' && '4. 投保方案'}
                {tab === 'generate' && '5. 生成链接'}
                {tab === 'history' && (
                  <span className="flex items-center gap-2">
                    6. 历史
                    {history.length > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 rounded-full">{history.length}</span>}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 md:p-10 min-h-[500px] transition-all">

          {activeTab === 'proposer' && (
            <div className="animate-fade-in space-y-8">
              <div className="border-b border-gray-100 pb-4 mb-6 flex flex-wrap gap-4 justify-between items-end">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">投保人信息录入</h2>
                  <p className="text-gray-400 text-sm mt-1">请录入身份信息，或使用 AI 扫描。</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={triggerAIScan}
                    className="bg-jh-green/10 text-jh-green border border-jh-green/20 hover:bg-jh-green/20 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all group"
                  >
                    <span className="group-hover:rotate-12 transition-transform">✨</span> AI 扫描识别
                  </button>
                  {personProfiles.length > 0 && (
                    <select
                      className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg p-2 focus:ring-jh-green focus:border-jh-green"
                      onChange={(e) => { if (e.target.value) loadPersonProfile(e.target.value, 'proposer'); e.target.value = ""; }}
                    >
                      <option value="">📂 通讯录...</option>
                      {personProfiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  )}
                  <button onClick={() => savePersonProfile(data.proposer)} className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-2 rounded-lg text-sm font-bold transition-colors">💾 保存</button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <FloatingInput label="名称" value={data.proposer.name} onChange={(v: string) => handleInputChange('proposer', 'name', v)} />
                <FloatingInput label="手机号 (用于验证)" value={data.proposer.mobile} onChange={(v: string) => handleInputChange('proposer', 'mobile', v)} type="tel" />
                <FloatingInput label="证件类型" value={data.proposer.idType} onChange={(v: string) => handleInputChange('proposer', 'idType', v)} />
                <FloatingInput label="证件号" value={data.proposer.idCard} onChange={(v: string) => handleInputChange('proposer', 'idCard', v)} />
                <div className="md:col-span-2"><FloatingInput label="住址" value={data.proposer.address} onChange={(v: string) => handleInputChange('proposer', 'address', v)} /></div>
              </div>
            </div>
          )}

          {activeTab === 'insured' && (
            <div className="animate-fade-in space-y-8">
              <div className="border-b border-gray-100 pb-4 mb-6 flex flex-wrap gap-4 justify-between items-end">
                <div><h2 className="text-2xl font-bold text-gray-800">被保险人信息</h2></div>
                <div className="flex gap-2">
                  <button onClick={triggerAIScan} className="bg-jh-green/10 text-jh-green border border-jh-green/20 hover:bg-jh-green/20 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all">
                    <span>✨</span> AI 扫描识别
                  </button>
                  {personProfiles.length > 0 && (
                    <select className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg p-2" onChange={(e) => { if (e.target.value) loadPersonProfile(e.target.value, 'insured'); e.target.value = ""; }}>
                      <option value="">📂 通讯录...</option>
                      {personProfiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  )}
                  <button onClick={() => savePersonProfile(data.insured)} className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-2 rounded-lg text-sm font-bold">💾 保存</button>
                </div>
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
              <div className="border-b border-gray-100 pb-4 mb-6 flex flex-wrap gap-4 justify-between items-end">
                <div><h2 className="text-2xl font-bold text-gray-800">车辆信息</h2></div>
                <div className="flex gap-2">
                  <button onClick={triggerAIScan} className="bg-jh-green/10 text-jh-green border border-jh-green/20 hover:bg-jh-green/20 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all">
                    <span>✨</span> 行驶证识别
                  </button>
                  {vehicleProfiles.length > 0 && (
                    <select className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg p-2" onChange={(e) => { if (e.target.value) loadVehicleProfile(e.target.value); e.target.value = ""; }}>
                      <option value="">📂 车库...</option>
                      {vehicleProfiles.map(p => <option key={p.id} value={p.id}>{p.plate}</option>)}
                    </select>
                  )}
                  <button onClick={() => saveVehicleProfile(data.vehicle)} className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-2 rounded-lg text-sm font-bold">💾 保存</button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <FloatingInput label="车牌号" value={data.vehicle.plate} onChange={(v: string) => handleInputChange('vehicle', 'plate', v)} />
                <FloatingInput label="机动车辆所有人" value={data.vehicle.vehicleOwner} onChange={(v: string) => handleInputChange('vehicle', 'vehicleOwner', v)} />
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
                <div className="bg-white rounded-xl border border-gray-300 p-4 relative group hover:border-gray-400 transition-all">
                  <label className="absolute -top-3 left-3 bg-white px-1 text-sm text-jh-green font-medium">保险期间</label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1"><input type="date" className="w-full outline-none" value={data.project.period.split(' 至 ')[0] || ''} onChange={(e) => handleStartDateChange(e.target.value)} /></div>
                    <span className="text-gray-300">至</span>
                    <div className="flex-1 text-right"><input type="date" className="w-full outline-none text-right" value={data.project.period.split(' 至 ')[1] || ''} onChange={(e) => handleEndDateChange(e.target.value)} /></div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 rounded-2xl border border-gray-100 p-4">
                <div className="flex justify-between items-center mb-4 px-2">
                  <label className="text-base font-bold text-gray-700">险种明细表</label>
                  <button onClick={addCoverage} className="text-sm bg-white border border-gray-200 text-gray-600 px-4 py-2 rounded-lg hover:shadow-sm transition-all">+ 添加险种</button>
                </div>
                <table className="w-full text-sm text-left"><tbody className="divide-y divide-gray-100">
                  {data.project.coverages.map((item, idx) => (
                    <tr key={idx} className="hover:bg-white transition-colors">
                      <td className="p-3"><input className="w-full bg-transparent border-b border-transparent focus:border-jh-green outline-none" value={item.name} placeholder="险种名称" onChange={(e) => handleCoverageChange(idx, 'name', e.target.value)} /></td>
                      <td className="p-3"><input className="w-full bg-transparent border-b border-transparent focus:border-jh-green font-mono outline-none" value={item.amount} placeholder="保额" onChange={(e) => handleCoverageChange(idx, 'amount', e.target.value)} /></td>
                      <td className="p-3"><input className="w-full bg-transparent border-b border-transparent focus:border-jh-green outline-none" value={item.deductible} placeholder="免赔" onChange={(e) => handleCoverageChange(idx, 'deductible', e.target.value)} /></td>
                      <td className="p-3"><input className="w-full bg-transparent border-b border-transparent focus:border-jh-green font-mono outline-none" value={item.premium} placeholder="保费" onChange={(e) => handleCoverageChange(idx, 'premium', e.target.value)} /></td>
                      <td className="p-3 text-center"><button onClick={() => removeCoverage(idx)} className="text-gray-300 hover:text-red-500 font-bold transition-colors">&times;</button></td>
                    </tr>
                  ))}
                </tbody>
                  <tfoot className="bg-gray-50 border-t border-gray-200">
                    <tr><td colSpan={3} className="p-4 text-right font-bold text-gray-500">保险费合计</td><td className="p-4 font-bold text-jh-green text-lg font-mono">¥ {data.project.premium}</td><td></td></tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'generate' && (
            <div className="animate-fade-in flex flex-col items-center max-w-lg mx-auto py-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-8">生成客户端链接</h2>

              <div className="w-full bg-orange-50 p-6 rounded-2xl text-left text-sm text-orange-800 border border-orange-100 mb-8 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="bg-orange-200 text-orange-700 rounded-full w-6 h-6 flex items-center justify-center font-bold text-xs mt-0.5">!</div>
                  <div>
                    <p className="font-bold mb-1">操作说明</p>
                    <ul className="list-disc pl-4 space-y-1 opacity-90">
                      <li>系统将优先尝试生成<span className="font-bold text-orange-900">“云端短链接”</span>。</li>
                      <li>若云端服务未连接，将自动降级为“Base64 长链接”。</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="w-full bg-white p-4 rounded-xl border border-gray-200 mb-6 flex items-center justify-between hover:border-jh-green transition-colors cursor-pointer" onClick={() => setIsPaidMode(!isPaidMode)}>
                <span className="font-medium text-gray-700">生成模式</span>
                <div className="flex items-center gap-3">
                  <span className={`text-sm ${isPaidMode ? 'text-gray-400' : 'text-jh-green font-bold'}`}>待支付</span>
                  <div className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 flex items-center ${isPaidMode ? 'bg-jh-green justify-end' : 'bg-gray-300 justify-start'}`}>
                    <div className="w-4 h-4 bg-white rounded-full shadow-md"></div>
                  </div>
                  <span className={`text-sm ${isPaidMode ? 'text-jh-green font-bold' : 'text-gray-400'}`}>已支付</span>
                </div>
              </div>

              <button
                onClick={generateLink}
                disabled={isCloudLoading}
                className={`w-full bg-jh-green hover:bg-emerald-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-green-200 transition-all active:scale-[0.98] text-lg flex items-center justify-center gap-2 ${isCloudLoading ? 'opacity-70 cursor-wait' : ''}`}
              >
                {isCloudLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                    正在云端上传...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    生成二维码并归档
                  </>
                )}
              </button>

              {qrCode && (
                <div className="mt-10 p-8 bg-white border border-gray-100 rounded-3xl shadow-2xl flex flex-col items-center animate-fade-in-up w-full">
                  <div className="bg-white p-2 rounded-xl border border-gray-100 shadow-inner">
                    <img src={qrCode} alt="Client QR Code" className="w-56 h-56" />
                  </div>
                  <p className="text-gray-500 font-medium mt-6 mb-2">请客户使用微信或支付宝扫码</p>

                  {generatedLink.includes('?id=') ? (
                    <span className="bg-green-100 text-green-800 text-[10px] font-bold px-2 py-0.5 rounded-full mb-2">已启用云端短链 (KV)</span>
                  ) : (
                    <span className="bg-yellow-100 text-yellow-800 text-[10px] font-bold px-2 py-0.5 rounded-full mb-2">使用 Base64 长链 (本地模式)</span>
                  )}

                  <div className="mt-6 w-full">
                    <div className="p-3 bg-gray-50 rounded-lg text-[10px] break-all text-gray-400 border border-gray-100 font-mono select-all">
                      {generatedLink}
                    </div>
                  </div>

                  <a href={generatedLink} target="_blank" rel="noreferrer" className="mt-6 text-jh-green font-bold text-sm hover:underline flex items-center gap-1">
                    <span>预览测试</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                  </a>
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="animate-fade-in space-y-6">
              <div className="border-b border-gray-100 pb-4 mb-6">
                <h2 className="text-2xl font-bold text-gray-800">历史记录</h2>
                <p className="text-gray-400 text-sm mt-1">本地生成的历史归档。</p>
              </div>
              {history.length === 0 ? <div className="text-center py-20 text-gray-400"><p>暂无记录</p></div> :
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left"><tbody className="divide-y divide-gray-100">{history.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors"><td className="p-4 text-[10px] text-gray-400">{r.timestamp}</td><td className="p-4 font-medium">{r.summary}</td><td className="p-4 text-right"><button onClick={() => loadRecord(r)} className="text-jh-green font-bold hover:underline">加载</button></td></tr>
                  ))}</tbody></table>
                </div>
              }
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const FloatingInput = ({ label, value, onChange, type = "text" }: any) => {
  const id = React.useId();
  return (
    <div className="relative group">
      <input type={type} id={id} className="block px-4 pb-3 pt-6 w-full text-base bg-white rounded-xl border border-gray-300 focus:outline-none focus:ring-1 focus:ring-jh-green focus:border-jh-green peer transition-all" placeholder=" " value={value} onChange={(e) => onChange(e.target.value)} />
      <label htmlFor={id} className="absolute text-sm text-gray-500 duration-300 transform -translate-y-3 scale-75 top-4 left-4 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-3 pointer-events-none">{label}</label>
    </div>
  );
};

export default Admin;
