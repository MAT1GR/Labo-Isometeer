// RUTA: /consultar/src/components/OTDetailForm.tsx

import React from "react";
import { useNavigate } from "react-router-dom";
import { FormProvider } from "react-hook-form";
import {
  ArrowLeft,
  Save,
  Download,
  Clock,
  DollarSign,
  CheckSquare,
  XSquare,
  Archive,
  UserSquare,
  Package,
  BookText,
  Lock,
  Edit, // Add this
} from "lucide-react";
import { useOTDetailForm } from "../hooks/useOTDetailForm";
import { Contact } from "../../services/clientService"; // Asegúrate de que esta importación sea correcta
import Input from "./ui/Input";
import Button from "./ui/Button";
import Card from "./ui/Card";
import NavigationPrompt from "./ui/NavigationPrompt";
import CreateFacturaModal from "./CreateFacturaModal";
import ExportOtModal from "./ui/ExportOtModal";
import OtHistoryModal from "./ui/OtHistoryModal";
import OTDetailEmployeeView from "./ot/OTDetailEmployeeView";
import OTDetailActivities from "./ot/OTDetailActivities";
import OTDetailInvoices from "./ot/OTDetailInvoices";

interface OTDetailFormProps {
  toggleIsEditing: () => void;
  isModal?: boolean;
}

const OTDetailForm: React.FC<OTDetailFormProps> = ({ toggleIsEditing, isModal = false }) => {
  const navigate = useNavigate();
  const {
    id,
    user,
    formMethods,
    isSaving,
    otData,
    dataForExport,
    users,
    contracts,
    facturasCliente,
    error,
    isExportModalOpen,
    isCreateFacturaModalOpen,
    isHistoryModalOpen,
    isLacreEnabled,
    isEmployee,
    myActivities,
    isFormEditable,
    otMoneda,
    canAuthorizeOT,
    setCreateFacturaModalOpen,
    setIsExportModalOpen,
    setIsHistoryModalOpen,
    onSubmit, // This is already the handleSubmit(onSubmit) wrapped version
    handleFacturaCreated,
    handleOpenExportModal,
    handleAuthorize,
    handleDeauthorize,
    handleCloseOT,
    handleStartActivity,
    handleStopActivity,
    getAvailableActivities,
    isEditing, // Add this
  } = useOTDetailForm();

  const {
    register,
    control,
    formState: { isSubmitting, isDirty },
  } = formMethods;

  if (error) return <div className="p-8 text-red-500 text-center">{error}</div>;
  if (!otData)
    return <div className="p-8 text-center">Cargando datos de la OT...</div>;

  const handleFormSubmit = async (event: React.FormEvent) => {
    await onSubmit(event);
    if (!isSaving) { // Only toggle if save was successful (not currently saving)
      toggleIsEditing();
    }
  };

  return (
    <FormProvider {...formMethods}>
      <NavigationPrompt when={isDirty && !isSaving} onSave={handleFormSubmit} />

      {/* --- CORRECCIÓN: Se pasa el otData completo que el modal espera --- */}
      <CreateFacturaModal
        isOpen={isCreateFacturaModalOpen}
        onClose={() => setCreateFacturaModalOpen(false)}
        otData={otData}
        onFacturaCreated={handleFacturaCreated}
      />
      <ExportOtModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        otData={dataForExport}
      />
      {id && (
        <OtHistoryModal
          isOpen={isHistoryModalOpen}
          onClose={() => setIsHistoryModalOpen(false)}
          otId={Number(id)}
        />
      )}
      <form onSubmit={handleFormSubmit} className="space-y-6">
        {/* --- Header (only if not in modal) --- */}
        {!isModal && (
          <div className="flex justify-between items-center mb-6">
            <div>
                <div className="flex items-center gap-2">
                    <Button type="button" variant="ghost" size="sm" onClick={() => navigate("/ot")} className="p-0 mr-2">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white">{otData.custom_id || `#${otData.id}`}</h1>
                </div>
                <p className="text-gray-500 dark:text-gray-400 ml-9">{otData.product}</p>
            </div>
            
            <div className="flex items-center gap-2">
              {!otData.authorized && (
                    <span className="bg-yellow-100 text-yellow-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded dark:bg-yellow-900 dark:text-yellow-300">
                        No Autorizado
                    </span>
              )}
              
              {!isEditing ? (
                 isFormEditable && !isEmployee && (
                    <Button type="button" variant="outline" onClick={toggleIsEditing}>
                        <Edit className="mr-2 h-4 w-4" /> Editar
                    </Button>
                 )
              ) : (
                <>
                    <Button type="button" variant="ghost" onClick={toggleIsEditing}>
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={isSubmitting || !isDirty}>
                        <Save className="mr-2 h-4 w-4" /> Guardar
                    </Button>
                </>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* --- LEFT COLUMN (Main Content) --- */}
            <div className="lg:col-span-2 space-y-6">
                
                 {/* --- Main Info --- */}
                <Card>
                    <fieldset disabled={!isEditing} className="p-6">
                         <h2 className="text-xl font-bold mb-4 flex items-center dark:text-white">
                            <Clock className="mr-3 text-gray-600 dark:text-gray-300" /> Detalles de la Orden de Trabajo
                         </h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Input label="Fecha de Creación" type="date" {...register("date")} disabled={!isEditing} />
                            <Input
                                label="Fecha de Entrega Estimada"
                                type="date"
                                {...register("estimated_delivery_date")}
                                disabled={!isEditing}
                            />
                            <Input
                                label="Vto. del Certificado"
                                type="date"
                                {...register("certificate_expiry")}
                                disabled={!isEditing || !isLacreEnabled}
                            />
                            
                            {/* Norma is derived in Summary, here we might skip or show static if not editable per activity */}
                            
                            <Input
                                label="Nº de Lacre"
                                {...register("seal_number" as const)}
                                disabled={!isEditing || !isLacreEnabled}
                            />

                             <div>
                                <label className="text-sm font-medium dark:text-gray-300">
                                    Contrato
                                </label>
                                <select
                                    {...register("contract_type" as const)}
                                    disabled={!isEditing}
                                    className="w-full mt-1 p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 disabled:bg-gray-50 disabled:border-gray-200 disabled:text-gray-600"
                                >
                                    <option value="">Sin contrato</option>
                                    {contracts.map((contract) => (
                                    <option key={contract.id} value={contract.name}>
                                        {contract.name}
                                    </option>
                                    ))}
                                </select>
                            </div>

                            <Input label="Marca" {...register("brand")} disabled={!isEditing} />
                            <Input label="Modelo" {...register("model")} disabled={!isEditing} />
                            <Input label="Producto" {...register("product" as const)} disabled={!isEditing} />
                            
                             <div>
                                <label className="text-sm font-medium dark:text-gray-300">
                                    Moneda
                                </label>
                                <select
                                    {...register("moneda")}
                                    disabled={!isEditing}
                                    className="w-full mt-1 p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 disabled:bg-gray-50 disabled:border-gray-200 disabled:text-gray-600"
                                >
                                    <option value="ARS">ARS (Pesos)</option>
                                    <option value="USD">USD (Dólares)</option>
                                </select>
                            </div>
                            
                            <div>
                                <label className="text-sm font-medium dark:text-gray-300">
                                    Tipo de OT
                                </label>
                                <select
                                    {...register("type" as const)}
                                    disabled={!isEditing}
                                    className="w-full mt-1 p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 disabled:bg-gray-50 disabled:border-gray-200 disabled:text-gray-600"
                                >
                                    <option value="Produccion">Producción</option>
                                    <option value="Calibracion">Calibración</option>
                                    <option value="Ensayo SE">Ensayo SE</option>
                                    <option value="Ensayo EE">Ensayo EE</option>
                                    <option value="Otros Servicios">Otros Servicios</option>
                                </select>
                            </div>

                        </div>
                    </fieldset>
                </Card>

                {/* --- Activities --- */}
                {!isEmployee && (
                    <OTDetailActivities
                    control={control}
                    register={register}
                    isFormEditable={isEditing} 
                    otMoneda={otMoneda}
                    users={users}
                    getAvailableActivities={getAvailableActivities}
                    />
                )}

                 {/* --- Invoices/Items --- */}
                 {!isEmployee && (
                    <OTDetailInvoices
                    control={control}
                    isFormEditable={isEditing}
                    facturas={otData.facturas || []}
                    facturasCliente={facturasCliente}
                    onOpenCreateModal={() => setCreateFacturaModalOpen(true)}
                    />
                )}

            </div>

            {/* --- RIGHT COLUMN (Sidebar) --- */}
            <div className="space-y-6">
                
                {/* --- Client Info --- */}
                <Card>
                    <fieldset disabled={!isEditing} className="p-6">
                         <h2 className="text-xl font-bold mb-4 flex items-center dark:text-white">
                            <UserSquare className="mr-3 text-gray-600 dark:text-gray-300" /> Información del Cliente
                        </h2>
                        <div className="space-y-4">
                            <Input label="Empresa" value={otData.client?.name} readOnly disabled className="disabled:opacity-100" />
                             <Input
                                label="Email"
                                value={otData.client?.email || 'N/A'}
                                readOnly
                                disabled
                                className="disabled:opacity-100"
                            />
                            <Input
                                label="Teléfono"
                                value={otData.client?.phone || 'N/A'}
                                readOnly
                                disabled
                                className="disabled:opacity-100"
                            />
                            <div>
                                <label className="text-sm font-medium dark:text-gray-300">
                                    Referente
                                </label>
                                <select
                                    {...register("contact_id")}
                                    disabled={!isEditing}
                                    className="w-full mt-1 p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 disabled:bg-gray-50 disabled:border-gray-200 disabled:text-gray-600"
                                >
                                    <option value="">Seleccionar referente...</option>
                                    {otData.client?.contacts?.map((c: Contact) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name} ({c.type})
                                    </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </fieldset>
                </Card>

                {/* --- Action Buttons & Warnings --- */}
                {!isEmployee && (
                    <Card>
                        <div className="p-6">
                            <h2 className="text-xl font-bold mb-4 flex items-center dark:text-white">
                                <CheckSquare className="mr-3 text-gray-600 dark:text-gray-300" /> Acciones Rápidas
                            </h2>
                            <div className="flex flex-col space-y-3">
                                {canAuthorizeOT() && !otData.authorized && (
                                <Button
                                    type="button"
                                    onClick={handleAuthorize}
                                    className="w-full bg-green-600 hover:bg-green-700"
                                >
                                    <CheckSquare className="mr-2 h-5 w-5" /> Autorizar OT
                                </Button>
                                )}
                                {canAuthorizeOT() &&
                                otData.authorized &&
                                otData.status === "pendiente" && (
                                    <Button
                                    type="button"
                                    onClick={handleDeauthorize}
                                    variant="danger"
                                    className="w-full"
                                    >
                                    <XSquare className="mr-2 h-5 w-5" /> Desautorizar OT
                                    </Button>
                                )}
                                
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsHistoryModalOpen(true)}
                                    className="w-full"
                                >
                                    <Clock className="mr-2 h-5 w-5" /> Ver Historial
                                </Button>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={handleOpenExportModal}
                                    className="w-full"
                                >
                                    <Download className="mr-2 h-5 w-5" /> Exportar PDF
                                </Button>

                                {user?.role === "director" && otData.status === "finalizada" && (
                                <Button
                                    type="button"
                                    onClick={handleCloseOT}
                                    className="w-full bg-purple-600 hover:bg-purple-700"
                                >
                                    <Archive className="mr-2 h-5 w-5" /> Cerrar OT
                                </Button>
                                )}
                            </div>
                            
                            {/* --- Lock State Warning --- */}
                            {!isFormEditable && !isEmployee && (
                                <div className="mt-4 bg-yellow-50 dark:bg-yellow-900/30 border-l-4 border-yellow-400 p-4 rounded-md">
                                    <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <Lock className="h-5 w-5 text-yellow-500" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-sm text-yellow-700 dark:text-yellow-200">
                                        Edición bloqueada: OT "{otData.status.replace("_", " ")}".
                                        </p>
                                    </div>
                                    </div>
                                </div>
                            )}

                        </div>
                    </Card>
                )}

                 {/* --- Employee View (Moved here if needed, or keep in main) --- */}
                 {/* For employee, layout might be simpler, but using same structure for now */}
                 {isEmployee && (
                    <Card>
                        <div className="p-6">
                             <OTDetailEmployeeView
                                myActivities={myActivities}
                                isAuthorized={otData.authorized}
                                onStartActivity={handleStartActivity}
                                onStopActivity={handleStopActivity}
                            />
                        </div>
                    </Card>
                 )}

                {/* --- Observations --- */}
                <Card>
                    <div className="p-6">
                        <h2 className="text-xl font-bold mb-4 flex items-center dark:text-white">
                            <BookText className="mr-3 text-gray-600 dark:text-gray-300" /> Observaciones
                        </h2>
                        <div>
                            <label className="text-sm font-medium dark:text-gray-300">
                            Generales (Cliente)
                            </label>
                            <textarea
                            {...register("observations" as const)}
                            disabled={!isEditing}
                            className="w-full mt-1 p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 disabled:bg-gray-50 disabled:border-gray-200 disabled:text-gray-600"
                            rows={4}
                            ></textarea>
                        </div>
                        <div className="mt-4">
                            <label className="text-sm font-medium dark:text-gray-300">
                            Internas (Colaborador)
                            </label>
                            <textarea
                            {...register("collaborator_observations" as const)}
                            disabled={!isEditing && !isEmployee}
                            className="w-full mt-1 p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 disabled:bg-gray-50 disabled:border-gray-200 disabled:text-gray-600"
                            rows={4}
                            placeholder={
                                isEmployee
                                ? "Añade tus observaciones aquí..."
                                : "Campo exclusivo para el empleado."
                            }
                            ></textarea>
                        </div>
                    </div>
                </Card>

            </div>
        </div>

        {/* --- Modal Footer (Only if used in modal mode, which is disabled now but kept for compatibility) --- */}
        {isModal && (
            <div className="flex justify-end gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button type="button" variant="ghost" onClick={toggleIsEditing}>
                Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting || !isDirty}>
                <Save className="mr-2 h-5 w-5" /> Guardar Cambios
                </Button>
            </div>
        )}
      </form>
    </FormProvider>
  );
};

export default OTDetailForm;
