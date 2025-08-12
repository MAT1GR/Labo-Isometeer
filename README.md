Labo-Isometeer
Labo-Isometeer es una aplicación web integral diseñada para la gestión interna de laboratorios. Permite administrar órdenes de trabajo, clientes, usuarios y contratos, optimizando los flujos de trabajo y centralizando la información operativa.

Tabla de Contenidos
Descripción

Características Principales

Tecnologías Utilizadas

Estructura del Proyecto

Instalación

Scripts Disponibles

Variables de Entorno

Endpoints de la API

Licencia

Descripción
Este proyecto consiste en una aplicación full-stack con un backend (servidor) construido en Node.js con Express y una base de datos SQLite, y un frontend (consultar) desarrollado con React y Vite. El sistema está diseñado para facilitar la gestión de las operaciones diarias de un laboratorio, ofreciendo un panel de control con estadísticas, gestión detallada de órdenes de trabajo (OTs), y un sistema de roles para controlar el acceso a las diferentes funcionalidades.

Características Principales
Gestión de Usuarios: Sistema de autenticación con roles (empleado, director, administración, administrador). Permite crear, eliminar y gestionar usuarios, incluyendo la importación masiva desde archivos XLSX.

Gestión de Clientes: Funcionalidad CRUD (Crear, Leer, Actualizar, Eliminar) completa para clientes y sus contactos asociados. También soporta importación masiva.

Órdenes de Trabajo (OTs): Creación y seguimiento detallado de OTs, asignación de actividades a usuarios, seguimiento de estados (pendiente, en progreso, finalizada, etc.) y generación de un ID personalizado y único.

Dashboard Interactivo: Panel de control que muestra estadísticas clave sobre OTs, ingresos, clientes y puntos acumulados por los empleados, con filtros por período (semana, mes, año).

Sistema de Puntos: Asignación de puntos a los empleados por actividades completadas, con gráficos para visualizar y comparar el rendimiento.

Generación de PDFs: Exportación de OTs, remitos y etiquetas en formato PDF.

Gestión de Contratos: Módulo para que los administradores puedan subir y gestionar los PDFs de los contratos que se adjuntan a las OTs.

Interfaz Moderna: Frontend reactivo construido con Tailwind CSS para una experiencia de usuario limpia y adaptable a diferentes dispositivos.

Tecnologías Utilizadas
Backend (servidor)
Node.js

Express

TypeScript

Better-sqlite3 para la base de datos SQLite.

bcryptjs para el hashing de contraseñas.

Multer para la subida de archivos (contratos y favicon).

cors y dotenv.

Frontend (consultar)
React

Vite como herramienta de construcción y servidor de desarrollo.

TypeScript

Tailwind CSS para el diseño de la interfaz.

SWR para el fetching de datos y cacheo.

React Hook Form y Zod para la gestión y validación de formularios.

Recharts para la visualización de gráficos y estadísticas.

Lucide React para los íconos.

jsPDF y pdf-lib para la generación de documentos PDF del lado del cliente.

Estructura del Proyecto
/
├── consultar/        # Frontend de la aplicación (React + Vite)
│   ├── public/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── contexts/
│   │   ├── lib/
│   │   ├── pages/
│   │   └── services/
│   ├── package.json
│   └── ...
├── servidor/         # Backend de la aplicación (Node.js + Express)
│   ├── src/
│   │   ├── config/
│   │   ├── routes/
│   │   └── server.ts
│   ├── uploads/      # Directorio para archivos subidos (contratos)
│   ├── laboratorio.db # Base de datos SQLite
│   └── package.json
└── README.md
Instalación
Sigue estos pasos para levantar el entorno de desarrollo local.

Prerrequisitos
Node.js (versión 18 o superior)

NPM (o un gestor de paquetes compatible como Yarn o pnpm)

Backend
Navega al directorio del servidor:

Bash

cd servidor
Instala las dependencias:

Bash

npm install
Inicia el servidor de desarrollo:

Bash

npm run dev
El backend estará corriendo en http://localhost:4000.

Frontend
Abre una nueva terminal y navega al directorio del cliente:

Bash

cd consultar
Instala las dependencias:

Bash

npm install
Asegúrate de que la URL del backend en src/api/axiosInstance.ts sea correcta. Por defecto, apunta a http://localhost:4000/api.

Inicia el cliente de desarrollo:

Bash

npm run dev
La aplicación estará disponible en la dirección que indique Vite en la terminal (generalmente http://localhost:5173).

Scripts Disponibles
En ambos directorios (servidor y consultar), puedes ejecutar los siguientes scripts:

npm run dev: Inicia el servidor de desarrollo con recarga en caliente.

npm run build: Compila el proyecto para producción (solo en el frontend).

npm start: Inicia el servidor en modo producción (solo en el backend, requiere compilación previa).

Variables de Entorno
El proyecto de frontend (consultar) utiliza un archivo .env para configurar las variables de entorno. Puedes crear un archivo .env en la raíz del directorio consultar basándote en el archivo .env.example:

VITE_API_BASE_URL=http://localhost:4000/api
Endpoints de la API
El servidor expone los siguientes endpoints principales bajo el prefijo /api:

/auth: Autenticación de usuarios (/login).

/users: Gestión de usuarios (CRUD y carga masiva).

/clients: Gestión de clientes (CRUD y carga masiva).

/ots: Gestión de órdenes de trabajo y sus actividades.

/dashboard: Datos agregados para el panel de control.

/statistics: Estadísticas detalladas por usuario y generales.

/contracts: Visualización y actualización de contratos en PDF.

/admin: Rutas para la administración del sistema (puntajes, favicon).

Licencia
Este proyecto está licenciado bajo la Licencia MIT. Consulta el archivo LICENSE para más detalles.
