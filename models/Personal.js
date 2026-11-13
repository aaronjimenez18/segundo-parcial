import { DataTypes } from "sequelize";
import db from "../config/db.js";
import bcrypt from "bcryptjs";

const Personal = db.define(
  "Personal",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    nombre: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: "El nombre es obligatorio." },
      },
    },
    apellido: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: "El apellido es obligatorio." },
      },
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
    },
    edad: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 0, max: 120 },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: {
          args: [8, 72],
          msg: "La contraseña debe tener entre 8 y 72 caracteres.",
        },
        esSegura(value) {
          if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) {
            throw new Error(
              "La contraseña debe incluir al menos una letra y un número.",
            );
          }
        },
      },
    },
    confirmar: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    rol: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: {
          args: [["admin", "comprador"]],
          msg: "El rol debe ser admin o comprador.",
        },
      },
    },
  },
  {
    tableName: "personal",
    timestamps: false,
    hooks: {
      beforeCreate: async function (persona) {
        const rep = await bcrypt.genSalt(10);
        persona.password = await bcrypt.hash(persona.password, rep);
      },
      beforeUpdate: async function (persona) {
        if (!persona.changed("password")) return;
        const rep = await bcrypt.genSalt(10);
        persona.password = await bcrypt.hash(persona.password, rep);
      },
    },
  },
);

export default Personal;
