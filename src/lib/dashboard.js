// Личный кабинет инвестора живёт на отдельном поддомене, отдельным приложением.
// Адрес вынесен в env, чтобы стенд можно было увести на свой хост, не трогая код.
export const DASHBOARD_URL = (import.meta.env.VITE_DASHBOARD_URL || 'https://app.atria.kg/').replace(
  /\/?$/,
  '/',
)
