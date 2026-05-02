export function printJson(value: unknown, pretty = true): void {
  console.log(JSON.stringify(value, null, pretty ? 2 : 0));
}
