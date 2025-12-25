
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { decodeData, InsuranceData, CoverageItem } from '../utils/codec';

type Step = 'terms' | 'verify' | 'check' | 'sign' | 'pay' | 'completed';
type DocItemMeta = { title: string; path: string };

// --- 类型定义 ---

type DocItemProps = {
  title: string;
  isRead: boolean;
  onClick: () => void;
};

type InfoCardProps = {
  title: string;
  icon: string;
  items: Array<[string, string | number | undefined]>;
};

type PaymentBtnProps = {
  type: 'wechat' | 'alipay';
  isActive: boolean;
  onClick: () => void;
};

type VerifyStepProps = {
  onComplete: () => void;
  proposerMobile: string;
};

type CheckStepProps = {
  onComplete: () => void;
  data: InsuranceData;
};

type SignStepProps = {
  onComplete: () => void;
};

type PayStepProps = {
  data: InsuranceData;
};

// --- 常量 ---
const PDF_BASE = `${((import.meta as any).env?.BASE_URL ?? '/')}pdfs/`;
const DOCUMENTS: DocItemMeta[] = [
  { title: '《保险条款》', path: `${PDF_BASE}${encodeURIComponent('保险条款.pdf')}` },
  { title: '《互联网平台用戶个人信息保护政策》', path: `${PDF_BASE}${encodeURIComponent('互联网平台用戶个人信息保护政策.pdf')}` },
  { title: '《车险“投保人缴费实名认证”客户授权声明书》', path: `${PDF_BASE}${encodeURIComponent('车险“投保人缴费实名认证”客户授权声明书.pdf')}` },
];

// --- 子组件定义 ---

const TopBanner: React.FC = (): React.ReactElement => (
  <div className="w-full bg-white shadow-sm shrink-0 relative z-10">
    <img src="/logo.jpeg" className="w-full h-auto block" alt="China Life Banner" />
  </div>
);

const Header: React.FC<{ title: string }> = ({ title }): React.ReactElement => (
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

const DocItem: React.FC<DocItemProps> = React.memo(({ title, isRead, onClick }): React.ReactElement => (
  <div
    onClick={onClick}
    className={`p-4 rounded-2xl border-2 transition-all flex items-center justify-between active:scale-95 cursor-pointer ${isRead ? 'border-jh-header bg-emerald-50' : 'border-gray-100 bg-white hover:border-jh-header/30'}`}
  >
    <div className="flex items-center gap-3">
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${isRead ? 'bg-jh-header text-white' : 'bg-gray-100 text-gray-400'}`}>
        {isRead ? (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
        )}
      </div>
      <span className={`text-[12px] font-black leading-tight tracking-tight max-w-[180px] ${isRead ? 'text-jh-header' : 'text-gray-700'}`}>{title}</span>
    </div>
    <div className={`text-[9px] font-black tracking-widest uppercase ${isRead ? 'text-jh-header' : 'text-gray-300'}`}>
      {isRead ? '已读' : '去阅读'}
    </div>
  </div>
));

const InfoCard: React.FC<InfoCardProps> = React.memo(({ title, icon, items }): React.ReactElement => (
  <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 h-full flex flex-col">
    <h3 className="font-black text-gray-800 border-b border-slate-50 pb-4 mb-5 text-xs flex items-center gap-2">
      <span className="w-8 h-8 bg-jh-header/5 text-jh-header rounded-xl flex items-center justify-center text-xs shadow-inner">{icon}</span> {title}
    </h3>
    <div className="grid gap-4 flex-1">
      {items.map(([l, v], i: number) => (
        <div key={i} className="flex justify-between items-start text-[11px]">
          <span className="text-gray-400 font-black uppercase tracking-widest shrink-0">{l}</span>
          <span className="text-gray-800 font-bold italic text-right break-all ml-4 leading-tight">{v || '未录入'}</span>
        </div>
      ))}
    </div>
  </div>
));

const PaymentBtn: React.FC<PaymentBtnProps> = React.memo(({ type, isActive, onClick }): React.ReactElement => (
  <button onClick={onClick} className={`p-6 rounded-[2rem] border-2 flex items-center justify-between transition-all active:scale-95 ${isActive ? (type === 'wechat' ? 'border-jh-green bg-emerald-50' : 'border-blue-500 bg-blue-50') : 'border-slate-50 bg-slate-50/30'}`}>
    <div className="flex items-center gap-4">
      <img src="/jhic.jpeg" className="w-11 h-11 rounded-xl shadow-md border-2 border-white" alt="JHIC" />
      <div className="text-left">
        <p className="font-black text-lg text-slate-800">{type === 'wechat' ? '微信支付' : '支付宝支付'}</p>
        <p className={`text-[9px] font-black uppercase tracking-widest ${type === 'wechat' ? 'text-gray-400' : 'text-blue-500'}`}>
          {type === 'wechat' ? '官方直收通道' : '三方协作接入'}
        </p>
      </div>
    </div>
    {isActive && <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs shadow-lg ${type === 'wechat' ? 'bg-jh-green' : 'bg-blue-500'}`}>✓</div>}
  </button>
));

// --- 步骤子组件 ---

const VerifyStep: React.FC<VerifyStepProps> = ({ onComplete, proposerMobile }): React.ReactElement => {
  const [inputMobile, setInputMobile] = useState('');
  const [error, setError] = useState('');

  const handleVerify = () => {
    if (inputMobile === proposerMobile || inputMobile === proposerMobile.slice(-4)) {
      onComplete();
    } else {
      setError('验证失败: 请输入投保时预留的完整手机号或后四位');
    }
  };

  return (
    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm space-y-8 animate-in slide-in-from-right duration-300">
      <h2 className="text-2xl font-black text-gray-800">安全核验</h2>
      <div className="space-y-4">
        <label className="text-xs text-gray-400 font-bold px-1 tracking-widest uppercase opacity-60">投保预留手机号</label>
        <input type="tel" value={inputMobile} onChange={(e) => { setInputMobile(e.target.value); setError(''); }} placeholder="请输入手机号" className="w-full border-b-2 border-gray-100 py-4 text-3xl outline-none focus:border-jh-header font-black transition-all" />
        {error && <p className="text-rose-500 text-xs mt-2 px-1 animate-in fade-in">{error}</p>}
      </div>
      <button onClick={handleVerify} className="w-full bg-jh-header text-white py-5 rounded-full font-black text-lg shadow-xl active:scale-95">
        验证身份，阅读条款
      </button>
    </div>
  );
};

const CheckStep: React.FC<CheckStepProps> = ({ onComplete, data }): React.ReactElement => {
  const [cardIndex, setCardIndex] = useState(0);
  const touchStart = useRef<number | null>(null);

  const handleCardChange = useCallback((index: number): void => {
    setCardIndex(index);
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart.current === null) return;
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart.current - touchEnd;

    if (Math.abs(diff) > 50) { // 滑動閾值
      if (diff > 0 && cardIndex < 3) setCardIndex(prev => prev + 1);
      if (diff < 0 && cardIndex > 0) setCardIndex(prev => prev - 1);
    }
    touchStart.current = null;
  };

  return (
    <div className="flex flex-col gap-4 animate-in slide-in-from-right duration-300">
      <div className="bg-white p-6 rounded-3xl shadow-sm flex items-center justify-between border border-slate-50">
        <div>
          <h3 className="font-black text-gray-800 text-lg">承保信息核验</h3>
          <p className="text-[9px] text-gray-400 font-bold uppercase tracking-[0.2em]">请左右滑动或点击指示点切换</p>
        </div>
        <div className="bg-jh-header text-white text-[11px] px-3 py-1 rounded-full font-black">
          {cardIndex + 1} / 4
        </div>
      </div>

      <div
        className="relative h-[360px] overflow-hidden rounded-[2.5rem] shadow-lg touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="flex h-full transition-transform duration-500 will-change-transform"
          style={{
            transform: `translateX(-${cardIndex * 100}%)`,
            transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
            backfaceVisibility: 'hidden'
          }}
        >
          <div className="w-full shrink-0"><InfoCard title="投保人信息" icon="👤" items={[['姓名', data.proposer.name], ['证件号', data.proposer.idCard], ['电话', data.proposer.mobile], ['详细住所', data.proposer.address]]} /></div>
          <div className="w-full shrink-0"><InfoCard title="被保险人信息" icon="🛡️" items={[['姓名', data.insured.name || data.proposer.name], ['证件号', data.insured.idCard || data.proposer.idCard], ['关系', '本人'], ['联系方式', data.insured.mobile || data.proposer.mobile]]} /></div>
          <div className="w-full shrink-0"><InfoCard title="承保车辆信息" icon="🚗" items={[['车牌号码', data.vehicle.plate], ['车辆所有人', data.vehicle.vehicleOwner], ['厂牌型号', data.vehicle.brand], ['车架号(VIN)', data.vehicle.vin], ['发动机号', data.vehicle.engineNo]]} /></div>
          <div className="w-full shrink-0">
            <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 h-full overflow-y-auto custom-scrollbar">
              <h3 className="font-black text-gray-800 border-b border-slate-50 pb-4 mb-4 text-xs flex items-center gap-2">
                <span className="w-8 h-8 bg-jh-header/5 text-jh-header rounded-xl flex items-center justify-center text-xs">📋</span> 承保方案
              </h3>
              <table className="w-full text-left text-[10px]">
                <thead className="text-gray-400 font-black uppercase tracking-widest border-b border-slate-50">
                  <tr><th className="py-2 font-black">保险项目</th><th className="py-2 px-1 font-black">限额/保额</th><th className="py-2 text-right font-black">保费</th></tr>
                </thead>
                <tbody className="text-gray-700 font-bold">
                  {data.project.coverages.map((c: CoverageItem, i: number): React.ReactElement => (
                    <tr key={i} className="border-b border-slate-50">
                      <td className="py-2.5 leading-tight">{c.name}</td><td className="py-2.5 px-1 italic text-slate-500">{c.amount || '详见条款'}</td><td className="py-2.5 text-right font-black">¥{c.premium}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-center gap-3">
        {[0, 1, 2, 3].map(i => (
          <button key={i} onClick={() => handleCardChange(i)} className={`h-2 transition-all rounded-full ${cardIndex === i ? 'w-10 bg-jh-header shadow-md shadow-jh-header/20' : 'w-2 bg-gray-200 hover:bg-jh-header/30'}`} />
        ))}
      </div>

      <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-50 flex justify-between items-center px-10">
        <span className="text-gray-400 font-black text-[10px] uppercase tracking-widest opacity-60">保费合计</span>
        <span className="text-slate-800 font-black text-sm tracking-tight">¥ {data.project.premium}</span>
      </div>

      <button onClick={onComplete} className="w-full bg-jh-header text-white py-5 rounded-full font-black text-lg shadow-2xl shadow-jh-header/20 active:scale-95 transition-all">信息核对无误，开始签名</button>
    </div>
  );
};

const SignStep: React.FC<SignStepProps> = ({ onComplete }): React.ReactElement => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.parentElement?.getBoundingClientRect();
    if (!rect) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#000000';
      ctxRef.current = ctx;
    }

    // 添加 resize 监听
    const handleResize = () => {
      const newRect = canvas.parentElement?.getBoundingClientRect();
      if (newRect) {
        canvas.width = newRect.width * dpr;
        canvas.height = newRect.height * dpr;
        ctx?.scale(dpr, dpr);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getPos = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>): { x: number; y: number } => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  }, []);

  const startDrawing = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>): void => {
    setIsDrawing(true);
    const pos = getPos(e);
    ctxRef.current?.beginPath();
    ctxRef.current?.moveTo(pos.x, pos.y);
  }, [getPos]);

  const draw = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>): void => {
    if (!isDrawing) return;
    if ('preventDefault' in e) e.preventDefault();
    const pos = getPos(e);
    ctxRef.current?.lineTo(pos.x, pos.y);
    ctxRef.current?.stroke();
  }, [isDrawing, getPos]);

  const stopDrawing = useCallback((): void => {
    setIsDrawing(false);
    setHasSigned(true);
    setError('');
  }, []);

  const handleClear = useCallback((): void => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasSigned(false);
    }
  }, []);

  const handleSubmit = useCallback((): void => {
    if (hasSigned) {
      onComplete();
    } else {
      setError('请先签名确认投保意向');
    }
  }, [hasSigned, onComplete]);

  return (
    <div className="bg-white p-8 rounded-[3rem] h-[75vh] flex flex-col space-y-6 animate-in slide-in-from-bottom duration-500">
      <div className="space-y-1"><h2 className="font-black text-2xl text-gray-800">电子签名</h2><p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest opacity-60">请在下方灰白区域签署您的正楷姓名</p></div>
      <div className="flex-1 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2.5rem] relative overflow-hidden">
        <canvas ref={canvasRef} className="w-full h-full touch-none block cursor-crosshair" onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseOut={stopDrawing} onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing} />
        {!hasSigned && <div className="absolute inset-0 flex items-center justify-center text-slate-300 pointer-events-none font-black opacity-20 uppercase tracking-[0.5em] text-sm italic">签名确认区</div>}
      </div>
      {error && <p className="text-rose-500 text-xs -mt-2 text-center animate-in fade-in">{error}</p>}
      <div className="flex gap-4">
        <button onClick={handleClear} className="flex-1 py-5 border-2 border-gray-100 rounded-full font-black text-gray-400 uppercase text-xs tracking-widest">重写</button>
        <button onClick={handleSubmit} className="flex-[2] py-5 bg-jh-header text-white rounded-full font-black shadow-xl active:scale-95 transition-all">确认签名并支付</button>
      </div>
    </div>
  );
};

const ClientIndex: React.FC = (): React.ReactElement => {
  const location = useLocation();
  // Change initial step to 'verify' to display mobile verification first
  const [step, setStep] = useState<Step>('verify');
  const [data, setData] = useState<InsuranceData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [readDocs, setReadDocs] = useState<boolean[]>(() => Array(DOCUMENTS.length).fill(false));
  const [currentDocIndex, setCurrentDocIndex] = useState(0);
  const allDocsRead = readDocs.every(Boolean);

  // 性能優化：預加載靜態資源與 PDF
  useEffect(() => {
    // 1. 預加載關鍵靜態圖片
    const staticImages = ['/logo.jpeg', '/jhic.jpeg', '/head-background.jpg'];
    staticImages.forEach(src => {
      const img = new Image();
      img.src = src;
    });

    // 2. 預取 PDF 文件 (利用瀏覽器緩存)
    DOCUMENTS.forEach(({ path }) => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.as = 'fetch';
      link.href = path;
      document.head.appendChild(link);
    });
  }, []);

  // 3. 預加載動態二維碼
  useEffect(() => {
    if (data?.payment.wechatQrCode) {
      const img = new Image();
      img.src = data.payment.wechatQrCode;
    }
  }, [data]);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const idParam = searchParams.get('id');
    const dataParam = searchParams.get('data');

    if (idParam) {
      setIsLoading(true);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时

      const fetchData = async () => {
        try {
          const res = await fetch(`/api/get?id=${idParam}`, { signal: controller.signal });
          clearTimeout(timeoutId);
          if (!res.ok) throw new Error('获取保单信息失败');
          const d = (await res.json().catch(() => null)) as InsuranceData | null;
          if (d) {
            setData(d);
            if (d.status === 'paid') setStep('completed');
          } else {
            setFetchError('保单数据解析失败');
          }
        } catch (err: any) {
          if (err.name === 'AbortError') {
            setFetchError('网络超时，请检查网络连接');
          } else {
            setFetchError(err.message || '获取保单信息失败');
          }
        } finally {
          clearTimeout(timeoutId);
          setIsLoading(false);
        }
      };

      fetchData();
    } else if (dataParam) {
      try {
        const decoded = decodeData(dataParam);
        if (decoded) {
          setData(decoded);
        } else {
          setFetchError('保单数据解析失败');
        }
      } catch (error) {
        setFetchError('保单数据无效');
      }
    }
  }, [location]);

  useEffect(() => {
    // 支付状态轮询
    if (step !== 'pay' || !data?.orderId) return;

    let retryCount = 0;
    const maxRetries = 30; // 90秒后停止轮询

    const intervalId = setInterval(async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const res = await fetch(`/api/get?id=${data.orderId}`, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.ok) {
          const latestData: InsuranceData = await res.json();
          if (latestData.status === 'paid') {
            setData(latestData);
            setStep('completed');
            clearInterval(intervalId);
          }
        }
        retryCount++;
        if (retryCount >= maxRetries) clearInterval(intervalId);
      } catch (error: unknown) {
        console.warn("轮询支付状态异常:", error instanceof Error ? error.message : String(error));
        retryCount++;
        if (retryCount >= maxRetries) clearInterval(intervalId);
      }
    }, 3000); // 每 3 秒轮询一次

    return () => clearInterval(intervalId);
  }, [step, data?.orderId]);

  const currentDoc = DOCUMENTS[currentDocIndex];

  const openDocInNewTab = useCallback((): void => {
    const newWindow = window.open(currentDoc.path, '_blank');
    if (!newWindow) alert('浏览器阻止了新窗口打开，请允许弹窗');
  }, [currentDoc]);

  const goPrevDoc = useCallback((): void => {
    setCurrentDocIndex((idx) => Math.max(0, idx - 1));
  }, []);

  const markCurrentAsRead = useCallback((): void => {
    setReadDocs((prev) => {
      const next = [...prev];
      next[currentDocIndex] = true;
      return next;
    });
  }, [currentDocIndex]);

  const markDocAndNext = useCallback((): void => {
    const isLastDocument = currentDocIndex === DOCUMENTS.length - 1;
    if (isLastDocument) {
      // If last document, go to Check step (Verification is already done)
      setStep('check');
    } else {
      setCurrentDocIndex((prevIndex) => prevIndex + 1);
    }
  }, [currentDocIndex]);

  if (isLoading || !data) {
    if (fetchError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-jh-light font-bold p-10 text-center">
          <p className="text-red-400 mb-4 text-lg">⚠️ {fetchError}</p>
          <button onClick={() => window.location.reload()} className="px-6 py-2 bg-white rounded-full shadow-sm text-sm text-gray-600">刷新重试</button>
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-jh-light flex flex-col items-center justify-center p-10 text-center">
        <TopBanner />
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="circle-loader mb-6"></div>
          <p className="text-gray-400 font-bold animate-pulse">正在安全加载保单数据...</p>
        </div>
      </div>
    );
  }

  // --- Terms View (Rendered conditionally for distinct UI) ---
  if (step === 'terms') {
    const isCurrentDocRead = readDocs[currentDocIndex];
    const isLastDoc = currentDocIndex === DOCUMENTS.length - 1;
    const allDocsRead = readDocs.every(Boolean);

    return (
      <div className="min-h-screen flex flex-col bg-jh-light font-sans">
        <TopBanner />
        <Header title="投保合规告知与授权" />
        <div className="p-6 flex flex-col flex-1 gap-6 max-w-lg mx-auto w-full">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm space-y-4">
            <h2 className="text-2xl font-black text-gray-800 tracking-tight leading-tight">投保合规告知</h2>
            <p className="text-gray-500 text-sm leading-relaxed font-medium">
              欢迎进入空中投保通道。根据监管要求，在进入承保流程前，请务必完整阅读并同意以下法律协议。
            </p>
          </div>

          <div className="bg-white p-4 rounded-[2rem] shadow-sm border border-slate-100 flex-1 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">
                  条款 {currentDocIndex + 1} / {DOCUMENTS.length}
                </p>
                <h3 className="text-lg font-black text-gray-800">{currentDoc.title}</h3>
              </div>
              <span className={`text-xs font-black transition-colors duration-300 ${isCurrentDocRead ? 'text-jh-header' : 'text-gray-400'}`}>
                {isCurrentDocRead ? '✓ 已标记已读' : '未阅读'}
              </span>
            </div>

            <div className="flex gap-2">
              {DOCUMENTS.map((doc, idx) => (
                <div key={doc.title} className={`flex-1 h-1.5 rounded-full transition-all duration-500 ${idx < currentDocIndex || readDocs[idx] ? 'bg-jh-header shadow-md shadow-jh-header/30' : 'bg-slate-200'}`} />
              ))}
            </div>

            <div className="relative flex-1 min-h-[70vh] md:min-h-[75vh] h-[calc(100vh-220px)] rounded-2xl overflow-hidden border border-slate-100 shadow-inner bg-slate-50/60 animate-in fade-in duration-300">
              <iframe title={currentDoc.title} src={currentDoc.path} className="w-full h-full" />
              <div className="absolute top-3 right-3 flex gap-2">
                <button onClick={openDocInNewTab} className="px-3 py-1 bg-white/80 border border-slate-200 rounded-full text-[10px] font-black text-gray-600 hover:bg-white shadow-sm active:scale-95 transition-all">
                  🔗 无法加载？新窗口打开
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              {currentDocIndex > 0 && (
                <button onClick={goPrevDoc} className="w-full px-5 py-3 rounded-full border-2 border-slate-200 text-sm font-black text-gray-600 bg-white hover:border-jh-header/50 hover:text-jh-header active:scale-95 transition-all">
                  ← 上一条款
                </button>
              )}

              <div className="flex gap-3">
                {!isCurrentDocRead && (
                  <button onClick={markCurrentAsRead} className="flex-1 px-5 py-3 rounded-full text-sm font-black border-2 border-slate-200 text-gray-700 bg-white hover:border-jh-header/50 active:scale-95 transition-all">
                    📖 标记已读
                  </button>
                )}

                <button onClick={markDocAndNext} className={`flex-1 px-6 py-3 rounded-full text-sm font-black shadow-xl active:scale-95 transition-all duration-300 ${isCurrentDocRead ? 'bg-jh-header text-white hover:shadow-2xl hover:shadow-jh-header/30' : 'bg-slate-100 text-gray-300 cursor-not-allowed'}`} disabled={!isCurrentDocRead}>
                  {isLastDoc ? '✓ 已阅读所有，核对信息' : '已阅读，下一条款 →'}
                </button>
              </div>
              
              {/* Skip button logic updated to go to check step */}
              {allDocsRead && !isLastDoc && (
                <button onClick={() => setStep('check')} className="w-full px-5 py-3 rounded-full text-sm font-black border-2 border-jh-header/40 text-jh-header bg-white hover:bg-emerald-50 active:scale-95 transition-all animate-in fade-in duration-500">
                  ⚡ 快速跳过，核对信息
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- Main View (Verify, Check, Sign, Pay) ---
  const headerTitle = React.useMemo((): string => {
    switch (step) {
      case 'verify': return '身份安全验证';
      case 'check': return '承保信息核对';
      case 'sign': return '电子签名确认';
      case 'pay': return '保费安全支付';
      case 'completed': return '投保完成';
      default: return '中国人寿财险空中投保';
    }
  }, [step]);

  return (
    <div className="min-h-screen bg-jh-light flex flex-col font-sans overflow-x-hidden relative">
      <div className="absolute top-0 left-0 right-0 h-[500px] z-0 pointer-events-none" style={{ backgroundImage: 'url(/head-background.jpg)', backgroundSize: 'cover', backgroundPosition: 'top' }}>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-jh-light/60 to-jh-light"></div>
      </div>

      <div className="w-full bg-white shadow-sm shrink-0 relative z-10">
        <img src="/logo.jpeg" className="w-full h-auto block" alt="China Life Banner" />
      </div>
      <Header title={headerTitle} />

      {/* 顶部导航 */}
      <div className="bg-white px-6 py-4 flex justify-between text-[10px] text-gray-300 border-b uppercase font-black tracking-widest relative z-10">
        <span className={step === 'verify' ? 'text-jh-header' : ''}>身份验证</span>
        <span className={step === 'check' ? 'text-jh-header' : ''}>承保信息</span>
        <span className={step === 'sign' ? 'text-jh-header' : ''}>签名确认</span>
        <span className={step === 'pay' ? 'text-jh-header' : ''}>保费支付</span>
      </div>

      <main className="p-4 space-y-4 max-w-lg mx-auto w-full flex-1 relative z-10 animate-in fade-in duration-300">
        {step === 'verify' && (
           <div className="flex flex-col items-center justify-center min-h-[50vh]">
             {/* Pass VerifyStep completion handler to go to Terms */}
             <VerifyStep
              onComplete={() => setStep('terms')}
              proposerMobile={data.proposer.mobile}
            />
           </div>
        )}

        {step === 'check' && (
          <CheckStep
            onComplete={() => setStep('sign')}
            data={data}
          />
        )}

        {step === 'sign' && (
          <SignStep
            onComplete={() => setStep('pay')}
          />
        )}

        {step === 'pay' && (
          <PayStep
            data={data}
          />
        )}
      </main>

      {step === 'completed' && (
        <div className="fixed inset-0 bg-white z-[100] flex flex-col items-center justify-center p-10 text-center space-y-8 animate-in fade-in duration-500">
          <div className="w-24 h-24 bg-jh-header text-white rounded-[2.5rem] flex items-center justify-center text-5xl shadow-2xl shadow-jh-header/30">✓</div>
          <div className="space-y-2">
            <h2 className="text-3xl font-black text-gray-800 tracking-tight">支付申请已提交</h2>
            <p className="text-gray-400 text-sm font-medium leading-relaxed">感谢您选择中国人寿财险。<br />您的保单详情将随后发送至您的手机。</p>
            <p className="text-xs text-gray-300 pt-2">订单号: {data.orderId}</p>
          </div>
          <button onClick={() => window.close()} className="px-12 py-4 border border-slate-100 rounded-full text-slate-400 font-black uppercase text-xs tracking-widest">返回微信</button>
        </div>
      )}
    </div>
  );
};

const PayStep: React.FC<PayStepProps> = ({ data }): React.ReactElement => {
  const [paymentMethod, setPaymentMethod] = useState<'wechat' | 'alipay' | null>(null);
  const [paymentError, setPaymentError] = useState<string>('');

  const handleAlipayClick = useCallback((): void => {
    if (!data.payment.alipayUrl) {
      setPaymentError('支付宝收款链接未配置，请联系业务员');
      return;
    }
    try {
      const newWindow = window.open(data.payment.alipayUrl, '_blank');
      if (!newWindow) {
        setPaymentError('浏览器阻止了支付页面打开，请检查弹窗设置');
      }
    } catch (error) {
      setPaymentError('打开支付页面失败，请稍后重试');
    }
  }, [data.payment.alipayUrl]);

  return (
    <div className="bg-white p-8 rounded-[3rem] shadow-2xl text-center space-y-10 animate-in zoom-in-95 duration-500">
      <div className="space-y-2">
        <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest opacity-60">保费应付总额</p>
        <h2 className="text-5xl font-black text-red-600 italic tracking-tighter leading-none">¥ {data.project.premium}</h2>
      </div>
      <div className="grid gap-4">
        <PaymentBtn
          type="wechat"
          isActive={paymentMethod === 'wechat'}
          onClick={() => { setPaymentMethod('wechat'); setPaymentError(''); }}
        />
        <PaymentBtn
          type="alipay"
          isActive={paymentMethod === 'alipay'}
          onClick={() => { setPaymentMethod('alipay'); setPaymentError(''); }}
        />
      </div>
      {paymentError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-600 text-sm font-bold animate-in fade-in">
          {paymentError}
        </div>
      )}
      {paymentMethod === 'wechat' && (
        <div className="p-8 bg-white rounded-[2.5rem] shadow-3xl border border-jh-green/5 animate-in slide-in-from-top-4">
          {data.payment.wechatQrCode ? (
            <div className="space-y-4">
              <p className="text-[10px] text-jh-header font-black uppercase tracking-widest animate-pulse">长按识别下方二维码完成支付</p>
              <img src={data.payment.wechatQrCode} className="w-64 h-64 mx-auto rounded-[2rem] shadow-inner" alt="WeChat QR Code" />
            </div>
          ) : (
            <p className="text-slate-300 font-bold italic py-10 text-sm">业务员暂未配置收款码凭证</p>
          )}
        </div>
      )}
      {paymentMethod === 'alipay' && (
        <button
          onClick={handleAlipayClick}
          className="w-full bg-blue-600 text-white py-6 rounded-[2rem] font-black shadow-2xl shadow-blue-600/20 active:scale-95 transition-all text-xl"
        >
          前往支付宝支付
        </button>
      )}
    </div>
  );
};

export default ClientIndex;
