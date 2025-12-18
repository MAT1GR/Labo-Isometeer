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

    const { formMethods, users, loadData } = formProps;
    const { setValue, getValues } = formMethods;

    const activityIndex = (getValues('activities') || []).findIndex(a => a.id === currentActivityId);

    if (activityIndex === -1) return;

    const selectedUsers = users.filter(u => selectedIds.includes(u.id));
    setValue(`activities.${activityIndex}.assigned_users` as any, selectedUsers, { shouldDirty: true });
    
    const updatedData = getValues();
    
    try {
        await otService.updateOT(Number(formProps.id), updatedData);
        await loadData(); // Recargar datos para refrescar la UI
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
      <OTDetailSummary
        otData={formProps.otData}
        onEdit={formProps.toggleIsEditing}
        onAuthorize={formProps.handleAuthorize}
        onHistory={() => formProps.setIsHistoryModalOpen(true)}
        onAssignUsers={handleOpenAssignmentModal}
        canAuthorizeOT={formProps.canAuthorizeOT()}
      />
      
      <Modal 
        isOpen={formProps.isEditing} 
        onClose={formProps.toggleIsEditing}
        title={`Editando OT: ${formProps.otData.custom_id}`}
      >
        <div className="p-4">
          <OTDetailForm {...formProps} toggleIsEditing={formProps.toggleIsEditing} isModal={true} />
        </div>
      </Modal>

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
