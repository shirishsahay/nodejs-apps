const express = require("express");
const connectDB = require("./config/db");
const { nanoid } = require("nanoid");
const Url = require("./models/url");
require("dotenv").config();

const app = express();

connectDB();

app.use(express.json());

function isValidUrl(url) {
  //   const urlPattern = new RegExp(
  //     '^(https?:\\/\\/)?' + // protocol
  //     '((([a-zA-Z\\d]([a-zA-Z\\d-]*[a-zA-Z\\d])*)\\.)+[a-zA-Z]{2,}|' + // domain name
  //     '((\\d{1,3}\\.){3}\\d{1,3}))' + // OR ip (v4) address
  //     '(\\:\\d+)?(\\/[-a-zA-Z\\d%_.~+]*)*' + // port and path
  //     '(\\?[;&a-zA-Z\\d%_.~+=-]*)?' + // query string
  //     '(\\#[-a-zA-Z\\d_]*)?$',
  //     'i'
  //   );
  //   return !!urlPattern.test(url);

  try {
    new URL(url);
    return true;
  } catch (_) {
    return false;
  }
}

/**
 * route : POST /api/shorten
 * Description : Create a short URL
 * Access : Public
 * Parameters : originalUrl (string)
 * Returns : JSON object with originalUrl and shortUrl
 */
app.post("/api/shorten", async (req, res) => {
  const { originalUrl } = req.body;

  if (!originalUrl || !isValidUrl(originalUrl)) {
    return res.status(400).json({ error: "Invalid URL" });
  }

  try {
    // Check if the original URL already exists in the database
    let url = await Url.findOne({ originalUrl });

    if (url) {
      // If it exists, return the existing short URL
      return res.json({ originalUrl: url.originalUrl, shortUrl: url.shortUrl });
    } else {
      // Generate a unique short URL ID
      const urlId = nanoid(8);
      const shortUrl = `${process.env.BASE_URL}/${urlId}`;

      // Create a new URL document and save it to the database
      url = new Url({
        originalUrl,
        shortUrl,
        urlId,
        date: new Date().toISOString(),
      });
      await url.save();
      return res.status(201).json({ originalUrl, shortUrl });
    }
  } catch (error) {
    console.error("Error creating short URL:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * route : GET /:urlId
 * Description : Redirect to the original URL based on the short URL ID
 * Access : Public
 * Parameters : urlId (string)
 * Returns : Redirects to the original URL or returns an error if not found
 */
app.get("/:urlId", async (req, res) => {
  const { urlId } = req.params;

  try {
    const url = await Url.findOne({ urlId });

    if (!url) {
      return res.status(404).json({ error: "URL not found" });
    }

    // Redirect user to original web page
    return res.redirect(url.originalUrl);

    // return the url data as JSON instead of redirecting
    // return res.status(200).json(url);
  } catch (error) {
    console.error("Error redirecting to original URL:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * route : Update /:urlId
 * Description : Update the short URL for a given original URL based on the short URL ID
 * Access : Public
 * Parameters : urlId (string), originalUrl (string)
 * Returns : JSON object with updated originalUrl and shortUrl or error if not found
 */
app.put("/:urlId", async (req, res) => {
  const { urlId } = req.params;
  
  // const { originalUrl } = req.body;
  // if (!originalUrl || !isValidUrl(originalUrl)) {
  //   return res.status(400).json({ error: "Invalid URL" });
  // }

  try {
    const url = await Url.findOne({ urlId });

    if (!url) {
      return res.status(404).json({ error: "URL not found" });
    }

    // Update the original URL and regenerate the short URL
    // url.originalUrl = originalUrl;
    const newUrlId = nanoid(8);
    url.urlId = newUrlId;
    url.shortUrl = `${process.env.BASE_URL}/${newUrlId}`; // Generate a new short URL ID
    await url.save();

    return res.json({ originalUrl: url.originalUrl, shortUrl: url.shortUrl });
  } catch (error) {
    console.error("Error updating short URL:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * route : DELETE /:urlId
 * Description : Delete a short URL based on the short URL ID
 * Access : Public
 * Parameters : urlId (string)
 * Returns : JSON object with success message or error if not found
 */
app.delete("/:urlId", async (req, res) => {
  const { urlId } = req.params;

  try {
    const url = await Url.findOneAndDelete({ urlId });

    if (!url) {
      return res.status(404).json({ error: "URL not found" });
    }

    return res.json({ message: "Short URL deleted successfully" });
  } catch (error) {
    console.error("Error deleting short URL:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Start the server
 * The server listens on the port specified in the .env file or defaults to 3000
 * Logs a message indicating the server is running and the port number
 */

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
