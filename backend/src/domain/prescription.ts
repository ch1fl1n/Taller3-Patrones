// Reglas de la evidencia de fórmula médica.

// Validación síncrona de entrada: la evidencia debe ser un enlace http(s) al documento
export function isValidDocumentUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  try {
    const { protocol } = new URL(url.trim());
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

// Revisión simulada del químico farmacéutico (no hay validador externo real en el taller).
// Es determinista para poder demostrar ambos caminos: un documento cuyo enlace
// contenga "rechaz" (p. ej. .../formula-rechazada.pdf) se rechaza; cualquier otro se aprueba.
export function simulatePharmacistReview(documentUrl: string): 'VALIDATED' | 'REJECTED' {
  return /rechaz/i.test(documentUrl) ? 'REJECTED' : 'VALIDATED';
}
