
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

  if (isLoading || !data) return <div className="p-10 text-center text-gray-400 animate-pulse font-medium">正在安全加载保单数据...</div>;

  const handleAlipayJump = () => {
    if (!data.payment.alipayUrl) {
      alert('收单配置尚未就绪，请联系业务员。');
      return;
    }
    
    // 协同助手：自动复制保费金额到剪贴板
    const amount = data.project.premium;
    navigator.clipboard.writeText(amount).then(() => {
      setIsRedirecting(true);
      // 延迟 3 秒跳转，确保客户读完指令
      setTimeout(() => {
        window.location.href = data.payment.alipayUrl;
      }, 3000);
    }).catch(() => {
      // 兜底方案
      window.location.href = data.payment.alipayUrl;
    });
  };

  const handleMobileVerify = () => {
    if (inputMobile === data.proposer.mobile || inputMobile === data.proposer.mobile.slice(-4)) setStep('check');
    else alert(`验证失败：请输入投保手机号全号或后四位`);
  };

  const Header = ({ title }: { title: string }) => (
    <header className="bg-jh-header text-white h-12 flex items-center px-4 sticky top-0 z-30 shadow-sm">
      <h1 className="text-lg font-medium mx-auto tracking-wide">{title}</h1>
    </header>
  );

  return (
    <div className="min-h-screen bg-jh-light flex flex-col pb-10 font-sans">
      <Header title="新核心车险承保" />
      
      {/* 步骤条 */}
      <div className="bg-white px-6 py-3 flex justify-between text-[9px] text-gray-300 border-b uppercase tracking-widest font-black">
         <span className={step === 'verify' ? 'text-jh-header' : ''}>身份验证</span>
         <span className="opacity-20">&gt;</span>
         <span className={step === 'check' ? 'text-jh-header' : ''}>信息核对</span>
         <span className="opacity-20">&gt;</span>
         <span className={step === 'sign' ? 'text-jh-header' : ''}>签名确认</span>
         <span className="opacity-20">&gt;</span>
         <span className={step === 'pay' ? 'text-jh-header' : ''}>保费支付</span>
      </div>

      <main className="p-4 space-y-4 max-w-lg mx-auto w-full flex-1">
        {step === 'pay' && (
          <div className="bg-white p-8 rounded-[3rem] shadow-2xl text-center space-y-10 animate-in zoom-in-95 duration-500 relative overflow-hidden">
            
            {/* AI 引导跳转遮罩层 */}
            {isRedirecting && (
              <div className="fixed inset-0 z-[100] bg-blue-600 flex flex-col items-center justify-center p-10 text-white animate-in fade-in duration-300">
                 <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mb-10 animate-pulse">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                 </div>
                 <h3 className="text-3xl font-black mb-6">支付指令已就绪</h3>
                 <div className="bg-white/10 p-8 rounded-[2rem] border border-white/20 text-center space-y-6 max-w-xs shadow-2xl">
                    <p className="text-xl font-bold leading-tight">保险金额 <span className="text-yellow-300 block text-3xl mt-2 font-black italic">¥ {data.project.premium}</span></p>
                    <div className="h-[1px] bg-white/10 w-full"></div>
                    <p className="text-sm opacity-90 leading-relaxed font-medium">金额已自动复制。<br/>请在进入三方平台后，<br/><span className="bg-yellow-400 text-blue-900 px-1 font-black">长按输入框选择“粘贴”</span><br/>即可快速支付。</p>
                 </div>
                 <div className="mt-12 flex items-center gap-3">
                    <div className="flex gap-1.5">
                       <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                       <div className="w-2 h-2 bg-white rounded-full animate-bounce [animation-delay:0.2s]"></div>
                       <div className="w-2 h-2 bg-white rounded-full animate-bounce [animation-delay:0.4s]"></div>
                    </div>
                    <span className="text-xs font-black uppercase tracking-[0.2em] ml-2">正在接入安全收银台...</span>
                 </div>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">待支付订单总金额</p>
              <h2 className="text-5xl font-black text-red-600 tracking-tighter italic leading-none">¥ {data.project.premium}</h2>
            </div>
            
            <div className="grid gap-4 text-left">
              <button onClick={() => setPaymentMethod('wechat')} 
                className={`flex items-center justify-between p-6 rounded-3xl border-2 transition-all ${paymentMethod === 'wechat' ? 'border-jh-green bg-emerald-50 shadow-inner' : 'border-gray-100'}`}>
                <div className="flex items-center gap-4 font-black">
                  <span className="w-10 h-10 bg-jh-green text-white rounded-full flex items-center justify-center text-sm shadow-lg shadow-jh-green/20 font-black">微</span> 
                  <div>
                    <span className="text-gray-800 block text-lg">微信支付</span>
                    <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">官方渠道收单</span>
                  </div>
                </div>
                {paymentMethod === 'wechat' && <span className="text-jh-green font-black">✔</span>}
              </button>

              <button onClick={() => setPaymentMethod('alipay')} 
                className={`flex items-center justify-between p-6 rounded-3xl border-2 transition-all ${paymentMethod === 'alipay' ? 'border-blue-500 bg-blue-50 shadow-inner' : 'border-gray-100'}`}>
                <div className="flex items-center gap-4 font-black">
                  <span className="w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm shadow-lg shadow-blue-500/20 font-black">支</span> 
                  <div>
                    <span className="text-gray-800 block text-lg">支付宝支付</span>
                    <span className="text-[9px] text-blue-500 font-black uppercase tracking-widest">汇来通安全接入</span>
                  </div>
                </div>
                {paymentMethod === 'alipay' && <span className="text-blue-500 font-black">✔</span>}
              </button>
            </div>

            <div className="min-h-[280px] flex flex-col justify-center animate-in slide-in-from-top-4 duration-300">
              {paymentMethod === 'wechat' && (
                <div className="flex flex-col items-center">
                   <p className="text-[10px] text-jh-green mb-4 font-black tracking-[0.2em] uppercase">长按下方二维码进行识别支付</p>
                   <div className="p-4 bg-white rounded-[2rem] shadow-2xl border border-jh-green/10">
                     {data.payment.wechatQrCode ? (
                       <img src={data.payment.wechatQrCode} className="w-60 h-60 object-contain" alt="Pay QR" />
                     ) : (
                       <div className="w-60 h-60 flex flex-col items-center justify-center text-gray-300 space-y-3">
                         <div className="text-4xl">⚠️</div>
                         <p className="text-[10px] font-bold">业务员未上传收款码</p>
                       </div>
                     )}
                   </div>
                </div>
              )}

              {paymentMethod === 'alipay' && (
                <div className="p-10 bg-blue-50 rounded-[2.5rem] border border-blue-100 space-y-8 flex flex-col items-center">
                   <div className="w-16 h-16 bg-blue-500 text-white rounded-full flex items-center justify-center text-3xl shadow-lg shadow-blue-500/20 animate-bounce">⚡</div>
                   <div className="text-center space-y-4">
                      <p className="text-sm text-blue-800 font-black italic">国寿财险${data.vehicle.plate || '[未录入]'}商险</p>
                      <div className="bg-white/60 p-5 rounded-3xl border border-blue-100 shadow-sm">
                         <p className="text-[11px] text-blue-600 font-bold leading-relaxed italic">
                           “本次支付由汇来通安全接入提供服务，请您进入三方平台后输入保险金额并进行支付”
                         </p>
                      </div>
                   </div>
                   <button 
                    onClick={handleAlipayJump}
                    className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black shadow-xl shadow-blue-600/30 active:scale-95 transition-all text-xl"
                   >
                     立即去支付
                   </button>
                   <p className="text-[9px] text-blue-400 font-black uppercase tracking-[0.2em]">金额已就绪，跳转后直接粘贴</p>
                </div>
              )}

              {!paymentMethod && (
                <div className="flex flex-col items-center justify-center text-gray-300 py-10 opacity-30 italic">
                  <div className="w-12 h-12 border-2 border-dashed border-gray-200 rounded-full flex items-center justify-center mb-3">?</div>
                  <p className="text-sm font-bold">请选择支付渠道</p>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* ... 其他 Step 保持不变 ... */}
        {step === 'verify' && (
          <div className="bg-white p-8 rounded-3xl shadow-sm space-y-8">
            <h2 className="text-xl font-bold text-gray-800">安全验证</h2>
            <div className="space-y-4">
              <p className="text-xs text-gray-400">请输入投保预留手机号进行匹配：</p>
              <input type="tel" value={inputMobile} onChange={e => setInputMobile(e.target.value)} placeholder="请输入手机号" className="w-full border-b border-gray-100 py-4 text-2xl outline-none focus:border-jh-header font-mono" />
            </div>
            <button onClick={handleMobileVerify} className="w-full bg-jh-header text-white py-4 rounded-full font-bold shadow-lg">验证并继续</button>
          </div>
        )}
        {/* ... 其他步骤省略 ... */}
      </main>
    </div>
  );
};

const InfoCard = ({ title, items, icon }: any) => (
  <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-50 group hover:border-jh-header/10 transition-colors">
    <h3 className="font-bold text-gray-800 border-b border-gray-50 pb-3 mb-3 text-xs flex items-center gap-2">
      <span className="w-6 h-6 bg-jh-header/5 text-jh-header rounded-full flex items-center justify-center text-[10px]">{icon}</span> {title}
    </h3>
    <div className="grid gap-2.5">
      {items.map(([l, v]: any, i: number) => (
        <div key={i} className="flex justify-between items-start text-[11px]">
          <span className="text-gray-400 shrink-0 font-medium">{l}</span>
          <span className="text-gray-800 font-bold text-right ml-4 break-all leading-tight">{v || '未采集'}</span>
        </div>
      ))}
    </div>
  </div>
);

export default ClientIndex;
