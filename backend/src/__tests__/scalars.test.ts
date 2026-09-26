import { Kind } from 'graphql';
import { DateTimeScalar, UUIDScalar } from '../scalars';

describe('escalar UUID', () => {
  it('acepta UUIDs y los normaliza a minúsculas', () => {
    expect(UUIDScalar.parseValue('00000000-0000-0000-0000-00000000000A')).toBe('00000000-0000-0000-0000-00000000000a');
  });

  it.each(['abc', '123', '00000000-0000-0000-0000-00000000000', 42, null])('rechaza %p', value => {
    expect(() => UUIDScalar.parseValue(value)).toThrow('UUID');
  });

  it('rechaza literales que no son string', () => {
    expect(() => UUIDScalar.parseLiteral({ kind: Kind.INT, value: '1' })).toThrow();
  });
});

describe('escalar DateTime', () => {
  it('serializa timestamps de Postgres a ISO 8601 en UTC', () => {
    expect(DateTimeScalar.serialize('2026-09-25 10:00:00+00')).toBe('2026-09-25T10:00:00.000Z');
    expect(DateTimeScalar.serialize('2026-09-25T05:00:00-05:00')).toBe('2026-09-25T10:00:00.000Z');
  });

  it('rechaza fechas inválidas', () => {
    expect(() => DateTimeScalar.parseValue('ayer')).toThrow('DateTime');
    expect(() => DateTimeScalar.serialize(undefined)).toThrow('DateTime');
  });
});
