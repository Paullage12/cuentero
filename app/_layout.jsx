import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { Suspense } from 'react';
import { ActivityIndicator, View } from 'react-native';

async function iniciarBD(db) {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS cuento (
      id      INTEGER PRIMARY KEY AUTOINCREMENT,
      titulo  TEXT NOT NULL,
      cuerpo  TEXT NOT NULL DEFAULT '',
      creado  TEXT NOT NULL,
      editado TEXT NOT NULL,
      orden   INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS favorito (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      cuento_id INTEGER NOT NULL UNIQUE,
      FOREIGN KEY (cuento_id) REFERENCES cuento(id) ON DELETE CASCADE
    );
  `);

  const columnas = await db.getAllAsync('PRAGMA table_info(cuento)');
  const tieneOrden = columnas.some((columna) => columna.name === 'orden');

  if (!tieneOrden) {
    await db.execAsync('ALTER TABLE cuento ADD COLUMN orden INTEGER NOT NULL DEFAULT 0');
  }

  const filas = await db.getAllAsync('SELECT id FROM cuento ORDER BY id ASC');
  for (let i = 0; i < filas.length; i += 1) {
    await db.runAsync('UPDATE cuento SET orden = ? WHERE id = ?', [i + 1, filas[i].id]);
  }
}

export default function Layout() {
  return (
    <Suspense
      fallback={
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <ActivityIndicator size="large" />
        </View>
      }
    >
      <SQLiteProvider databaseName="cuentero.db" onInit={iniciarBD} useSuspense>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: '#1b4332' },
            headerTintColor: '#fff',
          }}
        />
      </SQLiteProvider>
    </Suspense>
  );
}