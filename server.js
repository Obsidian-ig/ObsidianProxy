const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();
const PORT = 3000;

// Enable CORS for all routes
app.use(cors({
    origin: '*', // Allow requests from any origin (adjust as necessary)
    methods: ['GET', 'POST'], // Allow specific HTTP methods
    allowedHeaders: ['Content-Type', 'Authorization'], // Specify allowed headers
    exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar'], // Headers the client can access
}));

// Helper function to rewrite URLs
function rewriteUrls(html, baseUrl) {
    const base = new URL(baseUrl);

    // Replace src, href, and other attributes with absolute URLs
    html = html
        .replace(/(src|href)=["']?(?!http)([^"']+)["']?/g, (match, p1, p2) => {
            const absoluteUrl = new URL(p2, base).href;
            return `${p1}="${absoluteUrl}"`;
        })
        .replace(/(srcset)=["']?(?!http)([^"']+)["']?/g, (match, p1, p2) => {
            const absoluteUrl = new URL(p2, base).href;
            return `${p1}="${absoluteUrl}"`;
        })
        .replace(/background-image:\s*url\(["']?(?!http)([^"')]+)["']?\)/g, (match, p1) => {
            const absoluteUrl = new URL(p1, base).href;
            return `background-image: url("${absoluteUrl}")`;
        })
        .replace(/<script[^>]*src=["']([^"']+)["'][^>]*><\/script>/g, (match, p1) => {
            const absoluteUrl = new URL(p1, base).href;
            return `<script src="${absoluteUrl}"></script>`;
        });

    return html;
}

// Endpoint to handle requests from the client
app.get('/fetch', async (req, res) => {
    const targetUrl = req.query.url; // Get the target URL from the query

    if (!targetUrl) {
        console.error('No URL provided');
        return res.status(400).json({ error: 'No URL provided' });
    }

    console.log(`Received request to fetch: ${targetUrl}`);

    try {
        // Fetch the data from the target URL
        const response = await axios.get(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0', // Adding a common User-Agent to avoid request blocking
            },
        });
        console.log(`Fetched data from ${targetUrl}:`, response.status);

        // Rewrite asset URLs in the response data
        const rewrittenHtml = rewriteUrls(response.data, targetUrl);

        // Optionally log a portion of the data
        console.log('Response Data (first 1000 chars):', rewrittenHtml.substring(0, 1000));

        // Send rewritten data back to the client, along with CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*'); // Allow requests from any origin
        res.json({
            data: rewrittenHtml, // Send the rewritten response data
            headers: response.headers, // Send original headers from the target URL (optional)
        });
    } catch (error) {
        console.error(`Error fetching ${targetUrl}:`, error.message);
        res.status(500).json({ error: 'Error fetching the URL', details: error.message });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
