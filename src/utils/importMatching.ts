export const importNameKey=(value:unknown)=>typeof value==='string'?value.trim().normalize('NFC').toLocaleLowerCase():'';
export function matchingNames<T extends {name?:unknown}>(values:T[],name:unknown):T[] {
  const key=importNameKey(name);return key?values.filter(value=>importNameKey(value.name)===key):[];
}
