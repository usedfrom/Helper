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
      }
    );

    if (!backendResponse.ok) {
      const errorData = await backendResponse.json();
      throw new Error(errorData.message || 'Backend request failed');
    }

    const data = await backendResponse.json();
    res.status(200).json(data);
  } catch (error) {
    console.error('API route error:', error);
    res.status(500).json({ 
      message: error.message || 'Internal server error' 
    });
  }
}