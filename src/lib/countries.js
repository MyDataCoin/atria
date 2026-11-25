// Страны для выбора кода телефона. Порядок — по тому, откуда приходят наши инвесторы:
// сначала Кыргызстан и соседи, затем страны, где живёт много выходцев из Центральной Азии.
// min/max — длина национального номера (без кода страны), чтобы ловить опечатки до отправки.
export const COUNTRIES = [
  { iso: 'KG', name: 'Кыргызстан', code: '996', min: 9, max: 9 },
  { iso: 'KZ', name: 'Казахстан', code: '7', min: 10, max: 10 },
  { iso: 'RU', name: 'Россия', code: '7', min: 10, max: 10 },
  { iso: 'UZ', name: 'Узбекистан', code: '998', min: 9, max: 9 },
  { iso: 'TJ', name: 'Таджикистан', code: '992', min: 9, max: 9 },
  { iso: 'TR', name: 'Турция', code: '90', min: 10, max: 10 },
  { iso: 'AE', name: 'ОАЭ', code: '971', min: 8, max: 9 },
  { iso: 'KR', name: 'Южная Корея', code: '82', min: 9, max: 10 },
  { iso: 'CN', name: 'Китай', code: '86', min: 11, max: 11 },
  { iso: 'US', name: 'США', code: '1', min: 10, max: 10 },
  { iso: 'GB', name: 'Великобритания', code: '44', min: 10, max: 10 },
  { iso: 'DE', name: 'Германия', code: '49', min: 10, max: 11 },
  { iso: 'CZ', name: 'Чехия', code: '420', min: 9, max: 9 },
  { iso: 'PL', name: 'Польша', code: '48', min: 9, max: 9 },
  { iso: 'UA', name: 'Украина', code: '380', min: 9, max: 9 },
  { iso: 'BY', name: 'Беларусь', code: '375', min: 9, max: 9 },
  { iso: 'GE', name: 'Грузия', code: '995', min: 9, max: 9 },
  { iso: 'AZ', name: 'Азербайджан', code: '994', min: 9, max: 9 },
  { iso: 'AM', name: 'Армения', code: '374', min: 8, max: 8 },
]

export const DEFAULT_COUNTRY = 'KG'

export const countryByIso = (iso) => COUNTRIES.find((c) => c.iso === iso) || COUNTRIES[0]

/** Группирует национальные цифры по три для читаемости: 700 123 456. */
export const groupDigits = (digits) => digits.replace(/(\d{3})(?=\d)/g, '$1 ')
