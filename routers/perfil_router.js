import express from "express";
import { ver, actualizar } from "../controllers/perfilController.js";

const perfil_router = express.Router();

perfil_router.get("/", ver);
perfil_router.post("/", actualizar);

export default perfil_router;
