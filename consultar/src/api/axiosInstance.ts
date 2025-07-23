// RUTA: /cliente/src/api/axiosInstance.ts

import axios from "axios";

// --- CAMBIO AQUÍ ---
// Usamos el nombre de tu computadora en lugar de la IP.
const API_BASE_URL = "http://DESKTOP-HU53VB2:4000/api";

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export const fetcher = (url: string) =>
  axiosInstance.get(url).then((res) => res.data);

export default axiosInstance;
