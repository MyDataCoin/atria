import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { createInvoice, getInvoice, getPaymentMethods, METHOD_LABELS } from '../lib/payments.js'
import { ApiError } from '../lib/api.js'
import { DASHBOARD_URL } from '../lib/dashboard.js'

const POLL_MS = 15_000

const fmtAmount = (n) =>
  new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0)

const fmtDate = (iso) =>
  iso
    ? new Date(iso).toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
    : ''

/** Кнопка «Скопировать» с подтверждением на пару секунд. */
function CopyButton({ value, label = 'Скопировать' }) {
  const [done, setDone] = useState(false)
  return (
    <button
      type="button"
      className="pay-copy"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value)
          setDone(true)
          setTimeout(() => setDone(false), 1800)
        } catch {
          /* буфер недоступен — значение всё равно видно и выделяется */
        }
      }}
    >
      {done ? 'Скопировано' : label}
    </button>
  )
}

/**
 * Шаг оплаты после создания заявки: выбор способа и реквизиты.
 *
 * Сомы — банковским переводом, реквизиты присылает оператор. Крипта — счёт с точной суммой и
 * адресом; экран сам опрашивает сервер и показывает, что перевод пришёл.
 */
export default function PaymentStep({ investmentId, amountKgs, currency, onClose }) {
  const [methods, setMethods] = useState(null)
  const [choice, setChoice] = useState(null) // null | 'bank' | method wire
  const [invoice, setInvoice] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [qr, setQr] = useState('')
  const pollRef = useRef(null)

  useEffect(() => {
    getPaymentMethods()
      .then((list) => setMethods(Array.isArray(list) ? list : []))
      .catch(() => setMethods([]))
  }, [])

  // QR — только адрес: кошельки сами подставляют сеть, а сумму человек вводит из строки выше.
  useEffect(() => {
    if (!invoice?.payToAddress) return setQr('')
    QRCode.toDataURL(invoice.payToAddress, { margin: 1, width: 360 })
      .then(setQr)
      .catch(() => setQr(''))
  }, [invoice?.payToAddress])

  // Пока счёт ждёт оплату — опрашиваем. Оплачен или отменён — перестаём.
  useEffect(() => {
    clearInterval(pollRef.current)
    if (!invoice || invoice.status !== 'pending') return
    pollRef.current = setInterval(async () => {
      try {
        const fresh = await getInvoice(investmentId)
        if (fresh) setInvoice(fresh)
      } catch {
        /* сеть моргнула — спросим в следующий раз */
      }
    }, POLL_MS)
    return () => clearInterval(pollRef.current)
  }, [invoice, investmentId])

  const pick = async (method) => {
    setError('')
    setChoice(method)
    if (method === 'bank') return
    setBusy(true)
    setInvoice(null)
    try {
      setInvoice(await createInvoice(investmentId, method))
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.problem?.detail || `Не удалось выставить счёт (ошибка ${err.status})`
          : 'Сеть недоступна. Попробуйте ещё раз',
      )
      setChoice(null)
    } finally {
      setBusy(false)
    }
  }

  const label = invoice ? METHOD_LABELS[invoice.method] : null

  return (
    <div className="pay">
      <span className="eyebrow">Заявка принята</span>
      <h2 className="reg-title display">Оплата</h2>
      <p className="reg-sub">
        Доли зарезервированы за вами. Выберите, как оплатить {fmtAmount(amountKgs)} {currency}.
      </p>

      <div className="pay-methods" role="radiogroup" aria-label="Способ оплаты">
        <button
          type="button"
          role="radio"
          aria-checked={choice === 'bank'}
          className={`pay-method ${choice === 'bank' ? 'on' : ''}`}
          onClick={() => pick('bank')}
        >
          <b>Сомы</b>
          <span>банковский перевод</span>
        </button>
        {(methods ?? []).map((m) => (
          <button
            key={m.method}
            type="button"
            role="radio"
            aria-checked={choice === m.method}
            className={`pay-method ${choice === m.method ? 'on' : ''}`}
            onClick={() => pick(m.method)}
            disabled={busy}
          >
            <b>{METHOD_LABELS[m.method]?.title ?? m.token}</b>
            <span>{METHOD_LABELS[m.method]?.net ?? m.network}</span>
          </button>
        ))}
      </div>

      {error && <div className="reg-error">{error}</div>}

      {choice === 'bank' && (
        <div className="pay-box">
          <p>
            Мы проверим заявку и пришлём реквизиты для перевода в сомах. Статус заявки — в личном кабинете.
          </p>
        </div>
      )}

      {busy && <div className="pay-box">Выставляем счёт…</div>}

      {invoice && invoice.status === 'paid' && (
        <div className="pay-box pay-paid">
          <b>Оплата получена.</b>
          <p>
            {fmtAmount(invoice.payAmount)} {invoice.token} пришли на кошелёк. Мы подтвердим заявку, и доли появятся
            в личном кабинете.
          </p>
        </div>
      )}

      {invoice && invoice.status === 'pending' && (
        <div className="pay-box">
          <div className="pay-row">
            <span className="pay-k">Сумма — ровно, до цента</span>
            <div className="pay-v">
              <strong className="pay-amount">
                {fmtAmount(invoice.payAmount)} {invoice.token}
              </strong>
              <CopyButton value={String(invoice.payAmount)} />
            </div>
          </div>
          <div className="pay-row">
            <span className="pay-k">Сеть</span>
            <div className="pay-v">
              <strong>{label?.net ?? invoice.network}</strong>
            </div>
          </div>
          <div className="pay-row">
            <span className="pay-k">Адрес</span>
            <div className="pay-v pay-addr">
              <code>{invoice.payToAddress}</code>
              <CopyButton value={invoice.payToAddress} />
            </div>
          </div>
          {qr && <img className="pay-qr" src={qr} alt="QR-код адреса" width="180" height="180" />}
          <ul className="pay-notes">
            <li>
              Отправьте <b>ровно {fmtAmount(invoice.payAmount)} {invoice.token}</b> — по этой сумме мы узнаём вашу
              заявку. Комиссию сети оплачивает отправитель.
            </li>
            <li>
              Только сеть <b>{invoice.network}</b>. Перевод в другой сети не дойдёт.
            </li>
            {invoice.token === 'USDT' && (
              <li>
                Курс: 1 USDT = {invoice.rateKgs} {currency}, зафиксирован в этом счёте.
              </li>
            )}
            <li>Оплатите до {fmtDate(invoice.expiresAtUtc)} — потом резерв снимается.</li>
          </ul>
          <p className="pay-wait">Ждём перевод — экран обновится сам, как только он придёт.</p>
        </div>
      )}

      <div className="buy-actions">
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          <span>Закрыть</span>
        </button>
        <a className="btn btn-primary" href={DASHBOARD_URL}>
          <span>Личный кабинет</span>
        </a>
      </div>
    </div>
  )
}
