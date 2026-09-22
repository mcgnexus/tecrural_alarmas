/** Una prueba explícita se confirma al cliente, pero nunca se incorpora al CRM. */
export function esSolicitudDePrueba(esPrueba: boolean | undefined): boolean {
  return esPrueba === true;
}
