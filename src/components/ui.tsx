// Native UI Components for FamSti iOS - fused premium/native design system
import React from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  TextInput,
  ActivityIndicator,
  Modal as RNModal,
  Pressable,
  StyleSheet,
  Platform,
  ScrollView,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { X } from 'lucide-react-native';
import { useAppTheme } from '../hooks/useAppTheme';

export const COLORS = {
  primary: '#007AFF',
  primaryLight: '#5856D6',
  accent: '#34C759',
  success: '#10B981',
  danger: '#FF3B30',
  warning: '#FF9500',
  violet: '#6C5CE7',
  background: {
    light: '#F2F2F7',
    dark: '#000000',
  },
  card: {
    light: '#FFFFFF',
    dark: '#1C1C1E',
  },
  text: {
    main: '#000000',
    mainDark: '#FFFFFF',
    sub: '#8E8E93',
    subDark: '#8E8E93',
  },
  border: {
    light: 'rgba(0, 0, 0, 0.06)',
    dark: 'rgba(255, 255, 255, 0.12)',
  },
};

type ButtonVariant = 'default' | 'outline' | 'ghost' | 'destructive' | 'secondary' | 'glass';
type ButtonSize = 'sm' | 'default' | 'lg' | 'icon';

interface ButtonProps {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  onPress?: () => void;
  disabled?: boolean;
  className?: string;
  style?: ViewStyle;
}

export const Button: React.FC<ButtonProps> = ({ children, variant = 'default', size = 'default', onPress, disabled, style }) => {
  const { isDark } = useAppTheme();

  const handlePress = () => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  };

  const sizeStyles = {
    sm: { paddingHorizontal: 14, paddingVertical: 8, minHeight: 36 },
    default: { paddingHorizontal: 20, paddingVertical: 12, minHeight: 48 },
    lg: { paddingHorizontal: 32, paddingVertical: 16, minHeight: 56 },
    icon: { width: 44, height: 44, paddingHorizontal: 0, paddingVertical: 0 },
  };

  const variantStyle = (): ViewStyle => {
    switch (variant) {
      case 'outline':
        return { backgroundColor: 'transparent', borderWidth: 1, borderColor: isDark ? COLORS.border.dark : COLORS.border.light };
      case 'ghost':
        return { backgroundColor: 'transparent' };
      case 'destructive':
        return { backgroundColor: COLORS.danger };
      case 'secondary':
        return { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F0EEF6' };
      case 'glass':
        return { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.76)' };
      default:
        return { backgroundColor: COLORS.primary };
    }
  };

  const textColor = () => {
    switch (variant) {
      case 'outline':
      case 'ghost':
      case 'glass':
        return variant === 'ghost' ? COLORS.primary : isDark ? COLORS.text.mainDark : COLORS.primary;
      case 'secondary':
        return isDark ? COLORS.text.mainDark : COLORS.text.main;
      default:
        return '#FFFFFF';
    }
  };

  return (
    <TouchableOpacity onPress={handlePress} disabled={disabled} activeOpacity={0.72} style={[{ borderRadius: 12, opacity: disabled ? 0.5 : 1 }, style]}>
      <View
        style={[
          {
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 8,
          },
          sizeStyles[size],
          variantStyle(),
        ]}
      >
        {typeof children === 'string' ? (
          <Text style={{ color: textColor(), fontWeight: '700', fontSize: size === 'sm' ? 14 : 17, letterSpacing: 0 }}>
            {children}
          </Text>
        ) : (
          children
        )}
      </View>
    </TouchableOpacity>
  );
};

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  className?: string;
  onPress?: () => void;
  variant?: 'default' | 'glass' | 'flat';
}

export const Card: React.FC<CardProps> = ({ children, style, onPress, variant = 'default' }) => {
  const { isDark } = useAppTheme();

  const cardContent = (
    <View
      style={[
        {
          borderRadius: 20,
          padding: 18,
          backgroundColor: variant === 'flat' ? 'transparent' : isDark ? COLORS.card.dark : COLORS.card.light,
          borderWidth: variant === 'flat' ? 0 : StyleSheet.hairlineWidth,
          borderColor: isDark ? COLORS.border.dark : COLORS.border.light,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0 : 0.04,
          shadowRadius: 8,
          elevation: 2,
        },
        style,
      ]}
    >
      {children}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.9} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }}>
        {cardContent}
      </TouchableOpacity>
    );
  }

  return cardContent;
};

interface InputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  secureTextEntry?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  style?: TextStyle;
  editable?: boolean;
  autoFocus?: boolean;
}

export const Input: React.FC<InputProps> = ({ value, onChangeText, placeholder, keyboardType, secureTextEntry, multiline, numberOfLines, style, editable = true, autoFocus }) => {
  const { isDark } = useAppTheme();

  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={isDark ? COLORS.text.subDark : COLORS.text.sub}
      keyboardType={keyboardType}
      secureTextEntry={secureTextEntry}
      multiline={multiline}
      numberOfLines={numberOfLines}
      editable={editable}
      autoFocus={autoFocus}
      style={[
        {
          borderRadius: 12,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: isDark ? COLORS.border.dark : 'rgba(0,0,0,0.1)',
          backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFFFFF',
          paddingHorizontal: 16,
          paddingVertical: 14,
          fontSize: 16,
          color: isDark ? COLORS.text.mainDark : COLORS.text.main,
          fontWeight: '500',
          minHeight: multiline ? 100 : 50,
          textAlignVertical: multiline ? 'top' : 'center',
          letterSpacing: 0,
        },
        style,
      ]}
    />
  );
};

type BadgeVariant = 'default' | 'secondary' | 'outline' | 'destructive' | 'success' | 'warning' | 'glass';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'default', style }) => {
  const { isDark } = useAppTheme();
  const variantStyles: Record<BadgeVariant, ViewStyle & { textColor: string }> = {
    default: { backgroundColor: COLORS.primary, textColor: '#FFFFFF' },
    secondary: { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#F0EEF6', textColor: isDark ? COLORS.text.mainDark : COLORS.text.main },
    outline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: isDark ? COLORS.border.dark : COLORS.border.light, textColor: isDark ? COLORS.text.mainDark : COLORS.text.main },
    destructive: { backgroundColor: COLORS.danger, textColor: '#FFFFFF' },
    success: { backgroundColor: COLORS.accent, textColor: '#FFFFFF' },
    warning: { backgroundColor: COLORS.warning, textColor: '#FFFFFF' },
    glass: { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.72)', textColor: isDark ? COLORS.text.mainDark : COLORS.primary },
  };

  const { textColor, ...viewStyle } = variantStyles[variant];
  const childArray = React.Children.toArray(children);
  const isPrimitiveContent = childArray.every((child) => typeof child === 'string' || typeof child === 'number');

  return (
    <View style={[{ borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' }, viewStyle, style]}>
      {isPrimitiveContent ? (
        <Text style={{ color: textColor, fontSize: 11, fontWeight: '800', letterSpacing: 0, textTransform: 'uppercase' }}>{childArray.join('')}</Text>
      ) : (
        children
      )}
    </View>
  );
};

interface SwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

export const Switch: React.FC<SwitchProps> = ({ value, onValueChange, disabled }) => {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={disabled}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onValueChange(!value);
      }}
      style={{
        width: 52,
        height: 32,
        borderRadius: 16,
        backgroundColor: value ? COLORS.primary : '#E0DEF0',
        justifyContent: 'center',
        paddingHorizontal: 2,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 14,
          backgroundColor: '#FFFFFF',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.2,
          shadowRadius: 4,
          elevation: 4,
          transform: [{ translateX: value ? 20 : 0 }],
        }}
      />
    </TouchableOpacity>
  );
};

export const ZoneBadge: React.FC<{ zone: string }> = ({ zone }) => {
  const colors: Record<string, string> = {
    Rosenheim: '#4F8AE6',
    Haidholzen: '#8B5CF6',
    Prutting: '#10B981',
    Kolbermoor: '#F59E0B',
    Raubling: '#EF4444',
    'Bad Aibling': '#EC4899',
  };
  const color = colors[zone] || '#6B7280';

  return (
    <View style={{ backgroundColor: `${color}20`, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: color }}>
      <Text style={{ color, fontSize: 10, fontWeight: '900', textTransform: 'uppercase' }}>{zone}</Text>
    </View>
  );
};

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ visible, onClose, title, children }) => {
  const { isDark } = useAppTheme();

  return (
    <RNModal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' }}>
        <Pressable style={{ flex: 1 }} onPress={onClose}>
          {Platform.OS === 'ios' && <BlurView intensity={20} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />}
        </Pressable>
        <View
          style={{
            backgroundColor: isDark ? COLORS.card.dark : COLORS.card.light,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingTop: 12,
            paddingHorizontal: 20,
            paddingBottom: 40,
            maxHeight: '90%',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.1,
            shadowRadius: 16,
            elevation: 10,
          }}
        >
          <View style={{ alignItems: 'center', marginBottom: 16 }}>
            <View style={{ width: 36, height: 5, borderRadius: 2.5, backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <Text style={{ fontSize: 20, fontWeight: '800', color: isDark ? COLORS.text.mainDark : COLORS.text.main, letterSpacing: 0 }}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F0EEF6', justifyContent: 'center', alignItems: 'center' }}>
              <X size={20} color={isDark ? COLORS.text.subDark : COLORS.text.sub} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>{children}</ScrollView>
        </View>
      </View>
    </RNModal>
  );
};

export const LoadingSpinner: React.FC<{ size?: 'small' | 'large' }> = ({ size = 'large' }) => {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 }}>
      <ActivityIndicator size={size} color={COLORS.primary} />
    </View>
  );
};
