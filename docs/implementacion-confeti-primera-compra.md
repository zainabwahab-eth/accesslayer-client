# Implementación del confeti para la primera compra

## Resumen

Se agregó una celebración de confeti que aparece únicamente después de la
primera compra exitosa de una llave. También se corrigieron los proveedores y
el contexto del router necesarios para ejecutar la aplicación, y se creó un
creador de prueba que permite verificar el flujo sin depender de un backend
local.

La demostración está disponible en:

```text
/creator/1
```

## Dependencias agregadas

Se instalaron las siguientes dependencias:

```json
"canvas-confetti": "^1.9.4"
"@types/canvas-confetti": "^1.9.0"
```

`canvas-confetti` genera la animación mediante canvas. El paquete de tipos
permite usarlo con TypeScript sin declaraciones manuales.

Los cambios correspondientes quedaron registrados en `package.json` y
`pnpm-lock.yaml`.

## Utilidad de celebración

Se creó `src/utils/firstPurchaseConfetti.ts`, que exporta:

```ts
playFirstPurchaseConfetti();
```

La función realiza el flujo siguiente:

1. Comprueba que se está ejecutando en el navegador.
2. Lee `localStorage.getItem('has_bought')`.
3. Si el valor ya es `"true"`, termina sin mostrar confeti.
4. Si es la primera compra, guarda `has_bought = "true"`.
5. Comprueba `prefers-reduced-motion`.
6. Crea un canvas temporal.
7. Ejecuta pequeños disparos de confeti mediante `requestAnimationFrame`.
8. Detiene la animación después de aproximadamente 2500 ms.
9. Cancela el frame y el timer, ejecuta `reset()` y elimina el canvas.

La función devuelve un callback de limpieza:

```ts
const cleanup = playFirstPurchaseConfetti();
```

Ese callback puede ejecutarse cuando el componente se desmonta y es seguro
llamarlo más de una vez.

### Características del canvas

El canvas generado:

- ocupa la pantalla completa con `position: fixed`;
- se muestra por encima del contenido;
- utiliza `pointer-events: none`, por lo que no bloquea botones o enlaces;
- incluye `data-first-purchase-confetti="true"` para poder localizarlo en
  pruebas;
- se elimina completamente al terminar o al desmontarse la vista.

### Accesibilidad

Cuando el navegador indica:

```css
prefers-reduced-motion: reduce;
```

la compra se registra normalmente en `localStorage`, pero la animación no se
ejecuta.

### Manejo de errores

Los errores de almacenamiento, creación del canvas o ejecución de
`canvas-confetti` se aíslan del flujo principal. Una compra confirmada sigue
considerándose exitosa aunque el efecto visual no pueda ejecutarse.

## Integración con la compra

La celebración se conectó después de la resolución exitosa de la mutación de
compra, nunca al presionar inicialmente el botón.

El orden implementado es:

```text
usuario inicia la compra
→ mutateAsync ejecuta la operación
→ la operación se resuelve correctamente
→ playFirstPurchaseConfetti comprueba has_bought
→ guarda has_bought = true si corresponde
→ muestra el confeti
→ presenta el mensaje de compra confirmada
```

Si `mutateAsync` rechaza la operación, la llamada al confeti no se alcanza y
`has_bought` no se modifica.

La integración está presente en:

- `src/pages/LandingPage.tsx`, para el flujo de compra del perfil destacado;
- `src/pages/CreatorDetailPage.tsx`, para la compra desde el perfil demo
  accesible directamente.

Ambas vistas conservan el callback de limpieza en un `ref` y lo ejecutan al
desmontarse.

## Creador de prueba

La portada ya mostraba creadores de demostración, pero al abrir uno la página
de detalle intentaba consultarlo exclusivamente en el backend. Si el backend
no tenía ese registro, se mostraba “Creator not found”.

Se agregó `DEMO_CREATOR` en `src/hooks/useCreators.ts` con los siguientes datos
principales:

```text
ID: 1
Nombre: Lena Markov
Handle: @lenamarkov
Categoría: Art
Precio: 12.4 XLM
Precio en stroops: 124000000
```

`useCreatorDetail('1')` intenta consultar el backend y, si esa consulta falla,
devuelve el creador demo. Otros identificadores continúan mostrando el error
normal cuando no existen.

En su página se añadió el botón:

```text
Buy 1 key
```

Este botón usa `useTradeMutation`, muestra el estado de confirmación y ejecuta
la celebración únicamente después de que la compra simulada termina con
éxito.

## Correcciones necesarias para ejecutar la aplicación

Durante la verificación se encontraron dos problemas previos que impedían
usar la interfaz.

### Contexto de React Router

`useRouteChangeLogging()` utilizaba `useLocation()` antes de montar
`RouterProvider`. React Router lanzaba una excepción y dejaba la raíz vacía.

Se creó `src/components/common/RouteChangeLogger.tsx` como layout de las rutas.
De esta forma, el hook se ejecuta dentro del contexto del router. Las rutas de
`src/routes.tsx` pasaron a ser hijas de este layout.

### Proveedores de React Query y Wagmi

La aplicación utilizaba hooks como `useQueryClient()` y `useAccount()` sin
montar el proveedor existente. Esto producía el error:

```text
No QueryClient set, use QueryClientProvider to set one
```

`src/main.tsx` ahora monta la aplicación así:

```tsx
<Web3Provider>
	<App />
</Web3Provider>
```

`Web3Provider` contiene `WagmiProvider` y `QueryClientProvider`, por lo que los
hooks de consultas, mutaciones y cartera reciben sus contextos correctamente.

## Pruebas agregadas

Se creó `src/utils/__tests__/firstPurchaseConfetti.test.ts` con cobertura para:

- primera compra: guarda `has_bought`, crea el canvas y lo elimina;
- compras posteriores: no crea una segunda animación;
- preferencia de movimiento reducido: registra la compra sin animar;
- desmontaje anticipado: elimina inmediatamente todos los recursos;
- error inesperado del canvas: no lanza errores y conserva la compra como
  exitosa.

También se verificaron TypeScript, ESLint, el build de producción y las pruebas
de proveedores y rutas.

## Cómo ejecutar el proyecto

Desde el directorio del cliente:

```bash
cd /home/efren/Escritorio/grantfox/accesslayer-client
npm exec --yes pnpm@10.6.5 -- dev
```

Vite mostrará una dirección parecida a:

```text
Local: http://localhost:5175/
```

El puerto puede cambiar si ya está ocupado. Siempre debe utilizarse la URL que
aparezca en la línea `Local:`.

## Cómo probar el confeti

1. Abrir el creador demo, usando el puerto actual de Vite:

   ```text
   http://localhost:5175/creator/1
   ```

2. Abrir las herramientas de desarrollo del navegador con `F12`.
3. En la consola, eliminar el indicador de una compra anterior:

   ```js
   localStorage.removeItem('has_bought');
   ```

4. Presionar `Buy 1 key`.
5. Esperar la confirmación de la compra simulada.
6. Verificar que el confeti aparece durante aproximadamente 2.5 segundos.

Al terminar puede comprobarse que el canvas ya no existe:

```js
document.querySelector('canvas[data-first-purchase-confetti="true"]');
```

El resultado esperado es:

```js
null;
```

Si se vuelve a comprar sin eliminar `has_bought`, la compra funcionará, pero el
confeti no se repetirá. Este es el comportamiento esperado para una celebración
exclusiva de la primera compra exitosa.

---

# First-purchase confetti implementation (English)

## Overview

A confetti celebration was added that appears only after a user's first
successful key purchase. The application providers and router context required
to run the project were also fixed, and a demo creator was added so the entire
flow can be tested without a local backend.

The demo is available at:

```text
/creator/1
```

## Added dependencies

The following dependencies were installed:

```json
"canvas-confetti": "^1.9.4"
"@types/canvas-confetti": "^1.9.0"
```

`canvas-confetti` renders the effect with a canvas, while the type package
provides TypeScript support without requiring custom declarations.

The dependency changes are recorded in `package.json` and `pnpm-lock.yaml`.

## Celebration utility

The file `src/utils/firstPurchaseConfetti.ts` was created and exports:

```ts
playFirstPurchaseConfetti();
```

The function performs the following sequence:

1. Verifies that it is running in a browser.
2. Reads `localStorage.getItem('has_bought')`.
3. If the value is already `"true"`, it exits without displaying confetti.
4. For a first purchase, it saves `has_bought = "true"`.
5. Checks the user's `prefers-reduced-motion` preference.
6. Creates a temporary canvas.
7. Fires small groups of particles using `requestAnimationFrame`.
8. Stops the animation after approximately 2500 ms.
9. Cancels the frame and timer, calls `reset()`, and removes the canvas.

The function returns a cleanup callback:

```ts
const cleanup = playFirstPurchaseConfetti();
```

The callback can be invoked when the owning component unmounts and is safe to
call more than once.

### Canvas behavior

The generated canvas:

- fills the viewport using `position: fixed`;
- appears above the page content;
- uses `pointer-events: none`, so it never blocks buttons or links;
- includes `data-first-purchase-confetti="true"` so tests can locate it;
- is completely removed after the animation or when the view unmounts.

### Accessibility

When the browser reports:

```css
prefers-reduced-motion: reduce;
```

the purchase is still recorded in `localStorage`, but the animation is not
played.

### Error handling

Storage, canvas creation, and `canvas-confetti` errors are isolated from the
main purchase flow. A confirmed purchase remains successful even if the visual
effect cannot run.

## Purchase integration

The celebration is called only after the purchase mutation resolves
successfully. It is never called when the user initially presses the button.

The implemented order is:

```text
user starts the purchase
→ mutateAsync executes the operation
→ the operation resolves successfully
→ playFirstPurchaseConfetti checks has_bought
→ has_bought = true is saved when appropriate
→ confetti is displayed
→ the confirmed-purchase message is shown
```

If `mutateAsync` rejects, execution never reaches the confetti call and
`has_bought` is not changed.

The integration is present in:

- `src/pages/LandingPage.tsx`, for the featured-profile purchase flow;
- `src/pages/CreatorDetailPage.tsx`, for the directly accessible demo-profile
  purchase.

Both views keep the cleanup callback in a `ref` and invoke it when they
unmount.

## Demo creator

The home page already displayed demo creators, but the detail page attempted
to retrieve them exclusively from the backend. When the backend did not
contain the selected record, the application displayed “Creator not found.”

A `DEMO_CREATOR` entry was added to `src/hooks/useCreators.ts` with the
following main data:

```text
ID: 1
Name: Lena Markov
Handle: @lenamarkov
Category: Art
Price: 12.4 XLM
Price in stroops: 124000000
```

`useCreatorDetail('1')` attempts to query the backend and returns the demo
creator if that request fails. Other unknown IDs continue to display the
normal not-found state.

The following button was added to the demo creator's page:

```text
Buy 1 key
```

This button uses `useTradeMutation`, displays a confirmation state, and starts
the celebration only after the simulated purchase finishes successfully.

## Application startup fixes

Two pre-existing issues that prevented the interface from running were found
during verification.

### React Router context

`useRouteChangeLogging()` called `useLocation()` before `RouterProvider` was
mounted. React Router threw an exception and left the application root empty.

`src/components/common/RouteChangeLogger.tsx` was added as a route layout. The
hook now runs inside the router context, and the routes in `src/routes.tsx` are
children of this layout.

### React Query and Wagmi providers

The application used hooks such as `useQueryClient()` and `useAccount()`
without mounting the existing provider. This produced the following error:

```text
No QueryClient set, use QueryClientProvider to set one
```

`src/main.tsx` now mounts the application as follows:

```tsx
<Web3Provider>
	<App />
</Web3Provider>
```

`Web3Provider` contains both `WagmiProvider` and `QueryClientProvider`, so
query, mutation, and wallet hooks receive their required contexts.

## Added tests

The file `src/utils/__tests__/firstPurchaseConfetti.test.ts` was added with
coverage for:

- first purchase: saves `has_bought`, creates the canvas, and removes it;
- later purchases: does not create another animation;
- reduced-motion preference: records the purchase without animation;
- early unmount: immediately releases all resources;
- unexpected canvas error: does not throw and preserves the successful
  purchase state.

TypeScript, ESLint, the production build, and the relevant provider and route
tests were also checked.

## Running the project

From the client directory, run:

```bash
cd /home/efren/Escritorio/grantfox/accesslayer-client
npm exec --yes pnpm@10.6.5 -- dev
```

Vite will print an address similar to:

```text
Local: http://localhost:5175/
```

The port may change when another process is already using it. Always use the
URL displayed on the `Local:` line.

## Testing the confetti

1. Open the demo creator using the current Vite port:

   ```text
   http://localhost:5175/creator/1
   ```

2. Open the browser developer tools with `F12`.
3. In the console, remove the previous-purchase flag:

   ```js
   localStorage.removeItem('has_bought');
   ```

4. Press `Buy 1 key`.
5. Wait for the simulated purchase confirmation.
6. Confirm that confetti appears for approximately 2.5 seconds.

After the effect ends, verify that the canvas no longer exists:

```js
document.querySelector('canvas[data-first-purchase-confetti="true"]');
```

The expected result is:

```js
null;
```

If another purchase is made without removing `has_bought`, the purchase still
works, but the confetti does not play again. This is the expected behavior for
a celebration that is exclusive to the first successful purchase.
