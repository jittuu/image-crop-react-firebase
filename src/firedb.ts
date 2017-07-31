import * as firebase from 'firebase';

const config = {
  apiKey: 'AIzaSyAwOp9aWCC4tjgeWD_SOvG3rAjChpnAnMU',
  authDomain: 'imageupload-31f7a.firebaseapp.com',
  databaseURL: 'https://imageupload-31f7a.firebaseio.com/',
  projectId: 'imageupload-31f7a',
  storageBucket: 'imageupload-31f7a.appspot.com',
  messagingSenderId: '1006622927028'
};
firebase.initializeApp(config);

export const uploadImage = (f: File) => {
  const uploadsRef = firebase.database().ref('uploads');
  const newRef = uploadsRef.push();
  newRef.set({ name: f.name });
  const storageRef = firebase.storage().ref();
  const name = newRef.key || f.name;
  const imgRef = storageRef.child(`upload_images/${name}.jpg`);
  return imgRef.put(f);
};
