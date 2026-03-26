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

  // Añadir producto (asigna automáticamente el supermercado más barato)
  addItem: async (userId, product) => {
    // Buscar el supermercado con el precio más bajo
    const prices = product.product_prices ?? [];
    if (prices.length === 0) return;
    const cheapest = prices.reduce((min, p) => p.price < min.price ? p : min);

    const { error } = await supabase
      .from('cart_items')
      .insert({
        user_id: userId,
        product_id: product.id,
        supermarket_id: cheapest.supermarket_id,
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