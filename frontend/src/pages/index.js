import { useState, useRef, useEffect } from 'react';
import Head from 'next/head';

export default function Home() {
  const [image, setImage] = useState(null);
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [apiKey, setApiKey] = useState('');
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const [stream, setStream] = useState(null);

  // Очистка стрима при размонтировании
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const startCamera = async () => {
    try {
      setError('');
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      videoRef.current.srcObject = mediaStream;
      setStream(mediaStream);
    } catch (err) {
      console.error("Camera error:", err);
      setError('Не удалось получить доступ к камере. Проверьте разрешения.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const captureImage = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (!video || !canvas) return;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setImage(imageDataUrl);
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Валидация формата
    const validTypes = ['image/jpeg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      setError('Пожалуйста, загрузите изображение в формате JPEG или PNG.');
      return;
    }

    // Валидация размера (максимум 5 МБ)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setError('Размер изображения не должен превышать 5 МБ.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImage(reader.result);
      setError('');
    };
    reader.onerror = () => {
      setError('Ошибка при чтении файла.');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!image) {
      setError('Сначала сделайте снимок или загрузите изображение.');
      return;
    }

    if (!apiKey) {
      setError('Пожалуйста, введите API-ключ.');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body: JSON.stringify({ image }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Ошибка анализа изображения.');
      }
      
      const data = await response.json();
      setResult(data.result);
    } catch (error) {
      console.error('API Error:', error);
      setError(error.message || 'Не удалось проанализировать изображение.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center p-4 sm:p-6">
      <Head>
        <title>Parent AI Helper</title>
        <meta name="description" content="AI assistant for parents to help with children's homework" />
        <link rel="icon" href="/favicon.ico" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <main className="w-full max-w-4xl flex flex-col items-center">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 mb-6 text-center">
          Parent AI Helper
        </h1>

        <div className="w-full mb-6">
          <input
            type="text"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Введите API-ключ"
            className="w-full p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6 w-full justify-center">
          <button 
            onClick={startCamera} 
            disabled={!!stream}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:bg-gray-400 hover:bg-blue-700 transition-colors"
          >
            Запустить камеру
          </button>
          <button 
            onClick={stopCamera} 
            disabled={!stream}
            className="px-4 py-2 bg-red-600 text-white rounded-lg disabled:bg-gray-400 hover:bg-red-700 transition-colors"
          >
            Остановить камеру
          </button>
          <button 
            onClick={captureImage} 
            disabled={!stream}
            className="px-4 py-2 bg-green-600 text-white rounded-lg disabled:bg-gray-400 hover:bg-green-700 transition-colors"
          >
            Сделать снимок
          </button>
          <button 
            onClick={() => fileInputRef.current.click()}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Загрузить изображение
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/jpeg,image/png"
            className="hidden"
          />
        </div>

        <div className="w-full max-w-full sm:max-w-lg md:max-w-xl lg:max-w-2xl mb-6">
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted 
            className="w-full rounded-lg border-2 border-gray-300 bg-black"
            style={{ display: stream ? 'block' : 'none' }} 
          />
        </div>

        <canvas ref={canvasRef} className="hidden" />

        {image && (
          <div className="w-full max-w-full sm:max-w-lg md:max-w-xl lg:max-w-2xl mb-6 text-center">
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-700 mb-4">Захваченное изображение</h2>
            <img 
              src={image} 
              alt="Captured" 
              className="w-full max-h-96 object-contain rounded-lg border border-gray-300"
            />
            <button 
              onClick={handleSubmit} 
              disabled={isLoading}
              className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400"
            >
              {isLoading ? 'Обработка...' : 'Анализировать изображение'}
            </button>
          </div>
        )}

        {error && (
          <div className="w-full max-w-full sm:max-w-lg md:max-w-xl lg:max-w-2xl p-4 bg-red-100 text-red-700 border border-red-300 rounded-lg mb-6">
            {error}
          </div>
        )}

        {result && (
          <div className="w-full max-w-full sm:max-w-lg md:max-w-xl lg:max-w-2xl p-6 bg-gray-50 border border-gray-200 rounded-lg">
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-700 mb-4">Решение</h2>
            <div className="text-gray-600 whitespace-pre-wrap">{result}</div>
          </div>
        )}
      </main>
    </div>
  );
}
    setIsLoading(false);
  }
};
