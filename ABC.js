// kejs.js versi lengkap dengan ID unik untuk redirect link eksternal

function extractDomain(url) {
	var hostname;
	if (url.indexOf("//") > -1) {
		hostname = url.split('/')[2];
	} else {
		hostname = url.split('/')[0];
	}
	hostname = hostname.split(':')[0];
	hostname = hostname.split('?')[0];
	return hostname;
}

function exception() {
	var exception = new Array();
	setting.exceptionurl = setting.exceptionurl;
	exception = setting.exceptionurl.split(",");
	return exception;
}

function convertstr(str) {
	return str.replace(/^\s+/, '').replace(/\s+$/, '');
}

// Generate a unique ID of 10 characters
function generateUniqueId(length = 10) {
	const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
	let result = '';
	for (let i = 0; i < length; i++) {
		result += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return result;
}

// AES Encryption/Decryption setup
var aesCrypto = {};
!function(t) {
	"use strict";
	t.formatter = {
		prefix: "",
		stringify: function(t) {
			var r = this.prefix;
			return r += t.salt.toString(), r += t.ciphertext.toString();
		},
		parse: function(t) {
			var r = CryptoJS.lib.CipherParams.create({}),
				e = this.prefix.length;
			return 0 !== t.indexOf(this.prefix) ? r : (r.ciphertext = CryptoJS.enc.Hex.parse(t.substring(16 + e)), r.salt = CryptoJS.enc.Hex.parse(t.substring(e, 16 + e)), r);
		}
	},
	t.encrypt = function(r, e) {
		try {
			return CryptoJS.AES.encrypt(r, e, {
				format: t.formatter
			}).toString();
		} catch (n) {
			return "";
		}
	},
	t.decrypt = function(r, e) {
		try {
			var n = CryptoJS.AES.decrypt(r, e, {
				format: t.formatter
			});
			return n.toString(CryptoJS.enc.Utf8);
		} catch (i) {
			return "";
		}
	};
}(aesCrypto);

if (!setting.exceptionurl) {
	setting.exceptionurl = window.location.href;
} else {
	setting.exceptionurl += "," + window.location.href;
}

// Mapping from unique ID to feed URL + encrypted external link
var idMap = {};

function showurl(datajson) {
	var check = false;
	var no = 0;
	var exceptionlength = exception().length;
	var linktag = document.getElementsByTagName("a");
	var links = [];
	var usedLinks = new Set();
	var semuaartikel = datajson.feed.openSearch$totalResults.$t;

	// Ambil semua link postingan
	for (var i = 0; i < semuaartikel; i++) {
		var urlartikel;
		for (var s = 0; s < datajson.feed.entry[i].link.length; s++) {
			if (datajson.feed.entry[i].link[s].rel == 'alternate') {
				urlartikel = datajson.feed.entry[i].link[s].href;
				break;
			}
		}
		links.push(urlartikel);
	}

	// Randomkan links
	links = links.sort(() => Math.random() - 0.5);

	// Tandai yang sudah digunakan
	for (var i = 0; i < linktag.length; i++) {
		var currentHref = linktag[i].href;
		for (var j = 0; j < links.length; j++) {
			if (currentHref === links[j]) {
				usedLinks.add(currentHref);
			}
		}
	}

	// Proses setiap <a>
	for (var i = 0; i < linktag.length; i++) {
		check = false;
		no = 0;
		while (check == false && no < exceptionlength) {
			if (extractDomain(linktag[i].href).match(extractDomain(exception()[no]))) {
				check = true;
			}
			no++;
		}
		if (check == false) {
			var linkReplaced = false;
			for (var j = 0; j < links.length; j++) {
				if (!usedLinks.has(links[j])) {
					var feedLink = links[j];
					var encrypted = aesCrypto.encrypt(convertstr(linktag[i].href), convertstr('root'));
					var finalUrl = feedLink + setting.path + encrypted;
					var uniqueId = 'ID-' + generateUniqueId();
					idMap[uniqueId] = finalUrl;
					linktag[i].href = "https://blog-dnz.com/?goto=" + uniqueId;
					linktag[i].rel = "nofollow";
					linktag[i].target = "_blank";
					usedLinks.add(feedLink);
					linkReplaced = true;
					break;
				}
			}
			if (!linkReplaced) {
				console.warn("No available feed links to replace for link: ", linktag[i].href);
			}
		}
	}
}

// Jika halaman saat ini punya ?goto=, handle redirect
(function() {
	const params = new URLSearchParams(window.location.search);
	const goto = params.get("goto");
	if (goto && idMap[goto]) {
		window.location.href = idMap[goto];
	}
})();
