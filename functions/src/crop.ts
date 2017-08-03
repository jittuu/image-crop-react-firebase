import * as functions from 'firebase-functions';

const gcs = require('@google-cloud/storage')({
  keyFilename: 'service-account-credentials.json',
});

interface CropProps {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const listener = functions.database.ref('uploads/{id}/crop').onCreate(async e => {
  if (e.data.exists()) {
    const parent = e.data.ref.parent;
    if (parent) {
      const psn = (await parent.once('value')) as functions.database.DeltaSnapshot;
      const { resizedFilePath } = psn.val();
      const crop: CropProps = e.data.val();
      const cropFileUrl = await cropImage(resizedFilePath, crop);
      await parent.update({ cropFileUrl });
    }
  }
});

const sf = require('image-size');
const sizeOf = (img: any) => new Promise<{ width: number, height: number }>((resolve, reject) => {
  sf(img, (err: any, dim: any) => {
    if (err) {
      reject(err);
    } else {
      resolve(dim as { width: number, height: number });
    }
  });
});
const mkdirp = require('mkdirp-promise');
const spawn = require('child-process-promise').spawn;
const path = require('path');
const os = require('os');
const fs = require('fs');
const F_PREFIX = 'crop';
const bucket = gcs.bucket('imageupload-31f7a.appspot.com');

const cropImage = async (filePath: string, crop: CropProps) => {
  const fileDir: string = path.dirname(filePath);
  const fileName: string = path.basename(filePath);
  const cropFilePath: string = path.normalize(path.join(fileDir, `${F_PREFIX}_${fileName}`));
  const tempLocalFile: string = path.join(os.tmpdir(), filePath);
  const tempLocalDir: string = path.dirname(tempLocalFile);
  const tempLocalCropFile: string = path.join(os.tmpdir(), cropFilePath);

  await mkdirp(tempLocalDir);
  const file = bucket.file(filePath);
  await file.download({ destination: tempLocalFile });
  const { height, width } = await sizeOf(tempLocalFile);
  const cropWidth = Math.trunc(width * crop.width / 100);
  const cropHeight = Math.trunc(height * crop.height / 100);
  const xoffset = Math.trunc(crop.x * width / 100);
  const yoffset = Math.trunc(crop.y * height / 100);
  await spawn(
    'convert',
    [tempLocalFile,
      '-crop', `${cropWidth}x${cropHeight}+${xoffset}+${yoffset}`,
      tempLocalCropFile]);

  await bucket.upload(tempLocalCropFile, { destination: cropFilePath });

  // delete temp files
  fs.unlinkSync(tempLocalFile);
  fs.unlinkSync(tempLocalCropFile);

  // Get the Signed URLs 
  const config = {
    action: 'read',
    expires: '03-01-2500'
  };
  const cropFile = bucket.file(cropFilePath);
  const cropFileUrl = cropFile.getSignedUrl(config);
  return cropFileUrl;
};
