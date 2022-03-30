//If add more cases of alerts, please keep updated AlertTypes on /src/helpers/alertTypes.js 
function sweetAlerts(AlertTypes, type, message, lingua) {
    if (AlertTypes) {
        AlertTypes = JSON.parse(AlertTypes)
    }

    if (lingua) {
        lingua = JSON.parse(lingua)
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
            confirmAlert(message, lingua);
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

function confirmAlert(message, lingua) {
    Swal.fire({
        title: `${lingua.areYouSure}`,
        text: `${lingua.youWontRevert}`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: `${lingua.deleted}`
    }).then((result) => {
        if (result.isConfirmed) {
            Swal.fire(
                `${lingua.deleted}`,
                `${lingua.hasBeenDeleted(message)}`,
                'success'
            )
        }
    })
}

// TODO: Add more cases
// https://sweetalert2.github.io/#examples