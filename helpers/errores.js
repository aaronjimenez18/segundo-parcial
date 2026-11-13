// Convierte errores de Sequelize en mensajes legibles para el usuario.
// Los errores desconocidos no se muestran al cliente para no filtrar detalles.
export const mensajeError = (err) => {
  if (
    err?.name === "SequelizeValidationError" ||
    err?.name === "SequelizeUniqueConstraintError"
  ) {
    return err.errors.map((e) => e.message).join(" · ");
  }
  if (err?.name === "SequelizeForeignKeyConstraintError") {
    return "No se puede completar: el registro está en uso o depende de otro registro.";
  }
  return "Ocurrió un error inesperado. Intenta de nuevo.";
};
