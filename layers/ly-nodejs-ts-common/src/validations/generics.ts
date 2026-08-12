
type AllowedValue = string | number | boolean | null | undefined | object;

export const isEmpty = (...valores: AllowedValue[]): boolean => {
  const emptyValues: (string | number | boolean | null | undefined)[] = [
    null,
    undefined,
    'undefined',
    'null',
    '',
    0,
    false,
    'false',
  ];

  for (const valor of valores) {
    if (
      emptyValues.includes(valor as string | number | boolean | null | undefined) ||
      (Array.isArray(valor) && valor.length === 0) ||
      (typeof valor === 'object' && valor !== null && Object.keys(valor).length === 0)
    ) {
      return true;
    }
  }
  return false;
};