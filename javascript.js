// Elementos del HTML

const formulario = document.getElementById("formulario-busqueda");
const campoUbicacion = document.getElementById("ubicacion");

const botonBuscar = document.getElementById("boton-buscar");
const botonUbicacion = document.getElementById("boton-ubicacion");
const botonActualizar = document.getElementById("boton-actualizar");

const cargando = document.getElementById("cargando");
const mensajeError = document.getElementById("mensaje-error");
const informacionClima = document.getElementById("informacion-clima");

const nombreCiudad = document.getElementById("nombre-ciudad");
const fechaActual = document.getElementById("fecha-actual");
const temperatura = document.getElementById("temperatura");
const iconoClima = document.getElementById("icono-clima");
const estadoClima = document.getElementById("estado-clima");

const viento = document.getElementById("viento");
const lluvia = document.getElementById("lluvia");
const humedad = document.getElementById("humedad");
const sensacion = document.getElementById("sensacion");

const pronosticoFuturo = document.getElementById("pronostico-futuro");
const pronosticoAnterior = document.getElementById("pronostico-anterior");

let ultimaUbicacion = null;


// Interpretar los códigos meteorológicos

function obtenerEstadoClima(codigo) {

    if (codigo === 0) {
        return { texto: "Despejado", icono: "☀️" };
    }

    if (codigo === 1 || codigo === 2) {
        return { texto: "Parcialmente nublado", icono: "🌤️" };
    }

    if (codigo === 3) {
        return { texto: "Nublado", icono: "☁️" };
    }

    if ([45, 48].includes(codigo)) {
        return { texto: "Niebla", icono: "🌫️" };
    }

    if ([51, 53, 55, 56, 57].includes(codigo)) {
        return { texto: "Llovizna", icono: "🌦️" };
    }

    if ([61, 63, 65, 66, 67].includes(codigo)) {
        return { texto: "Lluvia", icono: "🌧️" };
    }

    if ([71, 73, 75, 77, 85, 86].includes(codigo)) {
        return { texto: "Nieve", icono: "❄️" };
    }

    if ([80, 81, 82].includes(codigo)) {
        return { texto: "Chubascos", icono: "🌧️" };
    }

    if ([95, 96, 99].includes(codigo)) {
        return { texto: "Tormenta eléctrica", icono: "⛈️" };
    }

    return { texto: "Sin información", icono: "🌡️" };

}


// Buscar una ciudad

formulario.addEventListener("submit", function (evento) {

    evento.preventDefault();

    const ciudad = campoUbicacion.value.trim();

    if (ciudad !== "") {
        buscarCiudad(ciudad);
    }

});


// Obtener las coordenadas de una ciudad

async function buscarCiudad(ciudad) {

    mostrarCarga(true);

    try {

        const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(ciudad)}&count=1&language=es&format=json`;

        const respuesta = await fetch(url);

        if (!respuesta.ok) {
            throw new Error("Error al buscar la ciudad.");
        }

        const datos = await respuesta.json();

        if (!datos.results || datos.results.length === 0) {
            throw new Error("No se encontró la ciudad.");
        }

        const lugar = datos.results[0];

        const nombre = [
            lugar.name,
            lugar.admin1,
            lugar.country
        ].filter(Boolean).join(", ");

        await consultarClima(
            lugar.latitude,
            lugar.longitude,
            nombre
        );

    } catch (error) {

        mostrarError(error.message);

    } finally {

        mostrarCarga(false);

    }

}


// Consultar información meteorológica

async function consultarClima(latitud, longitud, nombre) {

    mostrarCarga(true);

    try {

        const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitud}&longitude=${longitud}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&hourly=temperature_2m,precipitation_probability,weather_code,wind_speed_10m&past_days=2&forecast_days=3&timezone=auto&timeformat=unixtime`;

        const respuesta = await fetch(url);

        if (!respuesta.ok) {
            throw new Error("No se pudo consultar el clima.");
        }

        const datos = await respuesta.json();

        mostrarClimaActual(datos, nombre);

        mostrarPronosticos(datos);

        ultimaUbicacion = {
            latitud,
            longitud,
            nombre
        };

        informacionClima.hidden = false;

    } catch (error) {

        mostrarError(error.message);

    } finally {

        mostrarCarga(false);

    }

}


// Mostrar el clima actual

function mostrarClimaActual(datos, nombre) {

    const clima = datos.current;

    const estado = obtenerEstadoClima(clima.weather_code);

    nombreCiudad.textContent = nombre;

    fechaActual.textContent = new Date(
        clima.time * 1000
    ).toLocaleString("es-CO", {
        timeZone: datos.timezone,
        dateStyle: "full",
        timeStyle: "short"
    });

    temperatura.textContent =
        `${Math.round(clima.temperature_2m)} °C`;

    iconoClima.textContent = estado.icono;

    estadoClima.textContent = estado.texto;

    viento.textContent =
        `${clima.wind_speed_10m} km/h`;

    humedad.textContent =
        `${clima.relative_humidity_2m} %`;

    sensacion.textContent =
        `${Math.round(clima.apparent_temperature)} °C`;


    // Buscar la probabilidad de lluvia de la hora actual

    const indice = datos.hourly.time.findIndex(
        hora => hora <= clima.time &&
            clima.time < hora + 3600
    );

    const probabilidad =
        datos.hourly.precipitation_probability[indice];

    lluvia.textContent = probabilidad != null
        ? `${probabilidad} %`
        : "Sin datos";

}


// Mostrar las 24 horas anteriores y futuras

function mostrarPronosticos(datos) {

    pronosticoFuturo.innerHTML = "";
    pronosticoAnterior.innerHTML = "";

    const horaActual = datos.current.time;

    const horas = datos.hourly.time.map((hora, indice) => {

        return {
            tiempo: hora,
            temperatura: datos.hourly.temperature_2m[indice],
            lluvia: datos.hourly.precipitation_probability[indice],
            codigo: datos.hourly.weather_code[indice],
            viento: datos.hourly.wind_speed_10m[indice]
        };

    });


    // Próximas 24 horas

    const futuras = horas.filter(
        hora => hora.tiempo > horaActual
    ).slice(0, 24);


    // Últimas 24 horas

    const anteriores = horas.filter(
        hora => hora.tiempo < horaActual
    ).slice(-24);


    // Crear tarjetas futuras

    futuras.forEach(hora => {

        pronosticoFuturo.appendChild(
            crearTarjetaHora(hora, datos.timezone)
        );

    });


    // Crear tarjetas anteriores

    anteriores.forEach(hora => {

        pronosticoAnterior.appendChild(
            crearTarjetaHora(hora, datos.timezone)
        );

    });

}


// Crear tarjetas meteorológicas

function crearTarjetaHora(hora, zonaHoraria) {

    const tarjeta = document.createElement("article");

    tarjeta.classList.add("tarjeta-hora");

    const fecha = new Date(hora.tiempo * 1000);

    const horaFormateada = fecha.toLocaleTimeString("es-CO", {
        timeZone: zonaHoraria,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
    });

    const diaFormateado = fecha.toLocaleDateString("es-CO", {
        timeZone: zonaHoraria,
        day: "numeric",
        month: "short"
    });

    const estado = obtenerEstadoClima(hora.codigo);

    tarjeta.innerHTML = `
        <h3>${horaFormateada}</h3>

        <p>${diaFormateado}</p>

        <span>${estado.icono}</span>

        <p class="temperatura-hora">
            ${hora.temperatura != null
            ? Math.round(hora.temperatura) + " °C"
            : "--"}
        </p>

        <p>${estado.texto}</p>

        <p>💨 ${hora.viento ?? "--"} km/h</p>

        <p>🌧️ ${hora.lluvia ?? "--"} %</p>
    `;

    return tarjeta;

}


// Actualizar el clima

botonActualizar.addEventListener("click", function () {

    if (ultimaUbicacion !== null) {

        consultarClima(
            ultimaUbicacion.latitud,
            ultimaUbicacion.longitud,
            ultimaUbicacion.nombre
        );

    }

});


// Obtener la ubicación actual

function obtenerUbicacion() {

    if (!navigator.geolocation) {

        mostrarError("El navegador no admite geolocalización.");

        return;

    }

    mostrarCarga(true);

    navigator.geolocation.getCurrentPosition(

        function (posicion) {

            const latitud = posicion.coords.latitude;

            const longitud = posicion.coords.longitude;

            consultarClima(
                latitud,
                longitud,
                "Mi ubicación actual"
            );

        },

        function () {

            mostrarCarga(false);

            mostrarError(
                "No se pudo obtener tu ubicación. Busca una ciudad manualmente."
            );

        },

        {
            enableHighAccuracy: false,
            timeout: 10000
        }

    );

}


// Botón de ubicación

botonUbicacion.addEventListener("click", obtenerUbicacion);


// Mostrar animación de carga

function mostrarCarga(estado) {

    cargando.hidden = !estado;

    botonBuscar.disabled = estado;

    campoUbicacion.disabled = estado;

    botonUbicacion.disabled = estado;

    botonActualizar.disabled =
        estado || ultimaUbicacion === null;

    if (estado) {

        mensajeError.hidden = true;

        informacionClima.hidden = true;

    }

}


// Mostrar mensajes de error

function mostrarError(mensaje) {

    mensajeError.textContent = mensaje;

    mensajeError.hidden = false;

    informacionClima.hidden = true;

}


// Obtener la ubicación al iniciar la aplicación

window.addEventListener("DOMContentLoaded", obtenerUbicacion);