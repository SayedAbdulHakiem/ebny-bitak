import { initializeApp } from 'firebase/app';
import { collection, collectionGroup, deleteDoc, doc, getDocs, getFirestore, setDoc } from 'firebase/firestore';
import { firebaseConfig } from '../src/app/core/firebase-config.ts';
import { DATA_ROOT } from '../src/app/core/paths.ts';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

await setDoc(doc(db, DATA_ROOT, 'root'), { name: DATA_ROOT }, { merge: true });

async function moveTopLevel(name) {
  const snap = await getDocs(collection(db, name));
  for (const item of snap.docs) {
    await setDoc(doc(db, DATA_ROOT, 'root', name, item.id), item.data());
    await deleteDoc(item.ref);
    console.log(`moved ${name}/${item.id}`);
  }
}

await moveTopLevel('houses');
await moveTopLevel('users');

const days = await getDocs(collectionGroup(db, 'daily'));
for (const item of days.docs) {
  const parts = item.ref.path.split('/');
  if (parts[0] === DATA_ROOT) continue;
  await setDoc(doc(db, DATA_ROOT, 'root', ...parts), item.data());
  await deleteDoc(item.ref);
  console.log(`moved ${item.ref.path}`);
}

console.log(`Data is under ${DATA_ROOT}/root`);
process.exit(0);
