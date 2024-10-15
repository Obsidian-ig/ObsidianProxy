const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();
const PORT = 3000;

// Enable CORS to allow requests from your client
app.use(cors());

// Helper function to rewrite URLs
function rewriteUrls(html, baseUrl) {
    const base = new URL(baseUrl);

    // Replace src and href attributes with absolute URLs
    html = html
        .replace(/(src|href)=["']?(?!http)([^"']+)["']?/g, (match, p1, p2) => {
            const absoluteUrl = new URL(p2, base).href;
            return `${p1}="${absoluteUrl}"`;
        })
        .replace(/(srcset)=["']?(?!http)([^"']+)["']?/g, (match, p1, p2) => {
            const absoluteUrl = new URL(p2, base).href;
            return `${p1}="${absoluteUrl}"`;
        })
        // Handling CSS background images in style attributes
        .replace(/background-image:\s*url\(["']?(?!http)([^"')]+)["']?\)/g, (match, p1) => {
            const absoluteUrl = new URL(p1, base).href;
            return `background-image: url("${absoluteUrl}")`;
        })
        // Handling <script> tags in the response
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
        const response = await axios.get(targetUrl);
        console.log(`Fetched data from ${targetUrl}:`, response.status);

        // Rewrite asset URLs in the response data
        const rewrittenHtml = rewriteUrls(response.data, targetUrl);

        // Optionally log a portion of the data (for large responses, you may want to limit this)
        console.log('Response Data:', rewrittenHtml.substring(0, 1000)); // Log first 1000 characters of the response data

        res.json({
            data: rewrittenHtml, // Send the rewritten response data back to the client
            headers: response.headers, // Optionally, send headers
        });
    } catch (error) {
        console.error(`Error fetching ${targetUrl}:`, error.message);
        res.status(500).json({ error: 'Error fetching the URL', details: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
