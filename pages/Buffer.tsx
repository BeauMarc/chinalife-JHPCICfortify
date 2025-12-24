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
      if (idParam) { navigate(`/index?id=${idParam}`); } 
      else { navigate(`/index?data=${dataParam}`); }
    }, 4000); 
    return () => clearTimeout(timer);
  }, [dataParam, idParam, navigate]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 font-sans">
      <header className="bg-jh-header text-white h-12 flex items-center justify-between px-4 shadow-sm z-50 sticky top-0">
        <div className="w-10"></div>
        <h1 className="text-lg font-medium tracking-wide flex-1 text-center truncate px-2">授权登录</h1>
        <div className="w-10"></div>
      </header>
      <div className="flex-1 flex flex-col items-center justify-center p-8 -mt-12">
        <div className="mb-12 relative">
           <div className="w-14 h-14 border-[3px] border-gray-200 border-t-jh-header rounded-full animate-spin"></div>
        </div>
        <div className="text-center space-y-4 max-w-xs mx-auto">
            <h2 className="text-gray-800 font-bold text-lg">正在安全跳转</h2>
            <p className="text-sm text-gray-500 leading-relaxed">您正在进入由中国人寿财产保险股份有限公司提供的服务页面，请稍候...</p>
        </div>
        <div className="mt-16 flex items-center gap-1.5 text-xs text-green-600 bg-green-50 px-3 py-1.5 rounded-full border border-green-100">
           <span className="font-medium">平台已加密保护</span>
        </div>
      </div>
    </div>
  );
};
export default Buffer;