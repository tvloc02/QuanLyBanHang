export interface ShippingConfig {
  id: number;
  type: 'province' | 'distance';
  name: string;
  province?: string;
  minDistance?: number;
  maxDistance?: number;
  fee: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProvinceShipping {
  province: string;
  fee: number;
  estimatedDays: number;
}

export interface DistanceShipping {
  minDistance: number;
  maxDistance: number;
  fee: number;
  estimatedDays: number;
}

export interface ShippingSettings {
  freeShippingThreshold: number;
  defaultFee: number;
  sameDayFee: number;
  expressFee: number;
  weekendFee: number;
  remoteFee: number;
}
