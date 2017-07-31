import * as React from 'react';
import * as db from './firedb';
import * as firebase from 'firebase';

const crop = {
  aspect: 60 / 75,
};
const ReactCrop = require('react-image-crop');

interface State {
  uploading: boolean;
  uploadProgress: number;
  imagePath?: string;
}

export default class ImageEditor extends React.Component<{}, State> {
  constructor(props: {}) {
    super(props);
    this.onHandleFileChange = this.onHandleFileChange.bind(this);
    this.state = { uploading: false, uploadProgress: 0 };
  }

  render() {
    const { uploading, uploadProgress, imagePath } = this.state;
    if (uploading) {
      return (<div>{`uploading ${uploadProgress} %`}</div>);
    }

    if (imagePath) {
      return (<ReactCrop src={imagePath} crop={crop} />);
    }

    return (
      <input type="file" accept="image/jpeg" onChange={this.onHandleFileChange} />
    );
  }

  onHandleFileChange(e: any) {
    const files = e.target.files as FileList;
    const file = files[0];
    this.setState({ uploading: true, uploadProgress: 0 });
    const uploadTask = db.uploadImage(file);
    uploadTask.on(
      'state_changed',
      (snapshot: firebase.storage.UploadTaskSnapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        this.setState({ uploading: true, uploadProgress: progress });
      },
      (err: Error) => {
        console.log(err);
      },
      () => {
        this.setState({
          uploading: false,
          imagePath: uploadTask.snapshot.downloadURL || ''
        });
        return undefined;
      });
  }
}
