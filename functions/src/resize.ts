import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const gcs = require('@google-cloud/storage')({
  keyFilename: 'service-account-credentials.json',
});

const F_PREFIX = 'resize';
const mkdirp = require('mkdirp-promise');
const spawn = require('child-process-promise').spawn;
const path = require('path');
const os = require('os');
const fs = require('fs');

export const listener = functions.storage.object().onChange(event => {
  // File and directory paths.
  const filePath = event.data.name;
  const fileDir = path.dirname(filePath);
  const fileName = path.basename(filePath);
  const resizeFilePath = path.normalize(path.join(fileDir, `${F_PREFIX}_${fileName}`));
  const tempLocalFile = path.join(os.tmpdir(), filePath);
  const tempLocalDir = path.dirname(tempLocalFile);
  const tempLocalThumbFile = path.join(os.tmpdir(), resizeFilePath);

  if (event.data.contentType) {
    // Exit if this is triggered on a file that is not an image.
    if (event.data.contentType && !event.data.contentType.startsWith('image/')) {
      console.log('This is not an image.');
      return;
    }

    // Exit if the image is already a thumbnail.
    if (fileName.startsWith(F_PREFIX)) {
      console.log('Already resized image.');
      return;
    }

    // Exit if this is a move or deletion event.
    if (event.data.resourceState === 'not_exists') {
      console.log('This is a deletion event.');
      return;
    }

    // Cloud Storage files.
    const bucket = gcs.bucket(event.data.bucket);
    const file = bucket.file(filePath);
    const thumbFile = bucket.file(resizeFilePath);

    // Create the temp directory where the storage file will be downloaded.
    return mkdirp(tempLocalDir).then(() => {
      // Download file from bucket.
      return file.download({ destination: tempLocalFile });
    }).then(() => {
      console.log('The file has been downloaded to', tempLocalFile);
      // Generate a resize img using ImageMagick.
      return spawn('convert', [tempLocalFile, '-resize', '800', tempLocalThumbFile]);
    }).then(() => {
      console.log('Thumbnail created at', tempLocalThumbFile);
      // Uploading the Thumbnail.
      return bucket.upload(tempLocalThumbFile, { destination: resizeFilePath });
    }).then(() => {
      console.log('Thumbnail uploaded to Storage at', resizeFilePath);
      // Once the image has been uploaded delete the local files to free up disk space.
      fs.unlinkSync(tempLocalFile);
      fs.unlinkSync(tempLocalThumbFile);
      // Get the Signed URLs for the thumbnail and original image.
      const config = {
        action: 'read',
        expires: '03-01-2500'
      };

      return Promise.all([
        thumbFile.getSignedUrl(config),
        file.getSignedUrl(config)
      ]);
    }).then((results: any) => {
      console.log('Got Signed URLs.');
      const resizedResult = results[0];
      const originalResult = results[1];
      const resizedFileUrl = resizedResult[0];
      const fileUrl = originalResult[0];

      const key = path.basename(filePath, path.extname(filePath));
      // Add the URLs to the Database
      return admin.database().ref(`uploads/${key}`).update({ path: fileUrl, resized: resizedFileUrl });
    });
  }
});
