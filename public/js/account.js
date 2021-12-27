$(document).ready(function () {
  const publishableKey = 'pk_test_51JbqswL5YqSpFl3KswbblP5qXQFWDBV6sNxKnsqfP1Sckl8KaXzpKfAL6aErdRj7M2kp6E3igZVFjrY79ywN9ewT00Rcp2wiCp'

  const stripe = Stripe(
    publishableKey)
  const checkoutButton = $('#checkout-button')
  const manageBillingButton = $('#manage-billing-button')

  checkoutButton.click(function () {
    const product = $("input[name='product']:checked").val()

    fetch('/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'email': customer.email
      },
      body: JSON.stringify({
        product,
        customerID: customer.billingID
      })
    })
      .then((result) => result.json())
      .then(({ sessionId }) => stripe.redirectToCheckout({ sessionId }))
  })

  manageBillingButton.click(function () {
    const requestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        email: customer.email
      },
      body: JSON.stringify({
        customer: customer.billingID
      })
    }

    fetch('/billing', requestOptions)
      .then((response) => response.json())
      .then((result) => window.location.replace(result.url))
      .catch((error) => console.log('error', error))
  })
})
