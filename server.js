const express = require('express');
const app = express();
const config = require('./config');
const { google } = require('googleapis');
const request = require('request');
const fs = require('fs');

// Initialize Google Drive API
const oauth2Client = new google.auth.OAuth2(
  config.clientId,
  config.clientSecret,
  config.redirectUri
);

app.use(express.json());

// Step 1: Authorize and start the download process
app.get('/start-download', (req, res) => {    // /start-download is a end point
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/drive.readonly'],
  });
  res.redirect(authUrl);
});



// Step 2: Handle OAuth2 callback and start downloading the file
app.get('/myapp', (req, res) => {    // myapp  is a end point
  const code = req.query.code;
  oauth2Client.getToken(code, (err, token) => {
    if (err) {
      console.error('Error getting token:', err);
      res.status(500).send('Error getting token');
      return;
    }
    oauth2Client.setCredentials(token);
    downloadFile(config.fileId);
    res.send('Download started. Check /download-status for progress.');
  });
});

// Step 3: Download the file from Google Drive
function downloadFile(fileId) {
  const drive = google.drive({ version: 'v3', auth: oauth2Client });
  const dest = fs.createWriteStream('downloaded-video.mp4');

  drive.files.get(
    {
      fileId: fileId,
      alt: 'media',
    },
    { responseType: 'stream' },
    (err, response) =>  
    {
      if (err) {
        console.error('Error downloading file:', err);
        return;
      }

        const {data} = response;
                data.on('end', () => {
          console.log('Download completed.');
          uploadFile('downloaded-video.mp4');
        })
        .on('error', (err) => {
          console.error('Error downloading file:', err);
        })
        .pipe(dest);
    }
  );
}

// Step 4: Upload the file in chunks to the destination folder
function uploadFile(filePath) {
  const drive = google.drive({ version: 'v3', auth: oauth2Client });
  const fileMetadata = {
    name: 'uploaded-video.mp4',
    parents: [config.destinationFolderId],
  };
  const media = {
    mimeType: 'video/mp4',
    body: fs.createReadStream(filePath),
  };

  drive.files.create(
    {
      resource: fileMetadata,
      media: media,
      fields: 'id',
    },
    (err, file) => {
      if (err) {
        console.error('Error uploading file:', err);
        return;
      }

      console.log('Upload completed. File ID:', file.data.id);
    }
  );
}

// Step 5: Create an endpoint to monitor download and upload progress
app.get('/download-status', (req, res) => {
  // Implement code to check the progress of the download and upload here
  res.send('Download and upload status: In progress');
});

app.listen(4000, () => {
  console.log('Server is running on port 4000');
});
