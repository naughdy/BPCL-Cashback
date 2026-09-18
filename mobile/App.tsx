/**
 * BPCL Fuel Cashback — Operator Mobile App
 */
import React from 'react';
import { Provider } from 'react-redux';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { store } from './src/store/store';
import { RootNavigator } from './src/navigation/RootNavigator';
import { colors } from './src/theme/tokens';

export default function App() {
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor={colors.bpclBlue} />
        <RootNavigator />
      </SafeAreaProvider>
    </Provider>
  );
}
