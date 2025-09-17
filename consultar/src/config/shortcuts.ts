// RUTA: consultar/src/config/shortcuts.ts

export interface Shortcut {
  keys: string;
  description: string;
}

export interface Shortcuts {
  [action: string]: Shortcut;
}

// Aquí defines todas las acciones y sus atajos por defecto
export const defaultShortcuts: Shortcuts = {
  CREATE_NEW_OT: { keys: "alt+n", description: "Crear nueva Orden de Trabajo" },
  SAVE_FORM: { keys: "ctrl+s", description: "Guardar formulario actual" },
  GO_TO_DASHBOARD: { keys: "alt+d", description: "Ir al Dashboard" },
  GO_TO_OTS: { keys: "alt+o", description: "Ir a Órdenes de Trabajo" },
  GO_TO_CLIENTS: { keys: "alt+c", description: "Ir a Clientes" },
  TOGGLE_THEME: { keys: "alt+t", description: "Cambiar tema (claro/oscuro)" },
};

// Función para cargar los atajos (los por defecto + los guardados por el usuario)
export const getShortcuts = (): Shortcuts => {
  try {
    const customShortcuts = localStorage.getItem("keyboardShortcuts");
    if (customShortcuts) {
      // Combina los atajos guardados con los por defecto para no perder nuevos atajos
      return { ...defaultShortcuts, ...JSON.parse(customShortcuts) };
    }
  } catch (error) {
    console.error("Error al cargar los atajos personalizados:", error);
  }
  return defaultShortcuts;
};
