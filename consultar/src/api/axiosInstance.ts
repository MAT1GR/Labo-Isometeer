// RUTA: /consultar/src/api/axiosInstance.ts

import axios from "axios";

// PRODUCCION
// const API_BASE_URL = "http://192.168.0.150:6001/api";

// DESAROLLO
const API_BASE_URL = "http://localhost:6002/api";

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// --- INTERCEPTOR CORREGIDO PARA AÑADIR EL TOKEN DE AUTENTICACIÓN ---
axiosInstance.interceptors.request.use(
  (config) => {
    // 1. Obtener el string del usuario del localStorage
    const userString = localStorage.getItem("user");

    if (userString) {
      // 2. Parsear el string JSON para obtener el objeto de usuario
      const userData = JSON.parse(userString);
      const token = userData.token;

      // 3. Si el token existe dentro del objeto, añadirlo a la cabecera
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    // Devolver la configuración (modificada o no) para que la petición continúe
    return config;
  },
  (error) => {
    // Manejar errores en la configuración de la petición
    return Promise.reject(error);
  }
);
// --- FIN DEL INTERCEPTOR ---

export const fetcher = (url: string) =>
  axiosInstance.get(url).then((res) => res.data);

export default axiosInstance;
