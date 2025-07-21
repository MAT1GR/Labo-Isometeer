// src/api/axiosInstance.ts
import axios from "axios";

// La URL base de tu servidor backend
const API_BASE_URL = "http://localhost:4000/api";

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Opcional: Puedes configurar interceptores para manejar tokens de autenticación en el futuro
axiosInstance.interceptors.request.use((config) => {
  // const token = localStorage.getItem('token'); // Ejemplo si usaras tokens JWT
  // if (token) {
  //   config.headers.Authorization = `Bearer ${token}`;
  // }
  return config;
});

// Esta es la función que SWR usará para todas las peticiones GET
export const fetcher = (url: string) =>
  axiosInstance.get(url).then((res) => res.data);

export default axiosInstance;
