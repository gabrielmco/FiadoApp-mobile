import { Client, Product, Sale } from './types';

export const SCREENS = {
  HOME: 'home',
  CLIENTS: 'clients',
  PRODUCTS: 'products',
  ANALYSIS: 'analysis'
};

export const PRODUCT_DEPARTMENTS = {
  'Pet Shop': ['Alimentação Seca', 'Granel', 'Higiene', 'Acessórios', 'Conforto/Casa'],
  'Agropecuária': ['Nutrição Aves/Suínos', 'Nutrição Bovinos/Equinos', 'Grãos & Insumos', 'Sais Minerais'],
  'Farmácia': ['Medicamentos', 'Defensivos/Venenos', 'Suplementos'],
  'Utilidades/Rural': ['Ferragens & Cercas', 'Cordas & Lonas', 'Vestuário', 'Jardinagem']
};