import express from "express";
import { diario } from "../controllers/reporteController.js";
import { soloAdmin } from "../middlewares/auth.js";

const reporte_router = express.Router();

// Los reportes son exclusivos del administrador.
reporte_router.use(soloAdmin);

reporte_router.get("/diario", diario);

export default reporte_router;
