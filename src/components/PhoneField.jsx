import { COUNTRIES, countryByIso, groupDigits } from '../lib/countries.js'

/**
 * Телефон: выбор страны + национальный номер. Одно поле на весь сайт — вход и обратная связь.
 *
 * value = { iso, national }; onChange получает новое значение. Вставили номер целиком с «+» —
 * код отрезается, а страна переключается на ту, чей это код.
 */
export default function PhoneField({ value, onChange, onBlur, autoFocus, invalid, id }) {
  const country = countryByIso(value.iso)

  const handleNumber = (e) => {
    const typed = e.target.value
    let digits = typed.replace(/\D/g, '')
    let iso = value.iso
    if (typed.trim().startsWith('+')) {
      // Длинные коды первыми: «+996» не должен прочитаться как «+9…».
      const match = [...COUNTRIES].sort((a, b) => b.code.length - a.code.length).find((c) => digits.startsWith(c.code))
      if (match) {
        if (match.code !== country.code) iso = match.iso
        digits = digits.slice(match.code.length)
      }
    }
    onChange({ iso, national: digits.slice(0, 12) })
  }

  return (
    <div className="reg-phone-row">
      <select
        className="reg-country"
        value={value.iso}
        onChange={(e) => onChange({ ...value, iso: e.target.value })}
        aria-label="Страна"
      >
        {COUNTRIES.map((c) => (
          <option key={c.iso} value={c.iso}>
            {c.name} +{c.code}
          </option>
        ))}
      </select>
      <span className="reg-code-prefix" aria-hidden="true">+{country.code}</span>
      <input
        id={id}
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        value={groupDigits(value.national)}
        onChange={handleNumber}
        onBlur={onBlur}
        placeholder={'0'.repeat(country.min).replace(/(\d{3})(?=\d)/g, '$1 ')}
        autoFocus={autoFocus}
        aria-invalid={invalid || undefined}
      />
    </div>
  )
}

/** Полный номер для API: «+код цифры». */
export const phoneToString = ({ iso, national }) => `+${countryByIso(iso).code}${national}`

/** Номер нужной длины для выбранной страны. */
export const phoneIsComplete = ({ iso, national }) => {
  const c = countryByIso(iso)
  return national.length >= c.min && national.length <= c.max
}
