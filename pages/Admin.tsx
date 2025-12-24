
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

  // 汇来通商品名称自动生成逻辑
  const hltProductName = `国寿财险${data.vehicle.plate || '[未录入车牌]'}机动车商业保险`;

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
    copyToClipboard(hltProductName, "商品名称已复制，请在汇来通后台粘贴");
    window.open('https://user.huilaitongpay.com/mchInfo', '_blank');
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24 font-sans text-slate-900">
      <header className="bg-jh-green text-white p-5 shadow-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center font-bold text-xl cursor-help" onClick={() => setShowGuide(true)}>保</div>
             <div>
                <h1 className="text-xl font-black tracking-tight leading-tight">JHPCIC 录入系统</h1>
                <p className="text-[10px] opacity-70 tracking-[0.2em] font-medium uppercase">Internal Autopay System v2.8</p>
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
                <h2 className="text-3xl font-black text-slate-800">收单配置助手</h2>
                <p className="text-slate-400 text-sm mt-1">集成第三方平台快捷操作流</p>
              </div>

              {/* 汇来通专项配置模块 */}
              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-blue-200 relative overflow-hidden group">
                 <div className="absolute top-0 right-0 p-10 opacity-10 pointer-events-none group-hover:scale-110 transition-transform">
                    <svg className="w-40 h-40" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.82v-1.91c-.06-.02-.13-.03-.19-.05-1.54-.47-2.72-1.39-3.4-2.42l1.71-1.02c.47.7 1.25 1.35 2.21 1.63.85.24 1.75.09 2.2-.33.35-.33.39-.78.11-1.08-.34-.37-.87-.63-1.6-.9l-.6-.22c-1.22-.45-2.22-.88-2.83-1.51-.77-.81-.95-1.93-.41-3.03.58-1.15 1.76-1.93 3.16-2.22V5h2.82v1.88c.07.01.14.03.21.04 1.28.27 2.26.97 2.92 1.83l-1.63 1.05c-.39-.5-.96-.92-1.69-1.1-.7-.17-1.45-.11-1.85.21-.34.28-.4.62-.19.92.29.42.92.74 1.94 1.13l.63.24c1.4.52 2.39 1.05 3 1.79.64.78.78 1.94.3 2.99-.6 1.31-1.89 2.13-3.39 2.44z"/></svg>
                 </div>
                 <div className="relative z-10 space-y-6">
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-3">
                          <span className="bg-white text-blue-700 px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase">Integration</span>
                          <h3 className="text-xl font-black">汇来通收银台助手</h3>
                       </div>
                       <div className="flex gap-2">
                          <div className="bg-white/10 px-3 py-1 rounded-lg text-[9px] font-mono border border-white/10">User: H15348806977</div>
                          <div className="bg-white/10 px-3 py-1 rounded-lg text-[9px] font-mono border border-white/10">Pass: 868132</div>
                       </div>
                    </div>

                    <div className="bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/20 space-y-4">
                       <div>
                          <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest mb-1">建议商品名称 (已根据规则自动生成)</p>
                          <div className="flex justify-between items-center gap-4">
                             <span className="text-lg font-bold tracking-tight">{hltProductName}</span>
                             <button onClick={openHuilaitong} className="shrink-0 bg-white text-blue-700 px-5 py-2 rounded-xl font-black text-xs hover:bg-blue-50 active:scale-95 transition-all">复制并前往配置</button>
                          </div>
                       </div>
                    </div>
                    <div className="space-y-3">
                       <label className="text-[10px] font-bold opacity-60 uppercase tracking-widest px-1">支付宝跳转链接 (请将汇来通生成的链接粘贴至此)</label>
                       <input 
                         type="text" 
                         className="w-full bg-white/10 border border-white/20 text-white placeholder:text-white/30 px-5 py-4 rounded-2xl focus:ring-4 focus:ring-white/10 outline-none font-medium transition-all" 
                         placeholder="https://user.huilaitongpay.com/pay/..."
                         value={data.payment.alipayUrl}
                         onChange={e => handleInputChange('payment', 'alipayUrl', e.target.value)}
                       />
                    </div>
                    <p className="text-[10px] opacity-50 italic">* 步骤：1. 点击上方复制按钮 -> 2. 在汇来通后台“商品名称”处粘贴 -> 3. 点击汇来通“复制支付链接”按钮 -> 4. 粘贴到此处。</p>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-1 gap-10">
                <div className="bg-emerald-50/50 p-8 rounded-[2.5rem] border border-emerald-100 space-y-6">
                   <h3 className="font-bold text-jh-green flex items-center gap-2"><span className="w-8 h-8 bg-jh-green text-white rounded-full flex items-center justify-center text-xs">微</span> 微信收款二维码 (手动备用)</h3>
                   <div className="bg-white p-6 rounded-3xl border border-emerald-100 flex flex-col items-center gap-4">
                      {data.payment.wechatQrCode ? (
                        <div className="relative group">
                          <img src={data.payment.wechatQrCode} className="w-48 h-48 object-contain" alt="QR" />
                          <button onClick={() => handleInputChange('payment', 'wechatQrCode', '')} className="absolute -top-3 -right-3 bg-red-500 text-white w-8 h-8 rounded-full text-xs shadow-lg">✕</button>
                        </div>
                      ) : (
                        <div className="text-center py-6">
                          <button onClick={() => qrInputRef.current?.click()} className="bg-jh-green text-white px-10 py-4 rounded-2xl font-bold shadow-xl shadow-jh-green/20">上传微信收款码</button>
                          <p className="text-[10px] text-slate-400 mt-4">通常用于业务员个人直收保费</p>
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
               <div className="border-b border-slate-50 pb-6">
                  <h2 className="text-3xl font-black text-slate-800">投保方案设置</h2>
                  <p className="text-slate-400 text-sm mt-1">您可以自由添加、删除保项，系统将自动汇总保费</p>
               </div>
              
              <div className="bg-slate-50 p-6 md:p-8 rounded-[2rem] border border-slate-100 space-y-8">
                {/* 快捷添加栏 */}
                <div className="flex flex-wrap gap-3 items-center">
                   <span className="text-xs font-black text-slate-400 uppercase tracking-widest mr-2">快捷添加:</span>
                   <QuickAddBtn label="车损险" onClick={() => addCoverage('机动车损失保险', '300,000.00')} />
                   <QuickAddBtn label="三者险" onClick={() => addCoverage('机动车第三者责任保险', '1,000,000.00')} />
                   <QuickAddBtn label="司机座" onClick={() => addCoverage('机动车车上人员责任险(驾驶员)', '10,000.00')} />
                   <QuickAddBtn label="乘客座" onClick={() => addCoverage('机动车车上人员责任险(乘客)', '10,000.00/座')} />
                   <button onClick={() => addCoverage()} className="px-4 py-2 bg-white border-2 border-dashed border-slate-200 text-slate-400 rounded-xl text-xs font-bold hover:border-jh-green hover:text-jh-green transition-all">自定义 +</button>
                </div>

                <div className="space-y-4">
                  {data.project.coverages.map((item, idx) => (
                    <div key={idx} className="group relative grid grid-cols-1 md:grid-cols-7 gap-4 items-end bg-white p-6 rounded-3xl border border-slate-200 shadow-sm animate-in slide-in-from-left duration-300">
                        <div className="md:col-span-3">
                           <InputGroup label="险种名称" value={item.name} onChange={v => updateCoverage(idx, 'name', v)} />
                        </div>
                        <div className="md:col-span-2">
                           <InputGroup label="承保限额" value={item.amount} onChange={v => updateCoverage(idx, 'amount', v)} />
                        </div>
                        <div className="md:col-span-2 relative">
                           <InputGroup label="保费金额" value={item.premium} onChange={v => updateCoverage(idx, 'premium', v)} />
                           <button 
                             onClick={() => removeCoverage(idx)}
                             className="absolute -top-1 -right-1 md:top-auto md:bottom-3 md:-right-10 w-8 h-8 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center text-xs hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                             title="删除此项"
                           >✕</button>
                        </div>
                    </div>
                  ))}
                </div>

                {data.project.coverages.length === 0 && (
                  <div className="py-20 text-center border-2 border-dashed border-slate-200 rounded-[2rem] text-slate-300 italic">
                    点击上方快捷按钮添加保项
                  </div>
                )}

                <div className="flex justify-between items-center px-10 py-8 bg-jh-green text-white rounded-[2rem] shadow-2xl shadow-jh-green/20">
                   <div>
                     <span className="font-black opacity-60 text-xs uppercase tracking-widest block mb-1">Total Premium</span>
                     <span className="font-bold">总保费合计：</span>
                   </div>
                   <span className="text-5xl font-black italic tracking-tighter">¥ {data.project.premium}</span>
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
                   <button onClick={() => copyToClipboard(generatedLink, "保单链接已复制")} className="mt-6 text-jh-green font-bold hover:underline">点击复制保单链接</button>
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
const QuickAddBtn = ({ label, onClick }: { label: string, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className="px-4 py-2 bg-jh-green/5 text-jh-green border border-jh-green/10 rounded-xl text-xs font-bold hover:bg-jh-green hover:text-white transition-all shadow-sm"
  >
    {label} +
  </button>
);

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
        
        <div className="space-y-4">
           <div className="p-5 bg-slate-50 border border-slate-100 rounded-2xl space-y-3">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">当前 AI Key 探测状态</p>
              <div className="flex justify-between items-center">
                 <span className="text-sm font-medium">环境变量注入:</span>
                 <span className={config.error ? 'text-rose-500 font-bold' : 'text-emerald-500 font-bold'}>
                   {config.error ? '未检测到 (MISSING)' : '已加载 (LOADED)'}
                 </span>
              </div>
              {!config.error && (
                <>
                  <div className="flex justify-between items-center text-xs">
                     <span className="text-slate-400">脱敏展示:</span>
                     <code className="bg-slate-200 px-2 py-0.5 rounded font-mono">{config.masked}</code>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                     <span className="text-slate-400">Key 字符长度:</span>
                     <span className="font-bold">{config.length} 位</span>
                  </div>
                </>
              )}
           </div>

           {config.error && (
             <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl">
                <p className="font-bold text-rose-600 text-sm">诊断建议：</p>
                <p className="text-xs text-rose-500 mt-1">1. Cloudflare 设置中变量名必须是 <code className="bg-white px-1 font-bold">API_KEY</code>。<br/>2. 变量值不要带引号。<br/>3. 修改后必须去 Deployments 点击 <b>Retry deployment</b>。</p>
             </div>
           )}
        </div>

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
