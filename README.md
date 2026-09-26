# Cuentero

Aplicación móvil con Expo para escribir, guardar, buscar, organizar y exportar cuentos en formato Markdown.

## Características

- Crear, editar y eliminar cuentos
- Búsqueda por título y contenido
- Marcado de favoritos
- Filtro de vista: todos o favoritos
- Orden de cuentos por arrastre
- Exportación de todos los cuentos a `cuentos.md`
- Persistencia con SQLite

## Tecnologías

- Expo SDK 57
- React Native
- Expo Router
- expo-sqlite
- FileSystem + Sharing para exportación

## Requisitos

- Node.js 20 o superior
- npm
- Expo Go en Android/iOS

## Instalación

1. Clona el proyecto
2. Entra a la carpeta
3. Instala dependencias:

```bash
npm install
```

4. Inicia la app:

```bash
npx expo start
```

5. Escanea el QR con Expo Go en tu dispositivo.

## Exportar cuentos

Desde la pantalla de Ajustes, pulsa:

- Exportar todos mis cuentos

La app genera un archivo `cuentos.md` y lo comparte desde la plataforma del sistema.

## Ejecución local

```bash
npm start
```

## Evidencias recomendadas

Se recomienda tomar estas capturas antes de entregar:

1. Pantalla principal con la lista de cuentos
2. Cuento en modo edición
3. Pantalla de ajustes con exportación
4. Resultado del archivo `cuentos.md`

## Subir a GitHub

```bash
git status
git add .
git commit -m "Entrega final cuentero"
git push origin main
```

## Enlace de entrega

Una vez subido, el repositorio queda disponible en:

```text
https://github.com/PaulLachi12/cuentero
```

Si tu usuario cambia o el repositorio no es público, comparte la URL exacta del remoto con tu evaluador.

