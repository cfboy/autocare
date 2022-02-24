function findModel(makeName, carModel = null) {
    console.log("Make Name: " + makeName);
    // Call to Cars API to get the Model of selected Make.
    let modelSelect = $('#carModel'); //Get the Select element of the Car Model.

    if (makeName === '') {
        $.ajax({
            success: function () {
                modelSelect.empty().append(new Option("Select One", "", false, false)).trigger("change");
            }
        });
    } else {
        $.ajax({
            url: "https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMake/" + makeName,
            type: "GET",
            data: { format: "json", data: "3GNDA13D76S000000;5XYKT3A12CG000000;" },
            dataType: "json",
            success: function (result) {
                // console.log(result);
                // Append the models to select element.
                modelSelect.empty().append(new Option("Select One", "", false, false));

                $.each(result.Results, function () {
                    // This works with select2 library.
                    var newOption = new Option(this.Model_Name, this.Model_Name, false, false);
                    modelSelect.append(newOption)
                })

                modelSelect.trigger("change");

                // modelSelect.empty().append(function () {
                //     var output = '<option value="">Select One</option>';
                //     $.each(result.Results, function () {
                //         var selected = (this.Model_Name === carModel ? "selected" : "");
                //         output += '<option id="' + this.Model_Name + '" ' + selected + '>' + this.Model_Name + '</option>';
                //     });
                //     return output;
                // }).trigger("change");
            },
            error: function (xhr, ajaxOptions, thrownError) {
                console.log(xhr.status);
                console.log(thrownError);
            }
        });
    }
}