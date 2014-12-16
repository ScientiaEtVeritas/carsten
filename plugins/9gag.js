this.expression = new RegExp("^:9gag$", "i");
this.fn = function(params, callback) {
            callback({
                status: true,
                info: {
                    icon: '<img style="position:relative; top:-3px;" src="../img/9gag-icon.png" />',
                    title: '9gag application',
                    duration: params.inputDuration,
                    url: params.input
                }
            });
};