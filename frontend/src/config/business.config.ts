export const BusinessConfig = {
  tax: {
    igvRate: 0.18,
    igvLabel: 'IGV',
    country: 'PE',
    pricesIncludeTax: true
  },

  currency: {
    code: 'PEN',
    symbol: 'S/',
    locale: 'es-PE'
  },

  payment: {
    methods: [
      { id: 1, name: 'Efectivo', code: 'CASH' },
      { id: 2, name: 'Tarjeta', code: 'CARD' },
      { id: 3, name: 'Transferencia', code: 'TRANSFER' },
      { id: 4, name: 'Yape/Plin', code: 'WALLET' },
      { id: 5, name: 'Crédito', code: 'CREDIT' }
    ]
  },

  pos: {
    defaultSearchMinLength: 2,
    maxCartItems: 100,
    showStockInSearch: true,
    autoFocusSearch: true
  }
} as const;

export type PaymentMethod = typeof BusinessConfig.payment.methods[number];
