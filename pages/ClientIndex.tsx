
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

  const handleMobileVerify = () => {
    if (inputMobile === data.proposer.mobile || inputMobile === data.proposer.mobile.slice(-4)) setStep('check');
    else alert(`验证失败：请输入投保手机号后四位或全号`);
  };

  const handleAlipayJump = () => {
    if (!data.payment.alipayUrl) {
      alert('支付通道暂未开启，请联系业务员。');
      return;
    }
    
    // 自动将金额复制到剪贴板，协助客户粘贴
    const amount = data.project.premium;
    navigator.clipboard.writeText(amount).then(() => {
      setIsRedirecting(true);
      // 延迟 2.5 秒跳转，给客户时间看清指令
      setTimeout(() => {
        window.location.href = data.payment.alipayUrl;
      }, 2500);
    }).catch(() => {
      // 降级处理：直接跳转
      window.location.href = data.payment.alipayUrl;
    });
  };

  const Header = ({ title }: { title: string }) => (
    <header className="bg-jh-header text-white h-12 flex items-center px-4 sticky top-0 z-30 shadow-sm">
      <h1 className="text-lg font-medium mx-auto tracking-wide">{title}</h1>
    </header>
  );

  if (step === 'terms') {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <Header title="授权录入" />
        <div className="p-8 flex flex-col flex-1">
          <div className="flex-1 space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">温馨提示</h2>
            <p className="text-gray-600 leading-relaxed">您即将进入中国人寿财险空中投保服务。请确认您已阅读并同意《保险条款》及个人信息保护政策。</p>
            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 text-[10px] text-emerald-600 font-medium leading-relaxed">
              * 点击下方按钮表示您授权系统获取并展示您的投保及车辆信息用于承保确认。
            </div>
          </div>
          <button onClick={() => setStep('verify')} className="w-full bg-jh-header text-white py-4 rounded-full font-bold shadow-xl active:scale-95 transition-transform">我已阅读并同意</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-jh-light flex flex-col pb-10">
      <Header title="新核心车险承保" />
      
      <div className="bg-white px-6 py-3 flex justify-between text-[9px] text-gray-300 border-b uppercase tracking-widest font-black">
         <span className={step === 'verify' ? 'text-jh-header' : ''}>身份验证</span>
         <span className="opacity-20">&gt;</span>
         <span className={step === 'check' ? 'text-jh-header' : ''}>信息核对</span>
         <span className="opacity-20">&gt;</span>
         <span className={step === 'sign' ? 'text-jh-header' : ''}>签名确认</span>
         <span className="opacity-20">&gt;</span>
         <span className={step === 'pay' ? 'text-jh-header' : ''}>保费支付</span>
      </div>

      <main className="p-4 space-y-4 max-w-lg mx-auto w-full">
        {step === 'verify' && (
          <div className="bg-white p-8 rounded-3xl shadow-sm space-y-8 animate-in slide-in-from-right duration-300">
            <h2 className="text-xl font-bold text-gray-800">安全验证</h2>
            <div className="space-y-4">
              <p className="text-xs text-gray-400">请输入投保预留手机号进行匹配：</p>
              <input type="tel" value={inputMobile} onChange={e => setInputMobile(e.target.value)} placeholder="请输入手机号" className="w-full border-b border-gray-100 py-4 text-2xl outline-none focus:border-jh-header font-mono" />
            </div>
            <button onClick={handleMobileVerify} disabled={inputMobile.length < 4} className="w-full bg-jh-header text-white py-4 rounded-full font-bold shadow-lg disabled:opacity-50">验证并继续</button>
          </div>
        )}

        {step === 'check' && (
          <div className="space-y-4 animate-in slide-in-from-right duration-300">
            <div className="bg-white p-5 rounded-2xl shadow-sm border-l-4 border-jh-header flex items-center justify-between">
               <div>
                  <h3 className="font-bold text-gray-800 text-sm">核对承保内容</h3>
                  <p className="text-[10px] text-gray-400">请核实录入信息的准确性</p>
               </div>
               <div className="bg-jh-header/10 text-jh-header text-[10px] px-2 py-1 rounded font-bold uppercase">Step 2/4</div>
            </div>

            <InfoCard title="投保人" icon="👤" items={[['姓名', data.proposer.name], ['证件号', data.proposer.idCard], ['联系电话', data.proposer.mobile], ['详细住所', data.proposer.address]]} />
            <InfoCard title="被保险人" icon="🛡️" items={[['姓名', data.insured.name], ['证件号', data.insured.idCard], ['住所', data.insured.address]]} />
            <InfoCard title="车辆核心参数" icon="🚗" items={[
              ['号牌号码', data.vehicle.plate], 
              ['所有人', data.vehicle.vehicleOwner],
              ['发动机号', data.vehicle.engineNo],
              ['注册日期', data.vehicle.registerDate],
              ['核定载客', `${data.vehicle.approvedPassengers} 人`],
              ['整备质量', `${data.vehicle.curbWeight} kg`],
              ['核定载重', `${data.vehicle.approvedLoad} kg`],
              ['车架号', data.vehicle.vin]
            ]} />

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-red-50">
               <h3 className="font-bold mb-4 text-sm text-gray-800 flex items-center gap-2">
                 <span className="w-1 h-3 bg-red-500 rounded-full"></span> 承保方案及保费
               </h3>
               <div className="space-y-3">
                 {data.project.coverages.map((c, i) => (
                   <div key={i} className="flex justify-between text-[11px]">
                      <span className="text-gray-400 font-medium">{c.name}</span>
                      <span className="font-bold text-gray-700">¥ {c.premium}</span>
                   </div>
                 ))}
               </div>
               <div className="flex justify-between mt-6 pt-4 border-t border-red-100 font-black text-red-600 text-xl italic tracking-tight">
                 <span>保费合计</span>
                 <span>¥ {data.project.premium}</span>
               </div>
            </div>

            <button onClick={() => setStep('sign')} className="w-full bg-jh-header text-white py-5 rounded-full font-bold shadow-xl active:scale-95 transition-all">信息确认无误，去签名</button>
          </div>
        )}

        {step === 'sign' && (
          <div className="bg-white p-6 rounded-3xl shadow-sm h-[75vh] flex flex-col animate-in slide-in-from-bottom duration-500">
            <div className="mb-4">
              <h2 className="font-bold text-gray-800">电子签名确认</h2>
              <p className="text-[10px] text-gray-400 mt-1">请在下方空白处书写您的正楷姓名，以此作为投保确认识别</p>
            </div>
            <div className="flex-1 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl relative overflow-hidden group">
               <canvas ref={canvasRef} className="w-full h-full touch-none" 
                onMouseDown={() => setIsDrawing(true)} onMouseUp={() => { setIsDrawing(false); setHasSigned(true); }}
                onMouseMove={(e) => {
                  if(!isDrawing) return;
                  const ctx = canvasRef.current?.getContext('2d');
                  if(ctx) {
                    const rect = canvasRef.current!.getBoundingClientRect();
                    ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.strokeStyle = '#222';
                    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top); ctx.stroke();
                  }
                }} />
               {!hasSigned && <div className="absolute inset-0 flex items-center justify-center text-gray-300 pointer-events-none text-xl font-black opacity-10">此处签名确认</div>}
            </div>
            <div className="flex gap-4 mt-6">
              <button onClick={() => { setHasSigned(false); canvasRef.current?.getContext('2d')?.clearRect(0,0,1000,1000); }} className="flex-1 py-4 border border-gray-200 rounded-full text-gray-400 font-bold">重写</button>
              <button onClick={() => hasSigned ? setStep('pay') : alert('请先签署姓名')} className="flex-[2] py-4 bg-jh-header text-white rounded-full font-bold shadow-lg">确认并去支付</button>
            </div>
          </div>
        )}

        {step === 'pay' && (
          <div className="bg-white p-8 rounded-[3rem] shadow-2xl text-center space-y-10 animate-in zoom-in-95 duration-500 relative">
            
            {/* 自动跳转引导遮罩 */}
            {isRedirecting && (
              <div className="fixed inset-0 z-[100] bg-blue-600 flex flex-col items-center justify-center p-10 text-white animate-in fade-in duration-300">
                 <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mb-8 animate-pulse">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                 </div>
                 <h3 className="text-3xl font-black mb-4">支付指令已就绪</h3>
                 <div className="bg-white/10 p-6 rounded-3xl border border-white/20 text-center space-y-4 max-w-xs">
                    <p className="text-lg font-bold">保费金额 <span className="text-yellow-300">¥{data.project.premium}</span> 已复制</p>
                    <p className="text-sm opacity-80 leading-relaxed">请在进入收银台后，<span className="font-black underline underline-offset-4">长按输入框选择“粘贴”</span> 即可完成支付操作。</p>
                 </div>
                 <div className="mt-10 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce [animation-delay:0.2s]"></div>
                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce [animation-delay:0.4s]"></div>
                    <span className="text-xs font-black uppercase tracking-widest ml-2">正在接入安全收银台...</span>
                 </div>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">待支付订单总金额</p>
              <h2 className="text-5xl font-black text-red-600 tracking-tighter italic">¥ {data.project.premium}</h2>
            </div>
            
            <div className="grid gap-4 text-left">
              <button onClick={() => setPaymentMethod('wechat')} 
                className={`flex items-center justify-between p-5 rounded-2xl border-2 transition-all ${paymentMethod === 'wechat' ? 'border-jh-green bg-emerald-50 shadow-inner' : 'border-gray-100 hover:border-jh-green/20'}`}>
                <div className="flex items-center gap-4 font-black">
                  <span className="w-10 h-10 bg-jh-green text-white rounded-full flex items-center justify-center text-sm shadow-lg shadow-jh-green/20">微</span> 
                  <div>
                    <span className="text-gray-700 block">微信支付</span>
                    <span className="text-[9px] text-gray-400 font-medium">官方渠道收单</span>
                  </div>
                </div>
                {paymentMethod === 'wechat' && <span className="text-jh-green font-black text-lg">●</span>}
              </button>

              <button onClick={() => setPaymentMethod('alipay')} 
                className={`flex items-center justify-between p-5 rounded-2xl border-2 transition-all ${paymentMethod === 'alipay' ? 'border-blue-500 bg-blue-50 shadow-inner' : 'border-gray-100 hover:border-blue-500/20'}`}>
                <div className="flex items-center gap-4 font-black">
                  <span className="w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm shadow-lg shadow-blue-500/20">支</span> 
                  <div>
                    <span className="text-gray-700 block">支付宝支付</span>
                    <span className="text-[9px] text-blue-500 font-black uppercase tracking-tight">汇来通安全接入</span>
                  </div>
                </div>
                {paymentMethod === 'alipay' && <span className="text-blue-500 font-black text-lg">●</span>}
              </button>
            </div>

            <div className="min-h-[300px] flex flex-col justify-center animate-in slide-in-from-top-4 duration-300">
              {paymentMethod === 'wechat' && (
                <div className="flex flex-col items-center">
                   <p className="text-[10px] text-jh-green mb-4 font-black tracking-[0.2em] uppercase">长按下方二维码进行识别支付</p>
                   <div className="p-4 bg-white rounded-3xl shadow-xl border border-jh-green/10">
                     {data.payment.wechatQrCode ? (
                       <img src={data.payment.wechatQrCode} className="w-60 h-60 object-contain" alt="Pay QR" />
                     ) : (
                       <div className="w-60 h-60 flex flex-col items-center justify-center text-gray-300 space-y-3 p-8">
                         <div className="w-12 h-12 border border-dashed border-gray-200 rounded-full flex items-center justify-center text-xl">⚠️</div>
                         <p className="text-[10px] leading-relaxed">业务员未上传收款码<br/>请联系服务人员补全信息</p>
                       </div>
                     )}
                   </div>
                </div>
              )}

              {paymentMethod === 'alipay' && (
                <div className="p-10 bg-blue-50 rounded-[2.5rem] border border-blue-100 space-y-8 flex flex-col items-center">
                   <div className="w-16 h-16 bg-blue-500 text-white rounded-full flex items-center justify-center text-3xl shadow-lg shadow-blue-500/20 animate-bounce">⚡</div>
                   <div className="text-center space-y-3">
                      <p className="text-sm text-blue-600 font-black italic">国寿财险${data.vehicle.plate}商险</p>
                      <div className="bg-white/50 p-4 rounded-2xl border border-blue-100">
                         <p className="text-[11px] text-blue-700 font-bold leading-relaxed italic">
                           “本次支付由汇来通安全接入提供服务，请您进入三方平台后输入保险金额并进行支付”
                         </p>
                      </div>
                   </div>
                   <button 
                    onClick={handleAlipayJump}
                    className="w-full bg-blue-500 text-white py-5 rounded-2xl font-black shadow-xl shadow-blue-500/30 active:scale-95 transition-all"
                   >
                     立即跳转收银台
                   </button>
                   <p className="text-[9px] text-blue-400 font-medium">金额已预备至剪贴板，跳转后可直接粘贴</p>
                </div>
              )}

              {!paymentMethod && (
                <div className="flex flex-col items-center justify-center text-gray-300 py-10 opacity-40 italic font-medium">
                  <div className="w-10 h-10 border border-gray-100 rounded-full flex items-center justify-center mb-2">?</div>
                  <p className="text-sm">请从上方选择支付渠道</p>
                </div>
              )}
            </div>
          </div>
        )}
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
