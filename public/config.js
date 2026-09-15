// Configure only confirmed commercial terms. Null values are not displayed.
window.MADAME_CONFIG = Object.freeze({
  checkoutUrl: 'https://lastlink.com/p/C01555529/checkout-payment/',
  purchaseLabel: 'Acessar a Lista',
  price: 'R$ 197,00 à vista',
  installments: '12x de R$ 20,98',
  referenceTotal: 'R$ 997,00',
  referenceValues: Object.freeze(['R$ 297,00','R$ 197,00','R$ 97,00','R$ 147,00','R$ 97,00','R$ 197,00','R$ 97,00']),
  guarantee: null,
  accessPeriod: 'Vitalício',
  updates: null,
  // Ativar somente após confirmar o benefício e sua aplicação no checkout.
  // {headline, description, code, checkoutUrl}; code e checkoutUrl são opcionais.
  leadIncentive: Object.freeze({
    headline: 'Seu próximo garimpo começa aqui.',
    description: 'A coleção completa por R$ 197,00 à vista. Confira as condições de pagamento no checkout.',
    referencePrice: 'R$ 997,00',
    price: 'R$ 197,00',
    checkoutUrl: 'https://lastlink.com/p/C01555529/checkout-payment/'
  })
});
