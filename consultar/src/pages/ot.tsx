// RUTA: /cliente/src/pages/OT.tsx

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { otService, WorkOrder } from '../services/otService';
import { clientService, Client } from '../services/clientService';
import { useAuth } from '../contexts/AuthContext';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { PlusCircle, Briefcase, Trash2 } from 'lucide-react';

type OTFormData = Omit<WorkOrder, 'id' | 'created_at' | 'status' | 'client_name'>;

const OT: React.FC = () => {
  const { user } = useAuth();
  const [ots, setOts] = useState<WorkOrder[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<OTFormData>({
    defaultValues: {
      date: new Date().toISOString().split('T')[0] // Poner fecha de hoy por defecto
    }
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [otsData, clientsData] = await Promise.all([otService.getAllOTs(), clientService.getAllClients()]);
      setOts(otsData);
      setClients(clientsData);
    } catch (err: any) {
      setFormError(err.message || 'Error al cargar datos iniciales.');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: OTFormData) => {
    if (!user) return;
    const dataToSubmit = { ...data, client_id: Number(data.client_id), created_by: user.id };
    try {
      setFormError(null);
      await otService.createOT(dataToSubmit);
      reset({ date: new Date().toISOString().split('T')[0] });
      await loadInitialData();
    } catch (err: any) {
      setFormError(err.message);
    }
  };

  const handleDelete = async (otId: number) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta Orden de Trabajo?')) {
        try {
            await otService.deleteOT(otId);
            await loadInitialData();
        } catch (err: any) {
            alert(err.message || 'Error al eliminar la OT.');
        }
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Órdenes de Trabajo</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <h2 className="text-xl font-semibold flex items-center gap-2 mb-4"><Briefcase /> Lista de OTs</h2>
            {loading && <p>Cargando...</p>}
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {ots.map(ot => (
                            <tr key={ot.id}>
                                <td className="px-6 py-4 text-sm font-medium text-gray-900">OT-{ot.id}</td>
                                <td className="px-6 py-4 text-sm text-gray-500">{ot.client_name}</td>
                                <td className="px-6 py-4 text-sm text-gray-500">{ot.product}</td>
                                <td className="px-6 py-4 text-sm text-gray-500">{new Date(ot.date).toLocaleDateString('es-AR')}</td>
                                <td className="px-6 py-4 text-sm text-gray-500 capitalize">{ot.status.replace('_', ' ')}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <Button variant="danger" size="sm" onClick={() => handleDelete(ot.id)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
          </Card>
        </div>
        <div>
          <Card>
            <h2 className="text-xl font-semibold flex items-center gap-2 mb-4"><PlusCircle /> Crear Nueva OT</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input label="Fecha *" type="date" {...register('date', { required: true })} />
              <Input label="Tipo de Trabajo *" {...register('type', { required: true })} />
               <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Cliente *</label>
                  <select {...register('client_id', { required: true })} className="w-full rounded-md border border-gray-300 px-3 py-2 mt-2">
                      <option value="">Seleccione un cliente</option>
                      {clients.map(client => (<option key={client.id} value={client.id}>{client.name}</option>))}
                  </select>
              </div>
              <Input label="Producto / Equipo *" {...register('product', { required: true })} />
              <Input label="Contrato (Opcional)" {...register('contract')} />
              {formError && <p className="text-sm text-red-600">{formError}</p>}
              <Button type="submit" disabled={isSubmitting} className="w-full">{isSubmitting ? 'Creando...' : 'Crear OT'}</Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default OT;