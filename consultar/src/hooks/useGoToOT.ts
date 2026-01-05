import { useNavigate } from "react-router-dom";

export const useGoToOT = () => {
  const navigate = useNavigate();

  const goToOT = (id: number) => {
    try {
      navigate(`/ot/editar/${id}`);
    } catch (err) {
      console.error("Error al abrir OT:", err);
    }
  };

  return goToOT;
};
