// RUTA: /cliente/src/api/axiosInstance.ts

import axios from "axios";

const API_BASE_URL = "http://192.168.0.150:6001/api";
// const API_BASE_URL = "http://localhost:6002/api";

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export const fetcher = (url: string) =>
  axiosInstance.get(url).then((res) => res.data);

export default axiosInstance;
