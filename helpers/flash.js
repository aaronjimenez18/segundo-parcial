// Guarda un mensaje breve en una cookie para mostrarlo después de un redirect.
export const setFlash = (res, tipo, mensaje) => {
  res.cookie(
    "flash",
    JSON.stringify({ tipo, mensaje }),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 15 * 1000,
    },
  );
};
