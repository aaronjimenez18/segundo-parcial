import express from "express";
import { inicio } from "../controllers/compradorController.js";
import { soloAdmin } from "../middlewares/auth.js";

const router = express.Router();

// Los perfiles de compra son de solo lectura: se crean automáticamente cuando
// un comprador inicia sesión y no se editan desde la aplicación.
router.use(soloAdmin);

router.get("/", inicio);

export default router;
