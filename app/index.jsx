import { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  PanResponder,
} from 'react-native';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

export default function Lista() {
  const db = useSQLiteContext();
  const router = useRouter();
  const [cuentos, setCuentos] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [favoritos, setFavoritos] = useState([]);
  const [verFavoritos, setVerFavoritos] = useState(false);
  const [draggingId, setDraggingId] = useState(null);
  const [dragOffsets, setDragOffsets] = useState({});
  const dragResponders = useRef({});

  const reordenarCuentos = useCallback(
    async (idOrigen, idDestino) => {
      if (!idOrigen || !idDestino || String(idOrigen) === String(idDestino)) {
        return;
      }

      const ordenActual = [...cuentos];
      const desde = ordenActual.findIndex((cuento) => String(cuento.id) === String(idOrigen));

      if (desde < 0) {
        return;
      }

      const [cuentoMovido] = ordenActual.splice(desde, 1);
      const hasta = ordenActual.findIndex((cuento) => String(cuento.id) === String(idDestino));

      if (hasta < 0) {
        ordenActual.push(cuentoMovido);
      } else {
        ordenActual.splice(hasta, 0, cuentoMovido);
      }

      setCuentos(ordenActual);

      try {
        for (let i = 0; i < ordenActual.length; i += 1) {
          await db.runAsync('UPDATE cuento SET orden = ? WHERE id = ?', [i + 1, ordenActual[i].id]);
        }
      } catch (error) {
        console.error('Error al guardar el orden de los cuentos:', error);
      }
    },
    [cuentos, db]
  );

  const moverEntreCuentos = useCallback(
    async (id, direccion) => {
      const ordenActual = [...cuentos];
      const indiceActual = ordenActual.findIndex((cuento) => String(cuento.id) === String(id));

      if (indiceActual < 0) {
        return;
      }

      const nuevoIndice = Math.min(
        Math.max(indiceActual + direccion, 0),
        ordenActual.length - 1
      );

      if (nuevoIndice === indiceActual) {
        return;
      }

      const [cuentoMovido] = ordenActual.splice(indiceActual, 1);
      ordenActual.splice(nuevoIndice, 0, cuentoMovido);
      setCuentos(ordenActual);

      try {
        for (let i = 0; i < ordenActual.length; i += 1) {
          await db.runAsync('UPDATE cuento SET orden = ? WHERE id = ?', [i + 1, ordenActual[i].id]);
        }
      } catch (error) {
        console.error('Error al guardar el orden de los cuentos:', error);
      }
    },
    [cuentos, db]
  );

  const crearRespuestaDrag = useCallback(
    (id) =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dx) > 1 || Math.abs(gestureState.dy) > 1,
        onMoveShouldSetPanResponderCapture: (_, gestureState) =>
          Math.abs(gestureState.dx) > 1 || Math.abs(gestureState.dy) > 1,
        onPanResponderGrant: () => {
          setDraggingId(id);
          setDragOffsets((prev) => ({ ...prev, [id]: 0 }));
        },
        onPanResponderMove: (_, gestureState) => {
          if (Math.abs(gestureState.dy) > 0) {
            setDragOffsets((prev) => ({ ...prev, [id]: gestureState.dy }));
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          const desplazamiento = gestureState.dy;

          if (Math.abs(desplazamiento) > 8) {
            moverEntreCuentos(id, desplazamiento > 0 ? 1 : -1);
          }

          setDraggingId(null);
          setDragOffsets((prev) => ({ ...prev, [id]: 0 }));
        },
        onPanResponderTerminationRequest: () => false,
      }),
    [moverEntreCuentos]
  );

  const cuentosFiltrados = cuentos.filter((cuento) => {
    const textoBusqueda = busqueda.trim().toLowerCase();
    const coincideBusqueda =
      !textoBusqueda ||
      String(cuento.titulo ?? '').toLowerCase().includes(textoBusqueda) ||
      String(cuento.cuerpo ?? '').toLowerCase().includes(textoBusqueda);

    const coincideFavorito = !verFavoritos || favoritos.includes(cuento.id);

    return coincideBusqueda && coincideFavorito;
  });

  const mostrarResultado = busqueda.trim()
    ? `Mostrando ${cuentosFiltrados.length} de ${cuentos.length} cuentos`
    : `Cuentos guardados: ${cuentos.length}`;

  const toggleFavorito = async (id) => {
    const esFavorito = favoritos.includes(id);

    setFavoritos((prev) =>
      esFavorito ? prev.filter((item) => item !== id) : [...prev, id]
    );

    try {
      if (esFavorito) {
        await db.runAsync('DELETE FROM favorito WHERE cuento_id = ?', [id]);
      } else {
        await db.runAsync('INSERT OR IGNORE INTO favorito (cuento_id) VALUES (?)', [id]);
      }
    } catch (error) {
      console.error('Error al guardar favorito:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      let activo = true;

      async function cargar() {
        const filas = await db.getAllAsync(
          'SELECT id, titulo, cuerpo, editado FROM cuento ORDER BY orden ASC, editado DESC'
        );
        const favoritosGuardados = await db.getAllAsync(
          'SELECT cuento_id FROM favorito ORDER BY cuento_id'
        );

        if (activo) {
          setCuentos(filas);
          setFavoritos(favoritosGuardados.map((item) => item.cuento_id));
        }
      }

      cargar();

      return () => {
        activo = false;
      };
    }, [db])
  );

  return (
    <View style={styles.contenedor}>
      <Stack.Screen
        options={{
          title: 'Cuentero',
          headerRight: () => (
            <Pressable onPress={() => router.push('/ajustes')}>
              <Text style={styles.headerButton}>Ajustes</Text>
            </Pressable>
          ),
        }}
      />

      <Text style={styles.contador}>{mostrarResultado}</Text>

      {draggingId ? (
        <Text style={styles.dragHint}>Mantén presionado un cuento y suéltalo sobre otro o al final.</Text>
      ) : null}

      <View style={styles.filtrosRow}>
        <Pressable
          style={[styles.filtroBoton, !verFavoritos && styles.filtroBotonActivo]}
          onPress={() => setVerFavoritos(false)}
        >
          <Text style={[styles.filtroTexto, !verFavoritos && styles.filtroTextoActivo]}>Todos</Text>
        </Pressable>
        <Pressable
          style={[styles.filtroBoton, verFavoritos && styles.filtroBotonActivo]}
          onPress={() => setVerFavoritos(true)}
        >
          <Text style={[styles.filtroTexto, verFavoritos && styles.filtroTextoActivo]}>Favoritos</Text>
        </Pressable>
      </View>

      <View style={styles.buscadorContainer}>
        <View style={styles.buscadorWrap}>
          <Text style={styles.iconoBusqueda}>⌕</Text>
          <TextInput
            style={styles.buscador}
            placeholder="Buscar cuento..."
            value={busqueda}
            onChangeText={setBusqueda}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {busqueda ? (
            <Pressable onPress={() => setBusqueda('')}>
              <Text style={styles.limpiar}>✕</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <FlatList
        data={cuentosFiltrados}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        ListEmptyComponent={
          <Text style={styles.vacio}>
            {busqueda ? 'No se encontraron cuentos con esa búsqueda.' : 'Todavía no hay cuentos. Toca + para escribir el primero.'}
          </Text>
        }
        renderItem={({ item }) => {
          const esFavorito = favoritos.includes(item.id);
          const panResponder = dragResponders.current[item.id] ?? (dragResponders.current[item.id] = crearRespuestaDrag(item.id));

          return (
            <View
              {...panResponder.panHandlers}
              style={[
                styles.tarjeta,
                draggingId === item.id && styles.tarjetaArrastrando,
                draggingId === item.id && {
                  transform: [{ translateY: dragOffsets[item.id] || 0 }, { scale: 1.02 }],
                  elevation: 8,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.18,
                  shadowRadius: 8,
                  zIndex: 10,
                },
              ]}
            >
              <View style={styles.tarjetaHeader}>
                <Pressable onPress={() => router.push(`/cuento/${item.id}`)}>
                  <Text style={styles.tarjetaTitulo}>{item.titulo}</Text>
                </Pressable>
                <Pressable
                  onPress={(event) => {
                    event.stopPropagation();
                    toggleFavorito(item.id);
                  }}
                  hitSlop={10}
                  style={styles.starButton}
                >
                  <Text style={esFavorito ? styles.starActive : styles.starInactive}>★</Text>
                </Pressable>
              </View>
              <Text style={styles.tarjetaVistaPrevia} numberOfLines={2}>
                {item.cuerpo}
              </Text>
              <Text style={styles.tarjetaFecha}>
                {new Date(item.editado).toLocaleDateString('es-PE')}
              </Text>
            </View>
          );
        }}
      />

      <Pressable style={styles.boton} onPress={() => router.push('/cuento/nuevo')}>
        <Text style={styles.botonTexto}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: '#f7f5f0',
  },
  contador: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1b4332',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  dragHint: {
    color: '#4d6a5b',
    fontSize: 12,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  filtrosRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  filtroBoton: {
    backgroundColor: '#fff',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d9d1c4',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filtroBotonActivo: {
    backgroundColor: '#1b4332',
    borderColor: '#1b4332',
  },
  filtroTexto: {
    color: '#1b4332',
    fontSize: 13,
    fontWeight: '600',
  },
  filtroTextoActivo: {
    color: '#fff',
  },
  busqueda: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#e8e2d5',
    fontSize: 15,
  },
  buscadorContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  buscadorWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d9d1c4',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  iconoBusqueda: {
    fontSize: 18,
    color: '#7a8b7f',
    marginRight: 8,
  },
  buscador: {
    flex: 1,
    fontSize: 15,
    color: '#1b4332',
    paddingVertical: 8,
  },
  limpiar: {
    fontSize: 16,
    color: '#7a8b7f',
    marginLeft: 8,
    paddingHorizontal: 4,
  },
  headerButton: {
    color: '#fff',
    fontSize: 16,
  },
  tarjeta: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e8e2d5',
  },
  tarjetaArrastrando: {
    borderColor: '#1b4332',
    borderWidth: 1.5,
    opacity: 1,
    backgroundColor: '#f6faf7',
  },
  tarjetaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  tarjetaTitulo: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1b4332',
    flex: 1,
  },
  starButton: {
    paddingLeft: 8,
  },
  starActive: {
    fontSize: 20,
    color: '#f4b400',
  },
  starInactive: {
    fontSize: 20,
    color: '#c9c2b7',
  },
  tarjetaVistaPrevia: {
    fontSize: 14,
    color: '#555',
    marginTop: 6,
  },
  tarjetaFecha: {
    fontSize: 12,
    color: '#7a8b7f',
    marginTop: 4,
  },
  vacio: {
    textAlign: 'center',
    color: '#7a8b7f',
    marginTop: 40,
  },
  botonFinal: {
    alignSelf: 'center',
    backgroundColor: '#1b4332',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 12,
  },
  botonFinalTexto: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  boton: {
    position: 'absolute',
    right: 20,
    bottom: 28,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1b4332',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  botonTexto: {
    color: '#fff',
    fontSize: 28,
    lineHeight: 30,
  },
});