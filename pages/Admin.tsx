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

// --- 子组件定义 ---

const SectionHeader: React.FC<{ title: string; subtitle: string; onScan: () => void }> = ({ title, subtitle, onScan }) => (
  <div className="flex justify-between items-center border-b border-slate-50 pb-6">
    <div className="flex-1">
      <h2 className="text-3xl font-black text-slate-800">{title}</h2>
      <p className="text-slate-400 text-sm mt-1">{subtitle}</p>
    </div>
    <button onClick={onScan} className="bg-jh-green text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-jh-green/20 transition-all hover:scale-105 active:scale-95 shrink-0 ml-4">📷 AI 识别</button>
  </div>
);

const InputGroup: React.FC<{ label: string; value: string; onChange: (v: string) => void }> = ({ label, value, onChange }) => (
  <div className="flex flex-col gap-2">
    <label className="text-xs font-black text-slate-400 tracking-widest px-1 uppercase">{label}</label>
    <input type="text" className="bg-slate-50 border border-slate-200 text-slate-800 px-5 py-4 rounded-2xl outline-none font-medium focus:border-jh-green transition-all" 
      value={value} onChange={e => onChange(e.target.value)} />
  </div>
);

const DiagnosticBadge: React.FC<{ label: string; status: 'ok' | 'checking' | 'fail'; onClick: () => void }> = ({ label, status, onClick }) => (
  <div onClick={onClick} className={`px-3 py-1 rounded-full text-[10px] font-black border flex items-center gap-2 cursor-pointer transition-all ${status === 'ok' ? 'bg-emerald-500/10 border-emerald-400/30 text-emerald-200' : (status === 'checking' ? 'bg-amber-500/10 border-amber-400/30 text-amber-200' : 'bg-rose-500/10 border-rose-400/30 text-rose-300')}`}>
    <div className={`w-2 h-2 rounded-full ${status === 'ok' ? 'bg-emerald-400' : (status === 'checking' ? 'bg-amber-400 animate-spin' : 'bg-rose-500 animate-pulse')}`}></div>
    {label}: {status === 'ok' ? '就绪' : (status === 'checking' ? '中' : '异常')}
  </div>
);

const Admin: React.FC = () => {
  const [data, setData] = useState<InsuranceData>(INITIAL_DATA);
  const [activeTab, setActiveTab] = useState<'proposer' | 'insured' | 'vehicle' | 'project' | 'payment' | 'generate' | 'history'>('proposer');
  const [qrCode, setQrCode] = useState<string>('');
  const [isCloudLoading, setIsCloudLoading] = useState(false);
  const [kvStatus, setKvStatus] = useState<'checking' | 'ok' | 'fail'>('checking');
  const [aiStatus, setAiStatus] = useState<'ready' | 'missing' | 'testing'>('missing');
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const wechatQrInputRef = useRef<HTMLInputElement>(null);

  const hltProductName = `国寿财险${data.vehicle.plate || '[车牌]'}机动车商业保险`;

  useEffect(() => {
    checkKV();
    const config = getApiKey();
    setAiStatus(config.error ? 'missing' : 'ready');
  }, []);

  const checkKV = () => {
    setKvStatus('checking');
    fetch('/api/status').then(res => res.json()).then(s => setKvStatus(s.kv_bound ? 'ok' : 'fail')).catch(() => setKvStatus('fail'));
  };

  const handleInputChange = (section: keyof InsuranceData, field: string, value: string) => {
    setData(prev => ({ ...prev, [section]: { ...(prev[section] as any), [field]: value } }));
  };

  const handleWechatQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64 = ev.target?.result as string;
        setData(prev => ({ ...prev, payment: { ...prev.payment, wechatQrCode: base64 } }));
      };
      reader.readAsDataURL(file);
    }
  };

  const applyHistoryData = (historyData: InsuranceData) => {
    // 深度克隆历史数据并应用，但保留当前的订单ID以防冲突
    const newData = JSON.parse(JSON.stringify(historyData));
    newData.orderId = `JH-${Math.floor(Math.random() * 100000)}`;
    setData(newData);
    setActiveTab('proposer');
    alert('已成功载入曾录入的信息');
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
    QRCode.toDataURL(finalUrl, { margin: 2, width: 600 }).then(setQrCode);
    setHistory(prev => [{ 
      id: Date.now().toString(), 
      timestamp: new Date().toLocaleString(), 
      summary: `${data.proposer.name || '未命名'} - ${data.vehicle.plate || '无车牌'}`, 
      data: JSON.parse(JSON.stringify(data)) 
    }, ...prev]);
    setActiveTab('generate');
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24 font-sans text-slate-900 overflow-x-hidden">
      <header className="bg-jh-green text-white p-5 shadow-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4 overflow-hidden">
             <div className="h-10 w-auto bg-white rounded-xl flex items-center justify-center overflow-hidden border border-white/30 shadow-md px-3 shrink-0">
                <img src="jhic.jpeg" className="h-8 w-auto object-contain" alt="China Life Logo" />
             </div>
             <div className="min-w-0">
                <h1 className="text-xl font-black tracking-tight leading-tight truncate">ChinaLife-JHPCIC投保系统</h1>
                <p className="text-[10px] opacity-70 tracking-[0.2em] font-medium uppercase">INTERNAL AUTOPAY SYSTEM V3.3</p>
             </div>
          </div>
          <div className="flex gap-3 shrink-0">
            <DiagnosticBadge label="KV" status={kvStatus} onClick={checkKV} />
            <DiagnosticBadge label="AI" status={aiStatus === 'ready' ? 'ok' : 'fail'} onClick={() => {}} />
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-4 md:p-8">
        <div className="flex overflow-x-auto gap-3 mb-10 pb-2 no-scrollbar">
          {[
            { id: 'proposer', label: '1. 投保人' },
            { id: 'insured', label: '2. 被保险人' },
            { id: 'vehicle', label: '3. 投保车辆信息' },
            { id: 'project', label: '4. 方案设置' },
            { id: 'payment', label: '5. 收款配置' },
            { id: 'generate', label: '6. 生成链接' },
            { id: 'history', label: '7. 历史' }
          ].map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} 
              className={`flex items-center gap-2 px-6 py-4 rounded-2xl whitespace-nowrap text-sm font-bold transition-all shadow-sm border ${activeTab === tab.id ? 'bg-jh-green text-white border-jh-green ring-4 ring-jh-green/10' : 'bg-white text-slate-400 border-slate-100 hover:border-jh-green/30'}`}>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-3xl shadow-2xl shadow-jh-green/5 border border-slate-100 p-6 md:p-12 min-h-[500px]">
          {activeTab === 'proposer' && (
            <div className="space-y-10 animate-in fade-in duration-500">
              <SectionHeader title="投保人核心资料" subtitle="请务必确保联系方式真实有效，以免影响核保" onScan={() => {}} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <InputGroup label="姓名 / 机构名称" value={data.proposer.name} onChange={v => handleInputChange('proposer', 'name', v)} />
                <InputGroup label="统一社会信用代码 / 证件号" value={data.proposer.idCard} onChange={v => handleInputChange('proposer', 'idCard', v)} />
                <InputGroup label="手机号码" value={data.proposer.mobile} onChange={v => handleInputChange('proposer', 'mobile', v)} />
                <div className="md:col-span-2"><InputGroup label="详细联系地址" value={data.proposer.address} onChange={v => handleInputChange('proposer', 'address', v)} /></div>
              </div>
            </div>
          )}

          {activeTab === 'vehicle' && (
            <div className="space-y-10 animate-in fade-in duration-500">
              <SectionHeader title="投保车辆信息" subtitle="请拍摄行驶证原件进行 AI 自动识别录入" onScan={() => {}} />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <InputGroup label="车牌号码" value={data.vehicle.plate} onChange={v => handleInputChange('vehicle', 'plate', v)} />
                <InputGroup label="车辆所有人" value={data.vehicle.vehicleOwner} onChange={v => handleInputChange('vehicle', 'vehicleOwner', v)} />
                <InputGroup label="厂牌型号" value={data.vehicle.brand} onChange={v => handleInputChange('vehicle', 'brand', v)} />
                <div className="md:col-span-3">
                  <InputGroup label="车辆识别代号 (VIN)" value={data.vehicle.vin} onChange={v => handleInputChange('vehicle', 'vin', v)} />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'payment' && (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4">
              <div className="border-b border-slate-50 pb-6">
                <h2 className="text-3xl font-black text-slate-800">支付渠道与收款配置</h2>
                <p className="text-slate-400 text-sm mt-1">配置支付宝跳转地址与上传微信收款二维码凭证</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-6">
                  <InputGroup label="支付宝跳转链接" value={data.payment.alipayUrl} onChange={v => handleInputChange('payment', 'alipayUrl', v)} />
                  <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 flex justify-between items-center">
                    <div>
                      <p className="text-[10px] text-blue-500 font-black mb-1 tracking-widest uppercase opacity-60">建议商品名</p>
                      <p className="font-bold text-blue-900 text-sm">{hltProductName}</p>
                    </div>
                    <button onClick={() => navigator.clipboard.writeText(hltProductName).then(() => alert('已复制'))} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold active:scale-90 transition-transform">复制</button>
                  </div>
                </div>
                <div className="bg-slate-50 p-8 rounded-[2.5rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-6 group transition-all hover:border-jh-green/50">
                  <h3 className="font-black text-slate-800 flex items-center gap-2">微信收款二维码</h3>
                  <div className="relative w-40 h-40 bg-white rounded-3xl shadow-xl flex items-center justify-center overflow-hidden border-4 border-white ring-8 ring-slate-100">
                    {data.payment.wechatQrCode ? (
                      <img src={data.payment.wechatQrCode} className="w-full h-full object-contain" alt="Wechat QR" />
                    ) : (
                      <div className="text-center p-4">
                        <div className="text-4xl mb-2 opacity-20">🖼️</div>
                        <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">请上传二维码</p>
                      </div>
                    )}
                  </div>
                  <input type="file" ref={wechatQrInputRef} onChange={handleWechatQrUpload} accept="image/*" className="hidden" />
                  <div className="flex gap-2">
                    <button onClick={() => wechatQrInputRef.current?.click()} className="bg-white text-jh-green px-6 py-3 rounded-2xl font-black text-sm shadow-lg border border-jh-green/20 hover:bg-jh-green hover:text-white transition-all">
                      {data.payment.wechatQrCode ? '更换图片' : '立即上传'}
                    </button>
                    {data.payment.wechatQrCode && (
                      <button onClick={() => handleInputChange('payment', 'wechatQrCode', '')} className="bg-rose-50 text-rose-500 px-4 py-3 rounded-2xl font-black text-sm border border-rose-100 hover:bg-rose-500 hover:text-white transition-all">删除</button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'generate' && (
            <div className="flex flex-col items-center justify-center py-10 space-y-10 animate-in zoom-in-95">
               <button onClick={generateLink} disabled={isCloudLoading} className="bg-jh-green text-white px-12 py-6 rounded-3xl font-black text-xl shadow-2xl transition-all active:scale-95 disabled:opacity-50 min-w-[280px]">
                 {isCloudLoading ? <span className="flex items-center gap-3 justify-center"><div className="w-5 h-5 border-4 border-t-white rounded-full animate-spin"></div> 正在同步云端</span> : '⚡ 生成加密投保码'}
               </button>
               {qrCode && (
                 <div className="flex flex-col items-center gap-6">
                   <div className="bg-white p-6 rounded-[3.5rem] shadow-3xl border relative overflow-hidden ring-1 ring-slate-100">
                     <img src={qrCode} className="w-64 h-64 object-contain relative z-10" alt="Generated QR" />
                     <div className="absolute top-0 right-0 p-3 opacity-10 font-black text-jh-green text-xs">JHPCIC V3.3</div>
                   </div>
                   <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.3em] bg-slate-100 px-6 py-2 rounded-full">长按保存或发送给客户</p>
                 </div>
               )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div className="border-b border-slate-50 pb-6">
                <h2 className="text-3xl font-black text-slate-800">曾录入的信息</h2>
                <p className="text-slate-400 text-sm mt-1">查看并复用之前的录单模板，加快操作速度</p>
              </div>
              {history.length === 0 ? (
                <div className="py-20 text-center text-slate-300 italic font-bold">暂无历史记录</div>
              ) : (
                <div className="grid gap-4">
                  {history.map((item) => (
                    <div key={item.id} className="bg-slate-50 p-6 rounded-3xl flex justify-between items-center border border-slate-100 hover:border-jh-green/40 transition-all">
                      <div>
                        <p className="font-black text-slate-800 text-lg">{item.summary}</p>
                        <p className="text-xs text-slate-400 font-medium mt-1 uppercase tracking-widest">{item.timestamp}</p>
                      </div>
                      <button onClick={() => applyHistoryData(item.data)} className="bg-white text-jh-green border border-jh-green/30 px-6 py-3 rounded-2xl font-black text-sm hover:bg-jh-green hover:text-white transition-all shadow-sm">应用此记录</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {(['insured', 'project'].includes(activeTab)) && (
            <div className="py-32 text-center">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl opacity-20">🚧</span>
              </div>
              <p className="text-slate-300 font-black italic uppercase tracking-[0.2em]">正在打磨中...</p>
              <p className="text-[10px] text-slate-200 mt-2 font-bold italic">请点击其他 Tab 继续测试</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Admin;