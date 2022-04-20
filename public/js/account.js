$(document).ready(function () {
    const useServiceButton = $('#use-service-button')
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


})