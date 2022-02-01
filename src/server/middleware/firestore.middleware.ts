/**
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Request, Response } from 'express';
import * as admin from 'firebase-admin';
import { ClearReportRequest } from '../../common-types';

export async function clearReport(req: Request, res: Response) {
  try {
    const request = req.body as ClearReportRequest;
    // Verify the identify of the currently signed-in user.
    const uid = (
      await admin
        .auth()
        .verifyIdToken(request.idToken, /* checkedRevoked = */ true)
    ).uid;
    const platform = request.platform;
    const documentId = request.documentId;
    const firestore = admin.firestore();
    const document = firestore.doc(
      `users/${uid}/${platform}_reports/${documentId}`
    );
    await deleteDocument(document, firestore);
    res.end();
  } catch (e) {
    console.error('Error clearing repoort: ' + e);
    res.status(500).send('Error clearing report');
  }
}

async function deleteDocument(
  doc: FirebaseFirestore.DocumentReference,
  firestore: FirebaseFirestore.Firestore
) {
  const subcollections = await doc.listCollections();
  for (const collection of subcollections) {
    await deleteCollection(collection, firestore);
  }
  await doc.delete();
}

async function deleteCollection(
  collection: FirebaseFirestore.CollectionReference,
  firestore: FirebaseFirestore.Firestore
) {
  const docs = await collection.listDocuments();
  if (docs.length === 0) {
    return;
  }
  for (const doc of docs) {
    await deleteDocument(doc, firestore);
  }
}
