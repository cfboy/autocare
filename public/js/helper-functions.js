function confirmDelete(href, id) {
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
            window.location = `${href}/${id}`;
        }
    })
}

function getCookie(cname) {
    var name = cname + "=";
    var decodedCookie = decodeURIComponent(document.cookie);
    var ca = decodedCookie.split(';');
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}

function manageLangDropdown() {
    var lang = getCookie('lang');
    if (lang !== '') {
        if (lang === 'es') {
            $('#showLang #es-lang').attr('hidden', false);
            $('#showLang #en-lang').attr('hidden', true);

            $('.dropdown-menu #es-lang').addClass('active').attr('hidden', true)
            $('.dropdown-menu #en-lang').removeClass('active').attr('hidden', false);

        }

        if (lang === 'en') {
            $('#showLang #es-lang').attr('hidden', true);
            $('#showLang #en-lang').attr('hidden', false);

            $('.dropdown-menu #en-lang').addClass('active').attr('hidden', true);
            $('.dropdown-menu #es-lang').removeClass('active').attr('hidden', false);
        }
    } else {
        $('#showLang #es-lang').attr('hidden', true);
        $('#showLang #en-lang').attr('hidden', false);

        $('.dropdown-menu #en-lang').addClass('active').attr('hidden', true);
        $('.dropdown-menu #es-lang').removeClass('active').attr('hidden', false);
    }
}

function clearForm(form) {
    form.find('input').val('');
    form.find('select').val("").trigger("change");
}

function showResult(updateDiv, result) {
    $(updateDiv).html(result);
}

function changeLocation(element, fromSelect) {
    var locationID;
    if (fromSelect) {
        locationID = element.options[element.selectedIndex].value;
    }
    else {
        locationID = element.getAttribute('id');
    }
    console.log(`changeLocation to ID: ${locationID}`)

    $.ajax({
        url: "/changeLocation",
        type: "POST",
        contentType: "application/json",
        data: JSON.stringify({
            locationID: locationID
        }),

    }).done(function (result) {
        // if (fromSelect) {
        //     location.reload();
        // }else
            window.location.href = "/account";
    }).fail(function (err) {
        console.log(err);
    })

}