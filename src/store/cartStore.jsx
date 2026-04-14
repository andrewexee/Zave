import { create } from 'zustand';
import supabase from '../supabaseClient';

export const useCartStore = create((set, get) => ({
  items: [],
  loading: false,

  // Cargar carrito del usuario desde Supabase
  fetchCart: async (userId) => {
    if (!userId) return;
    set({ loading: true });
    const { data } = await supabase
      .from('cart_items')
      .select(`
        id,
        product_id,
        supermarket_id,
        is_checked,
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

    const minPrice = Math.min(...prices.map(p => parseFloat(p.price)));
    const cheapestOptions = prices.filter(p => parseFloat(p.price) === minPrice);

    let selectedSupermarketId = cheapestOptions[0].supermarket_id;

    if (cheapestOptions.length > 1) {
      const currentItems = get().items;
      let supermarketCounts = {};
      currentItems.forEach(item => {
        const sId = item.supermarket_id;
        if (sId) {
          supermarketCounts[sId] = (supermarketCounts[sId] || 0) + 1;
        }
      });

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
        is_checked: false // Por defecto sin tachar
      });

    if (!error) await get().fetchCart(userId);
  },

  // --- NUEVA FUNCIÓN: Alternar tachado persistente ---
  toggleCheck: async (userId, cartItemId, currentState) => {
    const { error } = await supabase
      .from('cart_items')
      .update({ is_checked: !currentState })
      .eq('id', cartItemId);

    if (!error) {
      // Actualización optimista local para que sea instantáneo
      set((state) => ({
        items: state.items.map(item => 
          item.id === cartItemId ? { ...item, is_checked: !currentState } : item
        )
      }));
    }
  },

  // Cambiar supermercado asignado
  updateSupermarket: async (userId, cartItemId, supermarketId) => {
    await supabase
      .from('cart_items')
      .update({ supermarket_id: supermarketId })
      .eq('id', cartItemId);
    await get().fetchCart(userId);
  },

  // --- NUEVA FUNCIÓN: Vaciar un supermercado específico ---
  clearSupermarket: async (userId, supermarketId) => {
    const items = get().items;
    const itemsInSuper = items.filter(i => i.supermarket_id === supermarketId);
    const checkedItems = itemsInSuper.filter(i => i.is_checked);

    if (checkedItems.length > 0) {
      // Si hay productos tachados, eliminamos SOLO esos IDs
      const idsToDelete = checkedItems.map(i => i.id);
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .in('id', idsToDelete);
      
      if (!error) await get().fetchCart(userId);
    } else {
      // Si no hay nada tachado, eliminamos todo lo referente a ese supermercado
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', userId)
        .eq('supermarket_id', supermarketId);

      if (!error) await get().fetchCart(userId);
    }
  },

  // Eliminar un solo producto
  removeItem: async (userId, cartItemId) => {
    await supabase
      .from('cart_items')
      .delete()
      .eq('id', cartItemId);
    await get().fetchCart(userId);
  },

  // Vaciar todo el carrito
  clearCart: async (userId) => {
    if (!userId) return;
    await supabase
      .from('cart_items')
      .delete()
      .eq('user_id', userId);
    set({ items: [] });
  },
}));