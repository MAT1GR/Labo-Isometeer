import axios from "../api/axiosInstance";

export const getEstadisticasCobranza = async () => {
  const response = await axios.get("/statistics/cobranza");
  return response.data;
};

export const getEstadisticasFacturacion = async () => {
  const response = await axios.get("/statistics/facturacion");
  return response.data;
};

export const getPagos = async () => {
  const response = await axios.get("/statistics/pagos");
  return response.data;
};

export const getFacturas = async () => {
  const response = await axios.get("/statistics/facturas");
  return response.data;
};

export const getEstadisticasOT = async () => {
  const response = await axios.get("/statistics/ot");
  return response.data;
};
