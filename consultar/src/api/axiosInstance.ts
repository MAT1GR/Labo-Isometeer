// RUTA: /cliente/src/api/axiosInstance.ts

import axios from "axios";

// --- CAMBIO IMPORTANTE AQUÍ ---
// Reemplaza 'TU_DIRECCION_IP_LOCAL' con la IP real de la computadora
// donde corre el servidor (ej: '192.168.1.105').
// Puedes encontrarla escribiendo 'ipconfig' en la terminal de Windows.
const API_BASE_URL = "http://192.168.0.218:4000/api";

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export const fetcher = (url: string) =>
  axiosInstance.get(url).then((res) => res.data);

export default axiosInstance;
