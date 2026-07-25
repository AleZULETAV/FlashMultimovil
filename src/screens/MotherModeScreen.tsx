import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';

/**
 * UI del móvil madre: cuenta atrás, disparo, gestión de la sesión de peers.
 * Lógica real por implementar (ver roadmap, sección 8 del documento de proyecto).
 */
export default function MotherModeScreen(): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Modo: móvil madre</Text>
      <Text>TODO: iniciar sesión, enviar TriggerMessage, disparar cámara.</Text>
      <Button title="Disparar (placeholder)" onPress={() => {}} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  title: { fontSize: 20, fontWeight: 'bold' },
});
