import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { db } from '../lib/storage';

type Props = { children: React.ReactNode };
type State = { hasError: boolean; message: string };

export class AppErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message || 'Unbekannter Fehler' };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    db.saveSystemError({
      id: `ui-${Date.now()}`,
      timestamp: new Date().toISOString(),
      description: `${error.message}\n${info.componentStack}`,
      fixed: false,
    }).catch(() => undefined);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <View style={{ flex: 1, justifyContent: 'center', padding: 28, backgroundColor: '#F8F7FC' }}>
        <Text style={{ fontSize: 26, fontWeight: '900', color: '#1A1625' }}>FamSti braucht kurz einen Neustart</Text>
        <Text style={{ marginTop: 12, color: '#6E6A85', fontSize: 16, lineHeight: 23 }}>
          Ein App-Fehler wurde protokolliert. Deine lokalen Daten bleiben erhalten.
        </Text>
        <Text style={{ marginTop: 16, color: '#8A849C', fontSize: 13 }}>{this.state.message}</Text>
        <TouchableOpacity
          onPress={() => this.setState({ hasError: false, message: '' })}
          style={{ marginTop: 24, height: 52, borderRadius: 16, backgroundColor: '#6C5CE7', alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 16 }}>App weiter nutzen</Text>
        </TouchableOpacity>
      </View>
    );
  }
}
