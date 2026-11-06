# Guion de narración · Video de demostración Tauros Barbería

Video: `docs/demo-tauros.mp4` (4:17). Los tiempos son aproximados (±2 s).
Lee con calma: cada bloque está escrito para caber en su tramo hablando a ritmo normal.
Si usas texto a voz (CapCut o ElevenLabs), pega cada bloque por separado y ubícalo en su tiempo.

---

### 0:00 – 0:08 · Intro
> Hola. Les presentamos **Tauros Barbería**, un sistema web de agendamiento de citas, desarrollado como proyecto de aula de la Universidad de Santander.

### 0:08 – 0:17 · El problema
> La barbería agendaba todo a mano: por teléfono y en papel. Eso causaba citas cruzadas, clientes que no sabían qué horas había libres y mucho tiempo perdido coordinando.

### 0:17 – 0:22 · Capítulo: Módulo cliente
> Empecemos por lo que ve el cliente.

### 0:22 – 1:16 · Recorrido del cliente
**0:22 – 0:30**
> Apenas entra, el cliente ve cuántos turnos quedan libres hoy y cuál es el próximo. Esto se calcula en vivo con la agenda real.

**0:30 – 0:36**
> Luego encuentra los beneficios: reservar en un minuto, precio claro y cancelación sin costo.

**0:36 – 0:46**
> En esta sección, el teléfono muestra cada paso de la reserva a medida que se baja por la página.

**0:46 – 0:56**
> La carta de servicios está organizada por categorías, con precio y duración. Todo sale de la base de datos, así que el administrador puede cambiarlo sin tocar el código.

**0:56 – 1:03**
> Hay una galería de estilos para inspirarse: con "Lo quiero" se reserva directo con el barbero que mejor lo hace.

**1:03 – 1:09**
> Cada barbero aparece con su silla y sus turnos de hoy. Si está de descanso, no se puede reservar con él.

**1:09 – 1:16**
> Y por accesibilidad, un botón permite pausar todas las animaciones, como lo pide la norma WCAG.

### 1:16 – 1:21 · Capítulo: Reserva
> Ahora hagamos una reserva real.

### 1:21 – 2:28 · Reserva paso a paso
**1:21 – 1:28**
> Primero se elige el barbero. Al lado se ven los turnos que le quedan hoy.

**1:28 – 1:34**
> Luego el servicio. Cada uno muestra su precio y lo que dura.

**1:34 – 1:45**
> Después el día y la hora. Verde es libre y gris ocupado. Como "corte más barba" dura una hora, el sistema solo ofrece las horas donde cabe completo.

**1:45 – 2:05**
> Ahora los datos: nombre y celular, que es obligatorio. Si el número no es válido, el sistema avisa de inmediato. Y mientras se escribe, el número se organiza solo.

**2:05 – 2:15**
> Antes de confirmar, el cliente debe autorizar el uso de sus datos, como exige la Ley 1581 de 2012 de protección de datos personales.

**2:15 – 2:28**
> Y listo: la cita queda guardada en la base de datos y el cliente recibe su comprobante con número de reserva. Todo en menos de un minuto, sin crear cuenta y sin pagar por adelantado.

### 2:28 – 2:33 · Capítulo: Celular
> La aplicación está pensada primero para el celular.

### 2:33 – 2:47 · Vista en iPhone
> La mayoría de clientes reserva desde el teléfono, así que la página se adapta a cualquier pantalla, con botones grandes y una barra fija para reservar con un solo toque.

### 2:47 – 2:53 · Capítulo: Administrador
> Ahora veamos el panel del administrador.

### 2:53 – 3:49 · Panel del administrador
**2:53 – 3:00**
> Se entra desde un enlace discreto en el menú.

**3:00 – 3:08**
> Solo pueden entrar los usuarios autorizados en la base de datos, con correo y contraseña.

**3:08 – 3:16**
> Esta es la agenda del día, con una columna por barbero. Se actualiza sola en tiempo real: la cita que acabamos de hacer aparece resaltada.

**3:16 – 3:24**
> Al tocar una cita se ven sus datos. Se puede marcar como atendida o cancelar. Si se cancela, el turno vuelve a quedar libre.

**3:24 – 3:32**
> Aquí se registran los barberos, se les asigna una silla y se activan o desactivan con un interruptor.

**3:32 – 3:42**
> En horarios se define cuándo trabaja cada barbero, y en servicios se ajustan precios y duración.

**3:42 – 3:49**
> El administrador también puede cambiar su contraseña, que exige mínimo diez caracteres.

### 3:49 – 4:00 · Seguridad y accesibilidad
> La seguridad estuvo presente desde el diseño: la base de datos impide la doble reserva, protege los datos de cada cliente, limita las reservas por celular, cumple la Ley 1581 y el sitio solo ejecuta código verificado.

### 4:00 – 4:09 · Tecnologías
> Lo construimos con HTML, CSS y JavaScript, con Supabase como base de datos, GitHub para el código y Vercel para publicarlo automáticamente.

### 4:09 – 4:17 · Cierre
> Tauros Barbería: tu silla está lista. Pueden probarlo en tauros-barberia-app punto vercel punto app. Muchas gracias.

---

## Consejos para grabar
- Graba en un lugar silencioso, con el celular a un palmo de la boca.
- Lee cada bloque por separado; si te equivocas, repite solo ese bloque.
- En CapCut, baja la música al 10–15 % y sube tu voz al 100 %.
- Si un bloque te queda largo, acelera ese tramo del video (Velocidad → 1.1x) o recorta palabras.
