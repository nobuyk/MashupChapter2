/**
 *
 */

// 定数
var RANGE = 3;
var MAXHIT = 15;	// 1回の検索でヒットする店舗の最大数
var ZOOM_SIZE = 6;
var POPDIV_ID = "_shopphoto";

// グローバル変数
var map;	// マップオブジェクト
var gShopObjList = new Array();	// 検索ヒットした店舗のデータを保存
var gLat,gLng;	// 直前にチェックしたポイントの緯度、軽度を保存

//-------------------------------------------------------------------
// HTMLイベントハンドラ設定

window.onload = function() {
	load();
	setEvent();
}

//-------------------------------------------------------------------
// Googleマップ初期化

function load() {
	if (GBrowserIsCompatible()) {
		map = new GMap2(document.getElementById("mymap"));
		map.setCenter(new GLatLng(35.6829, 139.7653), ZOOM_SIZE);
		map.addControl(new GScaleControl());
		map.addControl(new GLargeMapControl());
		map.addControl(new GOverviewMapControl(new GSize(128,128)));
    }
}

//-------------------------------------------------------------------
//マーカを作る

function createGMarker(title, html, lat, lng) {
	var infoObj = new Object();
	infoObj.title = title;
	var gpObj = new GLatLng(lat, lng);
	var marker = new GMarker(gpObj, infoObj);
	map.addOverlay(marker);
	GEvent.addListener(marker, "click", function() {
		marker.openInfoWindowHtml(html);
	});
}

//---------------------------------------------------------------------
//イベントハンドラ設定

function setEvent() {
	GEvent.addListener(map, "click", function(lay, point) {
		if (lay == null) {
			var lat = Math.round(chgWgs2TkyLat(point.y, point.x)*100000)/100000;
			var lng = Math.round(chgWgs2TkyLng(point.y, point.x)*100000)/100000;
			gLat = lat;
			gLng = lng;
			getShopData(0);
		}
	});

	GEvent.addListener(map, "infowindowclose", function() {
		sPhotoClose();
	});

}

//-------------------------------------------------------------------
// 指定したポイント周辺の飲食店データを受け、対応処理へ分岐

function setMarkers(res) {
	map.clearOverlays();	// すべてのマーカを削除
	gShopObjList.length = 0;
	document.getElementById("menu").style.display = "none";

	if (! res.total_hit_count) {
		_d("info", "該当情報が登録されていません。エラー番号:" + res.error.code);
	}
	else {
		_d("info", "検索ヒット数&nbsp;" + res.total_hit_count + "&nbsp;件");
		if(res.total_hit_count == 1) {
			shopName = res.rest.name;
			objShop = res.rest;
			createMarker(objShop,shopName);	// 検索ヒットが1件だけなら直接マーカを表示
		}
		else {
			for (var shopName in res.rest) {
				var restObj = res["rest"][shopName];
				restObj.fullName = shopName;
				gShopObjList.push(restObj);
			}
			createShopMenu(res.page_offset - 1, res.total_hit_count);	// 店舗の選択メニューを表示
		}
	}
}

//-------------------------------------------------------------------
//検索ヒットした店舗の選択メニューを表示

function createShopMenu(page, totalCount) {
	var startPos = page * MAXHIT;
	_d("menu-pos", numFormat(startPos + 1));
	_d("menu-sum", numFormat(totalCount));

	var sOut = "";
	for (var i = 0; i < MAXHIT; i++) {
		if (i < gShopObjList.length) {
			shopName = (gShopObjList[i].fullName).replace(/<[ \t]*[Bb][Rr][ \t]*>/, "・");
			sOut += "<div class=\"menu-line\" id=\"menu" + i;
			sOut += "\" onmouseover=\"overShopMenu(" + i;
			sOut += ")\" onclick=\"clickShopMenu()\">";
			sOut += shopName.substr(0, 20);	// 店舗名は最大20文字まででカット
		}
		else {
			sOut += "<div class=\"menu-eline\">&nbsp;";	// リストの余白
		}
		sOut += "</div>";
	}
	_d("menu-lines",sOut);

	if (startPos > 0) {
		_d("menu-pre", "<span onclick=\"getShopData(" + (page-1) + ");\">[前へ]</span>");
	}
	else {
		_d("menu-pre", "[----]");
	}
	if (startPos + MAXHIT < totalCount) {
		_d("menu-next", "<span onclick=\"getShopData(" + (page+1) + ");\">[次へ]</span>");
	}
	else {
		d("menu-next", "[----]");
	}
	document.getElementById("menu").style.height = ((MAXHIT + 2) * 24) + "px";
	document.getElementById("menu").style.display = "block";
}

//-------------------------------------------------------------------
//件数表示用の数字を4桁に整形

function numFormat(num) {
	var numStr = "000" + num;
	return numStr.substr(numStr.length - 4);
}

//-------------------------------------------------------------------
//店舗項目上をマウスが通過したらマーカを表示

function overShopMenu(tgdShop) {
	map.clearOverlays();
	createMarker(gShopObjList[tgdShop], gShopObjList[tgdShop].fullName);
	map.panTo(new GLatLng(gShopObjList[tgdShop].latitude,
			gShopObjList[tgdShop].longitude));	// マーカが中心にる位置にマップをスクロール
}

//-------------------------------------------------------------------
//店舗項目をクリックしたらメニューを非表示に

function clickShopMenu() {
	document.getElementById("menu").style.display = "none";
}

//-------------------------------------------------------------------
//地図上に飲食店マーカを１つ設置する

function createMarker(objShop, shopName) {
	shopName = shopName.replace(/<[ \t]*[Bb][Rr][ \t]*>/, "・");
	var tTitle = createShopTitle(objShop, shopName);
	var tHtml = createShopInfoHtml(objShop, shopName);
	createGMarker(tTitle, tHtml, objShop.latitude, objShop.longitude);
}

//-------------------------------------------------------------------
//マーカのチップヘルプ

function createShopTitle(objShop, shopName) {
	var sTitle = shopName +
	"(" + errChk(objShop.code.category_name_l.content) +
	":" + errChk(objShop.code.category_name_s.content) +
        "/" + errChk(objShop.budget) + "円)";
	return sTitle;
}

//-------------------------------------------------------------------
//情報ウィンドウ内に表示するHTMLコード作成

function createShopInfoHtml(objShop, shopName) {
	var sBody = "<table width=\"480\">" +
	"<tr><th colspan=\"2\">" + shopName + "</th></tr>" +
	"<tr><td>■種別</td><td>" +
	errChk(objShop.code.category_name_l.content) +
	"&nbsp;/&nbsp;" +
	errChk(objShop.code.category_name_s.content) +
	"</td></tr>" +
	"<tr><td>■営業</td><td>" +
	errChk(objShop.opentime) + "&nbsp;/&nbsp;" +
	errChk(objShop.holiday) + "</td></tr>" +
	"<tr><td>■予算</td><td>" +
	errChk(objShop.budget) + "円</td></tr>" +
	"<tr><td><nobr>■アクセス</nobr></td><td>" +
	errChk(objShop.access.line) + "&nbsp;" +
	errChk(objShop.access.station) + "<br />&nbsp;(&nbsp;" +
	errChk(objShop.access.station_exit) + "&nbsp;から&nbsp;" +
	errChk(objShop.access.walk) + "分&nbsp;)&nbsp;" +
	"</td></tr>";
	"<tr><td>■住所</td><td>" +
	errChk(objShop.address) + "</td></tr>" +
	"<tr><td>■電話</td><td>" + errChk(objShop.tel) + "</td></tr>";

	if (varChk(objShop.url, "string")) {
		sBody += "<tr><td>■HP</td>" +
		"<td><a href=\"" + objShop.url + "\" target=\"blank\">" +
		objShop.url + "</td></tr>";
	}

	sBody += "<tr><td colspan=\"2\">" + errChk(objShop.pr.pr_long);

	if (varChk(objShop.image_url.shop_image1,"string")) {
		sBody += "&nbsp;<span onClick=\"sPhotoDsp('" +
		objShop.image_url.shop_image1 +
		"')\"><br />[お店の画像]</span>&nbsp;</td></tr>";
	}

	sBody += "</table>";
	return sBody;
}

//-------------------------------------------------------------------
//店舗データの特定項目が未定義か、空欄だった場合の判定

function errChk(tgd) {
	return varChk(tgd, "string") ? tgd : "---";
}

//-------------------------------------------------------------------
//店舗写真の表示

var photoDiv;

function sPhotoDsp(imageUrl) {
	photoDiv = createDiv(POPDIV_ID, 80, 32);
	document.getElementById(POPDIV_ID).innerHTML =
		"<div id=\"photocnt\" onClick=\"sPhotoClose()\"><img src=\"" +
		imageUrl +
		"\" /><br />提供：ぐるナビ</div>";
}

//-------------------------------------------------------------------
//店舗写真を消す

function sPhotoClose() {
	removeDiv(POPDIV_ID);
}

//-------------------------------------------------------------------
//「ぐるナビ」データアクセス実行

function getShopData(page) {
	_d("info", "＊ 検索中です ＊");
	var gurunaviUrl = getGurunaviUrl(gLat, gLng, page);
	xml2Json(gurunaviUrl,"callBackX2J");
}

//-------------------------------------------------------------------
//「ぐるナビ」データアクセスURL作成

function getGurunaviUrl(lat, lng, page) {
	page++;	// page 指定は1から
	var gurunaviApi = "https://api.gnavi.co.jp/RestSearchAPI/20150630/";
	var gurunaviKey = "7f71c463f4ca77f7f0d6412c77e0f365";
	var queri = gurunaviApi + "?keyid=" + gurunaviKey +
	"&coordinates_mode=2" +
	"&latitude=" + lat +
	"&longitude=" + lng +
	"&range=" + RANGE +
	"&offset_page=" + page +
	"&hit_per_page=" + MAXHIT;
	return queri;
}

//-------------------------------------------------------------------
//APIアクセス中継

function xml2Json(url,callback) {
	var proxyUrl = "http://app.drk7.jp/xml2json/";
	var callUrl = proxyUrl + "var=" + callback + "&url=" + encodeURIComponent(url);
	var script = document.createElement('script');
	script.charset = 'UTF-8';
	script.src = callUrl;
	document.body.appendChild(script);
}

//-------------------------------------------------------------------
//JSONPコールで使用するコールバック関数

var callBackX2J = {}
callBackX2J.onload = function(res) {
	setMarkers(res);
}

//-------------------------------------------------------------------
//測地系の変換
//※本コードはNowral氏が下記に公開されている変換式を参考にしています。
//http://homepage3.nifty.com/Nowral/index.html

function chgTky2WgsLng(lat, lng) {
	return (lng - lat * 0.000046038 - lng * 0.000083043 + 0.010040);
}

function chgTky2WgsLat(lat, lng) {
	return (lat - lat * 0.00010695 + lng * 0.000017464 + 0.0046017);
}

function chgWgs2TkyLng(lat, lng) {
	return (lng + lat * 0.000046047 + lng * 0.000083049 - 0.010041);
}

function chgWgs2TkyLat(lat, lng) {
	return (lat + lat * 0.00010696 - lng * 0.000017467 - 0.0046020);
}

//-------------------------------------------------------------------
//htmlコード挿入

function _d(id, htmlTxt) {
	document.getElementById(id).innerHTML = htmlTxt;
}

//-------------------------------------------------------------------
//divブロック挿入

function createDiv(id, left, top) {
	var outDiv;
	outDiv = document.createElement('div');
	outDiv.id = id;
	document.body.appendChild(outDiv);

	var tgdStyle = document.getElementById(id).style;
	tgdStyle.position = "absolute";
	tgdStyle.left = left + "px";
	tgdStyle.top = top + "px";
	tgdStyle.background = "white";
}

//-------------------------------------------------------------------
//divブロックの削除

function removeDiv(id) {
	var outDiv = document.getElementById(id);
    if (!!outDiv) {	// そのdivブロックが存在すれば削除
        document.body.removeChild(outDiv);
    }
}

//-------------------------------------------------------------------
//要素のタイプを確認する

function varChk(tgd, type) {
	return typeof(tgd) == type ? true : false;
}
