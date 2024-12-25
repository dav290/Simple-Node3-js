const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const dns = require('dns');
const mongoose = require('mongoose');
const url = require('url');

// Set up the app and middleware
const app = express();
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static('views'));

// Connect to MongoDB
mongoose.connect('mongodb+srv://david:UmrUoalWbM36b437@cluster0.mn7tkjf.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Failed to connect to MongoDB', err));

const urlSchema = new mongoose.Schema({
  original_url: String,
  short_url: Number,
});

const Url = mongoose.model('Url', urlSchema);

// Helper function to validate URLs
const validateUrl = (userUrl) => {
  try {
    const parsedUrl = new URL(userUrl);
    return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
  } catch (err) {
    return false;
  }
};

// Serve the homepage
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// POST endpoint to shorten a URL
app.post('/api/shorturl', async (req, res) => {
  const { url: userUrl } = req.body;

  if (!validateUrl(userUrl)) {
    return res.json({ error: 'invalid url' });
  }

  const hostname = new URL(userUrl).hostname;
  dns.lookup(hostname, async (err) => {
    if (err) {
      return res.json({ error: 'invalid url' });
    }

    try {
      const existingUrl = await Url.findOne({ original_url: userUrl });
      if (existingUrl) {
        return res.json({ original_url: existingUrl.original_url, short_url: existingUrl.short_url });
      }

      const urlCount = await Url.countDocuments();
      const newUrl = new Url({ original_url: userUrl, short_url: urlCount + 1 });
      await newUrl.save();
      res.json({ original_url: newUrl.original_url, short_url: newUrl.short_url });
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  });
});

// GET endpoint to redirect to the original URL
app.get('/api/shorturl/:short_url', async (req, res) => {
  const { short_url } = req.params;

  try {
    const foundUrl = await Url.findOne({ short_url });
    if (!foundUrl) {
      return res.json({ error: 'No short URL found' });
    }
    res.redirect(foundUrl.original_url);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Start the server
const PORT = process.env.PORT || 3100;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
