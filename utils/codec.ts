export const encodeData = (data: any): string => {
  try {
    const jsonString = JSON.stringify(data);
    return btoa(encodeURIComponent(jsonString).replace(/%([0-9A-F]{2})/g,
      function toSolidBytes(match, p1) {
        return String.fromCharCode(parseInt(p1, 16));
      }));
  } catch (e) {
    console.error("Encoding error", e);
    return "";
  }
};

export const decodeData = (base64: string): any => {
  try {
    const jsonString = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonString);
  } catch (e) {
    console.error("Decoding error", e);
    return null;
  }
};

export interface CoverageItem {
  name: string;
  amount: string;
  deductible: string;
  premium: string;
}

export interface InsuranceData {
  orderId: string;
  status: 'pending' | 'paid';
  proposer: { name: string; idType: string; idCard: string; mobile: string; address: string; };
  insured: { name: string; idType: string; idCard: string; mobile: string; address: string; };
  vehicle: { plate: string; vin: string; engineNo: string; brand: string; vehicleOwner: string; registerDate: string; curbWeight: string; approvedLoad: string; };
  project: { region: string; period: string; premium: string; coverages: CoverageItem[]; };
  payment: { alipayUrl: string; wechatUrl: string; };
  signature?: string;
}