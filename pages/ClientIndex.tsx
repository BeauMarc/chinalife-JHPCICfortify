import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { decodeData, InsuranceData, CoverageItem } from '../utils/codec';

// --- Error Boundary Definition ---
class DebugBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  constructor(props: any) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: any) { console.error('🔥 React Runtime Error:', error, info); }
  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center space-y-4 bg-white rounded-3xl m-4 border-2 border-rose-100 shadow-2xl">
          <div className="text-4xl animate-bounce">⚠️</div>
          <h2 className="font-black text-gray-800">页面显示异常</h2>
          <p className="text-xs text-gray-400">系统已捕获一个渲染错误，建议您刷新重试</p>
          <pre className="text-[10px] text-rose-500 bg-rose-50 p-4 rounded-xl max-w-full overflow-auto text-left w-full border border-rose-100">
            {this.state.error.message}
          </pre>
          <button onClick={() => window.location.reload()} className="w-full py-4 bg-jh-header text-white rounded-full text-sm font-black shadow-lg active:scale-95 transition-all">
            立即刷新
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- Safety Render Helper ---
const SafeRender: React.FC<{ value: any; fallback?: string }> = ({ value, fallback = '未录入' }) => {
  if (value === undefined || value === null || value === '') return <>{fallback}</>;
  if (typeof value === 'object') {
    try { return <>{JSON.stringify(value)}</>; } catch { return <>{fallback}</>; }
  }
  return <>{String(value)}</>;
};

// --- Constant Definitions ---
const DOCUMENTS: DocItemMeta[] = [
  { title: '机动车商业保险条款', path: '/pdfs/auto-insurance.pdf' },
  { title: '投保须知及风险提示', path: '/pdfs/notice.pdf' },
  { title: '免除保险责任说明', path: '/pdfs/exclusion.pdf' },
  { title: '个人信息保护政策', path: '/pdfs/privacy.pdf' }
];

type Step = 'terms' | 'check' | 'sign' | 'pay' | 'completed';
type DocItemMeta = { title: string; path: string };

// --- Sub Components ---

const TopBanner = () => (
  <div className="w-full bg-white shadow-sm shrink-0 relative z-20 border-b border-slate-50">
    <img src="/logo.jpeg" className="w-full h-auto block" alt="China Life Banner" />
  </div>
);

const Header = ({ title }: { title: string }) => (
  <header className="bg-jh-header text-white h-14 flex items-center px-4 sticky top-0 z-50 shadow-md border-b border-white/10">
    <div className="flex items-center gap-3 max-w-full">
      <div className="h-9 w-9 bg-white rounded-xl flex items-center justify-center overflow-hidden shrink-0 border border-white/30 shadow-sm p-1">
        <img src="/jhic.jpeg" className="h-full w-full object-contain" alt="JHIC Logo" />
      </div>
      <div className="flex flex-col">
        <h1 className="text-base font-black truncate tracking-tight">{title}</h1>
        <p className="text-[8px] opacity-70 font-bold uppercase tracking-widest">China Life Insurance</p>
      </div>
    </div>
  </header>
);

const PagingIndicator = ({ current, total, onJump }: { current: number; total: number; onJump: (i: number) => void }) => (
  <div className="flex justify-center gap-2 mb-4">
    {Array.from({ length: total }).map((_, i) => (
      <button
        key={i}
        onClick={() => onJump(i)}
        className={`h-1.5 rounded-full transition-all duration-300 ${i === current ? 'w-8 bg-jh-header shadow-sm' : 'w-4 bg-slate-200 hover:bg-slate-300'}`}
        aria-label={`Go to page ${i + 1}`}
      />
    ))}
  </div>
);

const InfoCard = React.memo(({ title, icon, items }: { title: string; icon: string; items: Array<[string, any]> }) => (
  <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col min-h-[380px] animate-in fade-in slide-in-from-right-4 duration-500">
    <h3 className="font-black text-gray-800 border-b border-slate-50 pb-4 mb-5 text-xs flex items-center gap-2">
      <span className="w-8 h-8 bg-jh-header/5 text-jh-header rounded-xl flex items-center justify-center text-xs shadow-inner">{icon}</span> {title}
    </h3>
    <div className="grid gap-4 flex-1">
      {items.map(([l, v], i) => (
        <div key={i} className="flex justify-between items-start text-[11px] animate-in slide-in-from-bottom-2" style={{ animationDelay: `${i * 50}ms` }}>
          <span className="text-gray-400 font-black uppercase tracking-widest shrink-0">{l}</span>
          <span className="text-gray-800 font-bold italic text-right break-all ml-4 leading-tight">
            <SafeRender value={v} />
          </span>
        </div>
      ))}
    </div>
  </div>
));

// --- Step: Terms ---
const TermsStep = ({ currentDocIndex, documents, readDocs, onNext, onPrev, onMarkRead, onSkip }: any) => {
  const currentDoc = documents[currentDocIndex];
  const isCurrentRead = readDocs[currentDocIndex];
  const isLastDoc = currentDocIndex === documents.length - 1;
  const allRead = readDocs.every(Boolean);

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white p-6 rounded-3xl shadow-sm flex items-center justify-between border border-slate-50">
        <div className="animate-in fade-in slide-in-from-left-4">
          <h3 className="font-black text-gray-800 text-lg">{currentDoc?.title}</h3>
          <p className="text-[9px] text-gray-400 font-bold uppercase tracking-[0.2em]">请仔细阅读并知晓相关权利义务</p>
        </div>
        <div className="bg-jh-header text-white text-[11px] px-3 py-1 rounded-full font-black animate-in zoom-in shadow-lg">
          {currentDocIndex + 1} / {documents.length}
        </div>
      </div>
      <div className="relative flex-1 min-h-[50vh] rounded-[2.5rem] overflow-hidden border border-slate-100 shadow-xl bg-white animate-in zoom-in-95 duration-500">
        {currentDoc?.path && currentDoc.path !== '#' ? (
          <iframe 
            key={currentDoc.path}
            title={currentDoc?.title} 
            src={currentDoc?.path} 
            className="w-full h-full absolute inset-0 border-none" 
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-300 space-y-2">
            <span className="text-4xl opacity-20">📄</span>
            <p className="text-xs font-black uppercase tracking-widest">条款文件未配置</p>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex gap-3">
          {currentDocIndex > 0 && (
            <button onClick={onPrev} className="px-6 py-4 rounded-full border-2 border-slate-200 text-sm font-black text-gray-500 bg-white active:scale-95 transition-all">
              ← 返回
            </button>
          )}
          {!isCurrentRead ? (
            <button onClick={onMarkRead} className="flex-1 py-4 rounded-full border-2 border-jh-header text-jh-header bg-white font-black text-sm shadow-lg shadow-jh-header/10 active:scale-95 transition-all">
              我已阅读并同意
            </button>
          ) : (
            <button onClick={onNext} className="flex-1 py-4 rounded-full bg-jh-header text-white font-black text-sm shadow-xl shadow-jh-header/20 active:scale-95 transition-all">
              {isLastDoc ? '去核对投保信息' : '阅读下一条 →'}
            </button>
          )}
        </div>
        {allRead && !isLastDoc && (
          <button onClick={onSkip} className="w-full py-2 text-xs font-bold text-gray-300 hover:text-jh-header transition-colors">⚡ 跳过已读内容</button>
        )}
      </div>
    </div>
  );
};

// --- Step: Check ---
const CheckStep = ({ data, onComplete }: { data: InsuranceData; onComplete: () => void }) => {
  const [pageIndex, setPageIndex] = useState(0);

  const pages = [
    { id: 0, title: '投保人信息', icon: '👤', items: [['姓名', data?.proposer?.name], ['证件类型', data?.proposer?.idType], ['证件号', data?.proposer?.idCard], ['手机号', data?.proposer?.mobile], ['详细地址', data?.proposer?.address]] },
    { id: 1, title: '被保险人信息', icon: '🛡️', items: [['姓名', data?.insured?.name || data?.proposer?.name], ['证件号', data?.insured?.idCard || data?.proposer?.idCard], ['与投保人关系', '本人'], ['手机号', data?.insured?.mobile || data?.proposer?.mobile]] },
    { id: 2, title: '承保车辆信息', icon: '🚗', items: [['车牌号', data?.vehicle?.plate], ['品牌型号', data?.vehicle?.brand], ['识别代号(VIN)', data?.vehicle?.vin], ['发动机号', data?.vehicle?.engineNo], ['车辆所有人', data?.vehicle?.vehicleOwner], ['注册日期', data?.vehicle?.registerDate]] },
    { id: 3, title: '承保方案', icon: '📋' },
  ];

  const isLastPage = pageIndex === pages.length - 1;

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white p-6 rounded-3xl shadow-sm flex items-center justify-between border border-slate-50">
        <div className="animate-in fade-in slide-in-from-left-4">
          <h3 className="font-black text-gray-800 text-lg">承保信息核验</h3>
          <p className="text-[9px] text-gray-400 font-bold uppercase tracking-[0.2em]">请核对您的投保信息（共 4 部分）</p>
        </div>
      </div>

      <PagingIndicator current={pageIndex} total={pages.length} onJump={setPageIndex} />

      <div className="min-h-[400px]">
        {pageIndex < 3 ? (
          <InfoCard key={`page-${pageIndex}`} title={pages[pageIndex].title} icon={pages[pageIndex].icon} items={pages[pageIndex].items as any} />
        ) : (
          <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 min-h-[400px] animate-in fade-in slide-in-from-right-4 duration-500 flex flex-col">
            <h3 className="font-black text-gray-800 border-b border-slate-50 pb-4 mb-4 text-xs flex items-center gap-2">
               <span className="w-8 h-8 bg-jh-header/5 text-jh-header rounded-xl flex items-center justify-center text-xs shadow-inner">📋</span> 承保方案明细
            </h3>
            <div className="space-y-3 flex-1">
              {(data?.project?.coverages || []).map((c, i) => (
                <div key={i} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0 animate-in fade-in slide-in-from-bottom-2" style={{ animationDelay: `${i * 30}ms` }}>
                   <div className="flex flex-col gap-0.5">
                      <span className="text-[11px] font-black text-gray-800 leading-tight"><SafeRender value={c.name} /></span>
                      <span className="text-[9px] font-bold text-gray-400 uppercase">限额/保额: <SafeRender value={c.amount} /></span>
                   </div>
                   <span className="text-xs font-black text-jh-header italic">¥<SafeRender value={c.premium} /></span>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-4 border-t-2 border-dashed border-slate-100 flex justify-between items-center">
               <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">保费合计</span>
               <span className="text-sm font-bold text-slate-800 italic">¥ <SafeRender value={data?.project?.premium} /></span>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        {pageIndex > 0 && (
          <button onClick={() => setPageIndex(p => p - 1)} className="px-6 py-4 rounded-full border-2 border-slate-200 text-sm font-black text-gray-400 bg-white active:scale-95 transition-all">
            ← 上一页
          </button>
        )}
        <button 
          onClick={() => isLastPage ? onComplete() : setPageIndex(p => p + 1)}
          className="flex-1 py-4 bg-jh-header text-white rounded-full font-black text-sm shadow-xl shadow-jh-header/20 active:scale-95 transition-all"
        >
          {isLastPage ? '信息核对无误，前往签名' : '下一页 →'}
        </button>
      </div>
    </div>
  );
};

// --- Step: Pay ---
const PayStep = ({ data }: { data: InsuranceData }) => {
  const [method, setMethod] = useState<'wechat' | 'alipay'>('wechat');

  const handleAlipay = () => {
    if (data?.payment?.alipayUrl) window.location.href = data.payment.alipayUrl;
    else alert('未配置支付宝链接');
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-50 space-y-8 animate-in zoom-in-95 duration-500">
        <div className="text-center space-y-2">
          <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest">保单结算总额</p>
          <h2 className="text-4xl font-black text-slate-800 animate-in fade-in slide-in-from-top-4">¥ <SafeRender value={data?.project?.premium} /></h2>
          <p className="text-[9px] text-gray-300 font-bold bg-slate-50 px-3 py-1 rounded-full inline-block">订单号: <SafeRender value={data?.orderId} /></p>
        </div>

        <div className="flex gap-4">
          <button onClick={() => setMethod('wechat')} className={`flex-1 p-6 rounded-[2rem] border-2 transition-all flex flex-col items-center gap-3 active:scale-95 ${method === 'wechat' ? 'border-jh-green bg-emerald-50 shadow-inner scale-105' : 'border-slate-50 bg-slate-50/30'}`}>
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-md border border-slate-50">
              <img src="/jhic.jpeg" className="w-8 h-8 object-contain" alt="WeChat" />
            </div>
            <span className={`font-black text-sm ${method === 'wechat' ? 'text-jh-green' : 'text-slate-700'}`}>微信支付</span>
          </button>
          <button onClick={() => setMethod('alipay')} className={`flex-1 p-6 rounded-[2rem] border-2 transition-all flex flex-col items-center gap-3 active:scale-95 ${method === 'alipay' ? 'border-blue-500 bg-blue-50 shadow-inner scale-105' : 'border-slate-50 bg-slate-50/30'}`}>
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-md border border-slate-50">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white text-[10px] font-black italic">Ali</div>
            </div>
            <span className={`font-black text-sm ${method === 'alipay' ? 'text-blue-500' : 'text-slate-700'}`}>支付宝</span>
          </button>
        </div>

        <div className="min-h-[220px] flex items-center justify-center bg-slate-50/30 rounded-[2.5rem] border border-slate-50 p-6 transition-all duration-500 overflow-hidden">
          {method === 'wechat' ? (
            <div className="text-center space-y-4 animate-in fade-in slide-in-from-bottom-4">
              {data?.payment?.wechatQrCode ? (
                <div className="relative p-3 bg-white rounded-3xl shadow-xl border-2 border-slate-100">
                  <img src={data.payment.wechatQrCode} className="w-44 h-44 object-contain rounded-xl block" alt="QR" />
                  <div className="absolute inset-0 border-4 border-slate-50/20 rounded-3xl pointer-events-none"></div>
                </div>
              ) : <div className="text-slate-300 font-black italic">暂未设置收款码</div>}
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest animate-pulse">扫码完成安全支付</p>
            </div>
          ) : (
            <div className="w-full space-y-4 animate-in fade-in slide-in-from-bottom-4">
              <p className="text-xs text-blue-800 font-bold bg-blue-50/50 p-5 rounded-2xl border border-blue-100/50 text-center leading-relaxed">
                点击下方按钮跳转至支付宝完成订单支付。<br/>支付完成后请截图保存凭证。
              </p>
              <button onClick={handleAlipay} className="w-full py-5 bg-[#1677FF] text-white rounded-2xl font-black shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 group">
                <span>立即跳转支付</span>
                <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="text-center space-y-1 animate-in fade-in duration-1000">
        <p className="text-[10px] text-slate-400 font-black flex items-center justify-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-jh-header rounded-full animate-ping"></span> 🛡️ 支付环境受中国人寿财险安全协议保护
        </p>
        <p className="text-[8px] text-slate-300 font-bold uppercase tracking-widest opacity-50">Payment secured by China Life Security Cloud</p>
      </div>
    </div>
  );
};

// --- Main Page Component ---
const ClientIndex = () => {
  const location = useLocation();
  const [step, setStep] = useState<Step>('terms');
  const [data, setData] = useState<InsuranceData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [readDocs, setReadDocs] = useState<boolean[]>(Array(DOCUMENTS.length).fill(false));
  const [currentDocIndex, setCurrentDocIndex] = useState(0);

  useEffect(() => {
    // 核心修复：在 HashRouter 环境下参数可能出现在 location.search 或 window.location.hash 中
    // 我们采用三重兜底解析机制
    
    // 1. 尝试从 react-router 提供的 search 解析
    const searchParams = new URLSearchParams(location.search);
    let idParam = searchParams.get('id');
    let dataParam = searchParams.get('data');

    // 2. 尝试从 window.location.search 直接解析 (HashRouter 有时会剥离这部分)
    if (!idParam && !dataParam) {
      const nativeSearchParams = new URLSearchParams(window.location.search);
      idParam = nativeSearchParams.get('id');
      dataParam = nativeSearchParams.get('data');
    }

    // 3. 兜底解析：如果参数被包裹在 hash 路径中 (常见于直接拼接 URL)
    if (!idParam && !dataParam) {
      const fullHash = window.location.hash;
      const queryIndex = fullHash.indexOf('?');
      if (queryIndex !== -1) {
        const hashParams = new URLSearchParams(fullHash.slice(queryIndex + 1));
        idParam = hashParams.get('id');
        dataParam = hashParams.get('data');
      }
    }

    if (idParam) {
      setIsLoading(true);
      setFetchError(null);
      fetch(`/api/get?id=${idParam}`)
        .then(res => {
          if (!res.ok) throw new Error(`数据获取失败 (HTTP ${res.status})`);
          return res.json();
        })
        .then(d => { 
          // 显式断言类型，修复 TS 编译错误
          const insuranceData = d as InsuranceData;
          setData(insuranceData); 
          if (insuranceData.status === 'paid') setStep('completed'); 
        })
        .catch(err => {
          console.error("Fetch Error:", err);
          setFetchError(err.message || String(err));
        })
        .finally(() => setIsLoading(false));
    } else if (dataParam) {
      try { 
        const decoded = decodeData(dataParam); 
        if (decoded) setData(decoded); 
        else setFetchError('保单数据格式无效'); 
      }
      catch (err) { 
        setFetchError('保单数据解析异常'); 
      }
    }
  }, [location]);

  const markCurrentAsRead = useCallback(() => {
    setReadDocs(prev => { const next = [...prev]; next[currentDocIndex] = true; return next; });
  }, [currentDocIndex]);

  const markDocAndNext = useCallback(() => {
    if (currentDocIndex === DOCUMENTS.length - 1) setStep('check');
    else setCurrentDocIndex(prev => prev + 1);
  }, [currentDocIndex]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-jh-light flex flex-col items-center justify-center p-10">
        <div className="absolute inset-0 bg-white/40 animate-pulse z-0"></div>
        <TopBanner />
        <div className="flex-1 flex flex-col items-center justify-center space-y-6 relative z-10">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-slate-100 border-t-jh-header rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-3 h-3 bg-jh-header rounded-full animate-pulse"></div>
            </div>
          </div>
          <div className="text-center space-y-1">
            <p className="text-gray-500 font-black uppercase text-xs tracking-widest animate-in fade-in slide-in-from-bottom-2">安全加载中</p>
            <p className="text-[9px] text-gray-300 font-bold uppercase tracking-widest">JHPCIC Security Cloud</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-jh-light flex flex-col items-center justify-center p-10 text-center">
        <TopBanner />
        <div className="mt-12 space-y-4">
          <p className="text-sm font-black text-gray-500">投保数据加载失败</p>
          {fetchError && (
            <p className="text-xs text-rose-400 bg-rose-50 px-4 py-2 rounded-xl border border-rose-100 animate-in fade-in">{fetchError}</p>
          )}
          <div className="pt-4">
            <button
              onClick={() => window.location.reload()}
              className="px-8 py-4 bg-jh-header text-white rounded-full text-xs font-black shadow-lg shadow-jh-header/20 active:scale-95 transition-all"
            >
              刷新重试
            </button>
          </div>
        </div>
      </div>
    );
  }

  const headerTitle = {
    terms: '投保协议告知', check: '承保信息核验', sign: '电子签名确认', pay: '保费支付', completed: '投保完成'
  }[step] || '投保服务';

  return (
    <DebugBoundary>
      <div className="min-h-screen bg-jh-light flex flex-col font-sans overflow-x-hidden relative pb-10">
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[400px] bg-gradient-to-b from-jh-header/5 to-transparent"></div>
          <div className="absolute -top-40 -left-40 w-96 h-96 bg-jh-header/5 rounded-full blur-[100px] animate-pulse"></div>
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }}></div>
          <div className="absolute top-0 left-0 right-0 h-[400px]" style={{ backgroundImage: 'url(/head-background.jpg)', backgroundSize: 'cover', backgroundPosition: 'top', opacity: 0.15 }}></div>
        </div>

        <TopBanner />
        <Header title={headerTitle} />

        <div className="bg-white/80 backdrop-blur-md px-6 py-4 flex justify-between text-[9px] text-gray-300 border-b uppercase font-black tracking-widest relative z-10 shadow-sm">
          <span className={['terms','check','sign','pay'].includes(step) ? 'text-emerald-500 font-black' : ''}>{step !== 'terms' ? '✓ ' : ''}条款阅读</span>
          <span className={['check','sign','pay'].includes(step) ? 'text-jh-header font-black' : ''}>承保信息</span>
          <span className={['sign','pay'].includes(step) ? 'text-jh-header font-black' : ''}>签名确认</span>
          <span className={['pay'].includes(step) ? 'text-jh-header font-black' : ''}>支付保费</span>
        </div>

        <main className="p-4 space-y-4 max-w-lg mx-auto w-full flex-1 relative z-10 animate-in fade-in slide-in-from-right duration-500 ease-out">
          {step === 'terms' && <TermsStep currentDocIndex={currentDocIndex} documents={DOCUMENTS} readDocs={readDocs} onNext={markDocAndNext} onPrev={() => setCurrentDocIndex(prev => Math.max(0, prev - 1))} onMarkRead={markCurrentAsRead} onSkip={() => setStep('check')} />}
          {step === 'check' && <CheckStep data={data} onComplete={() => setStep('sign')} />}
          {step === 'sign' && (
            <div className="bg-white p-8 rounded-[3rem] shadow-xl animate-in zoom-in-95 duration-500 min-h-[500px] flex flex-col border border-slate-50">
              <h2 className="text-xl font-black text-gray-800 mb-1">投保意愿确认</h2>
              <p className="text-[10px] text-gray-400 font-bold uppercase mb-8 tracking-widest">请签署您的正楷姓名以确认投保</p>
              <div className="flex-1 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2.5rem] relative flex items-center justify-center group hover:bg-slate-100 transition-colors">
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-200 font-black italic tracking-widest opacity-30 pointer-events-none">
                  <span className="text-4xl mb-2">🖋️</span>
                  <span>签名区域</span>
                </div>
              </div>
              <div className="mt-8 flex gap-3">
                 <button className="flex-1 py-4 border-2 border-slate-100 rounded-full text-xs font-black text-gray-400 active:bg-slate-50 active:scale-95 transition-all">重写</button>
                 <button onClick={() => setStep('pay')} className="flex-[2] py-4 bg-jh-header text-white rounded-full font-black shadow-xl shadow-jh-header/20 active:scale-95 transition-all">确认并去支付</button>
              </div>
            </div>
          )}
          {step === 'pay' && <PayStep data={data} />}
        </main>

        {step === 'completed' && (
          <div className="fixed inset-0 bg-white z-[100] flex flex-col items-center justify-center p-10 text-center space-y-8 animate-in fade-in slide-in-from-bottom duration-700">
            <div className="relative">
              <div className="w-24 h-24 bg-jh-header text-white rounded-[2.5rem] flex items-center justify-center text-4xl shadow-2xl shadow-jh-header/30 animate-in zoom-in spin-in-12 duration-1000">✓</div>
              <div className="absolute -inset-4 border-2 border-jh-header/20 rounded-[3rem] animate-ping opacity-20"></div>
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-black text-gray-800 tracking-tight">支付申请已提交</h2>
              <p className="text-gray-400 text-sm font-medium leading-relaxed max-w-[240px] mx-auto">感谢您的信任。<br />保单生效详情将稍后发送至您的手机，请注意查收。</p>
            </div>
            <button onClick={() => window.close()} className="px-12 py-4 border border-slate-100 rounded-full text-slate-400 font-black text-xs hover:bg-slate-50 transition-colors">完成并返回</button>
          </div>
        )}
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite linear;
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </DebugBoundary>
  );
};

export default ClientIndex;