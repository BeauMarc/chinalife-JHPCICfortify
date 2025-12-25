import React, { useState, useEffect, useRef } from 'react';
import { encodeData, InsuranceData, CoverageItem } from '../utils/codec';
import { scanPersonImage, scanVehicleImage, getApiKey, testAIConnection } from '../utils/ai';
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
  project: {
    region: '北京', period: '2024-01-01 至 2025-01-01', premium: '0.00', coverages: [
      { name: '机动车损失保险', amount: '300,000.00', deductible: '/', premium: '0.00' },
      { name: '机动车第三者责任保险', amount: '1,000,000.00', deductible: '/', premium: '0.00' }
    ]
  },
  payment: { alipayUrl: '', wechatQrCode: '' }
};

interface HistoryRecord { id: string; timestamp: string; summary: string; data: InsuranceData; }

const SectionHeader: React.FC<{ title: string; subtitle: string; onScan: () => void; isScanning: boolean; }> = ({ title, subtitle, onScan, isScanning }) => (
  <div className="flex flex-wrap justify-between items-center border-b border-slate-50 pb-6 gap-4">
    <div className="flex-1">
      <h2 className="text-3xl font-black text-slate-800">{title}</h2>
      <p className="text-slate-400 text-sm mt-1">{subtitle}</p>
    </div>
    <button onClick={onScan} disabled={isScanning} className="bg-jh-green text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-jh-green/20 transition-all hover:scale-105 active:scale-95 shrink-0 ml-4 disabled:opacity-50 disabled:cursor-wait min-w-[120px]">
      {isScanning ? (
        <>
          <div className="w-5 h-5 border-2 border-t-white rounded-full animate-spin"></div>
          <span>识别中...</span>
        </>
      ) : (
        '📷 AI 识别'
      )}
    </button>
  </div>
);

const COMMON_COVERAGES = [
  "机动车损失保险",
  "机动车第三者责任保险",
  "机动车车上人员责任保险(司机)",
  "机动车车上人员责任保险(乘客)",
  "机动车全车盗抢保险",
  "玻璃单独破碎险",
  "自燃损失险",
  "车身划痕损失险",
  "发动机涉水损失险",
  "不计免赔率险"
];

const COMMON_AMOUNTS = [
  "10万",
  "20万",
  "30万",
  "50万",
  "100万",
  "150万",
  "200万",
  "300万"
];

const InputGroup: React.FC<{ label: string; value: string; onChange: (v: string) => void; error?: string; list?: string; }> = ({ label, value, onChange, error, list }) => (
  <div className="flex flex-col gap-2">
    <label className="text-xs font-black text-slate-400 tracking-widest px-1 uppercase">{label}</label>
    <input type="text" list={list} className={`bg-slate-50 border text-slate-800 px-5 py-4 rounded-2xl outline-none font-medium focus:border-jh-green transition-all ${error ? 'border-rose-400' : 'border-slate-200'}`}
      value={value} onChange={e => onChange(e.target.value)} />
    {error && <p className="text-rose-500 text-xs mt-1 px-1">{error}</p>}
  </div>
);

const DiagnosticBadge: React.FC<{ label: string; status: 'ok' | 'checking' | 'fail'; onClick: () => void }> = ({ label, status, onClick }) => (
  <div onClick={onClick} className={`px-3 py-1 rounded-full text-[10px] font-black border flex items-center gap-2 cursor-pointer transition-all ${status === 'ok' ? 'bg-emerald-500/10 border-emerald-400/30 text-emerald-200' : (status === 'checking' ? 'bg-amber-500/10 border-amber-400/30 text-amber-200' : 'bg-rose-500/10 border-rose-400/30 text-rose-300')}`}>
    <div className={`w-2 h-2 rounded-full ${status === 'ok' ? 'bg-emerald-400' : (status === 'checking' ? 'bg-amber-400 animate-spin' : 'bg-rose-500 animate-pulse')}`}></div>
    {label}: {status === 'ok' ? '就绪' : (status === 'checking' ? '中' : '异常')}
  </div>
);

const PRESET_TEMPLATES = {
  personal: {
    proposer: { name: '李明', idType: '身份证', idCard: '11010119900307001X', mobile: '13800138000', address: '北京市朝阳区建国路88号' },
  },
  company: {
    proposer: { name: '北京示例科技有限公司', idType: '统一社会信用代码', idCard: '91110105MA01Q8888A', mobile: '13910012345', address: '北京市海淀区中关村大街1号' },
  },
  vehicle: {
    vehicle: { plate: '京A88888', vin: 'LSVDU25G8PK123456', brand: '特斯拉/Tesla Model Y', vehicleOwner: '李明' },
  }
};

const Admin: React.FC = () => {
  const [data, setData] = useState<InsuranceData>(INITIAL_DATA);
  const [activeTab, setActiveTab] = useState<'proposer' | 'insured' | 'vehicle' | 'project' | 'payment' | 'generate' | 'history'>('proposer');
  const [qrCode, setQrCode] = useState<string>('');
  const [generatedUrl, setGeneratedUrl] = useState<string>('');
  const [isCloudLoading, setIsCloudLoading] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const [kvStatus, setKvStatus] = useState<'checking' | 'ok' | 'fail'>('checking');
  const [aiStatus, setAiStatus] = useState<'ok' | 'fail' | 'testing' | 'missing'>('missing');
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [completedTabs, setCompletedTabs] = useState<Set<string>>(new Set());
  const wechatQrInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importFileInputRef = useRef<HTMLInputElement>(null);

  const hltProductName = `国寿财险${data.vehicle.plate || '[车牌]'}机动车商业保险`;

  useEffect(() => {
    checkKV();
    const config = getApiKey();
    setAiStatus(config.error ? 'fail' : 'ok');
    // 从 Cloudflare KV 加载历史记录
    setIsHistoryLoading(true);
    fetch('/api/history?action=get')
      .then(res => (res.ok ? res.json() : []))
      .then((data: HistoryRecord[]) => setHistory(Array.isArray(data) ? data : []))
      .catch((err: Error) => console.error("无法从 KV 加载历史记录:", err))
      .finally(() => setIsHistoryLoading(false));

    try {
      const draft = localStorage.getItem('jh_autopay_draft');
      if (draft) {
        if (window.confirm('检测到上次未完成的草稿，是否恢复？')) {
          const draftData = JSON.parse(draft);
          setData(draftData);
          alert('✓ 草稿已恢复');
        }
      }
    } catch (error) {
      console.error("无法从 localStorage 加载草稿:", error);
    }
  }, []);

  // 实时保存草稿
  useEffect(() => {
    const handler = setTimeout(() => {
      localStorage.setItem('jh_autopay_draft', JSON.stringify(data));
    }, 1000);
    return () => clearTimeout(handler);
  }, [data]);

  // 自动计算总保费逻辑：监听险种明细变化
  useEffect(() => {
    const total = data.project.coverages.reduce((sum: number, item: CoverageItem) => {
      const val = parseFloat(item.premium) || 0;
      return sum + val;
    }, 0);

    setData(prev => ({ ...prev, project: { ...prev.project, premium: total.toFixed(2) } }));
  }, [data.project.coverages]);

  // 每当 history 变化时，将其自动保存到 Cloudflare KV
  useEffect(() => {
    // 仅在 history 实际被修改后（非初始加载）执行保存
    if (!isHistoryLoading && history.length > 0) {
      fetch('/api/history?action=set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(history),
      }).catch((err: Error) => console.error("保存历史记录到 KV 失败:", err));
    }
  }, [history, isHistoryLoading]);

  const validateSection = (tab: typeof activeTab): string[] => {
    const errorMessages: string[] = [];
    const currentErrors: Record<string, string> = {};

    if (tab === 'proposer') {
      if (!data.proposer.name) { errorMessages.push('投保人名称不能为空'); currentErrors['proposer.name'] = '投保人名称不能为空'; }
      if (!data.proposer.idCard) { errorMessages.push('证件号码不能为空'); currentErrors['proposer.idCard'] = '证件号码不能为空'; }
      if (!/^1[3-9]\d{9}$/.test(data.proposer.mobile)) { errorMessages.push('请输入有效的手机号码'); currentErrors['proposer.mobile'] = '请输入有效的手机号码'; }
    }
    if (tab === 'insured') {
      if (!data.insured.name) { errorMessages.push('被保险人名称不能为空'); currentErrors['insured.name'] = '被保险人名称不能为空'; }
      if (!data.insured.idCard) { errorMessages.push('被保险人证件号码不能为空'); currentErrors['insured.idCard'] = '被保险人证件号码不能为空'; }
    }
    if (tab === 'vehicle') {
      if (!data.vehicle.plate) { errorMessages.push('车牌号码不能为空'); currentErrors['vehicle.plate'] = '车牌号码不能为空'; }
      if (!data.vehicle.vin) { errorMessages.push('车辆识别代号 (VIN)不能为空'); currentErrors['vehicle.vin'] = '车辆识别代号 (VIN)不能为空'; }
    }
    if (tab === 'project') {
      if (!data.project.premium || isNaN(Number(data.project.premium))) { errorMessages.push('保费合计必须为有效数字'); currentErrors['project.premium'] = '保费合计必须为有效数字'; }
    }
    setErrors(currentErrors);
    return errorMessages;
  };

  const isTabComplete = (tabId: string): boolean => {
    switch (tabId) {
      case 'proposer':
        return !!(data.proposer.name && data.proposer.idCard && /^1[3-9]\d{9}$/.test(data.proposer.mobile));
      case 'vehicle':
        return !!(data.vehicle.plate && data.vehicle.vin);
      case 'payment':
        return !!(data.payment.alipayUrl || data.payment.wechatQrCode);
      default:
        return true;
    }
  };

  useEffect(() => {
    const newCompleted = new Set<string>();
    if (isTabComplete('proposer')) newCompleted.add('proposer');
    if (isTabComplete('insured')) newCompleted.add('insured');
    if (isTabComplete('vehicle')) newCompleted.add('vehicle');
    if (isTabComplete('project')) newCompleted.add('project');
    if (isTabComplete('payment')) newCompleted.add('payment');
    setCompletedTabs(newCompleted);
  }, [data]);

  const handleTabSwitch = (newTab: typeof activeTab) => {
    const validationErrors = validateSection(activeTab);
    if (validationErrors.length > 0) {
      alert(`当前页面有错误，请修正后再切换:\n- ${validationErrors.join('\n- ')}`);
      return;
    }
    setErrors({}); // Clear errors when switching tab
    setActiveTab(newTab);
  };

  const checkKV = () => {
    setKvStatus('checking');
    fetch('/api/status').then(res => res.json()).then(s => setKvStatus(s.kv_bound ? 'ok' : 'fail')).catch(() => setKvStatus('fail'));
  };

  const testAI = async () => {
    setAiStatus('testing');
    try {
      await testAIConnection();
      setAiStatus('ok');
      alert("✅ AI 连接成功，Key 有效！");
    } catch (e: any) {
      setAiStatus('fail');
      alert(`❌ ${e.message}`);
    }
  };

  const handleInputChange = (section: keyof InsuranceData, field: string, value: string) => {
    setData(prev => ({ ...prev, [section]: { ...(prev[section] as any), [field]: value } }));
    const key = `${section}.${field}`;
    let error = '';
    if (section === 'proposer') {
      if (field === 'name' && !value) error = '投保人名称不能为空';
      if (field === 'idCard' && !value) error = '证件号码不能为空';
      if (field === 'mobile' && !/^1[3-9]\d{9}$/.test(value)) error = '请输入有效的手机号码';
    }
    if (section === 'insured') {
      if (field === 'name' && !value) error = '被保险人名称不能为空';
      if (field === 'idCard' && !value) error = '被保险人证件号码不能为空';
      if (field === 'mobile' && !/^1[3-9]\d{9}$/.test(value)) error = '请输入有效的手机号码';
    }
    if (section === 'vehicle') {
      if (field === 'plate' && !value) error = '车牌号码不能为空';
      if (field === 'vin' && !value) error = '车辆识别代号 (VIN)不能为空';
    }
    if (section === 'project') {
      if (field === 'premium' && (isNaN(Number(value)) || !value)) error = '请输入有效的保费金额';
    }
    setErrors((prev: Record<string, string>) => ({ ...prev, [key]: error }));
  };

  const triggerAIScan = (tab: 'proposer' | 'insured' | 'vehicle') => {
    fileInputRef.current?.setAttribute('data-scan-target', tab);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const tab = fileInputRef.current?.getAttribute('data-scan-target') as 'proposer' | 'insured' | 'vehicle';
    if (!file || !tab) return;

    setScanLoading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      try {
        const scanFn = (tab === 'proposer' || tab === 'insured') ? scanPersonImage : scanVehicleImage;
        const result = await scanFn(base64);
        setData(prev => ({ ...prev, [tab]: { ...prev[tab], ...result } }));
        alert('✅ AI 识别成功并已自动填充！');
      } catch (err: any) {
        alert(`⚠️ AI识别失败，请检查API密钥配置: ${err.message}`);
      } finally {
        setScanLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsDataURL(file);
  };
  const handleWechatQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev: ProgressEvent<FileReader>) => {
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
        const resData: { id?: string } = await response.json();
        if (resData.id) finalUrl = `${baseUrl}#/buffer?id=${resData.id}`;
      }
    } catch (e) { console.warn("KV 保存失败"); } finally { setIsCloudLoading(false); }

    if (!finalUrl) {
      finalUrl = `${baseUrl}#/buffer?data=${encodeData(data)}`;
    }
    setGeneratedUrl(finalUrl);
    QRCode.toDataURL(finalUrl, { margin: 2, width: 600 })
      .then(url => {
        setQrCode(url);
        setActiveTab('generate');
      })
      .catch((err: Error) => alert(`生成二维码失败: ${err.message}`));

    setHistory((prev: HistoryRecord[]) => [{
      id: Date.now().toString(),
      timestamp: new Date().toLocaleString(),
      summary: `${data.proposer.name || '未命名'} - ${data.vehicle.plate || '无车牌'}`,
      data: JSON.parse(JSON.stringify(data))
    }, ...prev]);
  };

  const applyTemplate = (template: Partial<InsuranceData>) => {
    setData(prev => ({ ...prev, ...JSON.parse(JSON.stringify(template)) }));
    alert('✓ 模板已应用');
  };

  const exportData = () => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
    const link = document.createElement("a");
    link.href = jsonString;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    link.download = `${data.proposer.name || '未命名'}_${timestamp}.json`;
    link.click();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event: ProgressEvent<FileReader>) => {
      try {
        const importedData: InsuranceData = JSON.parse(event.target?.result as string);
        if (importedData.proposer && importedData.vehicle) {
          setData(importedData);
          alert('✓ 数据导入成功！');
        } else {
          throw new Error('文件格式不正确');
        }
      } catch (err: any) {
        alert(`导入失败: ${err.message}`);
      }
    };
    reader.readAsText(file);
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
            <DiagnosticBadge label="AI" status={aiStatus === 'ok' ? 'ok' : (aiStatus === 'testing' ? 'checking' : 'fail')} onClick={testAI} />
          </div>
        </div>
      </header>

      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
      <input type="file" ref={importFileInputRef} onChange={handleImport} accept=".json" className="hidden" />

      <div className="max-w-6xl mx-auto p-4 md:p-8">
        <div className="flex overflow-x-auto gap-3 mb-10 pb-2 no-scrollbar">
          {[
            { id: 'proposer', label: '1. 投保人' },
            { id: 'insured', label: '2. 被保险人' },
            { id: 'vehicle', label: '3. 承保车辆' },
            { id: 'project', label: '4. 方案设置' },
            { id: 'payment', label: '5. 收款配置' },
            { id: 'generate', label: '6. 生成链接' },
            { id: 'history', label: '7. 历史' }
          ].map((tab) => (
            <button key={tab.id} onClick={() => handleTabSwitch(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-6 py-4 rounded-2xl whitespace-nowrap text-sm font-bold transition-all shadow-sm border ${activeTab === tab.id ? 'bg-jh-green text-white border-jh-green ring-4 ring-jh-green/10' : (completedTabs.has(tab.id) ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-slate-400 border-slate-100 hover:border-jh-green/30')}`}>
              {tab.label} {completedTabs.has(tab.id) && activeTab !== tab.id && '✓'}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-3xl shadow-2xl shadow-jh-green/5 border border-slate-100 p-6 md:p-12 min-h-[500px]">
          {activeTab === 'proposer' && (
            <div className="space-y-10 animate-in fade-in duration-500">
              <SectionHeader title="投保人核心资料" subtitle="请务必确保联系方式真实有效，以免影响核保" onScan={() => triggerAIScan('proposer')} isScanning={scanLoading} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <InputGroup label="姓名 / 机构名称" value={data.proposer.name} onChange={v => handleInputChange('proposer', 'name', v)} />
                <InputGroup label="统一社会信用代码 / 证件号" value={data.proposer.idCard} onChange={v => handleInputChange('proposer', 'idCard', v)} />
                <InputGroup label="手机号码" value={data.proposer.mobile} onChange={v => handleInputChange('proposer', 'mobile', v)} />
                <div className="md:col-span-2"><InputGroup label="详细联系地址" value={data.proposer.address} onChange={v => handleInputChange('proposer', 'address', v)} /></div>
              </div>
            </div>
          )}

          {activeTab === 'insured' && (
            <div className="space-y-10 animate-in fade-in duration-500">
              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => { setData(prev => ({ ...prev, insured: { ...prev.proposer } })); alert('✓ 已同步投保人信息'); }}
                  className="bg-jh-green/10 text-jh-green px-6 py-3 rounded-2xl font-bold text-sm hover:bg-jh-green hover:text-white transition-all active:scale-95 flex items-center gap-2"
                >
                  👤 同投保人
                </button>
              </div>
              <SectionHeader title="被保险人资料" subtitle="被保险人是受保险合同保障的人" onScan={() => triggerAIScan('insured')} isScanning={scanLoading} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <InputGroup label="姓名 / 机构名称" value={data.insured.name} onChange={v => handleInputChange('insured', 'name', v)} error={errors['insured.name']} />
                <InputGroup label="证件号码" value={data.insured.idCard} onChange={v => handleInputChange('insured', 'idCard', v)} error={errors['insured.idCard']} />
                <InputGroup label="手机号码" value={data.insured.mobile} onChange={v => handleInputChange('insured', 'mobile', v)} error={errors['insured.mobile']} />
                <div className="md:col-span-2"><InputGroup label="详细联系地址" value={data.insured.address} onChange={v => handleInputChange('insured', 'address', v)} /></div>
              </div>
            </div>
          )}

          {activeTab === 'project' && (
            <div className="space-y-10 animate-in fade-in duration-500">
              <div className="border-b border-slate-50 pb-6">
                <h2 className="text-3xl font-black text-slate-800">承保方案设置</h2>
                <p className="text-slate-400 text-sm mt-1">配置保险期间、承保区域及具体的险种方案</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <InputGroup label="承保区域" value={data.project.region} onChange={v => handleInputChange('project', 'region', v)} />
                <div className="md:col-span-2">
                  <InputGroup label="保险期间" value={data.project.period} onChange={v => handleInputChange('project', 'period', v)} />
                </div>
                <InputGroup label="保费合计" value={data.project.premium} onChange={v => handleInputChange('project', 'premium', v)} error={errors['project.premium']} />
              </div>

              <div className="space-y-4">
                <h3 className="font-black text-slate-800 text-lg flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-jh-green rounded-full"></span> 险种明细
                </h3>
                <datalist id="common-coverages">
                  {COMMON_COVERAGES.map(name => <option key={name} value={name} />)}
                </datalist>
                <datalist id="common-amounts">
                  {COMMON_AMOUNTS.map(amt => <option key={amt} value={amt} />)}
                </datalist>
                <div className="grid gap-4">
                  {data.project.coverages.map((coverage: CoverageItem, index: number) => (
                    <div key={index} className="bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100 grid grid-cols-1 md:grid-cols-4 gap-6 relative transition-all hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 group">
                      <InputGroup label="险种名称" list="common-coverages" value={coverage.name} onChange={v => {
                        const newCoverages = [...data.project.coverages];
                        newCoverages[index].name = v;
                        setData(prev => ({ ...prev, project: { ...prev.project, coverages: newCoverages } }));
                      }} />
                      <InputGroup label="保额/限额" list="common-amounts" value={coverage.amount} onChange={v => {
                        const newCoverages = [...data.project.coverages];
                        newCoverages[index].amount = v;
                        setData(prev => ({ ...prev, project: { ...prev.project, coverages: newCoverages } }));
                      }} />
                      <InputGroup label="免赔额/率" value={coverage.deductible} onChange={v => {
                        const newCoverages = [...data.project.coverages];
                        newCoverages[index].deductible = v;
                        setData(prev => ({ ...prev, project: { ...prev.project, coverages: newCoverages } }));
                      }} />
                      <InputGroup label="保费" value={coverage.premium} onChange={v => {
                        const newCoverages = [...data.project.coverages];
                        newCoverages[index].premium = v;
                        setData(prev => ({ ...prev, project: { ...prev.project, coverages: newCoverages } }));
                      }} />
                      <button
                        onClick={() => {
                          const newCoverages = data.project.coverages.filter((_, i) => i !== index);
                          setData(prev => ({ ...prev, project: { ...prev.project, coverages: newCoverages } }));
                        }}
                        className="absolute -top-2 -right-2 w-7 h-7 bg-rose-500 text-white rounded-full flex items-center justify-center text-xs shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-20"
                      >✕</button>
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      const newCoverages = [...data.project.coverages, { name: '', amount: '', deductible: '', premium: '' }];
                      setData(prev => ({ ...prev, project: { ...prev.project, coverages: newCoverages } }));
                    }}
                    className="w-full py-4 border-2 border-dashed border-slate-200 rounded-3xl text-slate-400 font-bold hover:border-jh-green hover:text-jh-green transition-all"
                  >+ 添加险种</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'vehicle' && (
            <div className="space-y-10 animate-in fade-in duration-500">
              <SectionHeader title="承保车辆信息" subtitle="请拍摄行驶证原件进行 AI 自动识别录入" onScan={() => triggerAIScan('vehicle')} isScanning={scanLoading} />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <InputGroup label="车牌号码" value={data.vehicle.plate} onChange={v => handleInputChange('vehicle', 'plate', v)} error={errors['vehicle.plate']} />
                <InputGroup label="车辆所有人" value={data.vehicle.vehicleOwner} onChange={v => handleInputChange('vehicle', 'vehicleOwner', v)} />
                <InputGroup label="品牌型号" value={data.vehicle.brand} onChange={v => handleInputChange('vehicle', 'brand', v)} />
                <div className="md:col-span-3">
                  <InputGroup label="车辆识别代号 (VIN)" value={data.vehicle.vin} onChange={v => handleInputChange('vehicle', 'vin', v)} error={errors['vehicle.vin']} />
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
              <div className="flex flex-wrap justify-between items-center border-b border-slate-50 pb-6 gap-4">
                <h2 className="text-3xl font-black text-slate-800">曾录入的信息</h2>
                <p className="text-slate-400 text-sm mt-1">查看并复用之前的录单模板，加快操作速度</p>
                <div className="flex gap-2">
                  <button onClick={() => importFileInputRef.current?.click()} className="bg-slate-100 text-slate-600 px-4 py-2 rounded-lg text-xs font-bold">导入</button>
                  <button onClick={exportData} className="bg-slate-100 text-slate-600 px-4 py-2 rounded-lg text-xs font-bold">导出当前</button>
                </div>
              </div>
              {isHistoryLoading ? (
                <div className="py-20 text-center text-slate-300 italic font-bold animate-pulse">正在从云端加载历史记录...</div>
              ) : history.length === 0 ? (
                <div className="py-20 text-center text-slate-300 italic font-bold">暂无历史记录</div>
              ) : (
                <div className="grid gap-4">
                  {history.map((item: HistoryRecord) => (
                    <div key={item.id} className="bg-slate-50 p-6 rounded-3xl flex flex-wrap justify-between items-center border border-slate-100 hover:border-jh-green/40 transition-all gap-4">
                      <div>
                        <p className="font-black text-slate-800 text-lg">{item.summary}</p>
                        <p className="text-xs text-slate-400 font-medium mt-1 uppercase tracking-widest">{item.timestamp}</p>
                      </div>
                      <button onClick={() => applyHistoryData(item.data)} className="bg-white text-jh-green border border-jh-green/30 px-6 py-3 rounded-2xl font-black text-sm hover:bg-jh-green hover:text-white transition-all shadow-sm active:scale-95">应用此记录</button>
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

export default Admin;