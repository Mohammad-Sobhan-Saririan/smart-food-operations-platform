import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product } from '@/types'; // Import the Product type

export interface CartItem extends Product {
    quantity: number;
}

interface CartState {
    cart: CartItem[];
    addToCart: (product: Product) => void;
    removeFromCart: (productId: string) => void;
    increaseQuantity: (productId: string) => void;
    decreaseQuantity: (productId: string) => void;
    clearCart: () => void; // <-- ADD THIS LINE to the interface
    removeItem: (productId: string) => void; // <-- ADD THIS
}

export const useCartStore = create(persist<CartState>((set) => ({
    cart: [],

    // Adds a product or increases its quantity
    addToCart: (product) =>
        set((state) => {
            const existingItem = state.cart.find((item) => item.id === product.id);
            if (existingItem) {
                // If item exists, just increase quantity
                return {
                    cart: state.cart.map((item) =>
                        item.id === product.id
                            ? { ...item, quantity: item.quantity + 1 }
                            : item
                    ),
                };
            } else {
                // If new item, add it to the cart with quantity 1
                return { cart: [...state.cart, { ...product, quantity: 1 }] };
            }
        }),

    removeItem: (productId) =>
        set((state) => ({
            cart: state.cart.filter((item) => item.id !== productId),
        })),

    // Removes an item completely from the cart
    removeFromCart: (productId) =>
        set((state) => ({
            cart: state.cart.filter((item) => item.id !== productId),
        })),

    // Increases quantity of an existing item
    increaseQuantity: (productId) =>
        set((state) => ({
            cart: state.cart.map((item) =>
                item.id === productId ? { ...item, quantity: item.quantity + 1 } : item
            ),
        })),

    // Decreases quantity or removes item if quantity is 1
    decreaseQuantity: (productId) =>
        set((state) => {
            const existingItem = state.cart.find((item) => item.id === productId);
            if (existingItem && existingItem.quantity > 1) {
                return {
                    cart: state.cart.map((item) =>
                        item.id === productId ? { ...item, quantity: item.quantity - 1 } : item
                    ),
                };
            } else {
                // Remove item if quantity is 1 or less
                return { cart: state.cart.filter((item) => item.id !== productId) };
            }
        }),
    clearCart: () => set({ cart: [] }),
}), {
    name: 'cafe-cart-storage', // The name of the item in localStorage
}));