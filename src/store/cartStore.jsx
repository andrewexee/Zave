import { create } from 'zustand';
import supabase from '../supabaseClient';

export const useCartStore = create((set, get) => ({
  items: [],
  loading: false,

  // Cargar carrito del usuario desde Supabase
  fetchCart: async (userId) => {
    set({ loading: true });
    const { data } = await supabase
      .from('cart_items')
      .select(`
        id,
        product_id,
        supermarket_id,
        products (
          id, name, description, weight_grams,
          categories ( id, name, color ),
          product_prices ( supermarket_id, price )
        ),
        supermarkets ( id, name )
      `)
      .eq('user_id', userId)
      .order('created_at');
    set({ items: data ?? [], loading: false });
  },

  // Añadir producto con lógica de desempate por prioridad
  addItem: async (userId, product) => {
    const prices = product.product_prices ?? [];
    if (prices.length === 0) return;

    // 1. Encontrar el precio mínimo absoluto
    const minPrice = Math.min(...prices.map(p => parseFloat(p.price)));

    // 2. Filtrar todos los supermercados que comparten ese precio mínimo
    const cheapestOptions = prices.filter(p => parseFloat(p.price) === minPrice);

    let selectedSupermarketId = cheapestOptions[0].supermarket_id;

    // 3. Desempate: si hay más de un supermercado con el precio mínimo
    if (cheapestOptions.length > 1) {
      const currentCartItems = get().items;
      const supermarketCounts = {};

      // Contar cuántos productos hay de cada supermercado actualmente en la lista
      currentCartItems.forEach(item => {
        const sId = item.supermarket_id;
        if (sId) {
          supermarketCounts[sId] = (supermarketCounts[sId] || 0) + 1;
        }
      });

      // Evaluar cuál de las opciones empatadas tiene más presencia en el carrito
      let maxCount = -1;
      cheapestOptions.forEach(option => {
        const count = supermarketCounts[option.supermarket_id] || 0;
        if (count > maxCount) {
          maxCount = count;
          selectedSupermarketId = option.supermarket_id;
        }
      });
    }

    const { error } = await supabase
      .from('cart_items')
      .insert({
        user_id: userId,
        product_id: product.id,
        supermarket_id: selectedSupermarketId,
      });

    if (!error) await get().fetchCart(userId);
  },

  // Cambiar supermercado asignado a un producto del carrito
  updateSupermarket: async (userId, cartItemId, supermarketId) => {
    await supabase
      .from('cart_items')
      .update({ supermarket_id: supermarketId })
      .eq('id', cartItemId);
    await get().fetchCart(userId);
  },

  // Eliminar un producto del carrito
  removeItem: async (userId, cartItemId) => {
    await supabase
      .from('cart_items')
      .delete()
      .eq('id', cartItemId);
    await get().fetchCart(userId);
  },

  // Vaciar carrito completo
  clearCart: async (userId) => {
    await supabase
      .from('cart_items')
      .delete()
      .eq('user_id', userId);
    set({ items: [] });
  },
}));