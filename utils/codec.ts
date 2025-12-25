export interface CoverageItem {
  name: string;
  amount: string;
  deductible: string;
  premium: string;
}

export interface InsuranceData {
  orderId: string;
  status: 'pending' | 'paid';
  proposer: {
    name: string;
    idType: string;
    idCard: string;
    mobile: string;
    address: string;
  };
  insured: {
    name: string;
    idType: string;
    idCard: string;
    mobile: string;
    address: string;
  };
  vehicle: {
    plate: string;
    vin: string;
    engineNo: string;
    brand: string;
    vehicleOwner: string;
    registerDate: string;
    curbWeight: string;
    approvedLoad: string;
    approvedPassengers: string;
  };
  project: {
    region: string;
    period: string;
    premium: string;
    coverages: CoverageItem[];
  };
  payment: {
    alipayUrl: string;
    wechatQrCode: string;
  };
}

/**
 * Encodes insurance data into a URL-safe Base64 string.
 * @param data The insurance data object.
 * @returns A Base64 encoded string.
 */
export function encodeData(data: InsuranceData): string {
  try {
    const jsonString = JSON.stringify(data);
    // Use btoa for browser environment. The unescape/encodeURIComponent trick handles Unicode.
    const encoded = btoa(unescape(encodeURIComponent(jsonString)));
    return encoded;
  } catch (error) {
    console.error("Encoding data failed:", error);
    return "";
  }
}

/**
 * Decodes a Base64 string back into an insurance data object.
 * @param encodedData The Base64 encoded string.
 * @returns The decoded insurance data object, or null if decoding fails.
 */
export function decodeData(encodedData: string): InsuranceData | null {
  try {
    // The escape/decodeURIComponent trick handles Unicode.
    const jsonString = decodeURIComponent(escape(atob(encodedData)));
    const data = JSON.parse(jsonString);
    // A simple type check could be added here for more robustness
    if (data && data.proposer && data.vehicle) {
      return data as InsuranceData;
    }
    return null;
  } catch (error) {
    console.error("Decoding data failed:", error);
    return null;
  }
}