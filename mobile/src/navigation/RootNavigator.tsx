import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '../theme/tokens';
import type { RootStackParamList } from './types';

import { SplashScreen } from '../screens/SplashScreen';
import { VehicleSearchScreen } from '../screens/VehicleSearchScreen';
import { ExistingCustomerScreen } from '../screens/ExistingCustomerScreen';
import { NewCustomerScreen } from '../screens/NewCustomerScreen';
import { OtpVerificationScreen } from '../screens/OtpVerificationScreen';
import { TransactionSuccessScreen } from '../screens/TransactionSuccessScreen';
import { RedemptionScreen } from '../screens/RedemptionScreen';
import { RedemptionOtpScreen } from '../screens/RedemptionOtpScreen';
import { WhatsAppVerificationScreen } from '../screens/WhatsAppVerificationScreen';
import { ReaderStatusScreen } from '../screens/ReaderStatusScreen';
import { RedemptionResultScreen } from '../screens/RedemptionResultScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{
          headerStyle: { backgroundColor: colors.bpclBlue },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: { fontWeight: '700' },
        }}
      >
        <Stack.Screen name="Splash" component={SplashScreen} options={{ headerShown: false }} />
        <Stack.Screen name="VehicleSearch" component={VehicleSearchScreen} options={{ title: 'BPCL Cashback', headerBackVisible: false }} />
        <Stack.Screen name="ExistingCustomer" component={ExistingCustomerScreen} options={{ title: 'Existing Customer' }} />
        <Stack.Screen name="NewCustomer" component={NewCustomerScreen} options={{ title: 'New Customer' }} />
        <Stack.Screen name="OtpVerification" component={OtpVerificationScreen} options={{ title: 'Verify OTP' }} />
        <Stack.Screen
          name="TransactionSuccess"
          component={TransactionSuccessScreen}
          options={{ title: 'Success', headerBackVisible: false, gestureEnabled: false }}
        />
        <Stack.Screen name="Redemption" component={RedemptionScreen} options={{ title: 'Redeem' }} />
        <Stack.Screen name="RedemptionOtp" component={RedemptionOtpScreen} options={{ title: 'Redemption OTP', headerBackVisible: false }} />
        <Stack.Screen
          name="WhatsAppVerification"
          component={WhatsAppVerificationScreen}
          options={{ title: 'WhatsApp', headerBackVisible: false, gestureEnabled: false }}
        />
        <Stack.Screen
          name="ReaderStatus"
          component={ReaderStatusScreen}
          options={{ title: 'Reader', headerBackVisible: false, gestureEnabled: false }}
        />
        <Stack.Screen
          name="RedemptionResult"
          component={RedemptionResultScreen}
          options={{ title: 'Redemption', headerBackVisible: false, gestureEnabled: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
