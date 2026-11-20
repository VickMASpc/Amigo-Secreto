import type { SubItem, WishItem } from '../types';

/** Resolve bundle references against the current published wishlist without modifying Firestore. */
export function resolveLinkedBundles(items: WishItem[]): WishItem[] {
  const index = new Map(items.map((item) => [item.id, item]));
  return items.map((item) => {
    if (item.kind !== 'bundle') return item;
    const subItems: SubItem[] = item.subItems.map((sub) => {
      const source = sub.sourceItemId ? index.get(sub.sourceItemId) : null;
      if (!source || source.ownerId !== item.ownerId || source.kind === 'bundle') return sub;
      return {
        ...sub,
        title: source.title,
        price: source.price,
        kind: source.kind === 'misc' ? 'misc' : source.kind === 'digital' ? 'digital' : 'store',
        url: source.url,
        image: source.image,
        storeName: source.storeName,
        notes: source.variantInfo || sub.notes,
      };
    });
    return {
      ...item,
      subItems,
      price: Math.round(subItems.reduce((sum, sub) => sum + sub.price, 0) * 100) / 100,
    };
  });
}

export const totalWithShipping = (item: WishItem): number =>
  Math.round((item.price + (item.shippingEstimate || 0)) * 100) / 100;
