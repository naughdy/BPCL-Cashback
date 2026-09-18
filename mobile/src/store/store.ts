import { configureStore } from '@reduxjs/toolkit';
import { bpclApi } from '../api/bpclApi';
import flowReducer from './flowSlice';

export const store = configureStore({
  reducer: {
    [bpclApi.reducerPath]: bpclApi.reducer,
    flow: flowReducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(bpclApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
