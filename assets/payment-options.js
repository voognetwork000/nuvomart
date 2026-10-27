/**
 * Buy Now (prepaid) and Buy COD buttons on the product page.
 *
 * Prepaid: adds the product, removes the COD charge if it is in the cart, tags the
 * cart as prepaid and sends the customer to checkout with the prepaid discount applied.
 *
 * COD: adds the product, adds the COD charge, tags the cart as cash on delivery and
 * sends the customer to checkout.
 */
class PaymentOptions extends HTMLElement {
  connectedCallback() {
    this.addEventListener('click', this.#handleClick);
  }

  disconnectedCallback() {
    this.removeEventListener('click', this.#handleClick);
  }

  /**
   * @param {MouseEvent} event
   */
  #handleClick = (event) => {
    const target = /** @type {Element} */ (event.target);
    const button = target.closest?.('[data-payment-method]');
    if (!button || !this.contains(button)) return;

    event.preventDefault();
    this.#checkout(/** @type {HTMLButtonElement} */ (button));
  };

  /**
   * @param {HTMLButtonElement} button
   */
  async #checkout(button) {
    const form = this.closest('form');
    const variantId = form?.querySelector('input[name="id"]')?.value;
    const quantity = Number(form?.querySelector('input[name="quantity"]')?.value) || 1;

    if (!variantId) return;

    const buttons = this.querySelectorAll('[data-payment-method]');
    buttons.forEach((item) => (item.disabled = true));

    const feeVariantId = this.dataset.codFeeVariantId;
    const isCod = button.dataset.paymentMethod === 'cod';

    try {
      await postJson('/cart/add.js', { items: [{ id: Number(variantId), quantity }] });

      await postJson('/cart/update.js', {
        updates: feeVariantId ? { [feeVariantId]: isCod ? 1 : 0 } : {},
        attributes: { payment_method: isCod ? 'cod' : 'prepaid' },
      });

      window.location.href = this.#checkoutUrl(isCod);
    } catch (error) {
      console.error('Could not start checkout', error);
      buttons.forEach((item) => (item.disabled = false));
    }
  }

  /**
   * @param {boolean} isCod
   * @returns {string}
   */
  #checkoutUrl(isCod) {
    const discountCode = this.dataset.prepaidDiscountCode;

    if (!isCod && discountCode) {
      return `/discount/${encodeURIComponent(discountCode)}?redirect=/checkout`;
    }

    return '/checkout';
  }
}

/**
 * @param {string} url
 * @param {object} body
 * @returns {Promise<unknown>}
 */
async function postJson(url, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Request to ${url} failed with status ${response.status}`);
  }

  return response.json();
}

if (!customElements.get('payment-options')) {
  customElements.define('payment-options', PaymentOptions);
}
