import { isValidDocumentUrl, simulatePharmacistReview } from '../domain/prescription';
import { parseCommandError } from '../commands/errors';

describe('evidencia de fórmula médica', () => {
  it.each(['https://docs.ejemplo.com/formula.pdf', 'http://localhost/f.png', '  https://x.co/a  '])(
    'acepta el enlace %p',
    url => {
      expect(isValidDocumentUrl(url)).toBe(true);
    }
  );

  it.each(['', '   ', 'formula.pdf', 'ftp://docs.ejemplo.com/f.pdf', 'javascript:alert(1)', null, undefined])(
    'rechaza %p',
    url => {
      expect(isValidDocumentUrl(url)).toBe(false);
    }
  );

  it('la revisión simulada rechaza enlaces con "rechaz" y aprueba el resto', () => {
    expect(simulatePharmacistReview('https://x.co/formula-rechazada.pdf')).toBe('REJECTED');
    expect(simulatePharmacistReview('https://x.co/RECHAZO.pdf')).toBe('REJECTED');
    expect(simulatePharmacistReview('https://x.co/formula.pdf')).toBe('VALIDATED');
  });
});

describe('errores de las funciones SQL', () => {
  it('separa el código del detalle', () => {
    expect(parseCommandError('INSUFFICIENT_STOCK:abc-123')).toEqual({ code: 'INSUFFICIENT_STOCK', detail: 'abc-123' });
    expect(parseCommandError('PRESCRIPTION_REQUIRED')).toEqual({ code: 'PRESCRIPTION_REQUIRED', detail: undefined });
  });
});
