export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { image } = req.body;
    
    if (!image) {
      return res.status(400).json({ message: 'Image is required' });
    }

    const backendResponse = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/analyze`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image }),
        signal: AbortSignal.timeout(30000) // 30s timeout
      }
    );

    const responseData = await backendResponse.json();

    if (!backendResponse.ok) {
      console.error('Backend error:', responseData);
      throw new Error(
        responseData.message || 
        responseData.error?.message || 
        'Backend request failed'
      );
    }

    res.status(200).json(responseData);
  } catch (error) {
    console.error('API route error:', error);
    
    let statusCode = 500;
    let message = 'Error processing your request';
    
    if (error.name === 'AbortError') {
      statusCode = 504;
      message = 'Request timeout';
    } else if (error.message.includes('model_not_found')) {
      statusCode = 503;
      message = 'Service temporarily unavailable';
    }
    
    res.status(statusCode).json({ 
      message,
      details: error.message 
    });
  }
}
