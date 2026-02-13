import React from 'react';
import { View, Text, TouchableOpacity, StatusBar, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function HomeScreen({ navigation }) {
    return (
        <SafeAreaView className="flex-1 bg-white" >
            <StatusBar barStyle="dark-content" />

            {/* Üst Kısım: Logo veya İkon */}
            <View className="flex-1 justify-center items-center px-10">
                <View className="bg-indigo-100 p-8 rounded-[50px] mb-8 shadow-xl shadow-indigo-200">
                    <Ionicons name="chatbubbles" size={100} color="#4f46e5" />
                </View>

                <Text className="text-5xl font-black text-slate-800 tracking-tighter text-center">
                    TABU<Text className="text-indigo-600">APP</Text>
                </Text>
                <Text className="text-slate-400 font-medium text-lg mt-2 text-center">
                    Arkadaşlarınla eğlenceye hazır mısın?
                </Text>
            </View>

            {/* Alt Kısım: Menü Butonları */}
            <View className="px-8 pb-12 space-y-4">

                {/* Oyuna Başla Butonu */}
                <TouchableOpacity
                    className="bg-indigo-600 py-6 rounded-3xl shadow-2xl shadow-indigo-300 flex-row justify-center items-center active:scale-95"
                    onPress={() => navigation.navigate('Game')}
                >
                    <Ionicons name="play" size={24} color="white" className="mr-2" />
                    <Text className="text-white text-2xl font-black uppercase italic tracking-widest ml-2">
                        BAŞLA!
                    </Text>
                </TouchableOpacity>

                {/* Ayarlar Butonu */}
                <TouchableOpacity
                    className="bg-slate-100 py-5 rounded-3xl flex-row justify-center items-center active:bg-slate-200"
                    onPress={() => navigation.navigate('Settings')}
                >
                    <Ionicons name="settings-sharp" size={20} color="#64748b" className="mr-2" />
                    <Text className="text-slate-500 text-lg font-bold uppercase tracking-widest ml-2">
                        AYARLAR
                    </Text>
                </TouchableOpacity>

                {/* Küçük Bilgi Notu */}
                <Text className="text-center text-slate-300 text-xs mt-4 font-bold uppercase tracking-tighter">
                    v1.0.0 - Fun Edition
                </Text>
            </View>
        </SafeAreaView>
    );
}