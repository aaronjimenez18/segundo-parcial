import express from "express";
import { login, autenticar, logout } from "../controllers/loginControllers.js";
const router_login = express.Router();
// Routing público: inicio de sesión y cierre de sesión
router_login.get("/", login);
router_login.get("/login", login);
router_login.post("/login/registrar", autenticar);
router_login.post("/logout", logout);
export default router_login;
