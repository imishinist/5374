'use strict';
/**
 各ゴミのカテゴリを管理するクラスです。
 */
var TrashModel;
TrashModel = (function () {
    function TrashModel(_label, _cell, remarks) {
        this.remarks = remarks;
        this.dayLabel = null;
        this.mostRecent = null;
        this.dayList = null;
        this.name = _label;
        this.description = null;
        this.regularFlg = 1;      // 定期回収フラグ（デフォルトはオン:1）

        // mflagが0の月は回収しない
        this.mflag = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        var collect_months;
        // :がある場合は，その後に続く月のみ回収する
        if (_cell.search(/:/) >= 0) {
            var flag = _cell.split(":");
            this.dayCell = flag[0].split(" ");
            collect_months = flag[1].split(" ");
        } else {
            this.dayCell = _cell.split(" ");
            collect_months = ["4", "5", "6", "7", "8", "9", "10", "11", "12", "1", "2", "3"];
        }
        collect_months.forEach(function (val) {
            this.mflag[val - 1] = 1;
        }.bind(this));

        this.dayLabel = this.getDayLabel();
    }

    TrashModel.prototype.getDayLabel = function getDayLabel() {
        if (this.dayLabel == undefined || this.dayLabel == null) {
            var result_text = "";
            this.dayCell.forEach(function (day_cell) {
                if (day_cell.length == 1) {
                    result_text += "毎週" + day_cell + "曜日 ";
                } else if (day_cell.length == 2 && day_cell.substr(0, 1) != "*") {
                    result_text += "第" + day_cell.charAt(1) + day_cell.charAt(0) + "曜日 ";
                } else {
                    // 不定期回収の場合（YYYYMMDD指定）
                    result_text = "不定期 ";
                    this.regularFlg = 0;  // 定期回収フラグオフ
                }
            }.bind(this));
            this.dayLabel = result_text;
        }
        return this.dayLabel;
    };

    TrashModel.prototype.getDateLabel = function getDateLabel() {
        var result_text = this.mostRecent.getFullYear() + "/" + (1 + this.mostRecent.getMonth()) + "/" + this.mostRecent.getDate();
        return this.getRemark() + this.getDayLabel() + " " + result_text;
    };

    var day_enum = ["日", "月", "火", "水", "木", "金", "土"];

    function getDayIndex(str) {
        for (var i = 0; i < day_enum.length; i++) {
            if (day_enum[i] == str) {
                return i;
            }
        }
        return -1;
    }

    /**
     * このごみ収集日が特殊な条件を持っている場合備考を返します。収集日データに"*n" が入っている場合に利用されます
     */
    TrashModel.prototype.getRemark = function getRemark() {
        var ret = "",
            remarks = this.remarks;
        this.dayCell.forEach(function (day) {
            if (day.substr(0, 1) == "*") {
                remarks.forEach(function (remark) {
                    if (remark.id == day.substr(1, 1)) {
                        ret += remark.text + "<br/>";
                    }
                });
            }
        });
        return ret;
    };
    /**
     このゴミの年間のゴミの日を計算します。
     センターが休止期間がある場合は、その期間１週間ずらすという実装を行っております。
     */
    TrashModel.prototype.calcMostRect = function calcMostRect(areaObj) {
        var day_mix = this.dayCell;
        var day_list = [];

        // 定期回収の場合
        if (this.regularFlg == 1) {

            var today = new Date();

            // 12月 +3月　を表現
            for (var i = 0; i < MaxMonth; i++) {
                var curMonth = today.getMonth() + i;
                var curYear = today.getFullYear() + Math.floor(curMonth / 12);
                var month = (curMonth % 12) + 1;

                // 収集が無い月はスキップ
                if (this.mflag[month - 1] == 0) {
                    continue;
                }
                for (var j in day_mix) {
                    //休止期間だったら、今後一週間ずらす。
                    var isShift = false;

                    //week=0が第1週目です。
                    for (var week = 0; week < 5; week++) {
                        //4月1日を起点として第n曜日などを計算する。
                        var date = new Date(curYear, month - 1, 1);
                        var d = new Date(date);
                        //コンストラクタでやろうとするとうまく行かなかった。。
                        //
                        //4月1日を基準にして曜日の差分で時間を戻し、最大５週までの増加させて毎週を表現
                        d.setTime(date.getTime() + 1000 * 60 * 60 * 24 *
                            ((7 + getDayIndex(day_mix[j].charAt(0)) - date.getDay()) % 7) + week * 7 * 24 * 60 * 60 * 1000
                        );
                        //年末年始のずらしの対応
                        //休止期間なら、今後の日程を１週間ずらす
                        if (areaObj.isBlankDay(d)) {
                            if (WeekShift) {
                                isShift = true;
                            } else {
                                continue;
                            }
                        }
                        if (isShift) {
                            d.setTime(d.getTime() + 7 * 24 * 60 * 60 * 1000);
                        }
                        //同じ月の時のみ処理したい
                        if (d.getMonth() != (month - 1) % 12) {
                            continue;
                        }
                        //特定の週のみ処理する
                        if (day_mix[j].length > 1) {
                            if (week != day_mix[j].charAt(1) - 1) {
                                continue;
                            }
                        }

                        day_list.push(d);
                    }
                }
            }
        } else {
            // 不定期回収の場合は、そのまま指定された日付をセットする
            for (var j in day_mix) {
                var year = parseInt(day_mix[j].substr(0, 4));
                var month = parseInt(day_mix[j].substr(4, 2)) - 1;
                var day = parseInt(day_mix[j].substr(6, 2));
                var d = new Date(year, month, day);
                day_list.push(d);
            }
        }
        //曜日によっては日付順ではないので最終的にソートする。
        //ソートしなくてもなんとなりそうな気もしますが、とりあえずソート
        day_list.sort(function (a, b) {
            var at = a.getTime();
            var bt = b.getTime();
            if (at < bt) return -1;
            if (at > bt) return 1;
            return 0;
        });
        //直近の日付を更新
        var now = new Date();

        for (var i = 0; i < day_list.length; i++) {
            if (this.mostRecent == null && now.getTime() < day_list[i].getTime() + 24 * 60 * 60 * 1000) {
                this.mostRecent = day_list[i];
                break;
            }
        }

        this.dayList = day_list;
    };

    TrashModel.prototype.getLeftDay = function getLeftDay() {
        //あと何日かを計算する処理です。
        var today = new Date(),
            leftDay = Math.ceil((this.mostRecent.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)),
            leftDayText = "";

        if (leftDay == 0) {
            leftDayText = "今日";
        } else if (leftDay == 1) {
            leftDayText = "明日";
        } else if (leftDay == 2) {
            leftDayText = "明後日";
        } else {
            leftDayText = leftDay + "日後";
        }
        return leftDayText;
    };

    return TrashModel;
})();
