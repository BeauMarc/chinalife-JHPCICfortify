
import React, { useState, useEffect, useRef } from 'react';
import { encodeData, InsuranceData, CoverageItem } from '../utils/codec';
import { scanPersonImage, scanVehicleImage } from '../utils/ai';
import QRCode from 'qrcode';

// 初始默认数据
const INITIAL_DATA: InsuranceData = {
  orderId: `JH-${Math.floor(Math.random() * 100000)}`,
  status: 'pending',
  proposer: { name: '', idType: '身份证', idCard: '', mobile: '', address: '' },
  insured: { name: '', idType: '身份证', idCard: '', mobile: '', address: '' },
  vehicle: { plate: '', vin: '', engineNo: '', brand: '', vehicleOwner: '', registerDate: '', curbWeight: '', approvedLoad: '' },
  project: { region: '北京', period: '2024-01-01 至 2025-01-01', premium: '0.00', coverages: [
    { name: '机动车损失保险', amount: '300,000.00', deductible: '/', premium: '0.00' },
    { name: '机动车第三者责任保险', amount: '1,000,000.00', deductible: '/', premium: '0.00' }
  ] },
  payment: { alipayUrl: '', wechatUrl: '' }
};

interface HistoryRecord { id: string; timestamp: string; summary: string; data: InsuranceData; }

const Admin: React.FC = () => {
  const [data, setData] = useState<InsuranceData>(INITIAL_DATA);
  const [activeTab, setActiveTab] = useState<'proposer' | 'vehicle' | 'project' | 'generate' | 'history'>('proposer');
  const [qrCode, setQrCode] = useState<string>('');
  const [generatedLink, setGeneratedLink] = useState<string>('');
  const [isCloudLoading, setIsCloudLoading] = useState(false);
  const [isAIScanning, setIsAIScanning] = useState(false);
  
  // 系统诊断状态
  const [kvStatus, setKvStatus] = useState<'checking' | 'ok' | 'fail'>('checking');
  const [aiStatus, setAiStatus] = useState<'ready' | 'missing'>('missing');

  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // 1. 核心诊断：检查后端 KV 绑定是否生效
    fetch('/api/status')
      .then(res => res.json())
      .then(s => setKvStatus(s.kv_bound ? 'ok' : 'fail'))
      .catch(() => setKvStatus('fail'));

    // 2. 核心诊断：检查环境变量 API_KEY 是否注入
    const hasKey = !!process.env.API_KEY && process.env.API_KEY !== "undefined";
    setAiStatus(hasKey ? 'ready' : 'missing');
  }, []);

  // 动态计算总保费
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

  const triggerAIScan = () => {
    if (aiStatus === 'missing') {
      alert("⚠️ AI 未就绪：请在 Cloudflare Pages 环境变量中配置 API_KEY 并重新部署。");
      return;
    }
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
        const result = (activeTab === 'proposer') ? await scanPersonImage(base64) : await scanVehicleImage(base64);
        if (result) {
          setData(prev => ({
            ...prev,
            [activeTab]: { ...prev[activeTab as any], ...result },
            // 同步更新被保险人为投保人
            insured: activeTab === 'proposer' ? { ...prev.insured, ...result } : prev.insured
          }));
        }
      } catch (err: any) {
        alert(`识别失败: ${err.message}`);
      } finally {
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
      // 尝试向后端 API 保存数据 (存入 KV)
      const response = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (response.ok) {
        const resData = await response.json();
        if (resData.id) finalUrl = `${baseUrl}#/buffer?id=${resData.id}`;
      }
    } catch (e) {
      console.warn("KV 保存失败，回退至离线 Base64 模式");
    } finally {
      setIsCloudLoading(false);
    }

    // 容错：如果 KV 失败，生成 Base64 长链接
    if (!finalUrl) {
      finalUrl = `${baseUrl}#/buffer?data=${encodeData(data)}`;
    }

    setGeneratedLink(finalUrl);
    QRCode.toDataURL(finalUrl, { margin: 2, width: 600 }).then(setQrCode);
    
    // 自动存入本地历史记录
    setHistory(prev => [{ 
      id: Date.now().toString(), 
      timestamp: new Date().toLocaleString(), 
      summary: `${data.proposer.name || '未命名'} - ${data.vehicle.plate || '无车牌'}`, 
      data: JSON.parse(JSON.stringify(data)) 
    }, ...prev]);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedLink);
    alert("链接已复制到剪贴板");
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24 font-sans text-slate-900">
      {/* 顶部导航与诊断 */}
      <header className="bg-jh-green text-white p-5 shadow-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center font-bold text-xl">保</div>
             <div>
                <h1 className="text-xl font-black tracking-tight leading-tight">JHPCIC 录入系统</h1>
                <p className="text-[10px] opacity-70 tracking-[0.2em] font-medium uppercase">Internal Autopay System v2.1</p>
             </div>
          </div>
          <div className="flex gap-3">
            <DiagnosticBadge label="KV 存储" status={kvStatus} />
            <DiagnosticBadge label="AI 识别" status={aiStatus === 'ready' ? 'ok' : 'fail'} />
          </div>
        </div>
      </header>

      {/* AI 扫描遮罩 */}
      {isAIScanning && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-jh-green/20 backdrop-blur-md">
           <div className="bg-white p-10 rounded-3xl shadow-2xl flex flex-col items-center gap-6 border border-white/50 animate-bounce">
              <div className="w-16 h-16 border-4 border-jh-green/20 border-t-jh-green rounded-full animate-spin"></div>
              <div className="text-center">
                <p className="text-xl font-bold text-jh-green">AI 正在深度扫描</p>
                <p className="text-sm text-slate-400 mt-1">请稍候，正在提取结构化数据...</p>
              </div>
           </div>
        </div>
      )}

      <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleFileChange} />

      <div className="max-w-6xl mx-auto p-4 md:p-8">
        {/* 步骤切换器 */}
        <div className="flex overflow-x-auto gap-3 mb-10 pb-2 no-scrollbar">
          {[
            { id: 'proposer', label: '1. 人员信息', icon: '👤' },
            { id: 'vehicle', label: '2. 车辆信息', icon: '🚗' },
            { id: 'project', label: '3. 投保方案', icon: '📝' },
            { id: 'generate', label: '4. 生成二维码', icon: '⚡' },
            { id: 'history', label: '5. 历史记录', icon: '📜' }
          ].map(tab => (
            <button 
              key={tab.id} 
              onClick={() => setActiveTab(tab.id as any)} 
              className={`flex items-center gap-2 px-6 py-4 rounded-2xl whitespace-nowrap text-sm font-bold transition-all shadow-sm border ${activeTab === tab.id ? 'bg-jh-green text-white border-jh-green ring-4 ring-jh-green/10' : 'bg-white text-slate-400 border-slate-100 hover:border-jh-green/30'}`}
            >
              <span>{tab.icon}</span> {tab.label}
            </button>
          ))}
        </div>

        {/* 主内容区域 */}
        <div className="bg-white rounded-3xl shadow-2xl shadow-jh-green/5 border border-slate-100 p-6 md:p-12 min-h-[500px]">
          
          {/* 1. 人员信息 */}
          {activeTab === 'proposer' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-10">
              <div className="flex justify-between items-center border-b border-slate-50 pb-6">
                <div>
                  <h2 className="text-3xl font-black text-slate-800">人员信息录入</h2>
                  <p className="text-slate-400 text-sm mt-1">支持二代身份证自动扫描识别</p>
                </div>
                <button onClick={triggerAIScan} className="group bg-jh-green text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-jh-green/20">
                  <span className="text-lg group-hover:rotate-12 transition-transform">📷</span> AI 扫描证件
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <InputGroup label="投保人姓名" value={data.proposer.name} onChange={v => handleInputChange('proposer', 'name', v)} placeholder="请填写姓名或使用 AI 扫描" />
                <InputGroup label="联系电话" value={data.proposer.mobile} onChange={v => handleInputChange('proposer', 'mobile', v)} placeholder="用于接收保单短信" />
                <InputGroup label="证件号码" value={data.proposer.idCard} onChange={v => handleInputChange('proposer', 'idCard', v)} placeholder="18位身份证号" />
                <InputGroup label="联系地址" value={data.proposer.address} onChange={v => handleInputChange('proposer', 'address', v)} placeholder="常住联系地址" />
              </div>
            </div>
          )}

          {/* 2. 车辆信息 */}
          {activeTab === 'vehicle' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-10">
               <div className="flex justify-between items-center border-b border-slate-50 pb-6">
                <div>
                  <h2 className="text-3xl font-black text-slate-800">车辆信息录入</h2>
                  <p className="text-slate-400 text-sm mt-1">支持行驶证正本自动扫描识别</p>
                </div>
                <button onClick={triggerAIScan} className="bg-jh-green text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:brightness-110 shadow-lg shadow-jh-green/20">
                  <span>🚗</span> AI 扫描行驶证
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <InputGroup label="号牌号码" value={data.vehicle.plate} onChange={v => handleInputChange('vehicle', 'plate', v)} placeholder="如：京A88888" />
                <InputGroup label="品牌型号" value={data.vehicle.brand} onChange={v => handleInputChange('vehicle', 'brand', v)} placeholder="行驶证品牌型号栏" />
                <InputGroup label="车辆识别代号 (VIN)" value={data.vehicle.vin} onChange={v => handleInputChange('vehicle', 'vin', v)} />
                <InputGroup label="所有人" value={data.vehicle.vehicleOwner} onChange={v => handleInputChange('vehicle', 'vehicleOwner', v)} />
              </div>
            </div>
          )}

          {/* 3. 投保方案 */}
          {activeTab === 'project' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-10">
               <div className="border-b border-slate-50 pb-6">
                <h2 className="text-3xl font-black text-slate-800">投保方案设置</h2>
                <p className="text-slate-400 text-sm mt-1">系统将自动累计总保费金额</p>
              </div>
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-6">
                {data.project.coverages.map((item, idx) => (
                   <div key={idx} className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                      <div className="col-span-1"><InputGroup label={`险种 ${idx + 1}`} value={item.name} onChange={v => updateCoverage(idx, 'name', v)} /></div>
                      <div><InputGroup label="保额 (元)" value={item.amount} onChange={v => updateCoverage(idx, 'amount', v)} /></div>
                      <div><InputGroup label="保费 (元)" value={item.premium} onChange={v => updateCoverage(idx, 'premium', v)} /></div>
                   </div>
                ))}
                <div className="flex justify-between items-center px-6 py-4 bg-jh-green/5 rounded-2xl border border-jh-green/10">
                   <span className="font-bold text-slate-600">总计保费：</span>
                   <span className="text-2xl font-black text-jh-green">¥ {data.project.premium}</span>
                </div>
              </div>
            </div>
          )}

          {/* 4. 生成二维码 */}
          {activeTab === 'generate' && (
            <div className="animate-in zoom-in-95 duration-500 flex flex-col items-center py-10">
              <div className="text-center mb-12 max-w-md">
                 <h2 className="text-3xl font-black text-slate-800">交付保单二维码</h2>
                 <p className="text-slate-400 mt-2">点击生成后，请引导客户扫码完成签署与支付。数据将同步至云端 KV 存储。</p>
              </div>
              
              <button 
                onClick={generateLink} 
                disabled={isCloudLoading} 
                className="group relative px-12 py-5 bg-jh-green text-white font-black text-xl rounded-2xl shadow-2xl shadow-jh-green/30 active:scale-95 transition-all disabled:opacity-50"
              >
                {isCloudLoading ? "正在上传云端..." : "立即生成服务二维码"}
              </button>

              {qrCode && (
                <div className="mt-16 animate-in slide-in-from-top-8 duration-700 flex flex-col items-center">
                  <div className="p-10 bg-white rounded-[3rem] shadow-[0_20px_50px_rgba(11,122,74,0.15)] border border-slate-100 relative overflow-hidden group">
                     <div className="absolute top-0 left-0 w-full h-2 bg-jh-green"></div>
                     <img src={qrCode} alt="QR Code" className="w-64 h-64 md:w-80 md:h-80 transition-transform group-hover:scale-105" />
                     <div className="mt-8 text-center">
                        <p className="text-slate-800 font-black text-lg">扫码进入保单流程</p>
                        <p className="text-slate-400 text-xs mt-1 tracking-widest uppercase">Secured by Cloudflare KV</p>
                     </div>
                  </div>
                  
                  <div className="mt-10 flex gap-4">
                     <button onClick={copyToClipboard} className="bg-slate-100 text-slate-600 px-6 py-3 rounded-xl font-bold hover:bg-slate-200 transition-colors">复制短链接</button>
                     <button onClick={() => window.open(generatedLink)} className="bg-slate-100 text-slate-600 px-6 py-3 rounded-xl font-bold hover:bg-slate-200 transition-colors">在新窗口打开预览</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 5. 历史记录 */}
          {activeTab === 'history' && (
             <div className="animate-in fade-in duration-500 space-y-6">
               <h2 className="text-3xl font-black text-slate-800 border-b border-slate-50 pb-6">录入历史</h2>
               {history.length === 0 ? (
                 <div className="flex flex-col items-center py-20 text-slate-300">
                    <span className="text-6xl mb-4">📭</span>
                    <p className="font-medium italic">暂无本地录入记录</p>
                 </div>
               ) : (
                 <div className="grid gap-4">
                   {history.map(r => (
                     <div key={r.id} className="flex justify-between items-center p-6 bg-slate-50 rounded-2xl border border-slate-100 hover:border-jh-green/30 transition-colors">
                        <div>
                          <p className="font-black text-slate-800 text-lg">{r.summary}</p>
                          <p className="text-xs text-slate-400 font-mono mt-1">{r.timestamp} | ID: {r.id.slice(-6)}</p>
                        </div>
                        <button onClick={() => { setData(r.data); setActiveTab('proposer'); }} className="bg-white text-jh-green font-bold px-6 py-2 rounded-xl shadow-sm hover:shadow-md active:scale-95 transition-all">重新加载</button>
                     </div>
                   ))}
                 </div>
               )}
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

// 状态微章组件
const DiagnosticBadge = ({ label, status }: { label: string, status: 'checking' | 'ok' | 'fail' }) => (
  <div className={`px-3 py-1 rounded-full text-[10px] font-black tracking-tighter border flex items-center gap-2 ${status === 'ok' ? 'bg-emerald-500/10 border-emerald-400/30 text-emerald-200' : status === 'fail' ? 'bg-rose-500/10 border-rose-400/30 text-rose-300' : 'bg-slate-500/10 border-slate-400/30 text-slate-300'}`}>
    <div className={`w-2 h-2 rounded-full ${status === 'ok' ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)] animate-pulse' : status === 'fail' ? 'bg-rose-500' : 'bg-slate-400'}`}></div>
    {label}: {status === 'ok' ? '已就绪' : status === 'fail' ? '连接失败' : '检测中...'}
  </div>
);

// 输入组组件
const InputGroup: React.FC<{ label: string; value: string; onChange: (v: string) => void; placeholder?: string }> = ({ label, value, onChange, placeholder }) => (
  <div className="flex flex-col gap-2">
    <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">{label}</label>
    <input 
      type="text" 
      className="bg-slate-50 border border-slate-200 text-slate-800 px-5 py-4 rounded-2xl outline-none focus:ring-4 focus:ring-jh-green/10 focus:border-jh-green focus:bg-white transition-all placeholder:text-slate-300 font-medium" 
      placeholder={placeholder} 
      value={value} 
      onChange={(e) => onChange(e.target.value)} 
    />
  </div>
);

export default Admin;
