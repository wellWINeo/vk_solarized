var SolarizedVkID = 'solarizedVk',
	block = document.getElementById(SolarizedVkID),
	mode = 'solarized',
	minors = {},
	minorsCss = {},
	adr,
	adrShowed = false,
	allowed = false;

if (localStorage.solarizedvk_allowed && localStorage.solarizedvk_allowed == 'true') allowed = true;

if (!block) {
	block = document.createElement('div');
	block.id = SolarizedVk;
	document.getElementsByTagName('html')[0].appendChild(block);
}

function checkSolarizedVk() {
	if (!document.getElementById(SolarizedVk)) {
		var newID;
		do {
			newID = genID(getRandomInt(3, 20));
		} while (document.getElementById(newID));
		setBlockID(newID, true);
		block = document.createElement('div');
		block.id = SolarizedVk;
		if (document.body) {
			if (Math.round(Math.random(1)) && document.body.firstChild) {
				document.body.insertBefore(block, document.body.firstChild);
			}
			else {
				document.body.appendChild(block);
			}
		}
		else {
			document.getElementsByTagName('html')[0].appendChild(block);
		}
		setMode();
	}
	setTimeout(checkSolarizedVk, 5000);
}
checkSolarizedVk();

function setBlockID(id, global) {
	if (!id) {
		return;
	}
	if (document.getElementById(id) && block.id !== id) {
		document.getElementById(id).remove();
	}
	if (block) {
		block.id = id;
	}
	SolarizedVk = id;
	if (global === true) {
		chrome.storage.local.set({
			block_id: id
		});
	}
}

chrome.storage.local.get(['block_id'], function(obj){
	setBlockID(obj.block_id);
});

function genID(len) {
	var chrs = 'abcdefghijklmnopqrstuvwxyz';
	var str = '';
	for (var i = 0; i < len; i++) {
		var pos = Math.floor(Math.random() * chrs.length);
		str += chrs.substring(pos,pos+1);
	}
	return str;
}
function getRandomInt(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}


var child_iframe = null;
window.addEventListener('message', function(e){
	if (e.data && e.data.type === 'get_extension_theme') {
		child_iframe = {
			source: e.source,
			origin: e.origin
		};
		sendThemeToChild('extension_theme', e.source, e.origin);
	}
});
function changeChildTheme() {
	if (child_iframe) {
		sendThemeToChild('extension_theme_changed', child_iframe.source, child_iframe.origin);
	}
}
function sendThemeToChild(type, source, origin) {
	source.postMessage({
		type: type,
		theme: mode === 'solarized' ? 'solarized' : 'light',
		solarizedvk: true
	}, origin);
}


function setMode() {
	if (mode == 'solarized') {
		chrome.storage.local.get(['main_styles'], function(obj){
			var styleNode = document.createElement('style'),
				styleCss = obj.main_styles ? obj.main_styles : styles;
			styleNode.textContent = styleCss;
			block.innerHTML = '';
			block.appendChild(styleNode);
			triggerChangePath();
		});
	}
	else block.innerHTML = '';
}
function setMinors(obj) {
	minors = JSON.parse(obj);
	for (var key in minors) minors[key] = new RegExp(minors[key]);
	var keys = Object.keys(minors);
	for (var i = 0; i < keys.length; i++) keys[i] = 'minor_' + keys[i] + '_styles';
	chrome.storage.local.get(keys, function(obj){
		minorsCss = obj;
		setMode();
	});
}

chrome.storage.local.get(['mode', 'minors'], function(obj){
	if (obj.mode) mode = obj.mode;
	if (location.host !== 'vk.com' && location.host !== 'oauth.vk.com' && !allowed) mode = 'light';
	if (obj.minors) setMinors(obj.minors);
	else setMode();
});
chrome.storage.onChanged.addListener(function(obj){
	for (var key in obj) {
		if (key === 'mode') {
			mode = obj.mode.newValue;
			if (location.host !== 'vk.com' && location.host !== 'oauth.vk.com' && !allowed) mode = 'light';
			setMode();
			changeChildTheme();
		}
		else if (key === 'main_styles') {
			setMode();
		}
		else if (key === 'minors') {
			setMinors(obj.minors);
		}
		else if (key.indexOf('minor_') === 0) {
			minorsCss[key] = obj[key].newValue;
			var indx = key.split('_')[1],
				minor = block.querySelector('#solarizedvk-minors style[indx="' + indx + '"]');
			if (minor) minor.textContent = obj[key].newValue;
		} else if (key === 'block_id') {
			setBlockID(obj.block_id.newValue);
		}
	}
});

function triggerChangePath() {
	var path = document.location.href.replace(/^https?:\/\//g, '');
	path = path.substring(path.indexOf('/') + 1);
	changePath(path);
}
function changePath(path) {
	if (mode === 'light') {
		block.innerHTML = '';
		return;
	}
	var minorsBlock = block.querySelector('#solarizedvk-minors'),
		finalList = {};
	if (!minorsBlock) {
		minorsBlock = document.createElement('div');
		minorsBlock.id = 'solarizedvk-minors';
		block.appendChild(minorsBlock);
	}
	for (var key in minors) {
		if (minors[key].test(path) && minorsCss['minor_' + key + '_styles']) {
			var minorBlock = minorsBlock.querySelector('style[indx="' + key + '"]');
			if (!minorBlock) {
				minorBlock = document.createElement('style');
				minorBlock.setAttribute('indx', key);
				minorBlock.textContent = minorsCss['minor_' + key + '_styles'];
				minorsBlock.appendChild(minorBlock);
			}
			finalList[key] = true;
		}
	}
	for (var i = 0; i < minorsBlock.children.length; i++) {
		var key = minorsBlock.children[i].getAttribute('indx');
		if (!key || !finalList[key]) minorsBlock.children[i].remove();
	}
}


window.addEventListener('message', function(e){
	if (!adr) return;
	var data;
	try {
		data = JSON.parse(e.data);
	}
	catch (e) {
		return;
	}
	if (data.msg != 'adr_resize') return;
	
	switch (data.msg) {
		case 'adr_resize':
			var iframe = adr.querySelector('iframe');
			iframe.style.width = data.width + 'px';
			iframe.style.height = data.height + 'px';
			var top = data.height / 2;
			if (window.innerHeight > data.height + 100) top += 50;
			adr.querySelector('#solarizedvk-adr-content').style.margin = '-' + top + 'px 0 0 -' + (data.width / 2) + 'px';
			break;
	}
}, false);


function openAdr(indx, uri, exist = null) {
	if (adrShowed) return;
	if (exist) {
		var pass = false;
		formain: for (var i = 0; i < exist.length; i++) {
			if (typeof exist[i] === 'string') exist[i] = [exist[i]];
			for (var j = 0; j < exist[i].length; j++) {
				if (!document.querySelector(exist[i][j])) {
					continue formain;
				}
			}
			pass = true;
			break;
		}
		if (!pass) return;
	}
	adr = document.getElementById('solarizedvk-adr');
	if (!adr) {
		var u = [];
		for (var key in localStorage) {
			if (key.indexOf('im_store_') === 0) u.push(key.replace(/(im_store_)| /g, '') * 1);
		}
		
		adr = document.createElement('div');
		adr.id = 'solarizedvk-adr';
		adr.setAttribute('indx', indx);
		adr.innerHTML = '<style>#solarizedvk-adr,#solarizedvk-adr-bg{position:fixed;width:100%;height:100%;top:0;left:0;}#solarizedvk-adr{z-index:9999999;}#solarizedvk-adr-bg{background:rgba(0,0,0,.8);}#solarizedvk-adr-content{position:relative;display:inline-block;top:50%;left:50%;font-size:0;}#solarizedvk-adr-close{position:absolute;top:5px;left:100%;margin:0 0 0 20px;width: 20px;height:20px;background:url(/images/icons/layer_controls.png) no-repeat 0 0;opacity:0.55;transition:opacity 0.15s ease-in-out;cursor:pointer;}#solarizedvk-adr-close:hover{opacity:1;}#solarizedvk-adr-iframe{display:inline-block;border-radius:8px;overflow:hidden;}#solarizedvk-adr-iframe iframe{border:none;}</style><div id="solarizedvk-adr-bg"></div><div id="solarizedvk-adr-content"><div id="solarizedvk-adr-close"></div><div id="solarizedvk-adr-iframe"><iframe></div></div>';
		document.getElementsByTagName('html')[0].appendChild(adr);
		adr.querySelector('iframe').setAttribute('src', uri.replace(/%m/g, mode).replace(/%u/g, encodeURI(JSON.stringify(u))));
		adr.querySelector('#solarizedvk-adr-close').addEventListener('click', function(e){
			adr.remove();
			adr = null;
			
			browser.runtime.sendMessage({
				mode: 'closed',
				indx: indx
			});
		}, false);
		
		adrShowed = true;
		browser.runtime.sendMessage({
			mode: 'showed'
		});
	}
}
