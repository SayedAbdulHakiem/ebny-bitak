import { Injectable, inject } from '@angular/core';
import { CollectionReference, getDocs, query, runTransaction, where } from 'firebase/firestore';
import { todayKey } from './dates';
import { FirebaseService } from './firebase.service';
import { House, HouseStatRow, RangeTotals, SellerStatRow } from './models';
import { houseDayDocument, houseDaysCollection, houseDocument, sellerDayDocument, sellerDaysCollection } from './paths';

type ClickKind = 'views' | 'phone';

@Injectable({ providedIn: 'root' })
export class StatsService {
  private readonly firebase = inject(FirebaseService);

  async record(houseId: string, kind: ClickKind): Promise<void> {
    const db = this.firebase.requireFirestore();
    const date = todayKey();
    const houseRef = houseDocument(db, houseId);

    await runTransaction(db, async (transaction) => {
      const houseSnap = await transaction.get(houseRef);
      if (!houseSnap.exists()) throw new Error('المنزل غير موجود.');
      const sellerId = String(houseSnap.data()['sellerId'] ?? '');
      const houseName = String(houseSnap.data()['name'] ?? '');
      const houseDayRef = houseDayDocument(db, houseId, date);
      const sellerDayRef = sellerDayDocument(db, sellerId, date);
      const houseDaySnap = await transaction.get(houseDayRef);
      const sellerDaySnap = await transaction.get(sellerDayRef);

      const viewCount = Number(houseSnap.data()['viewCount'] ?? 0);
      const phoneRevealCount = Number(houseSnap.data()['phoneRevealCount'] ?? 0);
      const houseViews = Number(houseDaySnap.data()?.['views'] ?? 0);
      const housePhone = Number(houseDaySnap.data()?.['phoneReveals'] ?? 0);
      const sellerViews = Number(sellerDaySnap.data()?.['views'] ?? 0);
      const sellerPhone = Number(sellerDaySnap.data()?.['phoneReveals'] ?? 0);
      const viewInc = kind === 'views' ? 1 : 0;
      const phoneInc = kind === 'phone' ? 1 : 0;

      transaction.update(
        houseRef,
        kind === 'views' ? { viewCount: viewCount + 1 } : { phoneRevealCount: phoneRevealCount + 1 },
      );
      transaction.set(houseDayRef, {
        scope: 'house',
        houseId,
        sellerId,
        houseName,
        date,
        views: houseViews + viewInc,
        phoneReveals: housePhone + phoneInc,
      });
      transaction.set(sellerDayRef, {
        scope: 'seller',
        sellerId,
        sourceHouseId: houseId,
        date,
        views: sellerViews + viewInc,
        phoneReveals: sellerPhone + phoneInc,
      });
    });
  }

  async houseTotals(houseId: string, from: string, to: string): Promise<RangeTotals> {
    const days = houseDaysCollection(this.firebase.requireFirestore(), houseId);
    return sumDays(days, from, to);
  }

  async sellerTotals(sellerId: string, from: string, to: string): Promise<RangeTotals> {
    const days = sellerDaysCollection(this.firebase.requireFirestore(), sellerId);
    return sumDays(days, from, to);
  }

  async overview(houses: House[], from: string, to: string): Promise<{ houses: HouseStatRow[]; sellers: SellerStatRow[] }> {
    const rows = await Promise.all(
      houses.map(async (house) => {
        const totals = await this.houseTotals(house.id, from, to);
        return { house, views: totals.views, phoneReveals: totals.phoneReveals };
      }),
    );
    const sellers = new Map<string, SellerStatRow>();
    rows.forEach((row) => {
      const current = sellers.get(row.house.sellerId) ?? {
        sellerId: row.house.sellerId,
        sellerName: row.house.sellerName,
        sellerType: row.house.sellerType,
        houses: 0,
        views: 0,
        phoneReveals: 0,
      };
      current.houses += 1;
      current.views += row.views;
      current.phoneReveals += row.phoneReveals;
      sellers.set(row.house.sellerId, current);
    });
    return {
      houses: rows.sort((a, b) => b.views - a.views),
      sellers: [...sellers.values()].sort((a, b) => b.views - a.views),
    };
  }
}

async function sumDays(days: CollectionReference, from: string, to: string): Promise<RangeTotals> {
  const snap = await getDocs(query(days, where('date', '>=', from), where('date', '<=', to)));
  return snap.docs.reduce<RangeTotals>(
    (totals, item) => ({
      views: totals.views + Number(item.data()['views'] ?? 0),
      phoneReveals: totals.phoneReveals + Number(item.data()['phoneReveals'] ?? 0),
    }),
    { views: 0, phoneReveals: 0 },
  );
}
