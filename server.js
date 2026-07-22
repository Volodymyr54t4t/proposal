// Сервер романтичного сайту-пропозиції
// Обробляє натискання кнопки "ТАК" і надсилає повідомлення у Telegram
require("dotenv").config()

const path = require("path")
const express = require("express")

const app = express()

const PORT = process.env.PORT || 3000
const BOT_TOKEN = process.env.BOT_TOKEN
const CHAT_ID = process.env.CHAT_ID

app.use(express.json())

// Статичні файли: index.html, фото 1.jpg, 2.jpg, 3.jpg, музика тощо
app.use(express.static(path.join(__dirname)))
app.use(express.static(path.join(__dirname, "public")))

// Головна сторінка
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"))
})

// Отримання реального IP відвідувача
function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"]
  if (forwarded) return forwarded.split(",")[0].trim()
  return req.socket?.remoteAddress || "невідомо"
}

// Екранування спецсимволів для Telegram HTML
function escapeHtml(text) {
  return String(text || "—")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

// Ендпоінт: вона сказала ТАК ❤️
app.post("/yes", async (req, res) => {
  const data = req.body || {}
  const ip = getClientIp(req)
  const now = new Date().toLocaleString("uk-UA", { timeZone: "Europe/Kyiv" })

  const message =
    `💍 <b>ВОНА СКАЗАЛА ТАК!</b> ❤️\n\n` +
    `📅 <b>Дата:</b> ${escapeHtml(now)}\n` +
    `🌍 <b>IP:</b> ${escapeHtml(ip)}\n` +
    `🌐 <b>Браузер:</b> ${escapeHtml(data.browser)}\n` +
    `💻 <b>ОС:</b> ${escapeHtml(data.os)}\n` +
    `📱 <b>Пристрій:</b> ${escapeHtml(data.device)}\n` +
    `🗣 <b>Мова:</b> ${escapeHtml(data.language)}\n` +
    `🕓 <b>Часовий пояс:</b> ${escapeHtml(data.timezone)}\n` +
    `🧾 <b>User-Agent:</b> ${escapeHtml(data.userAgent)}`

  // Якщо токен не налаштований — просто логуємо і повертаємо успіх
  if (!BOT_TOKEN || !CHAT_ID) {
    console.log("[v0] Telegram не налаштовано. Повідомлення:\n", message.replace(/<[^>]+>/g, ""))
    return res.json({ ok: true, telegram: false })
  }

  try {
    const tgRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: message,
        parse_mode: "HTML",
      }),
    })
    const result = await tgRes.json()
    if (!result.ok) {
      console.log("[v0] Помилка Telegram API:", result)
      return res.status(200).json({ ok: true, telegram: false, error: result.description })
    }
    console.log("[v0] Повідомлення успішно надіслано у Telegram")
    return res.json({ ok: true, telegram: true })
  } catch (err) {
    console.log("[v0] Помилка надсилання у Telegram:", err.message)
    return res.status(200).json({ ok: true, telegram: false, error: err.message })
  }
})

app.listen(PORT, () => {
  console.log(`[v0] Сайт-пропозиція працює на порті ${PORT}`)
})
