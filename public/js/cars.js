function findModel(makeName, carModel = null) {
    console.log("Make Name: " + makeName);
    // Call to Cars API to get the Model of selected Make.
    $.ajax({
        url: "https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMake/" + makeName,
        type: "GET",
        data: { format: "json", data: "3GNDA13D76S000000;5XYKT3A12CG000000;" },
        dataType: "json",
        success: function (result) {
            // console.log(result);
            let modelSelect = $('#model'); //Get the Select element of the Car Model.
            // Append the models to select element.
            modelSelect.empty().append(function () {
                var output = '<option value="">Select One</option>';
                $.each(result.Results, function () {
                    var selected = (this.Model_Name === carModel ? "selected" : "");
                    output += '<option id="' + this.Model_Name + '" ' + selected + '>' + this.Model_Name + '</option>';
                });
                return output;
            }).change();
        },
        error: function (xhr, ajaxOptions, thrownError) {
            console.log(xhr.status);
            console.log(thrownError);
        }
    });
}