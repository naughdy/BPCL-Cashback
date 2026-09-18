import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_BASE_URL } from '../config';
import type { Customer, FuelType, Redemption, ApiErrorShape } from '../types';

export interface SearchCustomerResponse {
  found: boolean;
  customer?: Customer;
}

export interface SendOtpResponse {
  otpId: string;
  expiresAt: string;
  resendAvailableAt: string;
}

export interface VerifyOtpResponse {
  verified: boolean;
  attemptsRemaining: number;
}

export interface AddTransactionResponse {
  transactionId: string;
  customer: Customer;
}

export const bpclApi = createApi({
  reducerPath: 'bpclApi',
  baseQuery: fetchBaseQuery({ baseUrl: API_BASE_URL }),
  tagTypes: ['Customer', 'Redemption'],
  endpoints: (builder) => ({
    searchCustomer: builder.mutation<SearchCustomerResponse, { vehicleNumber: string }>({
      query: (body) => ({ url: '/customers/search', method: 'POST', body }),
    }),

    sendOtp: builder.mutation<SendOtpResponse, { mobileNumber: string; purpose: 'CUSTOMER_VERIFICATION' | 'REDEMPTION'; customerId?: string }>({
      query: (body) => ({ url: '/otp/send', method: 'POST', body }),
    }),

    verifyOtp: builder.mutation<VerifyOtpResponse, { otpId: string; code: string }>({
      query: (body) => ({ url: '/otp/verify', method: 'POST', body }),
    }),

    createCustomer: builder.mutation<
      Customer,
      { vehicleNumber: string; mobileNumber: string; fuelType: FuelType; otpId: string; otpCode: string }
    >({
      query: (body) => ({ url: '/customers', method: 'POST', body }),
      invalidatesTags: ['Customer'],
    }),

    addTransaction: builder.mutation<AddTransactionResponse, { customerId: string; litres: string; idempotencyKey: string }>({
      query: (body) => ({ url: '/transactions', method: 'POST', body }),
      invalidatesTags: ['Customer'],
    }),

    initiateRedemption: builder.mutation<Redemption, { customerId: string; amount?: string; idempotencyKey: string }>({
      query: (body) => ({ url: '/redemptions', method: 'POST', body }),
    }),

    getRedemption: builder.query<Redemption, string>({
      query: (id) => `/redemptions/${id}`,
      providesTags: ['Redemption'],
    }),

    sendRedemptionOtp: builder.mutation<SendOtpResponse, { redemptionId: string }>({
      query: ({ redemptionId }) => ({ url: `/redemptions/${redemptionId}/otp/send`, method: 'POST' }),
    }),

    verifyRedemptionOtp: builder.mutation<Redemption, { redemptionId: string; otpId: string; code: string }>({
      query: ({ redemptionId, ...body }) => ({ url: `/redemptions/${redemptionId}/otp/verify`, method: 'POST', body }),
      invalidatesTags: ['Redemption'],
    }),

    processRedemptionWhatsApp: builder.mutation<Redemption, { redemptionId: string }>({
      query: ({ redemptionId }) => ({ url: `/redemptions/${redemptionId}/whatsapp`, method: 'POST' }),
      invalidatesTags: ['Redemption'],
    }),

    processRedemptionReader: builder.mutation<{ redemption: Redemption; customer: Customer }, { redemptionId: string }>({
      query: ({ redemptionId }) => ({ url: `/redemptions/${redemptionId}/reader`, method: 'POST' }),
      invalidatesTags: ['Redemption', 'Customer'],
    }),

    cancelRedemption: builder.mutation<Redemption, { redemptionId: string; reason?: string }>({
      query: ({ redemptionId, reason }) => ({ url: `/redemptions/${redemptionId}/cancel`, method: 'POST', body: { reason } }),
      invalidatesTags: ['Redemption'],
    }),
  }),
});

export type BpclApiError = { status: number; data: ApiErrorShape };

export const {
  useSearchCustomerMutation,
  useSendOtpMutation,
  useVerifyOtpMutation,
  useCreateCustomerMutation,
  useAddTransactionMutation,
  useInitiateRedemptionMutation,
  useGetRedemptionQuery,
  useSendRedemptionOtpMutation,
  useVerifyRedemptionOtpMutation,
  useProcessRedemptionWhatsAppMutation,
  useProcessRedemptionReaderMutation,
  useCancelRedemptionMutation,
} = bpclApi;
