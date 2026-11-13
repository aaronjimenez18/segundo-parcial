import { DataTypes } from "sequelize";
import db from "../config/db.js";

const Especie = db.define(
  "Especie",
  {
    id_epe: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    nombre: {
      type: DataTypes.STRING(25),
      allowNull: false,
      validate: {
        notEmpty: { msg: "El nombre de la especie es obligatorio." },
        len: { args: [1, 25], msg: "El nombre admite máximo 25 caracteres." },
      },
    },
    id_lte: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        loteValido(value) {
          if (!Number.isInteger(Number(value)) || Number(value) < 1) {
            throw new Error("Selecciona un lote válido.");
          }
        },
      },
    },
    id_tpo: {
      type: DataTypes.SMALLINT,
      allowNull: false,
      validate: {
        tipoValido(value) {
          if (!Number.isInteger(Number(value)) || Number(value) < 1) {
            throw new Error("Selecciona un tipo válido.");
          }
        },
      },
    },
    imagen: {
      type: DataTypes.STRING(100),
      allowNull: true,
      validate: {
        len: { args: [0, 100], msg: "La imagen admite máximo 100 caracteres." },
      },
    },
  },
  {
    tableName: "especie",
    timestamps: false,
  },
);

export default Especie;
