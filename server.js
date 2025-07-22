const express = require('express');
const mongoose = require('mongoose');

const app = express();
const PORT = 3000;

// ВАЖНО: Используйте строку подключения от драйвера, а не от Atlas SQL
// Замените <username>, <password> и имя вашего кластера.
const dbURI = 'mongodb+srv://<username>:<password>@cluster-name.mongodb.net/myVirtualDatabase?retryWrites=true&w=majority';

mongoose.connect(dbURI)
    .then((result) => {
        console.log('Успешно подключено к MongoDB');
        app.listen(PORT, () => console.log(`Сервер запущен на порту ${PORT}`));
    })
    .catch((err) => console.log(err));

// Middleware для обслуживания статичных файлов (наш frontend)
app.use(express.static('public'));

// Здесь будут маршруты для регистрации и входа
// app.post('/register', ...);
// app.post('/login', ...);
