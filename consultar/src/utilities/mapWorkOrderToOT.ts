import { OT, ActivityType, ChangeType, ContactType, DescriptionItemType } from "../types/typeOT";
import { WorkOrder, Activity } from "../types/workOrder";

export function mapWorkOrderToOT(workOrder: WorkOrder): OT {
    
    const mapActivities = (activities: Activity[]): ActivityType[] => {
        return activities.map(act => ({
            id: act.id,
            name: act.name as string,
            score: 0, // Assuming default score
            time: act.hours_spent || 0,
            users: act.assigned_users ? act.assigned_users.map((u:any) => u.name) : [],
            state: act.status === 'finalizada' ? 'END' : act.status === 'en_progreso' ? 'STARTED' : 'CREATED',
        }));
    };

    const ot: OT = {
        id: workOrder.id,
        OTKey: workOrder.custom_id || `Interno #${workOrder.id}`,
        Client: workOrder.client_name || '',
        Date: new Date(workOrder.date),
        Producto: workOrder.product as string,
        Marca: '', // Not available in WorkOrder
        Modelo: '', // Not available in WorkOrder
        NormaAplicar: '', // Not available in WorkOrder
        Cotizacion: '', // Not available in WorkOrder
        FechaVencimiento: workOrder.certificate_expiry ? new Date(workOrder.certificate_expiry) : null,
        FechaEstimada: new Date(workOrder.estimated_delivery_date),
        Type: '', // Not available in WorkOrder
        Description: [], // Not available in WorkOrder
        StateProcess: workOrder.status,
        Observations: workOrder.description,
        Contact: [{
            type: 'default',
            contact: workOrder.contact_name,
            email: workOrder.contact_email,
            cell: workOrder.contact_phone
        }],
        Changes: [], // Not available in WorkOrder
        Auth: workOrder.authorized ? 1 : 0,
        Activities: mapActivities(workOrder.activities),
        IdClient: String(workOrder.client_id),
        Availability: null, // Not available in WorkOrder
        Factura: [], // Not available in WorkOrder
        Facturas: [], // Not available in WorkOrder
        contractName: 0, // Not available in WorkOrder
        isClose: workOrder.status === 'cerrada' ? 1 : 0,
        nLacre: '', // Not available in WorkOrder
        priority: workOrder.priority
    };

    return ot;
}
