/**
 * This function is called from AJAX function to fing the mondel of selected brand/make.
 * @param {*} makeName 
 * @param {*} carModel 
 */
function findModel(makeName, carModel = null, select) {
    console.log("Make Name: " + makeName);
    // Call to Cars API to get the Model of selected Make.
    let modelSelect = $('#carModel'); //Get the Select element of the Car Model.

    if (makeName === '') {
        // Removed ajax call to avoid go to server and back.
        // $.ajax({
        // success: function () {
        modelSelect.empty().append(new Option(select, "", false, false)).trigger("change");
        // }
        // });
    } else {
        // TODO: add backup if the API its not working.
        $.ajax({
            url: "https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMake/" + makeName,
            type: "GET",
            data: { format: "json", data: "3GNDA13D76S000000;5XYKT3A12CG000000;" },
            dataType: "json",
            beforeSend: function () {
                modelSelect.attr('disabled', true);
            },
            success: function (result) {
                let models = result.Results
                //TODO: verify if has models then show a select with models or show open input field.
                models = models.sort((a, b) => a.Model_Name.localeCompare(b.Model_Name))

                // console.log(result);
                // Append the models to select element.
                modelSelect.empty().append(new Option(select, "", false, false));

                $.each(models, function () {
                    let selected = (carModel && carModel == this.Model_Name)
                    // This works with select2 library.
                    var newOption = new Option(this.Model_Name, this.Model_Name, selected, selected);
                    modelSelect.append(newOption);
                })

                modelSelect.trigger("change");
                modelSelect.attr('disabled', false);
            },
            error: function (xhr, ajaxOptions, thrownError) {
                console.log(xhr.status);
                console.log(thrownError);
            }
        });
    }
}

function autofillCarInfo(selectedCar, linguaString) {
    if (selectedCar && selectedCar.value != '') {
        let id = selectedCar.selectedOptions[0].getAttribute('value');
        let brand = selectedCar.selectedOptions[0].getAttribute('brand');
        // let model = selectedCar.selectedOptions[0].getAttribute('model');
        let plate = selectedCar.selectedOptions[0].getAttribute('plate');
        let carBrand = $('#brand');
        // let carModel = $('#carModel');
        let carPlate = $('#carPlate');

        carBrand.attr('disabled', true);
        // carModel.attr('disabled', true);
        carPlate.attr('disabled', true);

        // showResult function is in the helper-functions.js
        showResult('#autofillLoading', `<span class="d-block alert-fill-info rounded-1 p-2">${linguaString}...</span>`)

        // Set the values to the form fields.
        if (carBrand.data('select2'))
            carBrand.select2().val(brand).trigger('change'); //This trigger the function findModel on cars.js
        else {
            carBrand.val(brand);
        }
        carBrand.attr('disabled', false);
        // Set timeout in which the models loads.
        setTimeout(function () {
            // carModel.attr('disabled', true);
            // if (model) {
            //     if (carModel.data('select2'))
            //         carModel.select2().val(model).trigger('change');
            //     else {
            //         carModel.val(model);
            //     }
            // }
            // carModel.attr('disabled', false);
            carPlate.attr('disabled', false);
            carPlate.val(plate);
            showResult('#autofillLoading', "")
        }, 1500);

    }

}

$('#carPlate').on('input', function () {
    this.setCustomValidity("");

    var c = this.selectionStart,
        r = /[^a-z0-9]/gi,
        v = $(this).val();
    if (r.test(v)) {
        $(this).val(v.replace(r, ''));
        c--;
    }
    this.setSelectionRange(c, c);
});