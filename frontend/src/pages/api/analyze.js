export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { image } = req.body;
    
    if (!image?.startsWith('data:image/')) {
      return res.status(400).json({ 
        message: 'Valid base64 image is required' 
      });
    }

    const backendResponse = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/analyze`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image }),
        signal: AbortSignal.timeout(45000) // увеличенный таймаут для прокси
      }
    );

    const data = await backendResponse.json();

    if (!backendResponse.ok) {
      console.error('Backend error:', data);
      throw new Error(
        data.message || 
        data.details || 
        `Backend request failed (Proxy: ${data.proxyUsed || 'unknown'})`
      );
    }

    return res.status(200).json({
      ...data,
      proxyUsed: data.proxyUsed || 'unknown'
    });
  } catch (error) {
    console.error('API route error:', error);
    
    const statusCode = error.name === 'AbortError' ? 504 : 500;
    return res.status(statusCode).json({ 
      message: 'Error processing request',
      details: error.message,
      proxyStatus: 'Proxy may be unavailable'
    });
  }
}
