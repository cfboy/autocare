$(document).ready(function () {
    const publishableKey = 'pk_test_51JbqswL5YqSpFl3KswbblP5qXQFWDBV6sNxKnsqfP1Sckl8KaXzpKfAL6aErdRj7M2kp6E3igZVFjrY79ywN9ewT00Rcp2wiCp'
    const stripe = Stripe(publishableKey)
    // const checkoutButton = $('#checkout-button') //Old checkout btn TODO: delete
    // const manageBillingButton = $('.manage-billing-button')
    const useServiceButton = $('#use-service-button')
    const checkoutBtn = $('#checkout-btn'); //New checkout btn

    // manageBillingButton.click(function () {
    //     const billingID = $(this).attr("value");
    //     const email = $(this).attr("email");
    //     const requestOptions = {
    //         method: 'POST',
    //         headers: {
    //             'Content-Type': 'application/json',
    //             email: email
    //         },
    //         body: JSON.stringify({
    //             customer: billingID
    //         })
    //     }

    //     fetch('/billing', requestOptions)
    //         .then((response) => response.json())
    //         .then((result) => window.location.replace(result.url))
    //         .catch((error) => console.log('error', error))
    // })

    useServiceButton.click(function (event) {
        event.preventDefault();
        event.stopPropagation();

        const userID = $(this).attr("user-id");
        const carID = $(this).attr("car-id");
        const inputType = $(this).attr("inputType");

        $.ajax({
            url: "/useService",
            type: "POST",
            contentType: "application/json",
            data: JSON.stringify({
                userID: userID,
                carID: carID,
                inputType: inputType
            }),
            beforeSend: function () {
                showResult('#useServiceUpdate',
                    `<div class="spinner text-center p-5">
                            <div class="spinner-grow"></div>
                    </div>`
                );

            }
        }).done(function (result) {
            showResult('#useServiceUpdate', result);
            // cleanInput("tagNumber");
        }).fail(function (err) {
            console.log(err);
        })

    })

    // Checkout
    checkoutBtn.click(function () {
        const subscriptions = JSON.parse($('#subscription-list').val());
        const billingID = $(this).attr("value");
        const email = $(this).attr("email");

        fetch('/checkout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'email': email
            },
            body: JSON.stringify({
                subscriptions,
                customerID: billingID
            })
        })
            .then((result) => result.json())
            .then(({ sessionId }) => stripe.redirectToCheckout({ sessionId }))
    })
})