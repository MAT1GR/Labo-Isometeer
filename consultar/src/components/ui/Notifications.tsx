// RUTA: /consultar/src/components/ui/Notifications.tsx

import React, { Fragment, useEffect, useRef, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import useSWR from "swr";
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
import axiosInstance from "../../api/axiosInstance";

const Notifications: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Se utiliza useState para tener un control directo y en tiempo real de la UI.
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // SWR se usa para la carga inicial de notificaciones.
  const { mutate: mutateSWR } = useSWR<Notification[]>(
    user ? `/notifications/${user.id}` : null,
    () =>
      user
        ? notificationService.getNotifications(user.id)
        : Promise.resolve([]),
    {
      revalidateOnFocus: false,
      onSuccess: (data) => {
        // Sincronizamos el estado local con los datos iniciales cargados por SWR.
        setNotifications(data);
      },
    }
  );

  // Efecto para manejar la conexión SSE, el sonido y el desbloqueo de audio.
  useEffect(() => {
    if (user) {
      // Se crea el objeto Audio una sola vez y se almacena en una ref.
      if (!audioRef.current) {
        audioRef.current = new Audio("/notification.mp3");
      }

      // SOLUCIÓN PARA EL SONIDO: Los navegadores bloquean el audio hasta que el usuario interactúa.
      // Esta función se ejecuta una vez con el primer clic en cualquier parte de la página
      // para "desbloquear" la capacidad de reproducir sonidos.
      const unlockAudio = () => {
        if (audioRef.current && audioRef.current.paused) {
          audioRef.current.play().catch(() => {});
          audioRef.current.pause(); // Lo pausamos inmediatamente, solo queremos el permiso.
        }
        // Una vez ejecutado, eliminamos el listener para no volver a hacerlo.
        document.body.removeEventListener("click", unlockAudio);
      };
      document.body.addEventListener("click", unlockAudio);

      // Se establece la conexión con el servidor para eventos en tiempo real.
      const eventSource = new EventSource(
        `${axiosInstance.defaults.baseURL}/notifications/events/${user.id}`
      );

      eventSource.onopen = () =>
        console.log("Conexión SSE para notificaciones establecida.");

      eventSource.onmessage = (event) => {
        try {
          const newNotification = JSON.parse(event.data) as Notification;
          // Se ignora el mensaje inicial de conexión que no es una notificación.
          if (!newNotification.id) return;

          // Se actualiza el estado local para un renderizado instantáneo de la nueva notificación.
          setNotifications((currentNotifications) => {
            // Prevenimos duplicados por si acaso.
            if (currentNotifications.find((n) => n.id === newNotification.id)) {
              return currentNotifications;
            }
            return [newNotification, ...currentNotifications];
          });

          // Se reproduce el sonido de la notificación.
          if (audioRef.current) {
            audioRef.current.play().catch((error) => {
              console.error(
                "No se pudo reproducir el sonido. El usuario debe interactuar con la página primero.",
                error
              );
            });
          }
        } catch (e) {
          // Capturamos mensajes que no sean JSON, como los pings de 'keep-alive'.
          console.log("Mensaje SSE no JSON recibido:", event.data);
        }
      };

      eventSource.onerror = (error) => {
        console.error("Error en la conexión SSE, se cerrará:", error);
        eventSource.close();
      };

      // Limpieza al desmontar el componente para cerrar la conexión.
      return () => {
        if (eventSource.readyState !== EventSource.CLOSED) {
          eventSource.close();
          console.log("Conexión SSE para notificaciones cerrada.");
        }
        document.body.removeEventListener("click", unlockAudio);
      };
    }
  }, [user]);

  const unreadNotifications = notifications?.filter((n) => !n.is_read) || [];

  const handleNotificationClick = async (notification: Notification) => {
    if (user && !notification.is_read) {
      await notificationService.markAsRead([notification.id], user.id);
      // Actualizamos el estado local y el cache de SWR.
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notification.id ? { ...n, is_read: true } : n
        )
      );
      mutateSWR();
    }
    if (notification.ot_id) {
      navigate(`/ot/editar/${notification.ot_id}`);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (user && unreadNotifications.length > 0) {
      const unreadIds = unreadNotifications.map((n) => n.id);
      await notificationService.markAsRead(unreadIds, user.id);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      mutateSWR();
    }
  };

  return (
    <>
      <audio
        ref={audioRef}
        src="/notification.mp3"
        preload="auto"
        style={{ display: "none" }}
      />
      <Popover className="relative">
        <Popover.Button className="relative rounded-full p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none">
          <Bell className="h-4 w-4" />
          {unreadNotifications.length > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold ring-2 ring-white dark:ring-gray-800">
              {unreadNotifications.length}
            </span>
          )}
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
          {/* --- CAMBIO: Se ajustan las clases para que el panel se despliegue desde la izquierda --- */}
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
    </>
  );
};

export default Notifications;
