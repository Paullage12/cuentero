import { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  Pressable,
  Text,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

function contarPalabras(texto) {
  return texto.trim() ? texto.trim().split(/\s+/).length : 0;
}

function contarCaracteres(texto) {
  return texto.length;
}

function calcularTiempoLectura(texto) {
  const palabras = contarPalabras(texto);
  if (palabras === 0) return '0 min';
  const minutos = Math.max(1, Math.ceil(palabras / 200));
  return `${minutos} min`;
}

export default function Editor() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const routeId = Array.isArray(id) ? id[0] : id ?? 'nuevo';
  const esNuevo = routeId === 'nuevo';
  const [titulo, setTitulo] = useState('');
  const [cuerpo, setCuerpo] = useState('');
  const [modificado, setModificado] = useState(false);
  const [cantidadPalabras, setCantidadPalabras] = useState(0);
  const [cantidadCaracteres, setCantidadCaracteres] = useState(0);
  const [tiempoLectura, setTiempoLectura] = useState('0 min');

  useEffect(() => {
    if (esNuevo) {
      setTitulo('');
      setCuerpo('');
      setModificado(false);
      setCantidadPalabras(0);
      setCantidadCaracteres(0);
      setTiempoLectura('0 min');
      return;
    }

    async function cargar() {
      const fila = await db.getFirstAsync(
        'SELECT titulo, cuerpo FROM cuento WHERE id = ?',
        [Number(routeId)]
      );
      if (fila) {
        setTitulo(fila.titulo);
        setCuerpo(fila.cuerpo);
        setModificado(false);
        setCantidadPalabras(contarPalabras(fila.cuerpo));
        setCantidadCaracteres(contarCaracteres(fila.cuerpo));
        setTiempoLectura(calcularTiempoLectura(fila.cuerpo));
      }
    }
    cargar();
  }, [routeId, esNuevo, db]);

  function manejarCambioCuerpo(texto) {
    setCuerpo(texto);
    setModificado(true);
    setCantidadPalabras(contarPalabras(texto));
    setCantidadCaracteres(contarCaracteres(texto));
    setTiempoLectura(calcularTiempoLectura(texto));
  }

  function manejarCambioTitulo(texto) {
    setTitulo(texto);
    setModificado(true);
  }

  function salir() {
    if (modificado) {
      Alert.alert(
        '¿Salir sin guardar?',
        'Se perderán los cambios que hiciste.',
        [
          {
            text: 'Cancelar',
            style: 'cancel',
          },
          {
            text: 'Salir',
            style: 'destructive',
            onPress: () => router.back(),
          },
        ]
      );
    } else {
      router.back();
    }
  }

  async function guardar() {
    const limpio = titulo.trim();
    if (!limpio) {
      Alert.alert('Falta el título', 'Todo cuento necesita un nombre.');
      return;
    }
    const ahora = new Date().toISOString();
    if (esNuevo) {
      const ultimo = await db.getFirstAsync('SELECT COALESCE(MAX(orden), 0) AS maximo FROM cuento');
      const siguienteOrden = Number(ultimo?.maximo ?? 0) + 1;

      await db.runAsync(
        'INSERT INTO cuento (titulo, cuerpo, creado, editado, orden) VALUES (?, ?, ?, ?, ?)',
        [limpio, cuerpo, ahora, ahora, siguienteOrden]
      );
    } else {
      await db.runAsync(
        'UPDATE cuento SET titulo = ?, cuerpo = ?, editado = ? WHERE id = ?',
        [limpio, cuerpo, ahora, Number(routeId)]
      );
    }
    setModificado(false);
    router.back();
  }

  function confirmarBorrado() {
    Alert.alert('Borrar cuento', 'Esta acción no se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: async () => {
          await db.runAsync('DELETE FROM cuento WHERE id = ?', [Number(routeId)]);
          router.back();
        },
      },
    ]);
  }

  return (
    <KeyboardAvoidingView
      key={routeId}
      style={styles.contenedor}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen
        options={{
          title: esNuevo ? 'Nuevo cuento' : 'Editar cuento',
          headerLeft: () => (
            <Pressable onPress={salir}>
              <Text style={{ color: '#fff', fontSize: 16, marginLeft: 12 }}>Salir</Text>
            </Pressable>
          ),
          headerRight: () => (
            <Pressable onPress={guardar}>
              <Text style={{ color: '#fff', fontSize: 16, marginRight: 12 }}>Guardar</Text>
            </Pressable>
          ),
        }}
      />
      <TextInput
        style={styles.titulo}
        placeholder="Título del cuento"
        value={titulo}
        onChangeText={manejarCambioTitulo}
      />
      <TextInput
        style={styles.cuerpo}
        placeholder="Había una vez, en la quebrada..."
        value={cuerpo}
        onChangeText={manejarCambioCuerpo}
        multiline
        textAlignVertical="top"
      />
      <View style={styles.estadisticas}>
        <Text style={styles.contadorPalabras}>Palabras: {cantidadPalabras}</Text>
        <Text style={styles.contadorPalabras}>Caracteres: {cantidadCaracteres}</Text>
        <Text style={styles.contadorPalabras}>Lectura: {tiempoLectura}</Text>
      </View>

      <Pressable style={styles.guardar} onPress={guardar}>
        <Text style={styles.guardarTexto}>Guardar</Text>
      </Pressable>
      {!esNuevo && (
        <Pressable style={styles.botonBorrar} onPress={confirmarBorrado}>
          <Text style={styles.borrar}>Borrar cuento</Text>
        </Pressable>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: '#f7f5f0', padding: 16, gap: 12 },
  titulo: {
    fontSize: 18,
    fontWeight: '600',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e8e2d5',
  },
  cuerpo: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e8e2d5',
  },
  guardar: {
    backgroundColor: '#1b4332',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  estadisticas: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    alignItems: 'center',
  },
  contadorPalabras: {
    color: '#7a8b7f',
    fontSize: 13,
  },
  guardarTexto: { color: '#fff', fontWeight: '600' },
  botonBorrar: {
    borderWidth: 1,
    borderColor: '#d97777',
    backgroundColor: '#fff5f5',
    borderRadius: 10,
    paddingVertical: 12,
  },
  borrar: {
    textAlign: 'center',
    color: '#a4161a',
    fontWeight: '600',
  },
});