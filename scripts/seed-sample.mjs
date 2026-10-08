import { initializeApp } from 'firebase/app';
import { doc, getFirestore, setDoc, Timestamp } from 'firebase/firestore';
import { firebaseConfig } from '../src/app/core/firebase-config.ts';
import { DATA_ROOT } from '../src/app/core/paths.ts';

const houseId = '7_أ_1';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

await setDoc(doc(db, DATA_ROOT, 'root'), { name: DATA_ROOT });
await setDoc(doc(db, DATA_ROOT, 'root', 'houses', houseId), {
  name: 'بيت مميز للبيع في المنطقة السابعة',
  description:
    'السعر 2,700,000 جنيه، مليونان وسبعمائة ألف. 3 أدوار، دبل فيس على العمومي، قريب من كومبوند المخابرات، على طريق الواحات وبجوار جامعة MSA. الدور الأول متشطّب سوبر لوكس. أبني بيتك — 6 أكتوبر.',
  region: 7,
  sector: 'أ',
  houseNumber: '1',
  locationKey: houseId,
  photos: ['/samples/region-7-for-sale.png'],
  sellerId: 'sample-emaar-rasha',
  sellerName: 'مكتب الإعمار - رشا عيد',
  sellerType: 'company',
  sellerRating: 5,
  sellerPhone: '01114374239',
  viewCount: 0,
  phoneRevealCount: 0,
  createdAt: Timestamp.fromDate(new Date('2026-10-06T12:00:00+03:00')),
});

console.log(`Seeded houses/${houseId}`);
process.exit(0);
