import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config({ path: ".env" });

const JWTGenera = (info) =>
  jwt.sign(
    {
      id: info.id,
      nombre: info.mail,
    },
    process.env.SC_JWT,
    {
      expiresIn: "1d",
    },
  );

export { JWTGenera };
