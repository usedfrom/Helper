// В функции handleSubmit обновите обработку ошибок:
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
      throw new Error(
        errorData.message || 
        errorData.details || 
        `Request failed via proxy ${errorData.proxyUsed || ''}`
      );
    }
    
    const data = await response.json();
    setResult(data.result);
  } catch (error) {
    console.error('API Error:', error);
    setError(error.message || 'Failed to analyze image (proxy issue?)');
  } finally {
    setIsLoading(false);
  }
};
