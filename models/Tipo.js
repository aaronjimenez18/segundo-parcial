import { DataTypes } from "sequelize";
import db from "../config/db.js";

const Tipo = db.define(
  "Tipo",
  {
    id_tpo: {
      type: DataTypes.SMALLINT,
      autoIncrement: true,
      primaryKey: true,
    },
    nombre: {
      type: DataTypes.STRING(30),
      allowNull: false,
      validate: {
        notEmpty: { msg: "El nombre del tipo es obligatorio." },
        len: { args: [1, 30], msg: "El nombre admite máximo 30 caracteres." },
      },
    },
  },
  {
    tableName: "tipo",
    timestamps: false,
  },
);

export default Tipo;
