import * as React from 'react';
import * as db from './firedb';
import * as firebase from 'firebase';

interface CropProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  aspect?: number;
}

const ReactCrop = require('react-image-crop');

interface State {
  crop: CropProps;
  status: 'none' | 'uploading' | 'preparing' | 'to-crop' | 'croping' | 'done';
  uploadProgress: number;
  imageId?: string;
  imagePath?: string;
  cropImagePath?: string;
}

export default class ImageEditor extends React.Component<{}, State> {
  sub: () => void;

  constructor(props: {}) {
    super(props);
    this.onCropComplete = this.onCropComplete.bind(this);
    this.onHandleFileChange = this.onHandleFileChange.bind(this);
    this.onCropSubmit = this.onCropSubmit.bind(this);

    const crop: CropProps = {
      aspect: 60 / 75,
    };
    // tslint:disable-next-line:max-line-length
    // const imagePath = 'https://storage.googleapis.com/imageupload-31f7a.appspot.com/upload_images%2Fresize400_-KqRHktqmwI3TVYWC0ax.jpg?GoogleAccessId=firebase-adminsdk-g99nm@imageupload-31f7a.iam.gserviceaccount.com&Expires=16730323200&Signature=JCYT8JZDC0CMHnjoeCb8Inq07XnwH%2BfevLAZi3oT9lcj%2BgovWrGgnN714M3AYYjA%2FVqmSPY2FtFn3y3bSY3lJD9a1BpHPd9xwvJoUXxpQbUfNTio2cW9qRavlnnX2La5xqoyRaBFRXOiw%2BImY8LD4kzfwBrtAs6vFkWmBMRqq0ZKARGF1V6T3GdVYPN898lPfvnHMMAhJSoZa7Fwd557HQxrUtlQu1i1zNUcgiTUlCMA3UFBnn96GN5AIGbmd3mOmKm5M7RXg6s3Q3WNip1D8X%2BrhX6zQ5UQTk40hNoKyOKoy8Fjz0NKpfc0Sc%2BjPMhXvhV7POBuTjykjRTSwusscw%3D%3D';

    this.state = { status: 'none', uploadProgress: 0, crop };
  }

  render() {
    const { status, uploadProgress, imagePath, crop, cropImagePath } = this.state;
    if (status === 'uploading') {
      return (<div>{`uploading ${Math.trunc(uploadProgress)} %`}</div>);
    }

    if (status === 'preparing' || status === 'croping') {
      return (<div>{status}</div>);
    }

    if (cropImagePath) {
      return (
        <img src={cropImagePath} />
      );
    }

    if (imagePath) {
      return (
        <div>
          <ReactCrop src={imagePath} crop={crop} onChange={this.onCropComplete} />
          <br />
          <button onClick={this.onCropSubmit}>Crop</button>
        </div>
      );
    }

    return (
      <input type="file" accept="image/jpeg" onChange={this.onHandleFileChange} />
    );
  }

  onCropComplete(crop: CropProps) {
    this.setState({ crop });
  }

  onCropSubmit() {
    const { crop, imageId } = this.state;
    db.cropImage(imageId || '', crop);
    this.setState({ status: 'croping' });
  }

  onHandleFileChange(e: any) {
    const files = e.target.files as FileList;
    const file = files[0];
    this.setState({ status: 'uploading', uploadProgress: 0 });
    const { uploadTask, ref } = db.uploadImage(file);
    uploadTask.on(
      'state_changed',
      (snapshot: firebase.storage.UploadTaskSnapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        this.setState({ status: progress < 100 ? 'uploading' : 'preparing', uploadProgress: progress });
      },
      (err: Error) => {
        console.log(err);
      },
      () => {
        if (this.sub) {
          this.sub();
        }
        this.sub = db.observeUpload(ref.key || '', (v) => {
          if (v.cropFileUrl) {
            this.setState({
              status: 'done',
              cropImagePath: v.cropFileUrl,
            });
          }
          if (v.resized) {
            this.setState({
              status: 'to-crop',
              imageId: ref.key || undefined,
              imagePath: v.resized,
            });
          }
        });
        return undefined;
      });
  }
}
