import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Splash: undefined;
  VehicleSearch: undefined;
  ExistingCustomer: undefined;
  NewCustomer: undefined;
  OtpVerification: {
    mode: 'NEW_CUSTOMER';
    otpId: string;
    vehicleNumber: string;
    mobileNumber: string;
    fuelType: 'PETROL' | 'DIESEL';
    litres: string;
  };
  TransactionSuccess: { litres: string; cashbackGenerated: string };
  Redemption: undefined;
  RedemptionOtp: undefined;
  WhatsAppVerification: undefined;
  ReaderStatus: undefined;
  RedemptionResult: { success: boolean; failureReason?: string };
};

export type ScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, T>;
