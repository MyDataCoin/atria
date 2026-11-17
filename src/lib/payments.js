// Оплата заявки в крипте: USDT (BEP-20 / TRC-20) и KGST.
//
// Сумма в счёте уникальна до цента (например, 114.67 USDT): по ней сервер узнаёт, чья заявка
// оплачена, — перевод в блокчейне сам по себе ничего о человеке не говорит. Поэтому сумму нужно
// отправить ровно, без округления.

import { apiFetch } from './api.js'

/** Включённые методы с курсом: [{ method, token, network, rateKgs }]. Без входа. */
export function getPaymentMethods() {
  return apiFetch('/payments/methods')
}

/** Выставить (или получить уже выставленный) счёт по заявке в выбранном методе. */
export function createInvoice(investmentId, method) {
  return apiFetch(`/payments/investments/${investmentId}/invoice`, {
    method: 'POST',
    auth: true,
    body: { method },
  })
}

/** Текущий счёт заявки — опрашиваем, чтобы увидеть, что оплата пришла. */
export function getInvoice(investmentId) {
  return apiFetch(`/payments/investments/${investmentId}/invoice`, { auth: true })
}

export const METHOD_LABELS = {
  usdt_trc20: { title: 'USDT', net: 'TRC-20 · TRON' },
  usdt_bep20: { title: 'USDT', net: 'BEP-20 · BNB Chain' },
  kgst_bep20: { title: 'KGST', net: 'BEP-20 · BNB Chain' },
}
