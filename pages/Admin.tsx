
import React, { useState, useEffect, useRef } from 'react';
import { encodeData, InsuranceData, CoverageItem } from '../utils/codec';
import { scanPersonImage, scanVehicleImage } from '../utils/ai';
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

  useEffect(() => {
    fetch('/api/status').then(res => res.json()).then(s => setKvStatus(s.kv_bound ? 'ok' : 'fail')).catch(() => setKvStatus('fail'));
    const key = process.env.API_KEY;
    setAiStatus(!!key && key !== "undefined" ? 'ready' : 'missing');
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
    if (aiStatus === 'missing') { setShowGuide(true); return; }
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

  const copyToClipboard = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink).then(() => alert("✅ 链接已复制到剪贴板"));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24 font-sans text-slate-900">
      <header className="bg-jh-green text-white p-5 shadow-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center font-bold text-xl cursor-help" onClick={() => setShowGuide(true)}>保</div>
             <div>
                <h1 className="text-xl font-black tracking-tight leading-tight">JHPCIC 录入系统</h1>
                <p className="text-[10px] opacity-70 tracking-[0.2em] font-medium uppercase">Internal Autopay System v2.5</p>
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

          {activeTab === 'insured' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-10">
              <div className="flex justify-between items-center border-b border-slate-50 pb-6">
                <div>
                  <h2 className="text-3xl font-black text-slate-800">被保险人信息录入</h2>
                  <p className="text-slate-400 text-sm mt-1">支持 AI 识别或一键同步投保人</p>
                </div>
                <div className="flex gap-4">
                  <button onClick={syncInsured} className="bg-jh-green/10 text-jh-green px-6 py-3 rounded-2xl font-bold hover:bg-jh-green/20">一键同步投保人</button>
                  <button onClick={triggerAIScan} className="bg-jh-green text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2">📷 AI 识别</button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <InputGroup label="被保险人名称" value={data.insured.name} onChange={v => handleInputChange('insured', 'name', v)} />
                <InputGroup label="证件类型" value={data.insured.idType} onChange={v => handleInputChange('insured', 'idType', v)} />
                <InputGroup label="证件号码" value={data.insured.idCard} onChange={v => handleInputChange('insured', 'idCard', v)} />
                <InputGroup label="联系电话" value={data.insured.mobile} onChange={v => handleInputChange('insured', 'mobile', v)} />
                <div className="md:col-span-2"><InputGroup label="被保险人住所" value={data.insured.address} onChange={v => handleInputChange('insured', 'address', v)} /></div>
              </div>
            </div>
          )}

          {activeTab === 'vehicle' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-10">
              <SectionHeader title="车辆核心参数" subtitle="请对照行驶证正副本准确填写" onScan={triggerAIScan} />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <InputGroup label="号牌号码" value={data.vehicle.plate} onChange={v => handleInputChange('vehicle', 'plate', v)} />
                <InputGroup label="所有人" value={data.vehicle.vehicleOwner} onChange={v => handleInputChange('vehicle', 'vehicleOwner', v)} />
                <InputGroup label="发动机号" value={data.vehicle.engineNo} onChange={v => handleInputChange('vehicle', 'engineNo', v)} />
                <InputGroup label="注册日期" value={data.vehicle.registerDate} onChange={v => handleInputChange('vehicle', 'registerDate', v)} placeholder="YYYY-MM-DD" />
                <InputGroup label="核定载客人数" value={data.vehicle.approvedPassengers} onChange={v => handleInputChange('vehicle', 'approvedPassengers', v)} />
                <InputGroup label="整备质量 (kg)" value={data.vehicle.curbWeight} onChange={v => handleInputChange('vehicle', 'curbWeight', v)} />
                <InputGroup label="核定载质量 (kg)" value={data.vehicle.approvedLoad} onChange={v => handleInputChange('vehicle', 'approvedLoad', v)} />
                <div className="lg:col-span-2"><InputGroup label="车辆识别代码 (VIN)" value={data.vehicle.vin} onChange={v => handleInputChange('vehicle', 'vin', v)} /></div>
              </div>
            </div>
          )}

          {activeTab === 'payment' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-10">
              <div className="border-b border-slate-50 pb-6">
                <h2 className="text-3xl font-black text-slate-800">支付收单配置</h2>
                <p className="text-slate-400 text-sm mt-1">配置客户支付环节展示的内容</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="bg-blue-50/50 p-8 rounded-3xl border border-blue-100 space-y-6">
                   <h3 className="font-bold text-blue-600 flex items-center gap-2"><span className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs">支</span> 支付宝收银台</h3>
                   <InputGroup label="第三方支付跳转 URL" value={data.payment.alipayUrl} onChange={v => handleInputChange('payment', 'alipayUrl', v)} placeholder="输入支付跳转链接" />
                </div>
                <div className="bg-emerald-50/50 p-8 rounded-3xl border border-emerald-100 space-y-6">
                   <h3 className="font-bold text-jh-green flex items-center gap-2"><span className="w-8 h-8 bg-jh-green text-white rounded-full flex items-center justify-center text-xs">微</span> 微信收款二维码</h3>
                   <div className="bg-white p-6 rounded-2xl border border-emerald-100 flex flex-col items-center gap-4">
                      {data.payment.wechatQrCode ? (
                        <div className="relative group">
                          <img src={data.payment.wechatQrCode} className="w-40 h-40 object-contain" alt="QR" />
                          <button onClick={() => handleInputChange('payment', 'wechatQrCode', '')} className="absolute -top-3 -right-3 bg-red-500 text-white w-7 h-7 rounded-full text-xs shadow-lg">✕</button>
                        </div>
                      ) : (
                        <div className="text-center">
                          <button onClick={() => qrInputRef.current?.click()} className="bg-jh-green text-white px-8 py-3 rounded-xl font-bold shadow-sm">上传收款码</button>
                          <p className="text-[10px] text-slate-400 mt-2">支持常见收款图片格式</p>
                        </div>
                      )}
                      <input type="file" ref={qrInputRef} hidden accept="image/*" onChange={handleQrUpload} />
                   </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'project' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-10">
               <div className="border-b border-slate-50 pb-6"><h2 className="text-3xl font-black text-slate-800">投保方案设置</h2></div>
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-6">
                {data.project.coverages.map((item, idx) => (
                   <div key={idx} className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                      <div className="col-span-1"><InputGroup label={`险种名称`} value={item.name} onChange={v => updateCoverage(idx, 'name', v)} /></div>
                      <div><InputGroup label="保额" value={item.amount} onChange={v => updateCoverage(idx, 'amount', v)} /></div>
                      <div><InputGroup label="保费" value={item.premium} onChange={v => updateCoverage(idx, 'premium', v)} /></div>
                   </div>
                ))}
                <div className="flex justify-between items-center px-8 py-5 bg-jh-green text-white rounded-2xl shadow-xl">
                   <span className="font-bold opacity-80">总保费合计：</span>
                   <span className="text-3xl font-black">¥ {data.project.premium}</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'generate' && (
            <div className="animate-in zoom-in-95 duration-500 flex flex-col items-center py-10">
              <h2 className="text-3xl font-black text-slate-800 mb-2">生成服务二维码</h2>
              <button onClick={generateLink} disabled={isCloudLoading} className="mt-8 px-12 py-5 bg-jh-green text-white font-black text-xl rounded-2xl shadow-2xl disabled:opacity-50">
                {isCloudLoading ? "上传云端中..." : "立即生成"}
              </button>
              {qrCode && (
                <div className="mt-12 flex flex-col items-center animate-in slide-in-from-top-10">
                   <div className="p-10 bg-white rounded-[3rem] shadow-2xl border border-slate-100"><img src={qrCode} alt="QR" className="w-64 h-64" /></div>
                   <button onClick={copyToClipboard} className="mt-6 text-jh-green font-bold hover:underline">点击复制保单链接</button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && <HistorySection history={history} onLoad={setData} onTab={setActiveTab} />}
        </div>
      </div>
    </div>
  );
};

// 子组件
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

const ConfigGuide = ({ onClose }: any) => (
  <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
    <div className="bg-white rounded-[2rem] max-w-lg w-full p-10 space-y-8 animate-in zoom-in-95">
      <h3 className="font-black text-2xl text-slate-800">系统环境异常诊断</h3>
      <div className="space-y-4">
         <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl">
            <p className="font-bold text-rose-600 text-sm">检测到 AI KEY 无效或未生效</p>
            <p className="text-xs text-rose-500 mt-1 italic">若您已配置密钥但仍报错，请务必前往 Cloudflare 控制台 -> Deployments -> 找到最新记录点击 "Retry deployment"。</p>
         </div>
         <ol className="text-xs text-slate-500 space-y-3 px-2">
            <li>1. 确认 Cloudflare 环境变量已设置变量名为 <code className="bg-slate-100 px-1 rounded text-jh-green">API_KEY</code>。</li>
            <li>2. 确认 KV 绑定变量名为 <code className="bg-slate-100 px-1 rounded text-jh-green">KV_BINDING</code>。</li>
            <li className="font-bold text-slate-800 underline">3. 环境变量修改后，必须“重新构建(Retry Deployment)”方可生效！</li>
         </ol>
      </div>
      <button onClick={onClose} className="w-full bg-jh-green text-white py-4 rounded-2xl font-bold">已了解</button>
    </div>
  </div>
);

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
    {history.length === 0 ? <p className="text-center py-20 text-slate-300 italic">暂无本地记录</p> : 
      history.map((r: any) => (
        <div key={r.id} className="flex justify-between items-center p-6 bg-slate-50 rounded-2xl border border-slate-100">
          <div><p className="font-black text-lg">{r.summary}</p><p className="text-xs text-slate-400">{r.timestamp}</p></div>
          <button onClick={() => { onLoad(r.data); onTab('proposer'); }} className="bg-white text-jh-green font-bold px-6 py-2 rounded-xl shadow-sm hover:shadow-md">加载</button>
        </div>
      ))
    }
  </div>
);

export default Admin;
