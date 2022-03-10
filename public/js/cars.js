/**
 * This function is called from AJAX function to fing the mondel of selected brand/make.
 * @param {*} makeName 
 * @param {*} carModel 
 */
function findModel(makeName, carModel = null) {
    console.log("Make Name: " + makeName);
    // Call to Cars API to get the Model of selected Make.
    let modelSelect = $('#carModel'); //Get the Select element of the Car Model.

    if (makeName === '') {
        // Removed ajax call to avoid go to server and back.
        // $.ajax({
        // success: function () {
        modelSelect.empty().append(new Option("Select One", "", false, false)).trigger("change");
        // }
        // });
    } else {
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

                models = models.sort((a, b) => a.Model_Name.localeCompare(b.Model_Name))

                // console.log(result);
                // Append the models to select element.
                modelSelect.empty().append(new Option("Select One", "", false, false));

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

$('#carPlate').on('input', function () {
    var c = this.selectionStart,
        r = /[^a-z0-9]/gi,
        v = $(this).val();
    if (r.test(v)) {
        $(this).val(v.replace(r, ''));
        c--;
    }
    this.setSelectionRange(c, c);
});