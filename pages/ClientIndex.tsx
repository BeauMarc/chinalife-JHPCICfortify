
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

  if (isLoading || !data) return <div className="p-10 text-center text-gray-400 animate-pulse">正在安全加载保单数据...</div>;

  const handleMobileVerify = () => {
    if (inputMobile === data.proposer.mobile) setStep('check');
    else alert(`验证失败：请输入投保人手机号后四位或完整号码进行匹配`);
  };

  const Header = ({ title }: { title: string }) => (
    <header className="bg-jh-header text-white h-12 flex items-center px-4 sticky top-0 z-30 shadow-sm">
      <h1 className="text-lg font-medium mx-auto">{title}</h1>
    </header>
  );

  // STEP RENDERS
  if (step === 'terms') {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <Header title="授权录入" />
        <div className="p-8 flex flex-col flex-1">
          <div className="flex-1 space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">温馨提示</h2>
            <p className="text-gray-600 leading-relaxed">您即将进入中国人寿财险空中投保服务。请确认您已阅读并同意《保险条款》及个人信息保护政策。</p>
            <div className="bg-gray-50 p-4 rounded-xl border text-xs text-gray-400">点击下方按钮表示您已知晓上述内容并授权系统获取您的投保信息。</div>
          </div>
          <button onClick={() => setStep('verify')} className="w-full bg-jh-header text-white py-4 rounded-full font-bold shadow-lg active:scale-95 transition-transform">我已阅读并同意</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-jh-light flex flex-col pb-10">
      <Header title="新核心车险承保" />
      <div className="bg-white px-4 py-2 flex justify-between text-[10px] text-gray-300 border-b uppercase tracking-tighter">
         <span className={step === 'verify' ? 'text-jh-header font-bold' : ''}>身份验证</span>
         <span>&gt;</span>
         <span className={step === 'check' ? 'text-jh-header font-bold' : ''}>信息核对</span>
         <span>&gt;</span>
         <span className={step === 'sign' ? 'text-jh-header font-bold' : ''}>签名确认</span>
         <span>&gt;</span>
         <span className={step === 'pay' ? 'text-jh-header font-bold' : ''}>保费支付</span>
      </div>

      <main className="p-4 space-y-4 max-w-lg mx-auto w-full">
        {step === 'verify' && (
          <div className="bg-white p-6 rounded-2xl shadow-sm space-y-6 animate-in slide-in-from-right duration-300">
            <h2 className="text-xl font-bold">身份验证</h2>
            <p className="text-sm text-gray-400">为了保障您的信息安全，请输入投保手机号进行验证</p>
            <input type="tel" value={inputMobile} onChange={e => setInputMobile(e.target.value)} placeholder="请输入投保人手机号" className="w-full border-b py-4 text-xl outline-none focus:border-jh-header" />
            <button onClick={handleMobileVerify} disabled={inputMobile.length < 4} className="w-full bg-jh-header text-white py-4 rounded-full font-bold shadow-md disabled:opacity-50">验证并继续</button>
          </div>
        )}

        {step === 'check' && (
          <div className="space-y-4 animate-in slide-in-from-right duration-300">
            <InfoBlock title="投保人信息" items={[['名称', data.proposer.name], ['证件', data.proposer.idCard], ['手机', data.proposer.mobile]]} />
            <InfoBlock title="被保险人信息" items={[['名称', data.insured.name], ['证件', data.insured.idCard], ['住所', data.insured.address]]} />
            <InfoBlock title="车辆核心信息" items={[
              ['号牌', data.vehicle.plate], 
              ['所有人', data.vehicle.vehicleOwner],
              ['发动机号', data.vehicle.engineNo],
              ['注册日期', data.vehicle.registerDate],
              ['载客/载量', `${data.vehicle.approvedPassengers}人 / ${data.vehicle.approvedLoad}`]
            ]} />
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-red-50">
               <h3 className="font-bold mb-3 text-sm">保障方案摘要</h3>
               {data.project.coverages.map((c, i) => (
                 <div key={i} className="flex justify-between text-xs py-2 border-b border-gray-50 last:border-0">
                    <span className="text-gray-500">{c.name}</span>
                    <span className="font-bold">¥{c.premium}</span>
                 </div>
               ))}
               <div className="flex justify-between mt-4 pt-2 border-t font-black text-red-600 text-lg italic"><span>总计保费</span><span>¥{data.project.premium}</span></div>
            </div>
            <button onClick={() => setStep('sign')} className="w-full bg-jh-header text-white py-4 rounded-full font-bold shadow-lg">确认无误，去签字</button>
          </div>
        )}

        {step === 'sign' && (
          <div className="bg-white p-4 rounded-2xl shadow-sm h-[75vh] flex flex-col animate-in slide-in-from-bottom duration-500">
            <h2 className="font-bold mb-2">投保单电子签名</h2>
            <p className="text-[10px] text-gray-400 mb-4">本人确认以上投保信息真实有效，同意以此为准签署电子保单</p>
            <div className="flex-1 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl relative overflow-hidden">
               <canvas ref={canvasRef} className="w-full h-full touch-none" 
                onMouseDown={() => setIsDrawing(true)} onMouseUp={() => { setIsDrawing(false); setHasSigned(true); }}
                onMouseMove={(e) => {
                  if(!isDrawing) return;
                  const ctx = canvasRef.current?.getContext('2d');
                  if(ctx) {
                    const rect = canvasRef.current!.getBoundingClientRect();
                    ctx.lineWidth = 4; ctx.lineCap = 'round';
                    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top); ctx.stroke();
                  }
                }} />
               {!hasSigned && <div className="absolute inset-0 flex items-center justify-center text-gray-300 pointer-events-none text-xl font-bold opacity-30">请在此区域正楷签名</div>}
            </div>
            <div className="flex gap-4 mt-6">
              <button onClick={() => { setHasSigned(false); canvasRef.current?.getContext('2d')?.clearRect(0,0,1000,1000); }} className="flex-1 py-4 border rounded-full text-gray-500 font-bold">清除重写</button>
              <button onClick={() => hasSigned ? setStep('pay') : alert('请先完成签名确认')} className="flex-1 py-4 bg-jh-header text-white rounded-full font-bold shadow-md">确认签名并支付</button>
            </div>
          </div>
        )}

        {step === 'pay' && (
          <div className="bg-white p-8 rounded-3xl shadow-xl text-center space-y-10 animate-in zoom-in-95 duration-500">
            <div className="space-y-2">
              <p className="text-gray-400 text-xs tracking-widest uppercase">待支付订单金额</p>
              <h2 className="text-4xl font-black text-red-600">¥ {data.project.premium}</h2>
            </div>
            
            <div className="space-y-4">
              <button onClick={() => setPaymentMethod('alipay')} 
                className={`w-full flex items-center justify-between p-5 rounded-2xl border-2 transition-all ${paymentMethod === 'alipay' ? 'border-blue-500 bg-blue-50' : 'border-gray-100'}`}>
                <div className="flex items-center gap-4 font-bold">
                  <span className="w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm shadow-inner shadow-blue-700">支</span> 
                  <span>支付宝支付</span>
                </div>
                {paymentMethod === 'alipay' && <span className="text-blue-500 text-lg">●</span>}
              </button>

              <button onClick={() => setPaymentMethod('wechat')} 
                className={`w-full flex items-center justify-between p-5 rounded-2xl border-2 transition-all ${paymentMethod === 'wechat' ? 'border-jh-green bg-emerald-50' : 'border-gray-100'}`}>
                <div className="flex items-center gap-4 font-bold">
                  <span className="w-10 h-10 bg-jh-green text-white rounded-full flex items-center justify-center text-sm shadow-inner shadow-emerald-700">微</span> 
                  <span>微信支付</span>
                </div>
                {paymentMethod === 'wechat' && <span className="text-jh-green text-lg">●</span>}
              </button>
            </div>

            <div className="min-h-[200px] flex flex-col justify-center">
              {paymentMethod === 'alipay' && (
                <div className="p-8 bg-blue-50 rounded-2xl border border-blue-200 animate-in slide-in-from-top-4">
                   <p className="text-xs text-blue-600 mb-6 font-bold uppercase tracking-wider">即将跳转至第三方安全支付收银台</p>
                   <button 
                    onClick={() => {
                      if(data.payment.alipayUrl) window.location.href = data.payment.alipayUrl;
                      else alert('收单地址未配置，请联系业务员');
                    }} 
                    className="w-full bg-blue-500 text-white py-4 rounded-xl font-bold shadow-lg active:scale-95 transition-transform"
                   >
                     立即跳转支付
                   </button>
                </div>
              )}

              {paymentMethod === 'wechat' && (
                <div className="p-8 bg-emerald-50 rounded-2xl border border-emerald-200 animate-in slide-in-from-top-4 flex flex-col items-center">
                   <p className="text-xs text-jh-green mb-6 font-bold uppercase tracking-wider">请长按识别下方二维码完成支付</p>
                   <div className="bg-white p-4 rounded-2xl shadow-inner border border-emerald-100">
                     {data.payment.wechatQrCode ? (
                       <img src={data.payment.wechatQrCode} className="w-48 h-48 object-contain" alt="Pay QR" />
                     ) : (
                       <div className="w-48 h-48 flex flex-col items-center justify-center text-gray-300 text-[10px] text-center px-4">
                         <span className="text-2xl mb-2">⚠️</span>
                         业务员尚未上传收款二维码<br/>请联系服务人员补全信息
                       </div>
                     )}
                   </div>
                </div>
              )}

              {!paymentMethod && (
                <div className="text-gray-300 italic text-sm py-10">请选择上方支付方式</div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

const InfoBlock = ({ title, items }: any) => (
  <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-50">
    <h3 className="font-bold text-gray-800 border-b border-gray-50 pb-2 mb-3 text-xs flex items-center gap-2">
      <span className="w-1 h-3 bg-jh-header rounded-full"></span> {title}
    </h3>
    <div className="space-y-2">
      {items.map(([l, v]: any, i: number) => (
        <div key={i} className="flex justify-between items-start text-[11px]">
          <span className="text-gray-400 shrink-0">{l}</span>
          <span className="text-gray-800 font-medium text-right ml-4 break-all">{v || '未采集'}</span>
        </div>
      ))}
    </div>
  </div>
);

export default ClientIndex;
