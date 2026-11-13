import { DataTypes } from "sequelize";
import db from "../config/db.js";

const Comprador = db.define(
  "Comprador",
  {
    codigo_cpr: {
      type: DataTypes.SMALLINT,
      autoIncrement: true,
      primaryKey: true,
    },
    nombre: {
      type: DataTypes.STRING(15),
      allowNull: false,
      validate: {
        notEmpty: { msg: "El nombre es obligatorio." },
        len: { args: [1, 15], msg: "El nombre admite máximo 15 caracteres." },
      },
    },
    apellido_paterno: {
      type: DataTypes.STRING(15),
      allowNull: false,
      validate: {
        notEmpty: { msg: "El apellido paterno es obligatorio." },
        len: {
          args: [1, 15],
          msg: "El apellido paterno admite máximo 15 caracteres.",
        },
      },
    },
    apellido_materno: {
      type: DataTypes.STRING(15),
      allowNull: false,
      validate: {
        notEmpty: { msg: "El apellido materno es obligatorio." },
        len: {
          args: [1, 15],
          msg: "El apellido materno admite máximo 15 caracteres.",
        },
      },
    },
    direccion: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: {
        notEmpty: { msg: "La dirección es obligatoria." },
        len: { args: [1, 200], msg: "La dirección admite máximo 200 caracteres." },
      },
    },
    correo: {
      type: DataTypes.STRING(80),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: { msg: "El correo no tiene un formato válido." },
        notEmpty: { msg: "El correo es obligatorio." },
      },
    },
  },
  {
    tableName: "comprador",
    timestamps: false,
  },
);

export default Comprador;
