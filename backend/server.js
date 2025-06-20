require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 5000;

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Слишком много запросов. Пожалуйста, попробуйте снова через 15 минут.',
  },
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Увеличен лимит для изображений
app.use(limiter);

// API key authentication middleware
const authenticateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({
      success: false,
      message: 'Недействительный или отсутствующий API-ключ.',
    });
  }
  next();
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Сервер работает корректно.' });
});

// Main analysis endpoint
app.post('/analyze', authenticateApiKey, async (req, res) => {
  try {
    const { image } = req.body;
    
    if (!image) {
      return res.status(400).json({ 
        success: false,
        message: 'Требуется изображение.' 
      });
    }

    // Валидация формата base64
    if (!image.startsWith('data:image/')) {
      return res.status(400).json({ 
        success: false,
        message: 'Недопустимый формат изображения. Требуется изображение в формате base64 (JPEG или PNG).',
      });
    }

    // Проверка размера изображения
    const base64Data = image.split(';base64,').pop();
    const imageBuffer = Buffer.from(base64Data, 'base64');
    if (imageBuffer.length > 5 * 1024 * 1024) { // 5MB
      return res.status(400).json({
        success: false,
        message: 'Размер изображения превышает 5 МБ.',
      });
    }

    // Call OpenAI API
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4-vision-preview',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'You are a helpful assistant for parents. Analyze the provided image which may contain:' +
                      '\n1. A child\'s homework problem (math, science, etc.) - solve it step by step with explanations' +
                      '\n2. Foreign language text - translate it to the parent\'s language' +
                      '\n3. General question - provide a clear, concise answer' +
                      '\n\nFormat your response to be easy for a parent to understand and explain to their child.',
              },
              {
                type: 'image_url',
                image_url: {
                  url: image,
                },
              },
            ],
          },
        ],
        max_tokens: 2000,
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000, // 30 seconds timeout
      }
    );

    if (!response.data.choices || !response.data.choices[0].message) {
      throw new Error('Недействительный ответ от сервиса ИИ.');
    }

    const result = response.data.choices[0].message.content;
    
    res.json({ 
      success: true,
      result,
    });
    
  } catch (error) {
    console.error('Ошибка анализа:', error.response?.data || error.message);
    
    let statusCode = 500;
    let errorMessage = 'Ошибка обработки запроса.';
    let details = error.message;

    if (error.response) {
      switch (error.response.status) {
        case 400:
          statusCode = 400;
          errorMessage = 'Некорректный запрос к сервису ИИ.';
          details = error.response.data?.error?.message || 'Неверные данные в запросе.';
          break;
        case 401:
          statusCode = 401;
          errorMessage = 'Ошибка аутентификации в сервисе ИИ.';
          details = 'Проверьте конфигурацию API-ключа OpenAI.';
          break;
        case 429:
          statusCode = 429;
          errorMessage = 'Слишком много запросов к сервису ИИ.';
          details = 'Пожалуйста, попробуйте снова позже.';
          break;
        case 503:
          statusCode = 503;
          errorMessage = 'Сервис ИИ временно недоступен.';
          details = 'Попробуйте повторить запрос позже.';
          break;
        default:
          details = error.response.data?.error?.message || error.message;
      }
    } else if (error.code === 'ECONNABORTED') {
      statusCode = 504;
      errorMessage = 'Превышено время ожидания ответа от сервиса ИИ.';
      details = 'Попробуйте повторить запрос позже.';
    }

    res.status(statusCode).json({ 
      success: false,
      message: errorMessage,
      details,
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Ошибка сервера:', err);
  res.status(500).json({ 
    success: false,
    message: 'Внутренняя ошибка сервера.',
    details: err.message,
  });
});

app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
  console.log(`OpenAI модель: gpt-4-vision-preview`);
});
