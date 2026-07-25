import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

/**
 * UI del móvil remoto: se conecta a la sesión y espera TriggerMessage
 * para encender la linterna o disparar el flash. Ver sección 6 del documento de proyecto.
 */
export default function RemoteModeScreen(): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Modo: móvil remoto</Text>
      <Text>TODO: unirse a la sesión y escuchar mensajes de disparo.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  title: { fontSize: 20, fontWeight: 'bold' },
});
