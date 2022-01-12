//If add moder cases of alert, please keep updated AlertTypes: /src/helpers/alertTypes.js 
function sweetAlerts(AlertTypes, type, message) {
    if (AlertTypes) {
        AlertTypes = JSON.parse(AlertTypes)
    }
    switch (type) {
        case AlertTypes.BasicAlert:
            basicAlert(message);
            break;
        case AlertTypes.WarningAlert:
            warningIconAlert(message);
            break;
        case AlertTypes.ErrorAlert:
            errorIconAlert(message);
            break;
        case AlertTypes.CompletedActionAlert:
            completedActionAlert(message);
            break;
        case AlertTypes.ConfirmAlert:
            confirmAlert(message);
            break;

        default:
            basicAlert(message);
            console.log('Trying to alert the user.');
    }
}

function basicAlert(message) {
    Swal.fire({ text: message })
}

function warningIconAlert(message) {
    Swal.fire({
        icon: 'warning',
        text: message
    });
}

function errorIconAlert(message) {
    Swal.fire({
        icon: 'error',
        text: message
    });
}

function completedActionAlert(message) {
    Swal.fire({
        icon: 'success',
        title: message,
        showConfirmButton: false,
        timer: 1500
    })
}

function confirmAlert(message) {
    Swal.fire({
        title: 'Are you sure?',
        text: "You won't be able to revert this!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, delete it!'
    }).then((result) => {
        if (result.isConfirmed) {
            Swal.fire(
                'Deleted!',
                `${message} has been deleted.`,
                'success'
            )
        }
    })
}

// TODO: Add more cases
// https://sweetalert2.github.io/#examples