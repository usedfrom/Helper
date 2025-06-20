import { useState, useRef, useEffect } from 'react';
import Head from 'next/head';
import styles from '../styles/Home.module.css';

export default function Home() {
  const [image, setImage] = useState(null);
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [retryCamera, setRetryCamera] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);

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
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      videoRef.current.srcObject = mediaStream;
      setStream(mediaStream);
      setRetryCamera(false);
    } catch (err) {
      console.error("Camera error:", err);
      setError('Camera access is required. Please allow permissions and reload.');
      setRetryCamera(true);
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

  const handleSubmit = async () => {
    if (!image) {
      setError('Please capture an image first');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.details || 'Request failed');
      }
      
      const data = await response.json();
      setResult(data.result);
    } catch (error) {
      console.error('API Error:', error);
      setError(error.message || 'Failed to analyze image');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>Parent AI Helper</title>
        <meta name="description" content="AI assistant for parents to help with children's homework" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <h1 className={styles.title}>Parent AI Helper</h1>
        
        <div className={styles.controls}>
          <button 
            onClick={startCamera} 
            disabled={!!stream}
            className={styles.button}
          >
            Start Camera
          </button>
          <button 
            onClick={stopCamera} 
            disabled={!stream}
            className={styles.button}
          >
            Stop Camera
          </button>
          <button 
            onClick={captureImage} 
            disabled={!stream}
            className={styles.button}
          >
            Capture Image
          </button>
        </div>
        
        <div className={styles.videoContainer}>
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted 
            className={styles.video}
            style={{ display: stream ? 'block' : 'none' }} 
          />
        </div>
        
        <canvas ref={canvasRef} style={{ display: 'none' }} />
        
        {retryCamera && (
          <button 
            onClick={() => window.location.reload()}
            className={styles.button}
          >
            Reload Page to Retry Camera
          </button>
        )}
        
        {image && (
          <div className={styles.previewSection}>
            <h2>Captured Image</h2>
            <img 
              src={image} 
              alt="Captured" 
              className={styles.capturedImage} 
            />
            <button 
              onClick={handleSubmit} 
              disabled={isLoading}
              className={`${styles.button} ${styles.analyzeButton}`}
            >
              {isLoading ? 'Processing...' : 'Analyze Image'}
            </button>
          </div>
        )}
        
        {error && (
          <div className={styles.error}>
            {error}
            {error.includes('model_not_found') && (
              <p>Please try again later or contact support</p>
            )}
          </div>
        )}
        
        {result && (
          <div className={styles.resultSection}>
            <h2>Solution</h2>
            <div className={styles.resultText}>{result}</div>
          </div>
        )}
      </main>
    </div>
  );
}
