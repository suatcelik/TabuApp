import React from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, Switch, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useGameStore from '../store/useGameStore';

export default function SettingsScreen({ navigation }) {
    // Zustand store'dan ayarları ve güncelleme fonksiyonunu alıyoruz
    const { settings, setSettings } = useGameStore();

    // Hata önleyici yardımcı fonksiyon: Gelen değerin boolean olduğundan emin olur
    const handleVibrationToggle = (value) => {
        setSettings({ vibration: Boolean(value) });
    };

    const handleDurationChange = (time) => {
        setSettings({ duration: Number(time) });
    };

    return (
        <SafeAreaView className="flex-1 bg-slate-50">
            <StatusBar barStyle="dark-content" />

            {/* Üst Bar */}
            <View className="flex-row items-center px-6 py-4 bg-white border-b border-slate-100">
                <TouchableOpacity onPress={() => navigation.goBack()} className="p-2">
                    <Ionicons name="arrow-back" size={28} color="#4f46e5" />
                </TouchableOpacity>
                <Text className="ml-4 text-2xl font-black text-slate-800 uppercase tracking-tighter">
                    Oyun Ayarları
                </Text>
            </View>

            <View className="p-6 space-y-10">

                {/* Tur Süresi Seçimi */}
                <View>
                    <Text className="text-slate-400 font-bold mb-4 uppercase tracking-widest text-xs">
                        Tur Süresi (Saniye)
                    </Text>
                    <View className="flex-row justify-between">
                        {[45, 60, 90].map((time) => (
                            <TouchableOpacity
                                key={time}
                                onPress={() => handleDurationChange(time)}
                                className={`px-10 py-5 rounded-3xl ${settings.duration === time ? 'bg-indigo-600 shadow-lg' : 'bg-white border border-slate-200'}`}
                            >
                                <Text className={`font-black text-lg ${settings.duration === time ? 'text-white' : 'text-slate-600'}`}>
                                    {time}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Pas Hakkı Seçimi */}
                <View>
                    <Text className="text-slate-400 font-bold mb-4 uppercase tracking-widest text-xs">
                        Pas Hakkı
                    </Text>
                    <View className="flex-row justify-between">
                        {[3, 5, 10].map((pass) => (
                            <TouchableOpacity
                                key={pass}
                                onPress={() => setSettings({ maxPass: Number(pass) })}
                                className={`px-10 py-5 rounded-3xl ${settings.maxPass === pass ? 'bg-amber-500 shadow-lg' : 'bg-white border border-slate-200'}`}
                            >
                                <Text className={`font-black text-lg ${settings.maxPass === pass ? 'text-white' : 'text-slate-600'}`}>
                                    {pass}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Titreşim Kontrolü (Hatanın Kaynağı Burası Olabilir) */}
                <View className="flex-row justify-between items-center bg-white p-6 rounded-[35px] border border-slate-100 shadow-sm">
                    <View className="flex-row items-center">
                        <View className="bg-indigo-100 p-3 rounded-2xl mr-4">
                            <Ionicons name="vibrate" size={24} color="#4f46e5" />
                        </View>
                        <Text className="text-slate-700 font-bold text-lg text-center">Titreşim Geri Bildirimi</Text>
                    </View>
                    <Switch
                        value={Boolean(settings.vibration)} // Değeri zorla Boolean yapıyoruz
                        onValueChange={handleVibrationToggle}
                        trackColor={{ false: "#cbd5e1", true: "#818cf8" }}
                        thumbColor={settings.vibration ? "#4f46e5" : "#f4f3f4"}
                    />
                </View>

            </View>

            {/* Kaydet Butonu */}
            <View className="mt-auto p-6">
                <TouchableOpacity
                    className="bg-indigo-600 py-6 rounded-3xl shadow-xl active:bg-indigo-700"
                    onPress={() => navigation.goBack()}
                >
                    <Text className="text-white text-center font-black text-xl uppercase tracking-widest">
                        Değişiklikleri Uygula
                    </Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}