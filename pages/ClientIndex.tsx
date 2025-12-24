
import React, { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { decodeData, InsuranceData } from '../utils/codec';

type Step = 'terms' | 'verify' | 'check' | 'sign' | 'pay' | 'completed';

const ClientIndex: React.FC = () => {
  const location = useLocation();
  const [step, setStep] = useState<Step>('terms');
  const [data, setData] = useState<InsuranceData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'wechat' | 'alipay' | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);
  
  const [inputMobile, setInputMobile] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);

  // 条款阅读状态追踪
  const [readDocs, setReadDocs] = useState<{ [key: string]: boolean }>({
    terms: false,
    policy: false,
    auth: false
  });

  // 初始化保单数据
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
        .catch(err => console.error("Fetch error:", err))
        .finally(() => setIsLoading(false));
    } else if (dataParam) {
      const decoded = decodeData(dataParam);
      if (decoded) setData(decoded);
    }
  }, [location]);

  // 当进入签名页时，初始化 Canvas 分辨率以匹配显示尺寸
  useEffect(() => {
    if (step === 'sign' && canvasRef.current) {
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      // 设置物理像素，解决模糊和坐标错位问题
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
      }
    }
  }, [step]);

  // 坐标计算工具函数
  const getPointerPos = (e: React.MouseEvent | React.TouchEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    let clientX, clientY;
    
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    const pos = getPointerPos(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    if (e.cancelable) e.preventDefault();
    
    const pos = getPointerPos(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      setHasSigned(true);
    }
  };

  const handleAlipayJump = () => {
    if (!data?.payment.alipayUrl) {
      alert('收单配置尚未就绪，请稍后或联系服务人员。');
      return;
    }
    
    const amount = data.project.premium;
    navigator.clipboard.writeText(amount).then(() => {
      setIsRedirecting(true);
      setTimeout(() => {
        window.location.href = data.payment.alipayUrl;
      }, 3500);
    }).catch(() => {
      window.location.href = data.payment.alipayUrl;
    });
  };

  const handleMobileVerify = () => {
    if (!data) return;
    if (inputMobile === data.proposer.mobile || inputMobile === data.proposer.mobile.slice(-4)) {
      setStep('check');
    } else {
      alert(`安全验证失败：请检查输入的手机号或后四位`);
    }
  };

  const markAsRead = (key: string, url: string) => {
    window.open(url, '_blank');
    setReadDocs(prev => ({ ...prev, [key]: true }));
  };

  const isAllRead = readDocs.terms && readDocs.policy && readDocs.auth;

  const Header = ({ title }: { title: string }) => (
    <header className="bg-jh-header text-white h-12 flex items-center px-4 sticky top-0 z-30 shadow-sm border-b border-white/10">
      <h1 className="text-lg font-bold mx-auto tracking-wide">{title}</h1>
    </header>
  );

  // 加载态处理
  if (isLoading || !data) {
    return (
      <div className="min-h-screen bg-jh-light flex flex-col items-center justify-center p-10 text-center">
        <div className="circle-loader mb-6"></div>
        <p className="text-gray-400 font-medium animate-pulse">正在通过 AI 加密通道加载保单数据...</p>
      </div>
    );
  }

  // 核心逻辑：第一步必须显示条款阅读页
  if (step === 'terms') {
    return (
      <div className="min-h-screen flex flex-col bg-white font-sans">
        <Header title="授权录入" />
        <div className="p-6 flex flex-col flex-1">
          <div className="flex-1 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 overflow-hidden rounded-xl shadow-sm border border-gray-100">
                <img src="/jhic.jpeg" className="w-full h-full object-cover" alt="Logo" />
              </div>
              <h2 className="text-2xl font-black text-gray-800 tracking-tight">温馨提示</h2>
            </div>
            
            <p className="text-gray-500 leading-relaxed text-sm">
              您即将进入中国人寿财险空中投保服务。为了保障您的合法权益，请依次点击下方链接认真阅读相关协议：
            </p>
            
            <div className="space-y-4">
              <DocItem 
                title="《保险条款》" 
                isRead={readDocs.terms} 
                onClick={() => markAsRead('terms', '/pdfs/保险条款.pdf')} 
              />
              <DocItem 
                title="《互联网平台用戶个人信息保护政策》" 
                isRead={readDocs.policy} 
                onClick={() => markAsRead('policy', '/pdfs/互联网平台用戶个人信息保护政策.pdf')} 
              />
              <DocItem 
                title="《车险“投保人缴费实名认证”客户授权声明书》" 
                isRead={readDocs.auth} 
                onClick={() => markAsRead('auth', '/pdfs/车险“投保人缴费实名认证”客户授权声明书.pdf')} 
              />
            </div>

            <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100 flex gap-3 items-start">
               <span className="text-emerald-500 mt-0.5 font-bold">!</span>
               <p className="text-[11px] text-emerald-700 leading-relaxed font-medium">
                 * 请依次点击阅读以上文件。点击下方“我已阅读并同意”按钮即表示您已充分理解并同意上述所有条款，并授权系统获取您的投保及车辆信息用于承保确认。
               </p>
            </div>
          </div>
          
          <button 
            onClick={() => isAllRead ? setStep('verify') : alert('请先依次点击并阅读完所有协议内容')} 
            className={`w-full py-5 rounded-full font-black text-lg shadow-xl transition-all active:scale-95 mt-6 ${isAllRead ? 'bg-jh-header text-white' : 'bg-gray-100 text-gray-300 cursor-not-allowed'}`}
          >
            我已阅读并同意
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-jh-light flex flex-col pb-10 font-sans">
      <Header title="中国人寿财险空中投保" />
      
      <div className="bg-white px-6 py-4 flex justify-between text-[10px] text-gray-300 border-b uppercase tracking-[0.2em] font-black">
         <span className={step === 'verify' ? 'text-jh-header' : ''}>身份验证</span>
         <span className="opacity-10">●</span>
         <span className={step === 'check' ? 'text-jh-header' : ''}>信息核对</span>
         <span className="opacity-10">●</span>
         <span className={step === 'sign' ? 'text-jh-header' : ''}>签名确认</span>
         <span className="opacity-10">●</span>
         <span className={step === 'pay' ? 'text-jh-header' : ''}>保费支付</span>
      </div>

      <main className="p-4 space-y-4 max-w-lg mx-auto w-full flex-1">
        {step === 'pay' && (
          <div className="bg-white p-8 rounded-[3rem] shadow-2xl text-center space-y-12 animate-in zoom-in-95 duration-500 relative overflow-hidden">
            {isRedirecting && (
              <div className="fixed inset-0 z-[100] bg-blue-600 flex flex-col items-center justify-center p-12 text-white animate-in fade-in duration-300">
                 <div className="w-24 h-24 bg-white/10 backdrop-blur-xl rounded-full flex items-center justify-center mb-10 shadow-inner relative">
                    <div className="absolute inset-0 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                    <img src="/jhic.jpeg" className="w-12 h-12 rounded-lg object-cover" alt="Logo" />
                 </div>
                 <h3 className="text-3xl font-black mb-6 tracking-tight">AI 支付代理已启动</h3>
                 <div className="bg-white/10 backdrop-blur-md p-10 rounded-[2.5rem] border border-white/20 text-center space-y-6 max-w-xs shadow-3xl">
                    <p className="text-xl font-bold">保险金额已就绪</p>
                    <p className="text-4xl font-black text-yellow-300 italic tracking-tighter">¥ {data.project.premium}</p>
                    <div className="h-[1px] bg-white/20 w-full"></div>
                    <p className="text-sm font-medium leading-relaxed opacity-90">
                      金额已成功存入剪贴板。<br/>
                      进入收银台后，请在输入框<br/>
                      <span className="bg-yellow-400 text-blue-900 px-2 rounded-lg font-black mx-1 animate-pulse">长按并选择粘贴</span><br/>
                      即可完成保费支付。
                    </p>
                 </div>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest opacity-60">待支付订单总金额</p>
              <h2 className="text-6xl font-black text-red-600 tracking-tighter italic leading-none">¥ {data.project.premium}</h2>
            </div>
            
            <div className="grid gap-4 text-left">
              <button onClick={() => setPaymentMethod('wechat')} 
                className={`flex items-center justify-between p-6 rounded-3xl border-2 transition-all active:scale-[0.98] ${paymentMethod === 'wechat' ? 'border-jh-green bg-emerald-50/50 shadow-inner' : 'border-gray-50 bg-slate-50/30'}`}>
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 overflow-hidden rounded-2xl shadow-lg border-2 border-white bg-white">
                    <img src="/jhic.jpeg" className="w-full h-full object-cover" alt="JHIC" />
                  </div> 
                  <div>
                    <span className="text-gray-800 block font-black text-lg">微信支付</span>
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest text-jh-header">官方安全通道</span>
                  </div>
                </div>
                {paymentMethod === 'wechat' && <div className="w-6 h-6 bg-jh-green rounded-full flex items-center justify-center text-white text-xs">✓</div>}
              </button>

              <button onClick={() => setPaymentMethod('alipay')} 
                className={`flex items-center justify-between p-6 rounded-3xl border-2 transition-all active:scale-[0.98] ${paymentMethod === 'alipay' ? 'border-blue-500 bg-blue-50/50 shadow-inner' : 'border-gray-50 bg-slate-50/30'}`}>
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 overflow-hidden rounded-2xl shadow-lg border-2 border-white bg-white">
                    <img src="/jhic.jpeg" className="w-full h-full object-cover" alt="JHIC" />
                  </div> 
                  <div>
                    <span className="text-gray-800 block font-black text-lg">支付宝支付</span>
                    <span className="text-[9px] text-blue-500 font-black uppercase tracking-widest">汇来通 AI 协同接入</span>
                  </div>
                </div>
                {paymentMethod === 'alipay' && <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">✓</div>}
              </button>
            </div>

            <div className="min-h-[300px]">
              {paymentMethod === 'wechat' && (
                <div className="flex flex-col items-center animate-in slide-in-from-top-4">
                   <p className="text-[10px] text-jh-green mb-5 font-black tracking-[0.2em] uppercase text-jh-header">长按下方二维码识别支付</p>
                   <div className="p-6 bg-white rounded-[2.5rem] shadow-3xl border border-jh-green/5 ring-8 ring-jh-green/5">
                     {data.payment.wechatQrCode ? (
                       <img src={data.payment.wechatQrCode} className="w-64 h-64 object-contain" alt="Pay QR" />
                     ) : (
                       <div className="w-64 h-64 flex flex-col items-center justify-center text-gray-200 space-y-4">
                         <div className="text-5xl opacity-20">🛡️</div>
                         <p className="text-[11px] font-bold text-slate-300">业务员未配置微信收款码</p>
                       </div>
                     )}
                   </div>
                </div>
              )}

              {paymentMethod === 'alipay' && (
                <div className="p-10 bg-blue-50/50 rounded-[3rem] border border-blue-100 space-y-10 flex flex-col items-center animate-in slide-in-from-top-4">
                   <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-2xl overflow-hidden border-2 border-blue-100 animate-pulse">
                     <img src="/jhic.jpeg" className="w-full h-full object-cover" alt="JHIC" />
                   </div>
                   <div className="text-center space-y-6">
                      <div className="bg-white/80 p-6 rounded-[2rem] border border-blue-100 shadow-sm relative">
                         <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[9px] font-black px-3 py-1 rounded-full uppercase">AI Safe Guide</div>
                         <p className="text-[13px] text-blue-800 font-black leading-relaxed italic">
                           “本次支付由汇来通安全接入提供服务，请您进入三方平台后输入保险金额并进行支付”
                         </p>
                      </div>
                      <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest">金额 ¥ {data.project.premium} 已锁定至 AI 剪贴板</p>
                   </div>
                   <button 
                    onClick={handleAlipayJump}
                    className="w-full bg-blue-600 text-white py-6 rounded-2xl font-black shadow-2xl shadow-blue-600/40 active:scale-95 transition-all text-xl tracking-tight"
                   >
                     立即接入三方支付
                   </button>
                </div>
              )}

              {!paymentMethod && (
                <div className="flex flex-col items-center justify-center text-gray-200 py-16 opacity-40">
                  <div className="w-14 h-14 border-2 border-dashed border-gray-200 rounded-full flex items-center justify-center mb-4">?</div>
                  <p className="text-sm font-black italic tracking-widest">请选择上述支付方式</p>
                </div>
              )}
            </div>
          </div>
        )}
        
        {step === 'verify' && (
          <div className="bg-white p-10 rounded-[2.5rem] shadow-sm space-y-10 animate-in slide-in-from-right duration-300">
            <h2 className="text-2xl font-black text-gray-800">安全准入验证</h2>
            <div className="space-y-6">
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest px-1">投保手机号验证</p>
              <input type="tel" value={inputMobile} onChange={e => setInputMobile(e.target.value)} placeholder="请输入完整手机号或后四位" className="w-full border-b-2 border-gray-100 py-6 text-3xl outline-none focus:border-jh-header font-mono font-black placeholder:text-gray-100 transition-all" />
            </div>
            <button onClick={handleMobileVerify} disabled={inputMobile.length < 4} className="w-full bg-jh-header text-white py-5 rounded-full font-black text-lg shadow-xl shadow-jh-header/20 disabled:opacity-20 active:scale-95 transition-all">验证身份并继续</button>
          </div>
        )}

        {step === 'check' && (
          <div className="space-y-4 animate-in slide-in-from-right duration-300">
            <InfoCard title="投保人" icon="👤" items={[['姓名', data.proposer.name], ['证件号', data.proposer.idCard], ['联系电话', data.proposer.mobile]]} />
            <InfoCard title="车辆参数" icon="🚗" items={[['号牌号码', data.vehicle.plate], ['所有人', data.vehicle.vehicleOwner], ['车架号', data.vehicle.vin]]} />

            <div className="bg-white p-8 rounded-[2rem] shadow-sm border-2 border-red-50 relative overflow-hidden">
               <h3 className="font-black mb-6 text-sm text-gray-800 flex items-center gap-2">
                 <span className="w-1.5 h-4 bg-red-500 rounded-full"></span> 承保方案及保费
               </h3>
               <div className="space-y-4">
                 {data.project.coverages.map((c, i) => (
                   <div key={i} className="flex justify-between text-xs">
                      <span className="text-gray-400 font-bold uppercase tracking-widest">{c.name}</span>
                      <span className="font-black text-gray-700 italic">¥ {c.premium}</span>
                   </div>
                 ))}
               </div>
               <div className="flex justify-between mt-8 pt-6 border-t border-red-100 font-black text-red-600 text-2xl italic tracking-tighter">
                 <span>保费合计</span>
                 <span>¥ {data.project.premium}</span>
               </div>
            </div>

            <button onClick={() => setStep('sign')} className="w-full bg-jh-header text-white py-5 rounded-full font-black text-lg shadow-2xl shadow-jh-header/20 active:scale-95 transition-all">确认无误，去签名</button>
          </div>
        )}

        {step === 'sign' && (
          <div className="bg-white p-8 rounded-[3rem] shadow-sm h-[75vh] flex flex-col animate-in slide-in-from-bottom duration-500">
            <div className="mb-6">
              <h2 className="font-black text-2xl text-gray-800">电子签名确认</h2>
              <p className="text-xs text-gray-400 mt-2 font-medium">请在下方空白处书写您的正楷姓名，作为投保确认识别</p>
            </div>
            <div className="flex-1 bg-gray-50 border-2 border-dashed border-gray-200 rounded-[2rem] relative overflow-hidden">
               <canvas 
                ref={canvasRef} 
                className="w-full h-full touch-none cursor-crosshair block" 
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
               {!hasSigned && <div className="absolute inset-0 flex items-center justify-center text-gray-300 pointer-events-none text-3xl font-black opacity-10">此处签名确认</div>}
            </div>
            <div className="flex gap-4 mt-8">
              <button onClick={() => { 
                setHasSigned(false); 
                const ctx = canvasRef.current?.getContext('2d');
                if (ctx) ctx.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
              }} className="flex-1 py-5 border-2 border-gray-100 rounded-full text-gray-400 font-black tracking-widest uppercase text-xs">重写</button>
              <button onClick={() => hasSigned ? setStep('pay') : alert('请先签署姓名')} className="flex-[2] py-5 bg-jh-header text-white rounded-full font-black text-lg shadow-xl shadow-jh-header/20">确认并去支付</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

const DocItem = ({ title, isRead, onClick }: { title: string, isRead: boolean, onClick: () => void }) => (
  <div 
    onClick={onClick}
    className={`p-4 rounded-2xl border-2 transition-all flex items-center justify-between group active:scale-95 ${isRead ? 'border-jh-header bg-emerald-50 shadow-sm' : 'border-gray-100 bg-white hover:border-jh-header/30'}`}
  >
    <div className="flex items-center gap-3">
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${isRead ? 'bg-jh-header text-white' : 'bg-gray-100 text-gray-400'}`}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 12l2 2 4-4" /></svg>
      </div>
      <span className={`text-[12px] font-black tracking-tight leading-tight ${isRead ? 'text-jh-header' : 'text-gray-700'}`}>{title}</span>
    </div>
    <div className={`text-[9px] font-black uppercase tracking-widest ${isRead ? 'text-jh-header' : 'text-gray-300'}`}>
      {isRead ? '已阅读' : '点击阅读'}
    </div>
  </div>
);

const InfoCard = ({ title, icon, items }: any) => (
  <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-50">
    <h3 className="font-black text-gray-800 border-b border-gray-50 pb-4 mb-4 text-xs flex items-center gap-2">
      <span className="w-7 h-7 bg-jh-header/5 text-jh-header rounded-xl flex items-center justify-center text-xs">{icon}</span> {title}
    </h3>
    <div className="grid gap-3">
      {items.map(([l, v]: any, i: number) => (
        <div key={i} className="flex justify-between items-start text-[11px]">
          <span className="text-gray-400 shrink-0 font-black uppercase tracking-widest">{l}</span>
          <span className="text-gray-800 font-bold text-right ml-6 break-all leading-tight italic">{v || '未录入'}</span>
        </div>
      ))}
    </div>
  </div>
);

export default ClientIndex;
