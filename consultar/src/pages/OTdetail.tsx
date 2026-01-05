// RUTA: /consultar/src/pages/OTdetail.tsx

import React, { useState } from "react";
import { useOTDetailForm } from "../hooks/useOTDetailForm";
import OTDetailForm from "../components/OTDetailForm";
import OTDetailSummary from "../components/OTDetailSummary";
import Modal from "../components/ui/Modal";
import UserAssignmentModal from "../components/ui/UserAssignmentModal";
import { otService } from "../services/otService";

const OTDetail: React.FC = () => {
  const formProps = useOTDetailForm();
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [currentActivityId, setCurrentActivityId] = useState<number | null>(null);

  const handleOpenAssignmentModal = (activityId: number) => {
    setCurrentActivityId(activityId);
    setIsAssignmentModalOpen(true);
  };

  const handleConfirmAssignment = async (selectedIds: number[]) => {
    if (currentActivityId === null || !formProps.otData || !formProps.id) return;
    
    // Usamos la función expuesta por el hook
    formProps.handleActivityAssignmentChange(
        (formProps.otData.activities || []).findIndex(a => a.id === currentActivityId), 
        selectedIds
    );

    // Guardar cambios inmediatamente (o podríamos dejar que el usuario guarde manualmente)
    // En este flujo "in-line", es mejor que sea parte del guardado general,
    // PERO la asignación de usuarios suele ser una acción independiente en la UI actual.
    // Dado que eliminamos el Summary, la asignación ahora depende del Form.
    // Si queremos mantener el comportamiento anterior de guardar asignación inmediatamente:
    try {
        const { getValues } = formProps.formMethods;
        await otService.updateOT(Number(formProps.id), getValues());
        await formProps.loadData();
    } catch (error) {
        console.error("Failed to save user assignment:", error);
        alert("Error al guardar la asignación.");
    }

    setIsAssignmentModalOpen(false);
    setCurrentActivityId(null);
  };

  if (formProps.error) {
    return <div className="p-8 text-red-500 text-center">{formProps.error}</div>;
  }

  if (!formProps.otData) {
    return <div className="p-8 text-center">Cargando datos de la OT...</div>;
  }

  const initialSelectedUserIds = currentActivityId !== null
    ? (formProps.otData.activities?.find(a => a.id === currentActivityId)?.assigned_users || []).map(u => u.id)
    : [];

  return (
    <>
      {formProps.isEditing ? (
        <OTDetailForm 
            {...formProps} 
            toggleIsEditing={formProps.toggleIsEditing} 
            isModal={false} 
        />
      ) : (
        <OTDetailSummary
            otData={formProps.otData}
            onEdit={formProps.toggleIsEditing}
            onAuthorize={formProps.handleAuthorize}
            onHistory={() => formProps.setIsHistoryModalOpen(true)}
            onAssignUsers={handleOpenAssignmentModal}
            canAuthorizeOT={formProps.canAuthorizeOT()}
        />
      )}

      {isAssignmentModalOpen && (
        <UserAssignmentModal
          isOpen={isAssignmentModalOpen}
          onClose={() => setIsAssignmentModalOpen(false)}
          allUsers={formProps.users}
          initialSelectedUserIds={initialSelectedUserIds}
          onConfirmAssignment={handleConfirmAssignment}
        />
      )}
    </>
  );
};

export default OTDetail;
