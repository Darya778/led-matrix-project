
# LED Matrix Web Controller

Этот проект позволяет управлять 8x8 LED-матрицей через веб-интерфейс, используя MQTT и Node.js-сервер с авторизацией пользователей.

## 🔧 Стек технологий

- Node.js + Express
- SQLite
- MQTT (broker.emqx.io)
- JWT авторизация
- HTML + JS клиент

## 📦 Установка и запуск

1. Установите зависимости:
```
npm install
```

3. Инициализируйте базу данных:
```
.\sqlite3 db.sqlite ".read schema.sql"
```

4. Запустите сервер:
```
npm start
```

Сервер будет доступен по адресу: [http://localhost:3000](http://localhost:3000)

## 🔐 API

- `POST /api/register` — регистрация
- `POST /api/login` — вход
- `GET /api/matrices` — список матриц пользователя
- `POST /api/matrices/bind` — привязать матрицу по серийному номеру
- `POST /api/send` — отправить данные на матрицу

## 📁 Структура

- `index.js` — основной сервер
- `schema.sql` — SQL-структура базы
- `public/index.html` — клиентская часть
- `db.sqlite` — база данных
- `main.ino` — прошивка для esp

## 📡 MQTT

Все сообщения отправляются на брокер: `mqtt://broker.emqx.io`. Каждая матрица подписана на свой топик, указанный в базе данных.

---

© 2025. Автор проекта: Daria Nikiforova
