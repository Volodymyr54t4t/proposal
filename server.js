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

// Статичні файли: index.html, музика тощо
app.use(express.static(path.join(__dirname)))
app.use(express.static(path.join(__dirname, "public")))

// Головна сторінка
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"))
})

// Ендпоінт: вона сказала ТАК ❤️
app.post("/yes", async (req, res) => {
  const now = new Date().toLocaleString("ru-RU", { timeZone: "Europe/Kyiv" })
  const message = `💌 Соня ответила «ДА»! ❤️\n\n📅 ${now}\n✨ Теперь вы пара!`

  if (!BOT_TOKEN || !CHAT_ID) {
    console.error("[v0] Telegram не настроен: нужны BOT_TOKEN и CHAT_ID")
    return res.status(503).json({ ok: false, telegram: false })
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
      console.error("[v0] Ошибка Telegram API:", result.description)
      return res.status(502).json({ ok: false, telegram: false })
    }
    return res.json({ ok: true, telegram: true })
  } catch (err) {
    console.error("[v0] Ошибка отправки в Telegram:", err.message)
    return res.status(502).json({ ok: false, telegram: false })
  }
})

function listen(port) {
  const server = app.listen(port, "0.0.0.0", () => {
    console.log(`[proposal] Сайт доступен: http://localhost:${port}`)
  })

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      const nextPort = Number(port) + 1
      console.warn(`[proposal] Порт ${port} занят; пробую порт ${nextPort}`)
      listen(nextPort)
      return
    }

    console.error("[proposal] Не удалось запустить сервер:", error.message)
    process.exitCode = 1
  })
}

listen(PORT)
