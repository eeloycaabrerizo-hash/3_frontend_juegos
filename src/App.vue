<script setup>
import { ref, computed, onMounted } from 'vue'
import { getGames, login, createGame, updateGame, deleteGame } from './api'

const titulo = ref('Portal de Juegos')
const textoBusqueda = ref('')
const ordenarPorAño = ref(false)

const juegos = ref([])
const cargando = ref(false)
const error = ref(null)

async function cargarJuegos() {
  cargando.value = true
  error.value = null

  try {
    const respuesta = await getGames()
    juegos.value = respuesta.data.map(juego => ({
      id: juego.id,
      nombre: juego.nombre,
      año: juego.anio,
      descripcion: juego.descripcion,
      imagen: juego.imagen,
      enlace: juego.enlace
    }))
  } catch (e) {
    error.value = 'No se pudieron cargar los juegos. ¿Está arrancado el backend?'
  }

  cargando.value = false
}
onMounted(cargarJuegos)

// LOGIN
const token = ref(localStorage.getItem('token'))
const usuario = ref('')
const clave = ref('')
const errorLogin = ref(null)

const sesionIniciada = computed(() => token.value !== null)

async function iniciarSesion() {
  errorLogin.value = null

  try {
    const respuesta = await login(usuario.value, clave.value)
    localStorage.setItem('token', respuesta.data.access_token)
    token.value = respuesta.data.access_token
    usuario.value = ''
    clave.value = ''
  } catch (e) {
    errorLogin.value = 'Usuario o contraseña incorrectos'
  }
}

function cerrarSesion() {
  localStorage.removeItem('token')
  token.value = null
}

// GESTIÓN DE JUEGOS (añadir, editar, borrar)
const formularioVacio = { nombre: '', año: '', descripcion: '', imagen: '', enlace: '' }
const formulario = ref({ ...formularioVacio })
const editandoId = ref(null)
const mensajeJuegos = ref(null)

function manejarError(e, textoPorDefecto) {
  if (e.response && e.response.status === 401) {
    cerrarSesion()
    mensajeJuegos.value = 'La sesión ha caducado. Inicia sesión otra vez.'
  } else {
    mensajeJuegos.value = textoPorDefecto
  }
}

async function guardarJuego() {
  mensajeJuegos.value = null

  const datos = {
    nombre: formulario.value.nombre,
    anio: Number(formulario.value.año),
    descripcion: formulario.value.descripcion,
    imagen: formulario.value.imagen,
    enlace: formulario.value.enlace
  }

  try {
    if (editandoId.value === null) {
      await createGame(datos)
      mensajeJuegos.value = 'Juego añadido correctamente'
    } else {
      await updateGame(editandoId.value, datos)
      mensajeJuegos.value = 'Juego actualizado correctamente'
    }
    cancelarEdicion()
    await cargarJuegos()
  } catch (e) {
    manejarError(e, 'No se pudo guardar el juego')
  }
}

function editarJuego(juego) {
  formulario.value = {
    nombre: juego.nombre,
    año: juego.año,
    descripcion: juego.descripcion,
    imagen: juego.imagen,
    enlace: juego.enlace
  }
  editandoId.value = juego.id
  document.querySelector('.zona-formulario').scrollIntoView({ behavior: 'smooth' })
}

function cancelarEdicion() {
  formulario.value = { ...formularioVacio }
  editandoId.value = null
}

async function borrarJuego(juego) {
  if (!confirm(`¿Seguro que quieres borrar "${juego.nombre}"?`)) return

  mensajeJuegos.value = null

  try {
    await deleteGame(juego.id)
    mensajeJuegos.value = 'Juego borrado correctamente'
    await cargarJuegos()
  } catch (e) {
    manejarError(e, 'No se pudo borrar el juego')
  }
}

// Lógica del catálogo de juegos: Filtra por texto y ordena por año
const juegosFiltrados = computed(() => {
  let resultado = juegos.value.filter(juego => {
    const nombreEnMinusculas = juego.nombre.toLowerCase()
    const busquedaEnMinusculas = textoBusqueda.value.toLowerCase()
    return nombreEnMinusculas.includes(busquedaEnMinusculas)
  })
  
  if (ordenarPorAño.value) {
    resultado.sort((a, b) => a.año - b.año)
  }
  
  return resultado
})

// Lista de keywords (sacada de las descripciones de cada juego)
const palabrasClave = computed(() => {
  const todasLasDescripciones = juegosFiltrados.value.map(juego => juego.descripcion).join(' ')
  const textoLimpio = todasLasDescripciones.toLowerCase().replace(/[.,]/g, '')
  let palabras = textoLimpio.split(' ')
  
  palabras = palabras.filter(palabra => palabra.length > 3)
  
  return [...new Set(palabras)]
})

// LÓGICA DEL MINIJUEGO DEL DINOSAURIO
const enJuego = ref(false)
const dinoY = ref(0) // Altura del dinosaurio (0 es el suelo)
const cactusX = ref(500) // Posición horizontal del cactus
let temporizador = null
let velocidadY = 0 // Fuerza del salto

const saltar = () => {
  // Solo puede saltar si está tocando el suelo
  if (dinoY.value === 0 && enJuego.value) {
    velocidadY = 12 // Impulso hacia arriba
  }
}

const iniciarJuego = () => {
  if (enJuego.value) return
  
  enJuego.value = true
  cactusX.value = 500
  dinoY.value = 0
  velocidadY = 0
  
  // El bucle principal del juego (el "tick")
  temporizador = setInterval(() => {
    // 1. Mover el cactus hacia la izquierda
    cactusX.value -= 5
    if (cactusX.value < -30) cactusX.value = 500 // Si sale de la pantalla, vuelve a la derecha
    
    // 2. Aplicar físicas al dinosaurio
    dinoY.value += velocidadY
    if (dinoY.value > 0) {
      velocidadY -= 0.8 // La gravedad lo empuja hacia abajo
    } else {
      dinoY.value = 0 // Choca con el suelo
      velocidadY = 0
    }
    
    // 3. Detectar colisiones (Game Over)
    // Comprobamos si el cactus está en la misma posición X que el dino, y si el dino no ha saltado lo suficiente
    if (cactusX.value > 10 && cactusX.value < 50 && dinoY.value < 40) {
      clearInterval(temporizador) // Detenemos el motor
      enJuego.value = false
      alert("¡Game Over! Te has chocado con el cactus. 🌵")
    }
  }, 20) 
}

// Función para gestionar los clics en "Jugar ahora"
const abrirJuego = (juego) => {
  if (juego.id === 1) {
    // Si es tu T-Rex, hacemos scroll suave hacia tu minijuego
    document.querySelector('.zona-juego').scrollIntoView({ behavior: 'smooth' })
    // ¡Y lo arrancamos automáticamente!
    iniciarJuego()
  } else {
    // Si es otro juego, lo abrimos en una pestaña nueva
    window.open(juego.enlace, '_blank')
  }
}

</script>

<template>
  <main class="contenedor">
    <header class="cabecera">
      <h1>{{ titulo }}</h1>
      <p>Explora nuestro catálogo clásico</p>

      <div class="zona-buscador">
        <input
          type="text"
          v-model="textoBusqueda"
          placeholder="Buscar un juego por nombre..."
          class="input-buscador"
        >
      </div>

      <button @click="ordenarPorAño = !ordenarPorAño" class="btn-ordenar">
        Ordenar por Año ({{ ordenarPorAño ? 'Activado' : 'Desactivado' }})
      </button>

      <div class="zona-login">
        <div v-if="!sesionIniciada">
          <form @submit.prevent="iniciarSesion">
            <input v-model="usuario" type="text" placeholder="Usuario" required>
            <input v-model="clave" type="password" placeholder="Contraseña" required>
            <button type="submit">Iniciar sesión</button>
          </form>
          <p v-if="errorLogin">{{ errorLogin }}</p>
        </div>

        <div v-else>
          <span>Sesión iniciada</span>
          <button @click="cerrarSesion">Cerrar sesión</button>
        </div>
      </div>
    </header>

    <section v-if="sesionIniciada" class="zona-formulario">
      <h2>{{ editandoId === null ? 'Añadir juego' : 'Editar juego' }}</h2>

      <form @submit.prevent="guardarJuego" class="formulario-juego">
        <input v-model="formulario.nombre" type="text" placeholder="Nombre" required>
        <input v-model="formulario.año" type="number" placeholder="Año" required>
        <textarea v-model="formulario.descripcion" placeholder="Descripción" rows="3"></textarea>
        <input v-model="formulario.imagen" type="text" placeholder="Imagen (ej: /Snake-Google.png)">
        <input v-model="formulario.enlace" type="text" placeholder="Enlace (ej: https://...)">

        <div>
          <button type="submit">{{ editandoId === null ? 'Añadir' : 'Guardar cambios' }}</button>
          <button v-if="editandoId !== null" type="button" @click="cancelarEdicion">Cancelar</button>
        </div>
      </form>
    </section>

    <p v-if="mensajeJuegos">{{ mensajeJuegos }}</p>
    <p v-if="cargando">Cargando juegos...</p>
    <p v-if="error">{{ error }}</p>

    <section class="catalogo">
      <article v-for="juego in juegosFiltrados" :key="juego.id" class="tarjeta">
        <img :src="juego.imagen" :alt="juego.nombre" class="icono-juego">
        <h2>{{ juego.nombre }}</h2>
        <span class="etiqueta-año">{{ juego.año }}</span>
        <p>{{ juego.descripcion }}</p>
        <button @click="abrirJuego(juego)" class="btn-jugar">Jugar ahora</button>

        <div v-if="sesionIniciada" class="acciones-admin">
          <button @click="editarJuego(juego)">Editar</button>
          <button @click="borrarJuego(juego)" class="btn-borrar">Borrar</button>
        </div>
      </article>
    </section>

    <!-- Pie de página con Keywords generadas dinámicamente -->
    <footer class="pie-pagina">
      <h3>Palabras clave (Keywords)</h3>
      <div class="contenedor-keywords">
        <span v-for="palabra in palabrasClave" :key="palabra" class="etiqueta-keyword">
          {{ palabra }}
        </span>
      </div>
    </footer>

    <!-- MINIJUEGO -->
    <section class="zona-juego">
      <h2>Minijuego: T-Rex</h2>
      <!-- Al hacer clic en la caja, el dino salta -->
      <div class="pantalla-juego" @mousedown="saltar">

        <!-- Pantalla oscura con botón de inicio si el juego no está activo -->
        <div v-if="!enJuego" class="pantalla-inicio">
          <button @click="iniciarJuego" class="btn-jugar-minijuego">Empezar a jugar</button>
        </div>

        <!-- El atributo :style conecta las coordenadas de Vue con el CSS en tiempo real -->
        <div class="dino" :style="{ bottom: dinoY + 'px' }">🦖</div>
        <div class="cactus" :style="{ left: cactusX + 'px' }">🌵</div>

      </div>
      <p class="instrucciones">Haz clic dentro de la pantalla para saltar.</p>
    </section>
  </main>
</template>
<style>

/* Fuentes de Google: una pixelada para los títulos y otra normal para el texto */
@import url('https://fonts.googleapis.com/css2?family=Familjen+Grotesk:wght@400;700&family=Pixelify+Sans:wght@700&display=swap');

/* Colores: fondo #e9e7f4, texto y bordes #1b1a3a, azul #3b3bf2, coral #ff5c6c, amarillo #ffd23f */

/* Estilos generales */
body {
  font-family: 'Familjen Grotesk', sans-serif;
  background-color: #e9e7f4;
  color: #1b1a3a;
  margin: 0;
  padding: 40px 24px;
}

h1,
h2,
h3 {
  font-family: 'Pixelify Sans', monospace;
  margin: 0;
}

.contenedor {
  max-width: 1000px;
  margin: 0 auto;
}

/* Todos los botones comparten este estilo */
button {
  padding: 10px 16px;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  background-color: white;
  border: 3px solid #1b1a3a;
  box-shadow: 4px 4px 0 #1b1a3a;
}

/* Cabecera */
.cabecera {
  margin-bottom: 48px;
}

.cabecera h1 {
  font-size: 4.5rem;
  color: #3b3bf2;
  text-shadow: 4px 4px 0 #ffd23f;
}

.zona-buscador {
  margin: 20px 0 15px 0;
}

.input-buscador {
  width: 100%;
  max-width: 400px;
  box-sizing: border-box;
  padding: 12px 16px;
  font-size: 1rem;
  border: 3px solid #1b1a3a;
  box-shadow: 4px 4px 0 #1b1a3a;
}

/* Catálogo de juegos */
.catalogo {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(290px, 1fr));
  gap: 32px;
}

.tarjeta {
  display: flex;
  flex-direction: column;
  background-color: white;
  border: 3px solid #1b1a3a;
  box-shadow: 6px 6px 0 #1b1a3a;
}

.icono-juego {
  width: 100%;
  height: 170px;
  object-fit: contain;
  box-sizing: border-box;
  padding: 12px;
  border-bottom: 3px solid #1b1a3a;
}

.tarjeta h2,
.etiqueta-año {
  margin: 12px 20px 0 20px;
}

.etiqueta-año {
  font-weight: bold;
  color: #3b3bf2;
}

.tarjeta p {
  flex: 1; /* empuja el botón siempre hacia abajo */
  margin: 12px 20px;
}

.btn-jugar {
  align-self: flex-start;
  margin: 0 20px 20px 20px;
  background-color: #ff5c6c;
}

/* Pie de página (keywords) */
.pie-pagina {
  margin-top: 64px;
  padding-top: 20px;
  border-top: 3px solid #1b1a3a;
}

.contenedor-keywords {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}

.etiqueta-keyword {
  padding: 2px 10px;
  background-color: #ffd23f;
  border: 2px solid #1b1a3a;
}

/* Minijuego del dinosaurio */
.zona-juego {
  margin-top: 64px;
}

.pantalla-juego {
  position: relative; /* permite colocar el dino y el cactus dentro de la caja */
  max-width: 600px;
  height: 200px;
  margin-top: 16px;
  background-color: white;
  border: 3px solid #1b1a3a;
  border-bottom: 8px solid #1b1a3a; /* el suelo */
  overflow: hidden; /* oculta el cactus cuando sale de la caja */
  cursor: pointer;
}

.dino,
.cactus {
  position: absolute;
  font-size: 40px;
}

.dino {
  left: 30px;
  transform: scaleX(-1); /* gira el emoji para que mire hacia el cactus */
}

.cactus {
  bottom: 0;
}

.pantalla-inicio {
  position: absolute;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(27, 26, 58, 0.85);
  z-index: 10; /* por encima del dino y el cactus */
}

.btn-jugar-minijuego {
  background-color: #ffd23f;
}

/* Login */
.zona-login {
  margin-top: 20px;
}

.zona-login input {
  padding: 10px 12px;
  margin-right: 8px;
  font-size: 1rem;
  border: 3px solid #1b1a3a;
}

.zona-login span {
  margin-right: 12px;
  font-weight: bold;
}

/* Formulario y acciones de gestión */
.zona-formulario {
  margin-bottom: 40px;
  padding: 20px;
  background-color: white;
  border: 3px solid #1b1a3a;
  box-shadow: 6px 6px 0 #1b1a3a;
}

.formulario-juego {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 16px;
}

.formulario-juego input,
.formulario-juego textarea {
  padding: 10px 12px;
  font-size: 1rem;
  font-family: inherit;
  border: 3px solid #1b1a3a;
}

.acciones-admin {
  display: flex;
  gap: 10px;
  margin: 0 20px 20px 20px;
}

.btn-borrar {
  background-color: #ffd23f;
}
</style>