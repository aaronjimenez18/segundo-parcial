import express from "express";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import router_login from "./routers/login_router.js";
import reporte_router from "./routers/reporte_router.js";
import lote_router from "./routers/lote_router.js";
import compra_router from "./routers/compra_router.js";
import comprador_router from "./routers/comprador_router.js";
import especie_router from "./routers/especie_router.js";
import tipo_router from "./routers/tipo_router.js";
import perfil_router from "./routers/perfil_router.js";
import db from "./config/db.js";
import dotenv from "dotenv";
import methodOverride from "method-override";
import cookieParser from "cookie-parser";

import { verificarSesion } from "./middlewares/auth.js";
import { csrf } from "./middlewares/csrf.js";
import { capitalizar } from "./helpers/texto.js";

import createInitialAdmin from "./models/config_adm.js";
import "./models/index.js";

dotenv.config({ path: ".env" });

if (!process.env.SC_JWT) {
  throw new Error("Falta SC_JWT en el archivo .env");
}

const app = express();
const esProduccion = process.env.NODE_ENV === "production";

if (esProduccion) {
  app.set("trust proxy", 1);
}

// Cabeceras de seguridad y política de contenido.
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://fonts.googleapis.com",
          "https://cdn.jsdelivr.net",
        ],
        fontSrc: [
          "'self'",
          "https://fonts.gstatic.com",
          "https://cdn.jsdelivr.net",
        ],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: esProduccion ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: false,
    hsts: esProduccion ? undefined : false,
  }),
);

// Acceso a los datos del formulario
app.use(express.urlencoded({ extended: true }));

// Permitir PUT/DELETE vía ?_method=PUT
app.use(methodOverride("_method"));

// Middleware para parsear JSON
app.use(express.json());

// Lectura de cookies (sesión JWT y CSRF)
app.use(cookieParser());

// Archivos estáticos
app.use(
  express.static("public", {
    maxAge: esProduccion ? "7d" : 0,
  }),
);

// Mensajes flash: se leen una sola vez y se borran.
app.use((req, res, next) => {
  const guardado = req.cookies?.flash;
  if (guardado) {
    try {
      res.locals.flash = JSON.parse(guardado);
    } catch {
      // Si la cookie está corrupta, se ignora.
    }
    res.clearCookie("flash");
  }
  next();
});

// Protección CSRF para formularios.
app.use(csrf);

// Límite de intentos de inicio de sesión.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  // Solo cuentan los intentos fallidos; un ingreso correcto no gasta cupo.
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).render("login/login.ejs", {
      action: "/login/registrar",
      method: "POST",
      mensaje: null,
      error:
        "Demasiados intentos. Espera 15 minutos antes de volver a intentarlo.",
    });
  },
});
app.use("/login/registrar", loginLimiter);

// Helpers disponibles en todas las vistas
app.locals.capitalizar = capitalizar;

// Motor de vistas
app.set("view engine", "ejs");
app.set("views", "./views");

// Routing
// Público: inicio y cierre de sesión.
app.use("/", router_login);

// A partir de aquí todo exige sesión válida.
app.use(verificarSesion);
app.use("/perfil", perfil_router);
app.use("/reportes", reporte_router);
app.use("/lotes", lote_router);
app.use("/compras", compra_router);
app.use("/compradores", comprador_router);
app.use("/especies", especie_router);
app.use("/tipos", tipo_router);

// 404 para rutas autenticadas que no existen.
app.use((req, res) => {
  res.status(404).render("errores/404.ejs");
});

// Manejador central de errores: nunca muestra detalles internos al usuario.
app.use((err, req, res, next) => {
  console.error("Error no controlado:", err);
  if (res.headersSent) return next(err);
  return res.status(500).render("errores/500.ejs");
});

const port = Number(process.env.PORT) || 2800;

(async () => {
  try {
    await db.authenticate();
    console.log("Conexión a la base de datos establecida.");
    // sync sin alter evita que MySQL duplique índices únicos en cada reinicio
    await db.sync(); // crea tablas que falten; conserva el esquema existente
    console.log("Modelos sincronizados.");
    // Crear el administrador inicial si no existe.
    await createInitialAdmin();
    app.listen(port, () => {
      console.log(`Esperando peticiones en el puerto ${port}`);
    });
  } catch (err) {
    console.error("Error al iniciar:", err);
  }
})();
