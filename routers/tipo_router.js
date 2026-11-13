import express from "express";
import {
  inicio,
  verCrear,
  registro,
  editar,
  actualizar,
  eliminar,
} from "../controllers/tipoController.js";
import { soloAdmin } from "../middlewares/auth.js";

const router = express.Router();

router.use(soloAdmin);

router.get("/", inicio);
router.get("/crear", verCrear);
router.post("/registrar", registro);
router.get("/:id/editar", editar);
router.put("/:id", actualizar);
router.delete("/:id", eliminar);

export default router;
