// Botones de impresión sin usar onclick (compatible con CSP estricta).
document.addEventListener("click", (evento) => {
  const boton = evento.target.closest("[data-print]");
  if (!boton) return;
  evento.preventDefault();
  window.print();
});
