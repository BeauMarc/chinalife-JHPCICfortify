
import React, { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { decodeData, InsuranceData, CoverageItem } from '../utils/codec';

type Step = 'terms' | 'verify' | 'check' | 'sign' | 'pay' | 'completed';

// --- 子组件定义 ---

const Header: React.FC<{ title: string }> = ({ title }) => (
  <header className="bg-jh-header text-white h-14 flex items-center px-4 sticky top-0 z-50 shadow-md border-b border-white/10">
    <div className="flex items-center gap-3 max-w-full">
      <div className="h-9 w-9 bg-white rounded-xl flex items-center justify-center overflow-hidden shrink-0 border border-white/30 shadow-sm p-1">
        <img src="jhic.jpeg" className="h-full w-full object-contain" alt="JHIC Logo" />
      </div>
      <div className="flex flex-col">
        <h1 className="text-sm font-black truncate tracking-tight">{title}</h1>
        <p className="text-[8px] opacity-70 font-bold uppercase tracking-widest">China Life Insurance</p>
      </div>
    </div>
  </header>
);

const DocItem: React.FC<{ title: string, isRead: boolean, onClick: () => void }> = ({ title, isRead, onClick }) => (
  <div 
    onClick={onClick}
    className={`p-4 rounded-2xl border-2 transition-all flex items-center justify-between active:scale-95 cursor-pointer ${isRead ? 'border-jh-header bg-emerald-50' : 'border-gray-100 bg-white hover:border-jh-header/30'}`}
  >
    <div className="flex items-center gap-3">
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${isRead ? 'bg-jh-header text-white' : 'bg-gray-100 text-gray-400'}`}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 12l2 2 4-4" />
        </svg>
      </div>
      <span className={`text-[12px] font-black leading-tight tracking-tight max-w-[180px] ${isRead ? 'text-jh-header' : 'text-gray-700'}`}>{title}</span>
    </div>
    <div className={`text-[9px] font-black tracking-widest uppercase ${isRead ? 'text-jh-header' : 'text-gray-300'}`}>
      {isRead ? '已读' : '去阅读'}
    </div>
  </div>
);

const InfoCard: React.FC<{ title: string, icon: string, items: [string, string][] }> = ({ title, icon, items }) => (
  <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 h-full flex flex-col">
    <h3 className="font-black text-gray-800 border-b border-slate-50 pb-4 mb-5 text-xs flex items-center gap-2">
      <span className="w-8 h-8 bg-jh-header/5 text-jh-header rounded-xl flex items-center justify-center text-xs shadow-inner">{icon}</span> {title}
    </h3>
    <div className="grid gap-4 flex-1">
      {items.map(([l, v], i) => (
        <div key={i} className="flex justify-between items-start text-[11px]">
          <span className="text-gray-400 font-black uppercase tracking-widest shrink-0">{l}</span>
          <span className="text-gray-800 font-bold italic text-right break-all ml-4 leading-tight">{v || '未录入'}</span>
        </div>
      ))}
    </div>
  </div>
);

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
  const [cardIndex, setCardIndex] = useState(0);

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
        .then(d => { setData(d); if(d.status === 'paid') setStep('completed'); })
        .catch(() => setData(null))
        .finally(() => setIsLoading(false));
    } else if (dataParam) {
      const decoded = decodeData(dataParam);
      if (decoded) setData(decoded);
    }
  }, [location]);

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

  const markAsRead = (key: string, filename: string) => {
    window.open(`/pdfs/${filename}`, '_blank');
    setReadDocs(prev => ({ ...prev, [key]: true }));
  };

  const isAllRead = readDocs.terms && readDocs.policy && readDocs.auth;

  if (isLoading || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-jh-light font-bold">
        <div className="circle-loader mb-4"></div>
        <p className="text-gray-400 text-xs tracking-widest uppercase animate-pulse">Data Verification...</p>
      </div>
    );
  }

  if (step === 'terms') {
    return (
      <div className="min-h-screen flex flex-col bg-jh-light font-sans">
        <Header title="授权录入与协议确认" />
        <div className="p-6 flex flex-col flex-1 gap-6 max-w-lg mx-auto w-full">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm space-y-4">
            <h2 className="text-2xl font-black text-gray-800 tracking-tight leading-tight">投保合规告知</h2>
            <p className="text-gray-500 text-sm leading-relaxed font-medium">
              欢迎进入空中投保通道。根据监管要求，在进入承保流程前，请务必完整阅读并同意以下法律协议。
            </p>
          </div>
          <div className="space-y-3 flex-1">
            <DocItem title="《保险条款》" isRead={readDocs.terms} onClick={() => markAsRead('terms', '保险条款.pdf')} />
            <DocItem title="《互联网平台用戶个人信息保护政策》" isRead={readDocs.policy} onClick={() => markAsRead('policy', '互联网平台用戶个人信息保护政策.pdf')} />
            <DocItem title="《车险“投保人缴费实名认证”客户授权声明书》" isRead={readDocs.auth} onClick={() => markAsRead('auth', '车险“投保人缴费实名认证”客户授权声明书.pdf')} />
          </div>
          <button 
            onClick={() => isAllRead ? setStep('verify') : alert('请先依次点击并阅读完所有协议')}
            className={`w-full py-5 rounded-full font-black text-lg transition-all shadow-xl ${isAllRead ? 'bg-jh-header text-white active:scale-95' : 'bg-gray-200 text-gray-400'}`}
          >
            我已阅读并确认
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-jh-light flex flex-col font-sans overflow-x-hidden">
      <div className="w-full bg-white shadow-sm shrink-0">
        <img src="/top-banner.png" className="w-full h-auto block" alt="China Life Banner" />
      </div>
      <Header title="中国人寿财险空中投保" />
      
      {/* 顶部导航 */}
      <div className="bg-white px-6 py-4 flex justify-between text-[10px] text-gray-300 border-b uppercase font-black tracking-widest relative z-10">
         <span className={step === 'verify' ? 'text-jh-header' : ''}>身份验证</span>
         <span className={step === 'check' ? 'text-jh-header' : ''}>承保信息</span>
         <span className={step === 'sign' ? 'text-jh-header' : ''}>签名确认</span>
         <span className={step === 'pay' ? 'text-jh-header' : ''}>保费支付</span>
      </div>

      <main className="p-4 space-y-4 max-w-lg mx-auto w-full flex-1">
        {step === 'verify' && (
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm space-y-8 animate-in slide-in-from-right duration-300">
            <h2 className="text-2xl font-black text-gray-800">安全核验</h2>
            <div className="space-y-4">
              <label className="text-xs text-gray-400 font-bold px-1 tracking-widest uppercase opacity-60">投保预留手机号</label>
              <input type="tel" value={inputMobile} onChange={(e) => setInputMobile(e.target.value)} placeholder="请输入手机号" className="w-full border-b-2 border-gray-100 py-4 text-3xl outline-none focus:border-jh-header font-black transition-all" />
            </div>
            <button 
              onClick={() => (inputMobile === data.proposer.mobile || inputMobile === data.proposer.mobile.slice(-4)) ? setStep('check') : alert('验证失败：请输入投保时预留的手机号')}
              className="w-full bg-jh-header text-white py-5 rounded-full font-black text-lg shadow-xl active:scale-95"
            >
              验证身份
            </button>
          </div>
        )}

        {step === 'check' && (
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

            {/* 翻页式信息展示区 */}
            <div className="relative h-[360px] overflow-hidden rounded-[2.5rem] shadow-lg">
               <div className="flex h-full transition-transform duration-500 ease-in-out" style={{ transform: `translateX(-${cardIndex * 100}%)` }}>
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
                          <tr>
                            <th className="py-2 font-black">保险项目</th>
                            <th className="py-2 px-1 font-black">限额/保额</th>
                            <th className="py-2 text-right font-black">保费</th>
                          </tr>
                        </thead>
                        <tbody className="text-gray-700 font-bold">
                          {data.project.coverages.map((c: CoverageItem, i: number) => (
                            <tr key={i} className="border-b border-slate-50">
                              <td className="py-2.5 leading-tight">{c.name}</td>
                              <td className="py-2.5 px-1 italic text-slate-500">{c.amount || '详见条款'}</td>
                              <td className="py-2.5 text-right font-black">¥{c.premium}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
               </div>
            </div>

            {/* 分页指示点 */}
            <div className="flex justify-center gap-3">
              {[0, 1, 2, 3].map(i => (
                <button key={i} onClick={() => setCardIndex(i)} className={`h-2 transition-all rounded-full ${cardIndex === i ? 'w-10 bg-jh-header shadow-md shadow-jh-header/20' : 'w-2 bg-gray-200 hover:bg-jh-header/30'}`} />
              ))}
            </div>

            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-50 flex justify-between items-center px-10">
               <span className="text-gray-400 font-black text-[10px] uppercase tracking-widest opacity-60">保费合计</span>
               <span className="text-slate-800 font-black text-sm tracking-tight">¥ {data.project.premium}</span>
            </div>

            <button onClick={() => setStep('sign')} className="w-full bg-jh-header text-white py-5 rounded-full font-black text-lg shadow-2xl shadow-jh-header/20 active:scale-95 transition-all">信息核对无误，开始签名</button>
          </div>
        )}

        {step === 'sign' && (
          <div className="bg-white p-8 rounded-[3rem] h-[75vh] flex flex-col space-y-6 animate-in slide-in-from-bottom duration-500">
            <div className="space-y-1">
              <h2 className="font-black text-2xl text-gray-800">电子签名</h2>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest opacity-60">请在下方灰白区域签署您的正楷姓名</p>
            </div>
            <div className="flex-1 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2.5rem] relative overflow-hidden">
               <canvas 
                 ref={canvasRef} 
                 className="w-full h-full touch-none cursor-crosshair" 
                 onMouseDown={() => setIsDrawing(true)} 
                 onMouseUp={() => { setIsDrawing(false); setHasSigned(true); }}
                 onTouchStart={() => setIsDrawing(true)}
                 onTouchEnd={() => { setIsDrawing(false); setHasSigned(true); }}
               />
               {!hasSigned && <div className="absolute inset-0 flex items-center justify-center text-slate-300 pointer-events-none font-black opacity-20 uppercase tracking-[0.5em] text-sm italic">签名确认区</div>}
            </div>
            <div className="flex gap-4">
              <button onClick={() => { setHasSigned(false); ctxRef.current?.clearRect(0,0,2000,2000); }} className="flex-1 py-5 border-2 border-gray-100 rounded-full font-black text-gray-400 uppercase text-xs tracking-widest">重写</button>
              <button onClick={() => hasSigned ? setStep('pay') : alert('请先签名确认投保意向')} className="flex-[2] py-5 bg-jh-header text-white rounded-full font-black shadow-xl active:scale-95 transition-all">确认签名并支付</button>
            </div>
          </div>
        )}

        {step === 'pay' && (
          <div className="bg-white p-8 rounded-[3rem] shadow-2xl text-center space-y-10 animate-in zoom-in-95 duration-500">
            <div className="space-y-2">
              <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest opacity-60">保费应付总额</p>
              <h2 className="text-5xl font-black text-red-600 italic tracking-tighter leading-none">¥ {data.project.premium}</h2>
            </div>
            <div className="grid gap-4">
               <button onClick={() => setPaymentMethod('wechat')} className={`p-6 rounded-[2rem] border-2 flex items-center justify-between transition-all ${paymentMethod === 'wechat' ? 'border-jh-green bg-emerald-50' : 'border-slate-50 bg-slate-50/30'}`}>
                 <div className="flex items-center gap-4">
                    <img src="jhic.jpeg" className="w-11 h-11 rounded-xl shadow-md border-2 border-white" alt="JHIC" />
                    <div className="text-left"><p className="font-black text-lg text-slate-800">微信支付</p><p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">官方直收通道</p></div>
                 </div>
                 {paymentMethod === 'wechat' && <div className="w-6 h-6 bg-jh-green rounded-full flex items-center justify-center text-white text-xs shadow-lg">✓</div>}
               </button>
               <button onClick={() => setPaymentMethod('alipay')} className={`p-6 rounded-[2rem] border-2 flex items-center justify-between transition-all ${paymentMethod === 'alipay' ? 'border-blue-500 bg-blue-50' : 'border-slate-50 bg-slate-50/30'}`}>
                 <div className="flex items-center gap-4">
                    <img src="jhic.jpeg" className="w-11 h-11 rounded-xl shadow-md border-2 border-white" alt="JHIC" />
                    <div className="text-left"><p className="font-black text-lg text-slate-800">支付宝支付</p><p className="text-[9px] text-blue-500 font-black uppercase tracking-widest">三方协作接入</p></div>
                 </div>
                 {paymentMethod === 'alipay' && <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs shadow-lg">✓</div>}
               </button>
            </div>
            {paymentMethod === 'wechat' && (
              <div className="p-8 bg-white rounded-[2.5rem] shadow-3xl border border-jh-green/5 animate-in slide-in-from-top-4">
                {data.payment.wechatQrCode ? (
                  <div className="space-y-4">
                    <p className="text-[10px] text-jh-header font-black uppercase tracking-widest animate-pulse">长按识别下方二维码完成支付</p>
                    <img src={data.payment.wechatQrCode} className="w-64 h-64 mx-auto rounded-[2rem] shadow-inner" alt="QR" />
                  </div>
                ) : <p className="text-slate-300 font-bold italic py-10 text-sm">业务员暂未配置收款码凭证</p>}
              </div>
            )}
            {paymentMethod === 'alipay' && (
              <button onClick={() => window.location.href = data.payment.alipayUrl} className="w-full bg-blue-600 text-white py-6 rounded-[2rem] font-black shadow-2xl shadow-blue-600/20 active:scale-95 transition-all text-xl">前往支付宝支付</button>
            )}
          </div>
        )}
      </main>
      
      {step === 'completed' && (
        <div className="fixed inset-0 bg-white z-[100] flex flex-col items-center justify-center p-10 text-center space-y-8 animate-in fade-in duration-500">
           <div className="w-24 h-24 bg-jh-header text-white rounded-[2.5rem] flex items-center justify-center text-5xl shadow-2xl shadow-jh-header/30">✓</div>
           <div className="space-y-2">
             <h2 className="text-3xl font-black text-gray-800 tracking-tight">支付申请已提交</h2>
             <p className="text-gray-400 text-sm font-medium leading-relaxed italic">感谢您选择中国人寿财险。<br/>您的保单详情将随后发送至您的手机，请注意查收。</p>
           </div>
           <button onClick={() => window.close()} className="px-12 py-4 border border-slate-100 rounded-full text-slate-400 font-black uppercase text-xs tracking-widest">返回微信</button>
        </div>
      )}
    </div>
  );
};

export default ClientIndex;
