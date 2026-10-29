export const removeAccents = (str) => {
  if (!str) return ''
  return str.toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
}
