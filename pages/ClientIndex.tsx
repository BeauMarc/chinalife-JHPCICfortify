import React, { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { decodeData, InsuranceData, CoverageItem } from '../utils/codec';

type Step = 'terms' | 'verify' | 'check' | 'sign' | 'pay' | 'completed';

// --- Props 接口定义 ---

interface HeaderProps {
  title: string;
}

interface DocItemProps {
  title: string;
  isRead: boolean;
  onClick: () => void;
}

interface InfoCardProps {
  title: string;
  icon: string;
  items: [string, string][];
}

interface PaymentBtnProps {
  type: 'wechat' | 'alipay';
  isActive: boolean;
  onClick: () => void;
}

// --- 子组件定义 ---

const Header: React.FC<HeaderProps> = ({ title }) => (
  <header className="bg-jh-header text-white h-12 flex items-center px-4 sticky top-0 z-30 shadow-sm border-b border-white/10">
    <h1 className="text-lg font-bold mx-auto tracking-wide">{title}</h1>
  </header>
);

const DocItem: React.FC<DocItemProps> = ({ title, isRead, onClick }) => (
  <div onClick={onClick} className={`p-5 rounded-2xl border-2 transition-all flex items-center justify-between active:scale-95 cursor-pointer ${isRead ? 'border-jh-header bg-emerald-50 shadow-md' : 'border-gray-100 bg-white hover:border-jh-header/30'}`}>
    <div className="flex items-center gap-4">
      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${isRead ? 'bg-jh-header text-white' : 'bg-gray-100 text-gray-400'}`}>
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 12l2 2 4-4" />
        </svg>
      </div>
      <span className={`text-[13px] font-black leading-tight tracking-tight pr-4 ${isRead ? 'text-jh-header' : 'text-gray-700'}`}>{title}</span>
    </div>
    <div className={`text-[9px] font-black tracking-widest uppercase shrink-0 ${isRead ? 'text-jh-header' : 'text-gray-300'}`}>
      {isRead ? '已完成' : '去阅读'}
    </div>
  </div>
);

const InfoCard: React.FC<InfoCardProps> = ({ title, icon, items }) => (
  <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-50 hover:border-jh-header/20 transition-all">
    <h3 className="font-black text-gray-800 border-b border-gray-50 pb-4 mb-4 text-xs flex items-center gap-2">
      <span className="w-7 h-7 bg-jh-header/5 text-jh-header rounded-xl flex items-center justify-center text-xs">{icon}</span> {title}
    </h3>
    <div className="grid gap-3">
      {items.map(([l, v]: [string, string], i: number) => (
        <div key={i} className="flex justify-between items-start text-[11px]">
          <span className="text-gray-400 font-black uppercase tracking-widest shrink-0">{l}</span>
          <span className="text-gray-800 font-bold italic text-right break-all ml-4 leading-tight">{v || '未录入'}</span>
        </div>
      ))}
    </div>
  </div>
);

const PaymentBtn: React.FC<PaymentBtnProps> = ({ type, isActive, onClick }) => (
  <button onClick={onClick} className={`flex items-center justify-between p-6 rounded-3xl border-2 transition-all active:scale-[0.98] w-full ${isActive ? (type === 'wechat' ? 'border-jh-green bg-emerald-50' : 'border-blue-500 bg-blue-50') : 'border-gray-50 bg-slate-50/30'}`}>
    <div className="flex items-center gap-5">
      <div className="w-12 h-12 overflow-hidden rounded-2xl shadow-lg border-2 border-white bg-white flex items-center justify-center">
        <img src="jhic.jpeg" className="w-full h-full object-contain" alt="Pay Logo" />
      </div> 
      <div className="flex flex-col text-left">
        <span className="text-jh-text font-black text-lg">{type === 'wechat' ? '微信支付' : '支付宝支付'}</span>
        <span className="text-[9px] text-gray-400 font-black tracking-widest uppercase">官方安全收单</span>
      </div>
    </div>
    {isActive && (
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs ${type === 'wechat' ? 'bg-jh-header' : 'bg-blue-500'}`}>✓</div>
    )}
  </button>
);

// --- 主组件 ---

const ClientIndex: React.FC = () => {
  const location = useLocation();
  const [step, setStep] = useState<Step>('terms');
  const [data, setData] = useState<InsuranceData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'wechat' | 'alipay' | null>(null);
  
  const [inputMobile, setInputMobile] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);

  const [readDocs, setReadDocs] = useState<{ [key: string]: boolean }>({
    terms: false,
    policy: false,
    auth: false
  });

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const idParam = searchParams.get('id');
    const dataParam = searchParams.get('data');

    if (idParam) {
      setIsLoading(true);
      fetch(`/api/get?id=${idParam}`)
        .then(res => res.json())
        .then(d => { 
          setData(d); 
          if(d.status === 'paid') setStep('completed'); 
        })
        .catch(() => setData(null))
        .finally(() => setIsLoading(false));
    } else if (dataParam) {
      const decoded = decodeData(dataParam);
      if (decoded) setData(decoded);
    }
  }, [location]);

  // 签名画布逻辑
  useEffect(() => {
    if (step === 'sign' && canvasRef.current) {
      const canvas = canvasRef.current;
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (!rect) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 4;
        ctxRef.current = ctx;
      }
    }
  }, [step]);

  const handleMobileVerify = () => {
    if (!data) return;
    const cleanMobile = data.proposer.mobile.replace(/\s/g, '');
    if (inputMobile === cleanMobile || inputMobile === cleanMobile.slice(-4)) {
      setStep('check');
    } else {
      alert('安全核验失败：请检查输入的手机号是否正确。');
    }
  };

  const markAsRead = (key: string, filename: string) => {
    // 强制使用正确的文件路径
    const url = `/pdfs/${filename}`;
    window.open(url, '_blank');
    setReadDocs((prev: { [key: string]: boolean }) => ({ ...prev, [key]: true }));
  };

  const isAllRead = readDocs.terms && readDocs.policy && readDocs.auth;

  if (isLoading || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-jh-light">
        <div className="circle-loader mb-4"></div>
        <p className="text-gray-400 text-sm font-black uppercase tracking-widest opacity-50">Secure Connection Loading...</p>
      </div>
    );
  }

  // 1. 条款阅读页：重点聚焦，不显示 Banner
  if (step === 'terms') {
    return (
      <div className="min-h-screen flex flex-col bg-jh-light font-sans">
        <Header title="服务协议确认" />
        <div className="p-6 flex flex-col flex-1 gap-6 max-w-lg mx-auto w-full">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm space-y-4">
            <h2 className="text-2xl font-black text-gray-800 tracking-tight leading-tight">投保意向确认</h2>
            <p className="text-gray-500 text-sm leading-relaxed font-medium">
              欢迎使用中国人寿财险空中投保服务。进入投保流程前，请务必阅读以下协议并获得您的明确授权。
            </p>
          </div>
          
          <div className="space-y-4 flex-1">
            <DocItem 
              title="《保险条款》" 
              isRead={readDocs.terms} 
              onClick={() => markAsRead('terms', '保险条款.pdf')} 
            />
            <DocItem 
              title="《互联网平台用戶个人信息保护政策》" 
              isRead={readDocs.policy} 
              onClick={() => markAsRead('policy', '互联网平台用戶个人信息保护政策.pdf')} 
            />
            <DocItem 
              title="《车险“投保人缴费实名认证”客户授权声明书》" 
              isRead={readDocs.auth} 
              onClick={() => markAsRead('auth', '车险“投保人缴费实名认证”客户授权声明书.pdf')} 
            />
          </div>

          <button 
            onClick={() => isAllRead ? setStep('verify') : alert('请先点击并阅读完所有协议。')}
            className={`w-full py-5 rounded-full font-black text-lg transition-all duration-500 shadow-xl ${ isAllRead ? 'bg-jh-header text-white active:scale-95' : 'bg-gray-200 text-gray-400' }`}
          >
            我已阅读并确认
          </button>
        </div>
      </div>
    );
  }

  // 2. 后续流程：Banner 位于 Header 之上，通过内边距处理遮盖问题
  return (
    <div className="min-h-screen bg-jh-light flex flex-col font-sans overflow-x-hidden">
      <div className="w-full bg-white relative z-0">
        <img src="/top-banner.png" className="w-full h-auto block" alt="China Life Banner" />
      </div>
      <Header title="中国人寿财险空中投保" />
      
      <div className="bg-white px-6 py-4 flex justify-between text-[10px] text-gray-300 border-b uppercase font-black tracking-widest relative z-10">
         <span className={step === 'verify' ? 'text-jh-header' : ''}>身份验证</span>
         <span className={step === 'check' ? 'text-jh-header' : ''}>信息核对</span>
         <span className={step === 'sign' ? 'text-jh-header' : ''}>电子签名</span>
         <span className={step === 'pay' ? 'text-jh-header' : ''}>保费支付</span>
      </div>

      <main className="p-4 space-y-4 max-w-lg mx-auto w-full flex-1">
        {step === 'verify' && (
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm space-y-8 animate-in slide-in-from-right duration-300">
            <h2 className="text-2xl font-black text-gray-800">安全核验</h2>
            <div className="space-y-4">
              <label className="text-xs text-gray-400 font-bold px-1 uppercase tracking-widest opacity-60">投保预留手机号</label>
              <input 
                type="tel" 
                value={inputMobile} 
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInputMobile(e.target.value)} 
                placeholder="完整手机号或后四位" 
                className="w-full border-b-2 border-gray-100 py-4 text-3xl outline-none focus:border-jh-header font-black transition-all" 
              />
            </div>
            <button 
              onClick={handleMobileVerify} 
              disabled={inputMobile.length < 4} 
              className="w-full bg-jh-header text-white py-5 rounded-full font-black text-lg shadow-xl active:scale-95 transition-all disabled:opacity-30"
            >
              验证身份
            </button>
          </div>
        )}

        {step === 'check' && (
          <div className="space-y-4 animate-in slide-in-from-right duration-300">
            <InfoCard title="投保人信息" icon="👤" items={[['姓名', data.proposer.name], ['证件号', data.proposer.idCard], ['电话', data.proposer.mobile]]} />
            <InfoCard title="投保车辆参数" icon="🚗" items={[['车牌', data.vehicle.plate], ['所有人', data.vehicle.vehicleOwner], ['车架号', data.vehicle.vin]]} />
            <div className="bg-white p-8 rounded-[2rem] shadow-sm border-2 border-red-50 flex justify-between items-baseline">
               <span className="text-gray-400 font-black text-xs uppercase tracking-widest">保费合计</span>
               <span className="text-red-600 font-black text-4xl italic tracking-tighter">¥ {data.project.premium}</span>
            </div>
            <button onClick={() => setStep('sign')} className="w-full bg-jh-header text-white py-5 rounded-full font-black text-lg shadow-2xl active:scale-95 transition-all">信息无误，去签名</button>
          </div>
        )}

        {step === 'sign' && (
          <div className="bg-white p-8 rounded-[3rem] h-[70vh] flex flex-col space-y-6 animate-in slide-in-from-bottom duration-500">
            <div className="space-y-1">
              <h2 className="font-black text-2xl text-gray-800">电子签名确认</h2>
              <p className="text-xs text-gray-400 font-medium opacity-60">请在下方区域签署您的真实姓名</p>
            </div>
            <div className="flex-1 bg-gray-50 border-2 border-dashed border-gray-200 rounded-[2.5rem] relative overflow-hidden">
               <canvas 
                 ref={canvasRef} 
                 className="w-full h-full touch-none cursor-crosshair" 
                 onMouseDown={() => setIsDrawing(true)} 
                 onMouseUp={() => { setIsDrawing(false); setHasSigned(true); }} 
                 onTouchStart={() => setIsDrawing(true)}
                 onTouchEnd={() => { setIsDrawing(false); setHasSigned(true); }}
               />
               {!hasSigned && <div className="absolute inset-0 flex items-center justify-center text-gray-300 pointer-events-none font-black opacity-10 uppercase tracking-[0.5em] text-sm">请在此签名</div>}
            </div>
            <div className="flex gap-4">
              <button onClick={() => { setHasSigned(false); if(ctxRef.current) ctxRef.current.clearRect(0,0,2000,2000); }} className="flex-1 py-5 border-2 border-gray-100 rounded-full font-black text-gray-400 uppercase text-xs tracking-widest">重写</button>
              <button onClick={() => hasSigned ? setStep('pay') : alert('请先签署姓名')} className="flex-[2] py-5 bg-jh-header text-white rounded-full font-black shadow-xl active:scale-95 transition-all">确认并支付</button>
            </div>
          </div>
        )}

        {step === 'pay' && (
          <div className="bg-white p-8 rounded-[3rem] shadow-2xl text-center space-y-10 animate-in zoom-in-95 duration-500">
            <div className="space-y-2">
              <p className="text-gray-400 text-xs font-black uppercase tracking-widest opacity-60">应缴保费</p>
              <h2 className="text-6xl font-black text-red-600 italic tracking-tighter leading-none">¥ {data.project.premium}</h2>
            </div>
            <div className="grid gap-4">
              <PaymentBtn type="wechat" isActive={paymentMethod === 'wechat'} onClick={() => setPaymentMethod('wechat')} />
              <PaymentBtn type="alipay" isActive={paymentMethod === 'alipay'} onClick={() => setPaymentMethod('alipay')} />
            </div>
            {paymentMethod === 'wechat' && (
              <div className="p-6 bg-white rounded-[2.5rem] shadow-3xl border border-jh-green/5 animate-in slide-in-from-top-4">
                 {data.payment.wechatQrCode ? (
                   <div className="space-y-4">
                     <p className="text-[10px] text-jh-header font-black uppercase tracking-widest">长按保存二维码或识别支付</p>
                     <img src={data.payment.wechatQrCode} className="w-64 h-64 object-contain mx-auto rounded-3xl" alt="Wechat QR" />
                   </div>
                 ) : <p className="text-gray-300 py-10 font-bold italic">暂未配置微信收款码</p>}
              </div>
            )}
            {paymentMethod === 'alipay' && (
              <button onClick={() => window.location.href = data.payment.alipayUrl} className="w-full bg-blue-600 text-white py-6 rounded-2xl font-black shadow-2xl active:scale-95 transition-all text-xl">前往支付宝完成支付</button>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default ClientIndex;