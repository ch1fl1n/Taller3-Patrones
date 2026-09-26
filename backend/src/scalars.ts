import { GraphQLError, GraphQLScalarType, Kind } from 'graphql';

// Escalares personalizados del schema. Validan la entrada antes de que llegue a los
// resolvers: un UUID mal formado se rechaza en la capa GraphQL, no en la base de datos.

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseUuid(value: unknown): string {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) {
    throw new GraphQLError(`UUID inválido: ${JSON.stringify(value)}`);
  }
  return value.toLowerCase();
}

export const UUIDScalar = new GraphQLScalarType({
  name: 'UUID',
  description: 'Identificador UUID (RFC 4122)',
  serialize: parseUuid,
  parseValue: parseUuid,
  parseLiteral(ast) {
    if (ast.kind !== Kind.STRING) {
      throw new GraphQLError('UUID debe ser un string');
    }
    return parseUuid(ast.value);
  },
});

function parseDateTime(value: unknown): Date {
  const date = value instanceof Date ? value : typeof value === 'string' ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) {
    throw new GraphQLError(`DateTime inválido: ${JSON.stringify(value)}`);
  }
  return date;
}

export const DateTimeScalar = new GraphQLScalarType({
  name: 'DateTime',
  description: 'Fecha y hora en formato ISO 8601 (UTC)',
  // Postgres entrega timestamptz como string; se normaliza a ISO 8601 en UTC
  serialize: value => parseDateTime(value).toISOString(),
  parseValue: parseDateTime,
  parseLiteral(ast) {
    if (ast.kind !== Kind.STRING) {
      throw new GraphQLError('DateTime debe ser un string ISO 8601');
    }
    return parseDateTime(ast.value);
  },
});
