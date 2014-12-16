this.expression = new RegExp("^:github$", "i");
this.fn = function(params, callback) {
            callback({
                status: true,
                info: {
                    icon: '<img style="position:relative; top:-3px;" src="../img/github.png" />',
                    title: 'GitHub application',
                    duration: params.inputDuration,
                    url: params.input
                }
            });
};