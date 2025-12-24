
import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const Buffer: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  
  const dataParam = searchParams.get('data');
  const idParam = searchParams.get('id');

  useEffect(() => {
    if (!dataParam && !idParam) return;
    const timer = setTimeout(() => {
      navigate(idParam ? `/index?id=${idParam}` : `/index?data=${dataParam}`);
    }, 4000); 
    return () => clearTimeout(timer);
  }, [dataParam, idParam, navigate]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 font-sans">
      <div className="w-full bg-white">
        <img src="/top-banner.png" className="w-full h-auto block" alt="China Life Banner" />
      </div>
      <header className="bg-jh-header text-white h-12 flex items-center justify-center px-4 shadow-sm z-50 sticky top-0">
        <h1 className="text-lg font-medium tracking-wide">授权登录</h1>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center p-8 -mt-12">
        <div className="mb-12 relative">
           <div className="w-14 h-14 border-[3px] border-gray-200 border-t-jh-header rounded-full animate-spin"></div>
           <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-2 h-2 bg-jh-header rounded-full animate-pulse"></div>
           </div>
        </div>
        <div className="text-center space-y-4 max-w-xs mx-auto">
            <h2 className="text-gray-800 font-bold text-lg">正在安全跳转</h2>
            <p className="text-sm text-gray-500">正在进入中国人寿财险空中投保服务页面，请稍候...</p>
        </div>
        <div className="mt-16 flex items-center gap-1.5 text-xs text-green-600 bg-green-50 px-3 py-1.5 rounded-full border border-green-100">
           <span className="font-medium">🛡️ 平台已加密保护</span>
        </div>
      </div>

      <div className="pb-8 text-center px-6">
         <p className="text-[10px] text-gray-300 uppercase tracking-widest">Copyright © China Life Property & Casualty Insurance</p>
      </div>
    </div>
  );
};

export default Buffer;
