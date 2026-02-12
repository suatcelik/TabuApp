import 'react-native-gesture-handler'; // Mutlaka en üstte olmalı
import "./global.css"
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// Ekranları içe aktarıyoruz
import HomeScreen from './src/screens/HomeScreen';
import GameScreen from './src/screens/GameScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import ResultScreen from './src/screens/ResultScreen';

const Stack = createStackNavigator();

export default function App() {
  return (
    /* NavigationContainer: Tüm navigasyon yapısını sarmalar ve 
      "Couldn't find a navigation context" hatasını çözer.
    */
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerShown: false, // Temiz bir oyun görünümü için üst barı kapatıyoruz
          gestureEnabled: false // Oyun sırasında yanlışlıkla geri kaydırmayı engeller
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Game" component={GameScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="Result" component={ResultScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}