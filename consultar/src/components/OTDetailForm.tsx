// RUTA: /consultar/src/components/OTDetailForm.tsx

import React from "react";
import { useNavigate } from "react-router-dom";
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

const OTDetailForm: React.FC = () => {
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
    onSubmit,
    handleFacturaCreated,
    handleOpenExportModal,
    handleAuthorize,
    handleDeauthorize,
    handleCloseOT,
    handleStartActivity,
    handleStopActivity,
    getAvailableActivities,
  } = useOTDetailForm();

  const {
    register,
    control,
    formState: { isSubmitting, isDirty },
  } = formMethods;

  if (error) return <div className="p-8 text-red-500 text-center">{error}</div>;
  if (!otData)
    return <div className="p-8 text-center">Cargando datos de la OT...</div>;

  return (
    <>
      <NavigationPrompt when={isDirty && !isSaving} onSave={onSubmit} />

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
      <form onSubmit={onSubmit} className="space-y-6">
        {/* --- Header --- */}
        <div className="flex justify-between items-center flex-wrap gap-4">
          <Button type="button" variant="ghost" onClick={() => navigate("/ot")}>
            <ArrowLeft className="mr-2 h-5 w-5" /> Volver
          </Button>
          <div className="flex flex-col items-center">
            <h1 className="text-2xl font-bold text-center">
              Detalle de OT: {otData.custom_id || `#${otData.id}`}
            </h1>
            <div className="mt-1 text-sm font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full flex items-center gap-2">
              <DollarSign size={14} />
              <span>
                Los montos se gestionan en{" "}
                <strong>
                  {otMoneda === "USD" ? "Dólares (USD)" : "Pesos (ARS)"}
                </strong>
              </span>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsHistoryModalOpen(true)}
            >
              <Clock className="mr-2 h-5 w-5" /> Historial
            </Button>
            {!isEmployee && (
              <Button
                type="button"
                variant="secondary"
                onClick={handleOpenExportModal}
              >
                <Download className="mr-2 h-5 w-5" /> Exportar PDF
              </Button>
            )}
            <Button type="submit" disabled={isSubmitting || !isDirty}>
              <Save className="mr-2 h-5 w-5" /> Guardar
            </Button>
          </div>
        </div>

        {/* --- Action Buttons --- */}
        {!isEmployee && (
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm flex flex-wrap justify-center items-center gap-4">
            {canAuthorizeOT() && !otData.authorized && (
              <Button
                type="button"
                onClick={handleAuthorize}
                className="bg-green-600 hover:bg-green-700"
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
                >
                  <XSquare className="mr-2 h-5 w-5" /> Desautorizar OT
                </Button>
              )}
            {user?.role === "director" && otData.status === "finalizada" && (
              <Button
                type="button"
                onClick={handleCloseOT}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Archive className="mr-2 h-5 w-5" /> Cerrar OT
              </Button>
            )}
          </div>
        )}

        {/* --- Lock State Warning --- */}
        {!isFormEditable && !isEmployee && (
          <div className="bg-yellow-50 dark:bg-yellow-900/30 border-l-4 border-yellow-400 p-4 rounded-md">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Lock className="h-5 w-5 text-yellow-500" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700 dark:text-yellow-200">
                  La edición está bloqueada porque la OT ya se encuentra "
                  {otData.status.replace("_", " ")}".
                </p>
              </div>
            </div>
          </div>
        )}

        {/* --- Employee View --- */}
        {isEmployee && (
          <OTDetailEmployeeView
            myActivities={myActivities}
            isAuthorized={otData.authorized}
            onStartActivity={handleStartActivity}
            onStopActivity={handleStopActivity}
          />
        )}

        <div className="space-y-6">
          {/* --- Main Info --- */}
          <Card>
            <fieldset disabled={!isFormEditable} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Input label="Fecha" type="date" {...register("date")} />
                <div>
                  <label className="text-sm font-medium dark:text-gray-300">
                    Tipo de OT
                  </label>
                  {/* --- CORRECCIÓN: Se usa `as const` para asegurar el tipo --- */}
                  <select
                    {...register("type" as const)}
                    className="w-full mt-1 p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                  >
                    <option value="Produccion">Producción</option>
                    <option value="Calibracion">Calibración</option>
                    <option value="Ensayo SE">Ensayo SE</option>
                    <option value="Ensayo EE">Ensayo EE</option>
                    <option value="Otros Servicios">Otros Servicios</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium dark:text-gray-300">
                    Contrato
                  </label>
                  <select
                    {...register("contract_type" as const)}
                    className="w-full mt-1 p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                  >
                    <option value="">Sin contrato</option>
                    {contracts.map((contract) => (
                      <option key={contract.id} value={contract.name}>
                        {contract.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium dark:text-gray-300">
                    Moneda
                  </label>
                  <select
                    {...register("moneda")}
                    className="w-full mt-1 p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                  >
                    <option value="ARS">ARS (Pesos)</option>
                    <option value="USD">USD (Dólares)</option>
                  </select>
                </div>
              </div>
            </fieldset>
          </Card>

          {/* --- Client Info --- */}
          <Card>
            <fieldset disabled={!isFormEditable} className="p-6">
              <h2 className="text-lg font-semibold text-blue-700 dark:text-blue-400 col-span-full mb-4 flex items-center gap-2">
                <UserSquare size={20} /> Información del Cliente
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input label="Empresa" value={otData.client?.name} readOnly />
                <Input
                  label="Nº Cliente"
                  value={otData.client?.code}
                  readOnly
                />
                <div className="col-span-full">
                  <label className="text-sm font-medium dark:text-gray-300">
                    Referente
                  </label>
                  <select
                    {...register("contact_id")}
                    disabled={!isFormEditable}
                    className="w-full mt-1 p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                  >
                    <option value="">Seleccionar referente...</option>
                    {/* --- CORRECCIÓN: Se añade tipo explícito a 'c' --- */}
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

          {/* --- Product Info --- */}
          <Card>
            <fieldset disabled={!isFormEditable} className="p-6">
              <h2 className="text-lg font-semibold text-blue-700 dark:text-blue-400 col-span-full mb-4 flex items-center gap-2">
                <Package size={20} /> Producto
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input label="Nombre *" {...register("product" as const)} />
                <Input label="Marca" {...register("brand")} />
                <Input label="Modelo" {...register("model")} />
                <Input
                  label="Nº de Lacre"
                  {...register("seal_number" as const)}
                  disabled={!isLacreEnabled}
                />
                <Input
                  label="Vto. del Certificado"
                  type="date"
                  {...register("certificate_expiry")}
                  disabled={!isLacreEnabled}
                />
                <Input
                  label="Fecha de Entrega Estimada"
                  type="date"
                  {...register("estimated_delivery_date")}
                />
              </div>
            </fieldset>
          </Card>

          {/* --- Activities --- */}
          {!isEmployee && (
            <OTDetailActivities
              control={control}
              register={register}
              isFormEditable={isFormEditable}
              otMoneda={otMoneda}
              users={users}
              getAvailableActivities={getAvailableActivities}
            />
          )}

          {/* --- Invoices --- */}
          {!isEmployee && (
            <OTDetailInvoices
              control={control}
              isFormEditable={isFormEditable}
              // --- CORRECCIÓN: Se asegura de pasar siempre un array ---
              facturas={otData.facturas || []}
              facturasCliente={facturasCliente}
              onOpenCreateModal={() => setCreateFacturaModalOpen(true)}
            />
          )}

          {/* --- Observations --- */}
          <Card>
            <div className="p-6">
              <h2 className="text-lg font-semibold text-blue-700 dark:text-blue-400 col-span-full mb-4 flex items-center gap-2">
                <BookText size={20} /> Observaciones
              </h2>
              <div>
                <label className="text-sm font-medium dark:text-gray-300">
                  Observaciones Generales (visibles para el cliente)
                </label>
                <textarea
                  {...register("observations" as const)}
                  disabled={!isFormEditable}
                  className="w-full mt-1 p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 disabled:bg-gray-100 dark:disabled:bg-gray-800"
                  rows={4}
                ></textarea>
              </div>
              <div className="mt-4">
                <label className="text-sm font-medium dark:text-gray-300">
                  Observaciones del Colaborador (uso interno)
                </label>
                <textarea
                  {...register("collaborator_observations" as const)}
                  disabled={!isFormEditable && !isEmployee}
                  className="w-full mt-1 p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 disabled:bg-gray-100 dark:disabled:bg-gray-800"
                  rows={4}
                  placeholder={
                    isEmployee
                      ? "Añade tus observaciones aquí..."
                      : "Campo de uso exclusivo para el empleado asignado."
                  }
                ></textarea>
              </div>
            </div>
          </Card>
        </div>
      </form>
    </>
  );
};

export default OTDetailForm;
