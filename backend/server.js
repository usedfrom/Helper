require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const rateLimit = require('express-rate-limit');
const { HttpsProxyAgent } = require('https-proxy-agent');

const app = express();
const PORT = process.env.PORT || 5000;

// Proxy configuration
const proxyConfig = {
  host: process.env.PROXY_HOST || '104.239.105.125',
  port: process.env.PROXY_PORT || '6655',
  auth: {
    username: process.env.PROXY_USERNAME || 'iqmwofty',
    password: process.env.PROXY_PASSWORD || 'jk8uespriwzc'
  }
};

const proxyAgent = new HttpsProxyAgent({
  host: proxyConfig.host,
  port: proxyConfig.port,
  auth: `${proxyConfig.auth.username}:${proxyConfig.auth.password}`
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

app.use(cors());
app.use(express.json());
app.use(limiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    proxy: `${proxyConfig.host}:${proxyConfig.port}`
  });
});

// Main analysis endpoint
app.post('/analyze', async (req, res) => {
  try {
    const { image } = req.body;
    
    if (!image) {
      return res.status(400).json({ message: 'Image is required' });
    }

    if (!image.startsWith('data:image/')) {
      return res.status(400).json({ 
        message: 'Invalid image format. Please provide a valid base64 image.' 
      });
    }

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: "gpt-4-turbo",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "You are a helpful assistant for parents. Analyze the provided image which may contain:" +
                      "\n1. A child's homework problem (math, science, etc.) - solve it step by step with explanations" +
                      "\n2. Foreign language text - translate it to the parent's language" +
                      "\n3. General question - provide a clear, concise answer" +
                      "\n\nFormat your response to be easy for a parent to understand and explain to their child."
              },
              {
                type: "image_url",
                image_url: {
                  url: image
                }
              }
            ]
          }
        ],
        max_tokens: 2000
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        httpsAgent: proxyAgent,
        timeout: 40000
      }
    );

    if (!response.data.choices || !response.data.choices[0].message) {
      throw new Error('Invalid response from AI service');
    }

    const result = response.data.choices[0].message.content;
    
    res.json({ 
      success: true,
      result,
      proxyUsed: `${proxyConfig.host}:${proxyConfig.port}`
    });
    
  } catch (error) {
    console.error('Analysis error:', error.response?.data || error.message);
    
    let statusCode = 500;
    let errorMessage = 'Error processing your request';
    
    if (error.response?.status === 429) {
      statusCode = 429;
      errorMessage = 'Too many requests. Please try again later.';
    } else if (error.response?.status === 401) {
      statusCode = 401;
      errorMessage = 'Authentication failed. Please check service configuration.';
    } else if (error.response?.data?.error?.code === 'model_not_found') {
      statusCode = 400;
      errorMessage = 'The AI model is not available. Please contact support.';
    }
    
    res.status(statusCode).json({ 
      success: false,
      message: errorMessage,
      details: error.response?.data?.error?.message || error.message,
      proxyUsed: `${proxyConfig.host}:${proxyConfig.port}`
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    success: false,
    message: 'Internal server error',
    error: err.message,
    proxy: `${proxyConfig.host}:${proxyConfig.port}`
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Using proxy: ${proxyConfig.host}:${proxyConfig.port}`);
  console.log(`OpenAI model: gpt-4-turbo`);
});
