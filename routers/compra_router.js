import express from "express";
import {
  inicio,
  verCrear,
  registro,
  editar,
  actualizar,
  eliminar,
} from "../controllers/compraController.js";
import { soloAdmin } from "../middlewares/auth.js";

const router = express.Router();

// El comprador puede ver sus compras y realizar una nueva.
router.get("/", inicio);
router.get("/crear", verCrear);
router.post("/registrar", registro);

// Solo el administrador puede corregir o eliminar compras ya registradas.
router.get("/:id/editar", soloAdmin, editar);
router.put("/:id", soloAdmin, actualizar);
router.delete("/:id", soloAdmin, eliminar);

export default router;
