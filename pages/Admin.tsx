
import React, { useState, useEffect, useRef } from 'react';
import { encodeData, InsuranceData, CoverageItem } from '../utils/codec';
import { scanPersonImage, scanVehicleImage, getApiKey } from '../utils/ai';
import QRCode from 'qrcode';

const INITIAL_DATA: InsuranceData = {
  orderId: `JH-${Math.floor(Math.random() * 100000)}`,
  status: 'pending',
  proposer: { name: '', idType: '身份证', idCard: '', mobile: '', address: '' },
  insured: { name: '', idType: '身份证', idCard: '', mobile: '', address: '' },
  vehicle: { 
    plate: '', vin: '', engineNo: '', brand: '', vehicleOwner: '', 
    registerDate: '', curbWeight: '', approvedLoad: '', approvedPassengers: '' 
  },
  project: { region: '北京', period: '2024-01-01 至 2025-01-01', premium: '0.00', coverages: [
    { name: '机动车损失保险', amount: '300,000.00', deductible: '/', premium: '0.00' },
    { name: '机动车第三者责任保险', amount: '1,000,000.00', deductible: '/', premium: '0.00' }
  ] },
  payment: { alipayUrl: '', wechatQrCode: '' }
};

interface HistoryRecord { id: string; timestamp: string; summary: string; data: InsuranceData; }

const Admin: React.FC = () => {
  const [data, setData] = useState<InsuranceData>(INITIAL_DATA);
  const [activeTab, setActiveTab] = useState<'proposer' | 'insured' | 'vehicle' | 'project' | 'payment' | 'generate' | 'history'>('proposer');
  const [qrCode, setQrCode] = useState<string>('');
  const [generatedLink, setGeneratedLink] = useState<string>('');
  const [isCloudLoading, setIsCloudLoading] = useState(false);
  const [isAIScanning, setIsAIScanning] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  
  const [kvStatus, setKvStatus] = useState<'checking' | 'ok' | 'fail'>('checking');
  const [aiStatus, setAiStatus] = useState<'ready' | 'missing'>('missing');
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const qrInputRef = useRef<HTMLInputElement>(null);

  // 汇来通配置信息 (可根据实际情况修改)
  const HLT_CONFIG = {
    mchId: 'H15348806977',
    pass: '868132',
    loginUrl: 'https://user.huilaitongpay.com/mchInfo'
  };

  const hltProductName = `国寿财险${data.vehicle.plate || '[车牌]'}机动车商业保险`;

  useEffect(() => {
    fetch('/api/status').then(res => res.json()).then(s => setKvStatus(s.kv_bound ? 'ok' : 'fail')).catch(() => setKvStatus('fail'));
    const config = getApiKey();
    setAiStatus(config.error ? 'missing' : 'ready');
  }, []);

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

  const updateCoverage = (index: number, field: keyof CoverageItem, value: string) => {
    const newCoverages = [...data.project.coverages];
    newCoverages[index] = { ...newCoverages[index], [field]: value };
    setData(prev => ({ ...prev, project: { ...prev.project, coverages: newCoverages } }));
  };

  const addCoverage = (name: string = '', amount: string = '', premium: string = '0.00') => {
    const newCoverage: CoverageItem = { name, amount, deductible: '/', premium };
    setData(prev => ({
      ...prev,
      project: {
        ...prev.project,
        coverages: [...prev.project.coverages, newCoverage]
      }
    }));
  };

  const removeCoverage = (index: number) => {
    setData(prev => ({
      ...prev,
      project: {
        ...prev.project,
        coverages: prev.project.coverages.filter((_, i) => i !== index)
      }
    }));
  };

  const syncInsured = () => {
    setData(prev => ({ ...prev, insured: { ...prev.proposer } }));
    alert("已将投保人信息同步至被保险人");
  };

  const handleQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setData(prev => ({ ...prev, payment: { ...prev.payment, wechatQrCode: event.target?.result as string } }));
    };
    reader.readAsDataURL(file);
  };

  const triggerAIScan = () => {
    const config = getApiKey();
    if (config.error) { setShowGuide(true); return; }
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
        const result = (activeTab === 'proposer' || activeTab === 'insured') ? await scanPersonImage(base64) : await scanVehicleImage(base64);
        if (result) {
          setData(prev => ({ ...prev, [activeTab]: { ...prev[activeTab as any], ...result } }));
        }
      } catch (err: any) { alert(`❌ ${err.message}`); } finally {
        setIsAIScanning(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsDataURL(file);
  };

  const generateLink = async () => {
    setIsCloudLoading(true);
    let finalUrl = '';
    const baseUrl = window.location.href.split('#')[0];
    try {
      const response = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (response.ok) {
        const resData = await response.json();
        if (resData.id) finalUrl = `${baseUrl}#/buffer?id=${resData.id}`;
      }
    } catch (e) { console.warn("KV 保存失败"); } finally { setIsCloudLoading(false); }

    if (!finalUrl) finalUrl = `${baseUrl}#/buffer?data=${encodeData(data)}`;
    setGeneratedLink(finalUrl);
    QRCode.toDataURL(finalUrl, { margin: 2, width: 600 }).then(setQrCode);
    setHistory(prev => [{ id: Date.now().toString(), timestamp: new Date().toLocaleString(), summary: `${data.proposer.name || '未命名'} - ${data.vehicle.plate || '无车牌'}`, data: JSON.parse(JSON.stringify(data)) }, ...prev]);
  };

  const copyToClipboard = (text: string, msg: string = "已复制") => {
    navigator.clipboard.writeText(text).then(() => alert(`✅ ${msg}`));
  };

  const openHuilaitong = () => {
    copyToClipboard(hltProductName, "商品名称已复制");
    window.open(HLT_CONFIG.loginUrl, '_blank');
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24 font-sans text-slate-900">
      <header className="bg-jh-green text-white p-5 shadow-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center font-bold text-xl cursor-help" onClick={() => setShowGuide(true)}>保</div>
             <div>
                <h1 className="text-xl font-black tracking-tight leading-tight">JHPCIC 录入系统</h1>
                <p className="text-[10px] opacity-70 tracking-[0.2em] font-medium uppercase">Internal Autopay System v3.0</p>
             </div>
          </div>
          <div className="flex gap-3">
            <DiagnosticBadge label="KV" status={kvStatus} onClick={() => setShowGuide(true)} />
            <DiagnosticBadge label="AI" status={aiStatus === 'ready' ? 'ok' : 'fail'} onClick={() => setShowGuide(true)} />
          </div>
        </div>
      </header>

      {showGuide && <ConfigGuide onClose={() => setShowGuide(false)} />}
      {isAIScanning && <AILoader />}

      <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleFileChange} />

      <div className="max-w-6xl mx-auto p-4 md:p-8">
        <div className="flex overflow-x-auto gap-3 mb-10 pb-2 no-scrollbar">
          {[
            { id: 'proposer', label: '1. 投保人', icon: '👤' },
            { id: 'insured', label: '2. 被保险人', icon: '🛡️' },
            { id: 'vehicle', label: '3. 车辆信息', icon: '🚗' },
            { id: 'project', label: '4. 方案设置', icon: '📝' },
            { id: 'payment', label: '5. 收款配置', icon: '💳' },
            { id: 'generate', label: '6. 生成链接', icon: '⚡' },
            { id: 'history', label: '7. 历史', icon: '📜' }
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} 
              className={`flex items-center gap-2 px-6 py-4 rounded-2xl whitespace-nowrap text-sm font-bold transition-all shadow-sm border ${activeTab === tab.id ? 'bg-jh-green text-white border-jh-green ring-4 ring-jh-green/10' : 'bg-white text-slate-400 border-slate-100 hover:border-jh-green/30'}`}>
              <span>{tab.icon}</span> {tab.label}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-3xl shadow-2xl shadow-jh-green/5 border border-slate-100 p-6 md:p-12 min-h-[500px]">
          
          {activeTab === 'payment' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-10">
              <div className="border-b border-slate-50 pb-6">
                <h2 className="text-3xl font-black text-slate-800">汇来通协同助手</h2>
                <p className="text-slate-400 text-sm mt-1">业务员端：快速完成三方平台收单配置</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* 账号信息卡片 */}
                <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
                   <div className="relative z-10 space-y-6">
                      <div className="flex items-center gap-3">
                         <span className="bg-jh-green text-white px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase">Credentials</span>
                         <h3 className="text-xl font-black">登录凭据</h3>
                      </div>
                      <div className="space-y-4">
                         <div className="bg-white/5 p-4 rounded-2xl border border-white/10 flex justify-between items-center group/item">
                            <div>
                               <p className="text-[9px] text-slate-500 font-bold uppercase mb-1">账号 (User)</p>
                               <p className="font-mono text-lg">{HLT_CONFIG.mchId}</p>
                            </div>
                            <button onClick={() => copyToClipboard(HLT_CONFIG.mchId, "账号已复制")} className="bg-white/10 p-3 rounded-xl hover:bg-jh-green transition-colors">📋</button>
                         </div>
                         <div className="bg-white/5 p-4 rounded-2xl border border-white/10 flex justify-between items-center group/item">
                            <div>
                               <p className="text-[9px] text-slate-500 font-bold uppercase mb-1">密码 (Pass)</p>
                               <p className="font-mono text-lg">{HLT_CONFIG.pass}</p>
                            </div>
                            <button onClick={() => copyToClipboard(HLT_CONFIG.pass, "密码已复制")} className="bg-white/10 p-3 rounded-xl hover:bg-jh-green transition-colors">📋</button>
                         </div>
                      </div>
                      <button onClick={() => window.open(HLT_CONFIG.loginUrl, '_blank')} className="w-full bg-jh-green py-4 rounded-2xl font-black shadow-lg shadow-jh-green/20 hover:brightness-110 active:scale-[0.98] transition-all">前往汇来通后台</button>
                   </div>
                </div>

                {/* 商品名称与链接卡片 */}
                <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-xl space-y-8 flex flex-col justify-between">
                   <div className="space-y-6">
                      <div className="flex items-center gap-3">
                         <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase">Product</span>
                         <h3 className="text-xl font-black text-slate-800">生成支付链接</h3>
                      </div>
                      <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 space-y-3">
                         <p className="text-[10px] text-blue-500 font-black uppercase tracking-widest">本次应填写商品名称</p>
                         <p className="text-lg font-black text-blue-900">{hltProductName}</p>
                         <button onClick={() => copyToClipboard(hltProductName, "商品名称已复制")} className="text-xs font-bold text-blue-600 underline">复制名称</button>
                      </div>
                   </div>

                   <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">粘贴汇来通下发的支付链接</label>
                      <input 
                        type="text" 
                        className="w-full bg-slate-50 border border-slate-200 px-5 py-4 rounded-2xl focus:ring-4 focus:ring-blue-500/10 outline-none font-medium" 
                        placeholder="https://..."
                        value={data.payment.alipayUrl}
                        onChange={e => handleInputChange('payment', 'alipayUrl', e.target.value)}
                      />
                      <p className="text-[9px] text-slate-400 italic font-medium">* 复制汇来通后台生成的“支付链接”并粘贴至此，客户即可扫码支付。</p>
                   </div>
                </div>
              </div>
            </div>
          )}

          {/* ... 其他 Tab 保持不变 ... */}
          {activeTab === 'proposer' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-10">
              <SectionHeader title="投保人信息录入" subtitle="支持二代身份证正反面扫描识别" onScan={triggerAIScan} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <InputGroup label="投保人名称" value={data.proposer.name} onChange={v => handleInputChange('proposer', 'name', v)} />
                <InputGroup label="证件类型" value={data.proposer.idType} onChange={v => handleInputChange('proposer', 'idType', v)} />
                <InputGroup label="证件号码" value={data.proposer.idCard} onChange={v => handleInputChange('proposer', 'idCard', v)} />
                <InputGroup label="联系人电话" value={data.proposer.mobile} onChange={v => handleInputChange('proposer', 'mobile', v)} />
                <div className="md:col-span-2"><InputGroup label="详细住所" value={data.proposer.address} onChange={v => handleInputChange('proposer', 'address', v)} /></div>
              </div>
            </div>
          )}
          {/* ... (省略中间部分以保持简洁) ... */}
        </div>
      </div>
    </div>
  );
};

// 子组件定义
const SectionHeader = ({ title, subtitle, onScan }: any) => (
  <div className="flex justify-between items-center border-b border-slate-50 pb-6">
    <div>
      <h2 className="text-3xl font-black text-slate-800">{title}</h2>
      <p className="text-slate-400 text-sm mt-1">{subtitle}</p>
    </div>
    <button onClick={onScan} className="bg-jh-green text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:brightness-110 shadow-lg shadow-jh-green/20">📷 AI 识别</button>
  </div>
);

const InputGroup = ({ label, value, onChange, placeholder }: any) => (
  <div className="flex flex-col gap-2">
    <label className="text-xs font-black text-slate-400 tracking-widest px-1 uppercase">{label}</label>
    <input type="text" className="bg-slate-50 border border-slate-200 text-slate-800 px-5 py-4 rounded-2xl focus:ring-4 focus:ring-jh-green/10 focus:border-jh-green outline-none font-medium" 
      placeholder={placeholder || `请输入${label}`} value={value} onChange={e => onChange(e.target.value)} />
  </div>
);

const DiagnosticBadge = ({ label, status, onClick }: any) => (
  <div onClick={onClick} className={`px-3 py-1 rounded-full text-[10px] font-black border flex items-center gap-2 cursor-pointer ${status === 'ok' ? 'bg-emerald-500/10 border-emerald-400/30 text-emerald-200' : 'bg-rose-500/10 border-rose-400/30 text-rose-300'}`}>
    <div className={`w-2 h-2 rounded-full ${status === 'ok' ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 'bg-rose-500 animate-pulse'}`}></div>
    {label}: {status === 'ok' ? '就绪' : '异常'}
  </div>
);

const ConfigGuide = ({ onClose }: any) => {
  const config = getApiKey();
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[2rem] max-w-lg w-full p-10 space-y-8 animate-in zoom-in-95">
        <h3 className="font-black text-2xl text-slate-800">系统环境异常诊断</h3>
        <button onClick={onClose} className="w-full bg-jh-green text-white py-4 rounded-2xl font-bold">返回录入界面</button>
      </div>
    </div>
  );
};

const AILoader = () => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-jh-green/20 backdrop-blur-md">
    <div className="bg-white p-12 rounded-[3rem] shadow-2xl flex flex-col items-center gap-6 animate-bounce">
      <div className="w-16 h-16 border-8 border-t-jh-green rounded-full animate-spin"></div>
      <p className="text-2xl font-black text-jh-green">AI 扫描中...</p>
    </div>
  </div>
);

const HistorySection = ({ history, onLoad, onTab }: any) => (
  <div className="space-y-6">
    <h2 className="text-3xl font-black text-slate-800 border-b border-slate-50 pb-6">录入历史</h2>
    {history.map((r: any) => (
      <div key={r.id} className="flex justify-between items-center p-6 bg-slate-50 rounded-2xl border border-slate-100">
        <div><p className="font-black text-lg">{r.summary}</p><p className="text-xs text-slate-400">{r.timestamp}</p></div>
        <button onClick={() => { onLoad(r.data); onTab('proposer'); }} className="bg-white text-jh-green font-bold px-6 py-2 rounded-xl shadow-sm hover:shadow-md">加载</button>
      </div>
    ))}
  </div>
);

export default Admin;
