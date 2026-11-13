import { QueryTypes } from "sequelize";
import db from "../config/db.js";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config({ path: ".env" });

async function createInitialAdmin() {
  const adminUser = process.env.ADMIN_USER;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminEmail = process.env.ADMIN_EMAIL || "admin@araggon.unam.mx";

  if (!adminUser || !adminPassword || !adminEmail) {
    console.warn(
      "No se definieron ADMIN_USER, ADMIN_EMAIL o ADMIN_PASSWORD. Saltando creación de admin.",
    );
    return;
  }

  try {
    const [existing] = await db.query(
      "SELECT id FROM personal WHERE email = ? LIMIT 1",
      { replacements: [adminEmail], type: QueryTypes.SELECT },
    );

    if (existing != undefined) {
      // Una cuenta existente debe quedar confirmada para poder iniciar sesión.
      await db.query(
        "UPDATE personal SET confirmar = 1 WHERE id = ? AND confirmar = 0",
        { replacements: [existing.id], type: QueryTypes.UPDATE },
      );
      console.log("El usuario administrador ya existe. No se requiere acción.");
      return;
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(adminPassword, saltRounds);

    await db.query(
      "INSERT INTO personal (nombre, apellido, email, edad, password, rol, confirmar) VALUES (?, ?, ?, ?, ?, ?, ?)",
      {
        replacements: [
          "Administrador",
          "Administrador",
          adminEmail,
          50,
          passwordHash,
          "admin",
          1,
        ],
        type: QueryTypes.INSERT,
      },
    );

    console.log("Usuario administrador inicial creado exitosamente.");
  } catch (error) {
    console.error("Error al crear el usuario administrador inicial:", error);
  }
}

export default createInitialAdmin;
