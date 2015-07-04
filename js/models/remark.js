'use strict';

/**
 * ゴミ収集日に関する備考を管理するクラスです。
 * remarks.csvのモデルです。
 * @class RemarkModel
 * @constructor
 */
var RemarkModel = (function() {
    var remarkModel = function(data) {
        this.id = data[0];
        this.text = data[1];
    };

    return remarkModel;
})();

