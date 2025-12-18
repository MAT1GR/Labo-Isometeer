// src/components/OTDetailSummary.tsx
import React from "react";
import { WorkOrder } from "../services/otService";
import { 
  FileText, 
  Calendar, 
  User, 
  HardHat, 
  Wrench,
  DollarSign,
  ClipboardList,
  ChevronRight,
  CheckCircle,
  Edit,
  Tag,        // For Numero de Lacre, Marca
  Box,         // For Modelo
  BookText,    // For Norma a Aplicar, Contrato
  Package,     // For Producto
  CreditCard // For Cotizacion
} from "lucide-react";
import Button from "./ui/Button";

interface OTDetailSummaryProps {
  otData: WorkOrder;
  onEdit: () => void;
  onAuthorize: () => void;
  onHistory: () => void;
  onAssignUsers: (activityId: number) => void;
  canAuthorizeOT: boolean;
}

const InfoCard: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
  <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
    <div className="flex items-center mb-4">
      {icon}
      <h2 className="text-xl font-bold ml-3 dark:text-white">{title}</h2>
    </div>
    {children}
  </div>
);

const DetailItem: React.FC<{ label: string; value: React.ReactNode; icon?: React.ReactNode }> = ({ label, value, icon }) => (
  <div className="mb-2 flex items-center gap-2">
    {icon}
    <div>
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className="font-semibold dark:text-gray-200">{value || "-"}</p>
    </div>
  </div>
);

const OTDetailSummary: React.FC<OTDetailSummaryProps> = ({ otData, onEdit, onAuthorize, onHistory, onAssignUsers, canAuthorizeOT }) => {
    
  const totalActivities = otData.activities?.length || 0;
  const completedActivities = otData.activities?.filter(a => a.status === 'finalizada').length || 0;
  const progress = totalActivities > 0 ? (completedActivities / totalActivities) * 100 : 0;
  const totalEstimado = otData.activities?.reduce((acc, act) => acc + (act.precio_sin_iva || 0), 0) || 0;

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">{otData.custom_id}</h1>
            <p className="text-gray-500 dark:text-gray-400">{otData.product}</p>
        </div>
        <div className="flex items-center gap-2">
            {!otData.authorized && (
                <span className="bg-yellow-100 text-yellow-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded dark:bg-yellow-900 dark:text-yellow-300">
                    No Autorizado
                </span>
            )}
            <Button onClick={onEdit} variant="outline">
                <Edit className="mr-2 h-4 w-4" /> Editar
            </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
            <InfoCard title="Detalles de la Orden de Trabajo" icon={<FileText className="text-gray-600 dark:text-gray-300" />}>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <DetailItem icon={<Calendar size={16} className="text-gray-500 dark:text-gray-400" />} label="Fecha de Creación" value={new Date(otData.date).toLocaleDateString()} />
                    <DetailItem icon={<Calendar size={16} className="text-gray-500 dark:text-gray-400" />} label="Fecha Estimada de Entrega" value={otData.estimated_delivery_date ? new Date(otData.estimated_delivery_date).toLocaleDateString() : 'N/A'} />
                    <DetailItem icon={<Calendar size={16} className="text-gray-500 dark:text-gray-400" />} label="Fecha de Vencimiento" value={otData.certificate_expiry ? new Date(otData.certificate_expiry).toLocaleDateString() : 'N/A'} />
                    <DetailItem icon={<BookText size={16} className="text-gray-500 dark:text-gray-400" />} label="Norma a Aplicar" value={[...new Set(otData.activities?.map(a => a.norma))].join(', ')} />
                    <DetailItem icon={<Tag size={16} className="text-gray-500 dark:text-gray-400" />} label="Número de Lacre" value={otData.seal_number} />
                    <DetailItem icon={<BookText size={16} className="text-gray-500 dark:text-gray-400" />} label="Contrato" value={otData.contract_type} />
                    <DetailItem icon={<CreditCard size={16} className="text-gray-500 dark:text-gray-400" />} label="Cotización" value={"N/A"} />
                    <DetailItem icon={<Tag size={16} className="text-gray-500 dark:text-gray-400" />} label="Marca" value={otData.brand} />
                    <DetailItem icon={<Box size={16} className="text-gray-500 dark:text-gray-400" />} label="Modelo" value={otData.model} />
                    <DetailItem icon={<Package size={16} className="text-gray-500 dark:text-gray-400" />} label="Producto" value={otData.product} />
                    <DetailItem icon={<DollarSign size={16} className="text-gray-500 dark:text-gray-400" />} label="Moneda" value={otData.moneda} />
                </div>
            </InfoCard>

            <InfoCard title="Actividades Asignadas" icon={<Wrench className="text-gray-600 dark:text-gray-300" />}>
                 {otData.activities?.length > 0 ? (
                    otData.activities.map(activity => (
                        <div key={activity.id} className="flex justify-between items-center p-3 mb-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                            <div>
                                <p className="font-semibold dark:text-white">{activity.activity}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Asignado a: {activity.assigned_users?.map(u => u.name).join(', ') || 'Nadie'}
                                </p>
                                <Button onClick={() => onAssignUsers(activity.id)} size="sm" className="mt-2">
                                  Asignar Usuarios
                                </Button>
                            </div>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                                activity.status === 'finalizada' ? 'bg-green-200 text-green-800' :
                                activity.status === 'en_progreso' ? 'bg-blue-200 text-blue-800' :
                                'bg-gray-200 text-gray-800'
                            }`}>
                                {activity.status}
                            </span>
                        </div>
                    ))
                 ) : (
                    <p className="text-gray-500 dark:text-gray-400">No hay actividades asignadas.</p>
                 )}
            </InfoCard>

             <InfoCard title="Items Asociados" icon={<DollarSign className="text-gray-600 dark:text-gray-300" />}>
                {otData.activities?.length > 0 ? (
                    <>
                        {otData.activities.map(activity => (
                            <div key={activity.id} className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                                <div>
                                    <p className="font-semibold dark:text-white">{activity.activity}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Cantidad: 1</p>
                                </div>
                                <p className="font-semibold dark:text-white">${activity.precio_sin_iva?.toLocaleString('es-AR') || '0'}</p>
                            </div>
                        ))}
                        <div className="flex justify-between items-center mt-4 pt-2 border-t-2 border-gray-300 dark:border-gray-600">
                            <p className="text-lg font-bold dark:text-white">Total Estimado</p>
                            <p className="text-lg font-bold text-green-600 dark:text-green-400">${totalEstimado.toLocaleString('es-AR')}</p>
                        </div>
                    </>
                ) : (
                    <p className="text-gray-500 dark:text-gray-400">No hay items asociados.</p>
                )}
             </InfoCard>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
             <InfoCard title="Información del Cliente" icon={<User className="text-gray-600 dark:text-gray-300" />}>
                <DetailItem label="Nombre del Cliente" value={otData.client?.name} />
                <DetailItem label="Email" value={otData.client?.email} />
                <DetailItem label="Teléfono" value={otData.client?.phone} />
             </InfoCard>

             <InfoCard title="Acciones Rápidas" icon={<HardHat className="text-gray-600 dark:text-gray-300" />}>
                <div className="flex flex-col space-y-2">
                    {canAuthorizeOT && !otData.authorized && (
                        <Button onClick={onAuthorize} className="w-full bg-green-600 hover:bg-green-700">Autorizar</Button>
                    )}
                    <Button onClick={onEdit} variant="outline" className="w-full">Seleccionar Actividades</Button>
                    <Button onClick={onHistory} variant="outline" className="w-full">Ver Historial</Button>
                    <Button onClick={onEdit} variant="outline" className="w-full">Gestionar Items</Button>
                </div>
             </InfoCard>

             <InfoCard title="Resumen de Progreso" icon={<ClipboardList className="text-gray-600 dark:text-gray-300" />}>
                <p className="dark:text-white">{completedActivities} de {totalActivities} actividades completadas.</p>
                <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mt-2">
                    <div className="bg-blue-600 h-2.5 rounded-full" style={{width: `${progress}%`}}></div>
                </div>
                <p className="text-right text-sm dark:text-gray-300 mt-1">{progress.toFixed(0)}% completado</p>
             </InfoCard>
             
             <InfoCard title="Observaciones" icon={<CheckCircle className="text-gray-600 dark:text-gray-300" />}>
                 <p className="text-gray-600 dark:text-gray-300">{otData.observations || 'No hay observaciones.'}</p>
             </InfoCard>
        </div>
      </div>
    </div>
  );
};

export default OTDetailSummary;
