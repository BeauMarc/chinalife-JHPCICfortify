import React, { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { decodeData, InsuranceData } from '../utils/codec';

type Step = 'terms' | 'verify' | 'check' | 'sign' | 'pay' | 'completed';

const PREVIEW_DATA: InsuranceData = {
  orderId: 'JH-PREVIEW-001',
  status: 'pending',
  proposer: { name: '张三 (预览模式)', idType: '身份证', idCard: '110101199001011234', mobile: '13800138000', address: '北京市朝阳区建国路88号' },
  insured: { name: '张三', idType: '身份证', idCard: '110101199001011234', mobile: '13800138000', address: '北京市朝阳区建国路88号' },
  vehicle: { plate: '京A88888', vin: 'LFVPREVIEW123456', engineNo: '123456', brand: '特斯拉 Model 3', vehicleOwner: '张三', registerDate: '2023-01-01', curbWeight: '1800KG', approvedLoad: '5人' },
  project: { region: '北京', period: '2024-05-20 至 2025-05-19', premium: '15333.84', coverages: [{ name: '机动车损失保险', amount: '300,000.00', deductible: '/', premium: '4,500.00' }, { name: '机动车第三者责任保险', amount: '1,000,000.00', deductible: '/', premium: '10,833.84' }] },
  payment: { alipayUrl: 'https://alipay.com/example', wechatUrl: 'https://wechat.com/example' }
};

const ClientIndex: React.FC = () => {
  const location = useLocation();
  const [step, setStep] = useState<Step>('terms');
  const [data, setData] = useState<InsuranceData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const [inputMobile, setInputMobile] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const dataParam = searchParams.get('data');
    const idParam = searchParams.get('id');

    if (idParam) {
      setIsLoading(true);
      fetch(`/api/get?id=${idParam}`).then(res => { if (!res.ok) throw new Error("Order not found"); return res.json(); }).then((fetchedData: InsuranceData) => { setData(fetchedData); if (fetchedData.status === 'paid') setStep('completed'); }).catch(err => { console.error(err); alert("无法获取保单信息"); }).finally(() => setIsLoading(false));
    } else if (dataParam) {
      const decoded = decodeData(dataParam);
      if (decoded) { setData(decoded); if (decoded.status === 'paid') setStep('completed'); } else { alert("数据解析失败"); }
    } else {
      setData(PREVIEW_DATA); setIsPreview(true);
    }
  }, [location]);

  if (isLoading) return <div className="p-10 text-center text-gray-500 mt-20">正在从云端加载保单信息...</div>;
  if (!data) return <div className="p-4 text-center mt-20">正在加载数据...</div>;

  const handleMobileVerify = () => { if (inputMobile === data.proposer.mobile) { setStep('check'); } else { alert(`验证失败：手机号不匹配`); } };
  const startDrawing = (e: any) => { const ctx = canvasRef.current?.getContext('2d'); if(!ctx)return; setIsDrawing(true); ctx.beginPath(); ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY); };
  const draw = (e: any) => { if(!isDrawing)return; const ctx = canvasRef.current?.getContext('2d'); ctx?.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY); ctx?.stroke(); };
  const endDrawing = () => { setIsDrawing(false); setHasSigned(true); };

  const Header = ({ title, theme = 'green' }: any) => (
    <header className={`${theme === 'green' ? 'bg-jh-header text-white' : 'bg-gray-50 text-gray-800'} h-12 flex items-center px-4 justify-between sticky top-0 z-30`}>
      <h1 className="text-lg font-medium mx-auto">{title}</h1>
    </header>
  );

  if (step === 'terms') {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <Header title="授权登录" theme="white" />
        {isPreview && <div className="bg-orange-100 text-orange-800 text-xs font-bold text-center py-2">⚠️ 预览模式：测试数据</div>}
        <div className="flex-1 flex flex-col p-6">
           <div className="flex flex-col items-center justify-center mb-10 mt-6"><h2 className="text-xl font-bold">中国人寿 | 财产保险</h2></div>
           <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900 mb-6">温馨提示，您即将进入投保流程</h2>
              <p className="text-sm text-gray-600 mb-4">请仔细阅读《保险条款》及保险须知。</p>
           </div>
           <button onClick={() => setStep('verify')} className="w-full bg-jh-header text-white font-bold py-3.5 rounded-full shadow-lg">我已阅读并同意</button>
        </div>
      </div>
    );
  }
  
  if (step === 'completed') return <div className="p-10 text-center">支付完成</div>;

  return (
    <div className="min-h-screen bg-jh-light flex flex-col pb-10">
      <Header title="新核心车险承保" />
      {isPreview && <div className="bg-orange-100 text-orange-800 text-xs text-center py-2">⚠️ 预览模式</div>}
      <main className="flex-1 px-4 max-w-lg mx-auto w-full mt-4">
        {step === 'verify' && (
          <div className="bg-white rounded-xl p-6">
             <h2 className="font-bold mb-4">身份验证</h2>
             <input type="tel" value={inputMobile} onChange={(e) => setInputMobile(e.target.value)} placeholder="请输入手机号" className="w-full border p-2 mb-4 rounded" />
             <button onClick={handleMobileVerify} className="w-full bg-jh-header text-white py-2 rounded-full">验证</button>
          </div>
        )}
        {step === 'check' && (
           <div className="space-y-4">
             <div className="bg-white p-5 rounded-xl"><h3 className="font-bold mb-2">信息核对</h3><p>投保人: {data.proposer.name}</p><p>车牌: {data.vehicle.plate}</p><p className="text-red-600 font-bold">保费: {data.project.premium}</p></div>
             <button onClick={() => setStep('sign')} className="w-full bg-jh-header text-white py-3 rounded-full">去签字</button>
           </div>
        )}
        {step === 'sign' && (
            <div className="bg-white p-5 rounded-xl h-[60vh] flex flex-col">
                <h2 className="font-bold mb-2">电子签名</h2>
                <canvas ref={canvasRef} className="border flex-1 w-full bg-gray-50" onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={endDrawing} />
                <button onClick={() => hasSigned ? setStep('pay') : alert('请先签名')} className="mt-4 w-full bg-jh-header text-white py-3 rounded-full">确认签名</button>
            </div>
        )}
        {step === 'pay' && (
            <div className="bg-white p-8 rounded-xl text-center">
                <h2 className="font-bold mb-4">支付保费: ¥{data.project.premium}</h2>
                <div className="bg-gray-100 p-4 mb-4">二维码区域</div>
                <button disabled className="w-full bg-gray-300 text-white py-3 rounded-full">请扫码支付</button>
            </div>
        )}
      </main>
    </div>
  );
};
export default ClientIndex;