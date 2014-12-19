var utils = require("../helpers/utils")();

describe("indexOfObject", function () {
    it("return the first index in an array of a value in an object", function () {
        var mock = [{
            id:'hallo'
        }, {
            id:8
        }, {
            id:12
        }];
        var index = utils.indexOfObject(mock, 'id', '8');
        expect(index).toBe(1);
    });
});

describe("newFormatTime", function () {
    it("should format the seconds as hh m\" s'", function () {
        var seconds = 60;
        var string = utils.newFormatTime(seconds, false);
        expect(string).toBe('01\'');

        seconds = 10;
        string = utils.newFormatTime(seconds, true);
        expect(string).toBe('10"');

        seconds = 1000;
        string = utils.newFormatTime(seconds, true);
        expect(string).toBe('16\' 40"');

        seconds = 10000;
        string = utils.newFormatTime(seconds, true);
        expect(string).toBe('2h 46\' 40"');

    });
});