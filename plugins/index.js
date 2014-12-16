this.expression = new RegExp("^:index$", "i");
this.fn = function(params, callback) {
            callback({
                status: true,
                info: {
                    icon: '<img style="position:relative; top:-3px;" src="../img/home.png" />',
                    title: 'index page',
                    duration: params.inputDuration,
                    url: params.input
                }
            });
};