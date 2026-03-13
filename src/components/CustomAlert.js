// src/components/CustomAlert.js
import React from 'react';
import { Modal, View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function CustomAlert({ visible, title, message, buttons, onClose }) {
    if (!visible) return null;

    // Başlığa göre otomatik renk ve ikon belirleme (Tasarımına uyumlu renkler)
    let headerColor = "bg-fuchsia-700";
    let iconName = "information-circle";

    const titleLower = title?.toLowerCase() || "";
    if (titleLower.includes("hata")) {
        headerColor = "bg-rose-500";
        iconName = "alert-circle";
    } else if (titleLower.includes("başarılı")) {
        headerColor = "bg-emerald-500";
        iconName = "checkmark-circle";
    } else if (titleLower.includes("çık") || titleLower.includes("kilitli")) {
        headerColor = "bg-amber-500";
        iconName = "warning";
    } else if (titleLower.includes("⭐")) {
        headerColor = "bg-amber-400";
        iconName = "star";
    }

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View className="flex-1 items-center justify-center bg-black/60 px-6">
                <View className="bg-white w-full rounded-[40px] overflow-hidden shadow-2xl">

                    {/* Üst İkon ve Başlık Alanı */}
                    <View className="pt-8 pb-4 items-center px-6">
                        <View className={`${headerColor} p-4 rounded-full mb-3 shadow-lg`}>
                            <Ionicons name={iconName} size={40} color="white" />
                        </View>
                        <Text className="text-slate-800 text-2xl font-black text-center uppercase tracking-tight">
                            {title}
                        </Text>
                    </View>

                    {/* Mesaj */}
                    <View className="px-6 pb-8">
                        <Text className="text-slate-500 text-base font-bold text-center mb-8 leading-6">
                            {message}
                        </Text>

                        {/* Butonlar */}
                        <View className="flex-row gap-3">
                            {buttons?.map((btn, index) => {
                                const isCancel = btn.style === 'cancel';
                                const isDestructive = btn.style === 'destructive';

                                // Senin tasarımına uygun buton stilleri
                                let btnBg = "bg-slate-100";
                                let btnText = "text-slate-700";

                                if (isDestructive) {
                                    btnBg = "bg-rose-500";
                                    btnText = "text-white";
                                } else if (!isCancel && index === buttons.length - 1) {
                                    btnBg = headerColor; // Ana buton temanın rengini alır
                                    btnText = "text-white";
                                }

                                return (
                                    <TouchableOpacity
                                        key={index}
                                        className={`flex-1 py-4 rounded-2xl items-center justify-center active:scale-95 ${btnBg}`}
                                        onPress={() => {
                                            if (btn.onPress) btn.onPress();
                                            onClose();
                                        }}
                                    >
                                        <Text className={`${btnText} font-black text-base uppercase tracking-wider`}>
                                            {btn.text || "Tamam"}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}

                            {/* Eğer hiç buton gönderilmediyse varsayılan Tamam butonu */}
                            {(!buttons || buttons.length === 0) && (
                                <TouchableOpacity
                                    className={`w-full py-4 rounded-2xl items-center justify-center active:scale-95 ${headerColor}`}
                                    onPress={onClose}
                                >
                                    <Text className="text-white font-black text-base uppercase tracking-wider">
                                        Tamam
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </View>
            </View>
        </Modal>
    );
}