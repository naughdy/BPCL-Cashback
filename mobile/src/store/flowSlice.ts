import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Customer } from '../types';

interface FlowState {
  vehicleNumber: string | null;
  customer: Customer | null;
  activeRedemptionId: string | null;
}

const initialState: FlowState = {
  vehicleNumber: null,
  customer: null,
  activeRedemptionId: null,
};

const flowSlice = createSlice({
  name: 'flow',
  initialState,
  reducers: {
    setVehicleNumber(state, action: PayloadAction<string>) {
      state.vehicleNumber = action.payload;
    },
    setCustomer(state, action: PayloadAction<Customer | null>) {
      state.customer = action.payload;
    },
    setActiveRedemptionId(state, action: PayloadAction<string | null>) {
      state.activeRedemptionId = action.payload;
    },
    resetFlow() {
      return initialState;
    },
  },
});

export const { setVehicleNumber, setCustomer, setActiveRedemptionId, resetFlow } = flowSlice.actions;
export default flowSlice.reducer;
