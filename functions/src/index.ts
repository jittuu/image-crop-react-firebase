import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp(functions.config().firebase);
import { listener as resize } from './resize';
import { listener as crop } from './crop';

export {
  resize,
  crop
};
