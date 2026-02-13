import 'react-native-gesture-handler'; // Mutlaka en üstte
import "./global.css"
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context'; // Ekledik

// Ekranların import yolları
import HomeScreen from './src/screens/HomeScreen';
import GameScreen from './src/screens/GameScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import ResultScreen from './src/screens/ResultScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    // 1. SafeAreaProvider: Ekranların saat/çentik payını doğru hesaplaması için şart.
    <SafeAreaView className="flex-1">
      <NavigationContainer>
        {/* 2. StatusBar: Saatin ve ikonların uygulama üstünde şık durmasını sağlar */}
        <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right' // Daha modern bir geçiş animasyonu
          }}
        >
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Game" component={GameScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="Result" component={ResultScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaView>
  );
}