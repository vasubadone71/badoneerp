const uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // The file is already saved by multer middleware
    // We return the file path and filename so the client can save it in the database
    const category = req.params.category || 'general';
    const filePath = `/uploads/${category}/${req.file.filename}`;
    
    res.status(200).json({ 
      success: true, 
      fileName: req.file.filename,
      originalName: req.file.originalname,
      path: filePath 
    });
  } catch (error) {
    console.error('Upload Error:', error);
    res.status(500).json({ error: 'Failed to upload document' });
  }
};

module.exports = { uploadDocument };
