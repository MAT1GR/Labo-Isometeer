// RUTA: /cliente/src/components/ui/Notifications.tsx

import React, { Fragment, useEffect, useRef } from "react";
import { useAuth } from "../../contexts/AuthContext";
import useSWR, { mutate } from "swr";
import {
  notificationService,
  Notification,
} from "../../services/notificationService";
import { Popover, Transition } from "@headlessui/react";
import { Bell, Check } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import Button from "./Button";

const Notifications: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: notifications } = useSWR(
    user ? `/notifications/${user.id}` : null,
    () => (user ? notificationService.getNotifications(user.id) : []),
    { refreshInterval: 15000 } // Refresca cada 15 segundos
  );

  const unreadNotifications = notifications?.filter((n) => !n.is_read) || [];

  // === INICIO CAMBIO 1: Lógica para reproducir sonido ===
  const prevUnreadCount = useRef(unreadNotifications.length);
  const initialLoad = useRef(true);

  useEffect(() => {
    // Evita que el sonido se reproduzca en la carga inicial de la página
    if (initialLoad.current) {
      initialLoad.current = false;
      prevUnreadCount.current = unreadNotifications.length;
      return;
    }

    // Si el nuevo conteo de no leídas es mayor que el anterior, reproduce el sonido
    if (unreadNotifications.length > prevUnreadCount.current) {
      const audio = new Audio("/notification.mp3");
      audio.play().catch((error) => {
        // La reproducción automática puede ser bloqueada por el navegador.
        // El usuario debe interactuar con la página primero.
        console.error("Error al reproducir el sonido de notificación:", error);
      });
    }

    // Actualiza el conteo previo para la siguiente comparación
    prevUnreadCount.current = unreadNotifications.length;
  }, [unreadNotifications.length]);
  // === FIN CAMBIO 1 ===

  const handleNotificationClick = async (notification: Notification) => {
    if (user && !notification.is_read) {
      await notificationService.markAsRead([notification.id], user.id);
      mutate(`/notifications/${user.id}`);
    }
    if (notification.ot_id) {
      navigate(`/ot/editar/${notification.ot_id}`);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (user && unreadNotifications.length > 0) {
      const unreadIds = unreadNotifications.map((n) => n.id);
      await notificationService.markAsRead(unreadIds, user.id);
      mutate(`/notifications/${user.id}`);
    }
  };

  return (
    <Popover className="relative">
      <Popover.Button className="relative rounded-full p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none">
        <Bell className="h-4 w-4" />
        {/* === INICIO CAMBIO 2: Indicador numérico (badge) === */}
        {unreadNotifications.length > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold ring-2 ring-white dark:ring-gray-800">
            {unreadNotifications.length}
          </span>
        )}
        {/* === FIN CAMBIO 2 === */}
      </Popover.Button>
      <Transition
        as={Fragment}
        enter="transition ease-out duration-200"
        enterFrom="opacity-0 translate-y-1"
        enterTo="opacity-100 translate-y-0"
        leave="transition ease-in duration-150"
        leaveFrom="opacity-100 translate-y-0"
        leaveTo="opacity-0 translate-y-1"
      >
        <Popover.Panel className="absolute left-0 z-50 mt-2 w-80 origin-top-left rounded-md bg-white dark:bg-gray-800 py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          <div className="px-4 py-2 flex justify-between items-center border-b dark:border-gray-700">
            <p className="font-semibold">Notificaciones</p>
            {unreadNotifications.length > 0 && (
              <Button variant="ghost" size="sm" onClick={handleMarkAllAsRead}>
                <Check className="h-4 w-4 mr-1" /> Marcar leídas
              </Button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications && notifications.length > 0 ? (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className="p-4 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer border-b dark:border-gray-700/50 last:border-b-0"
                >
                  <div className="flex items-start gap-3">
                    {!notification.is_read && (
                      <div className="mt-1.5 h-2 w-2 rounded-full bg-blue-500 flex-shrink-0"></div>
                    )}
                    <div className="flex-1">
                      <p
                        className={`text-sm ${
                          !notification.is_read
                            ? "font-semibold"
                            : "font-normal"
                        }`}
                      >
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {formatDistanceToNow(
                          new Date(notification.created_at),
                          {
                            addSuffix: true,
                            locale: es,
                          }
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-sm text-gray-500">
                No tienes notificaciones.
              </div>
            )}
          </div>
        </Popover.Panel>
      </Transition>
    </Popover>
  );
};

export default Notifications;
