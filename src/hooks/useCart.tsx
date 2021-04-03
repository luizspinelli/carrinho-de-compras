import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const findProduct = cart.find(product => product.id === productId);
      if(!findProduct) {
        let product = await (await api.get(`products/${productId}`)).data;
        product = {...product, amount: 1};
        setCart([...cart, product])
        localStorage.setItem('@RocketShoes:cart', JSON.stringify([...cart, product]))
        return;
      } else {
        const productStock: Stock = await (await api(`stock/${productId}`)).data
        const checkStock = productStock.amount > findProduct.amount;
        if(checkStock) {
          const newCart = cart.map(product =>{
            if(product.id === productId){
              return {
                ...product,
                amount: product.amount > 0 ? product.amount + 1 : 1
              }
            }
            return product
          })
          setCart(newCart)
          localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))
          return;
        } else {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }

      }
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const findProduct = cart.find(product => product.id === productId);
      if(!findProduct){
        toast.error('Erro na remoção do produto');
        return;
      }
      const newCart = cart.filter(product => product.id !== findProduct?.id)
      setCart(newCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
        if(amount <= 1) {
          return;
        }
        const productStock: Stock = await (await api(`stock/${productId}`)).data
        const checkStock = productStock.amount >= amount;
        if(checkStock) {
          const newCart = cart.map(product =>{
            if(product.id === productId){
              return {
                ...product,
                amount: amount
              }
            }
            return product
          })
          setCart(newCart)
          localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))
        } else {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
