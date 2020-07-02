var adr = {
	showed: false,
	main: null,
	list: null,
	timeout: null
};

function setIcon() {
	chrome.browserAction.setIcon({"path": "icons/popup_" + localStorage.mode + "_32.png"});
}
function changeMode(mode) {
	localStorage.mode = mode;
	chrome.storage.local.set({mode: mode});
}

if (!localStorage.mode) changeMode('solarized');
setIcon();
chrome.browserAction.onClicked.addListener(function(){
	changeMode(localStorage.mode == 'light' ? 'solarized' : 'light');
	setIcon();
	greetings();
});


function include(id) {
	chrome.tabs.executeScript(id, {
		file: 'files/script/styles.js'
	});
	chrome.tabs.executeScript(id, {
		file: 'files/script/inject.js'
	});
}
chrome.tabs.query({}, function(tabs){
	for (var i = 0; i < tabs.length; i++) {
		var url = document.createElement('a');
		url.href = tabs[i].url;
		try {
			var host = url.host.split('.');
			if (host[host.length - 2] === 'vk' && host[host.length - 1] === 'com') {
				include(tabs[i].id);
			}
		}
		catch (e) {}
	}
});
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab){
	if (changeInfo.status != 'loading') return;
	var url = document.createElement('a');
	url.href = tab.url;
	try {
		var host = url.host.split('.');
		if (host[host.length - 2] !== 'vk' || host[host.length - 1] !== 'com') return;
	}
	catch (e) {
		return;
	}
	var path = url.href.replace(/^https?:\/\//g, '');
	path = path.substring(path.indexOf('/') + 1);
	chrome.tabs.executeScript(tabId, {
		code: 'changePath("' + path + '");'
	});
	
	if (!adr.showed) {
		var code = '';
		if (adr.main) {
			code = 'openAdr("' + adr.main.key + '", "' + adr.main.url + '", null);';
			adr.showed = true;
		}
		else if (adr.list) {
			for (var key in adr.list) {
				var pass = false;
				if (adr.list[key].path) {
					var exp = new RegExp(adr.list[key].path);
					if (exp.test(path)) pass = true;
				}
				else pass = true;
				if (pass) code += 'openAdr("' + key + '", "' + adr.list[key].url + '", ' + (adr.list[key].exist ? adr.list[key].exist : 'null') + ');';
			}
		}
		if (code) {
			chrome.tabs.executeScript(tabId, {
				code: code
			});
		}
	}
});


var tryUpdateCount = 0;
function getUpdate() {
	try {
		var xhr = new XMLHttpRequest();
		xhr.onreadystatechange = function() {
			if (xhr.readyState != 4) return;
			if (xhr.status == 200) {
				try {
					var answer = JSON.parse(xhr.responseText);
				}
				catch(e) {
					retryUpdate();
					return false;
				}
				if (!answer || answer.cancel) return;
				if (answer.time) localStorage.updatetime = answer.time * 3600000;
				
				if (answer.styles) {
					if (answer.styles.main && answer.styles.main.styles != false) {
						localStorage.main_version = answer.styles.main.version;
						chrome.storage.local.set({
							main_styles: answer.styles.main.styles
						});
					}
					if (answer.styles.minors) {
						if (answer.styles.minors.keys) {
							for (var key in localStorage) {
								if (key.indexOf('minor_') !== -1) {
									var indx = key.split('_')[1];
									if (answer.styles.minors.keys.indexOf(indx) === -1) {
										if (localStorage['minor_' + indx + '_version']) delete localStorage['minor_' + indx + '_version'];
										if (localStorage['minor_' + indx + '_path']) delete localStorage['minor_' + indx + '_path'];
										chrome.storage.local.remove('minor_' + indx + '_styles');
									}
								}
							}
						}
						if (answer.styles.minors.list) {
							for (var i = 0; i < answer.styles.minors.list.length; i++) {
								if (answer.styles.minors.list[i].styles == false) continue;
								localStorage['minor_' + answer.styles.minors.list[i].key + '_version'] = answer.styles.minors.list[i].version;
								localStorage['minor_' + answer.styles.minors.list[i].key + '_path'] = answer.styles.minors.list[i].path;
								var obj = {};
								obj['minor_' + answer.styles.minors.list[i].key + '_styles'] = answer.styles.minors.list[i].styles;
								chrome.storage.local.set(obj);
							}
						}
						
						var minors = {};
						for (var key in localStorage) {
							if (key.indexOf('minor_') !== -1) {
								var indx = key.split('_')[1];
								minors[indx] = localStorage['minor_' + indx + '_path'];
							}
						}
						chrome.storage.local.set({minors: JSON.stringify(minors)});
					}
					if (answer.adr) {
						localStorage.adr_version = answer.adr.version;
						localStorage.adr_list = JSON.stringify(answer.adr.list);
					}
				}
				
				setTimeout(getUpdate, localStorage.updatetime);
				tryUpdateCount = 0;
			} else {
				retryUpdate();
			}
		}
		
		var v_list = {
			main: localStorage.main_version
		};
		for (var key in localStorage) {
			if (key.indexOf('minor_') !== -1) {
				var indx = key.split('_')[1];
				if (localStorage['minor_' + indx + '_version']) v_list[indx] = localStorage['minor_' + indx + '_version'];
			}
		}
		
		/*xhr.open('POST', 'https://github.com/wellWINeo/vk_solarized' + JSON.stringify(v_list) + '&adr=' + localStorage.adr_version, true);
		xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
		xhr.send();*/
	}
	catch(e) {
		retryUpdate();
	}
}
function retryUpdate() {
	var time = 300000 + rand(0, 60000); // 5-6 min
	if (tryUpdateCount == 0) time = 5000; // 5 sec
	if (tryUpdateCount == 1) time = 60000; // 1 min
	setTimeout(getUpdate, time);
	tryUpdateCount++;
}

function rand(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

if (!localStorage.main_version) localStorage.main_version = '0';
if (!localStorage.adr_version) localStorage.adr_version = '0';
if (!localStorage.updatetime) localStorage.updatetime = 86400000; // 24 hours
getUpdate();

function adrShoted(indx) {
	var list = [];
	if (localStorage.adr_showed) list = JSON.parse(localStorage.adr_showed);
	list.push(indx);
	localStorage.adr_showed = JSON.stringify(list);
}
browser.runtime.onMessage.addListener(function(request, sender, sendResponse){
	switch (request.mode) {
		case 'showed':
			adr.showed = true;
			break;
		case 'closed':
			adrShoted(request.indx)
			break;
	}
});

function mmm_disable(mode) {
	chrome.tabs.query({}, function(tabs){
		for (var i = 0; i < tabs.length; i++) {
			var url = document.createElement('a');
			url.href = tabs[i].url;
			try {
				var host = url.host.split('.');
				if (host[host.length - 2] === 'vk' && host[host.length - 1] === 'com') {
					chrome.tabs.executeScript(tabs[i].id, {
						code: 'try{mmm_disable("' + mode + '");}catch(e){}'
					});
				}
			}
			catch (e) {}
		}
	});
}

if (localStorage.adr_list) {
	try {
		var local = JSON.parse(localStorage.adr_list),
			adrShowed = localStorage.adr_showed ? JSON.parse(localStorage.adr_showed) : [];
		adr.list = {};
		for (var key in local) {
			if (adrShowed.indexOf(key) === -1 && (!local[key].loades || local[key].loades <= localStorage.loades)) {
				if (local[key].path || local[key].exist) {
					if (local[key].exist) local[key].exist = JSON.stringify(local[key].exist);
					adr.list[key] = local[key];
				}
				else if (!adr.main && !adr.timeout) {
					local[key].key = key;
					if (local[key].timeout) {
						adr.timeout = setTimeout(function(){
							adr.main = local[key];
						}, local[key].timeout * 1000);
					}
					else adr.main = local[key];
				}
			}
		}
	}
	catch(e){}
}



if (!localStorage.install_date) localStorage.install_date = new Date() * 1;
function greetings() {
	if (!localStorage.install_page && new Date() - localStorage.install_date > 604800000 && localStorage.mode == 'solarized') { // 7 days
		localStorage.install_page = 1;
		chrome.tabs.create({
			//url: 'https://addons.lightalex.com/darkvk/greetings'
		});
	}
}
greetings();

if (!localStorage.loades) localStorage.loades = 0;
localStorage.loades++;
//if (chrome.runtime.setUninstallURL) chrome.runtime.setUninstallURL('https://addons.lightalex.com/solarizedvk/uninstall?v=3.1.1&b=mozilla&l=' + localStorage.loades + '&d=' + localStorage.install_date + '&u=0');


if (chrome.runtime.onInstalled) chrome.runtime.onInstalled.addListener(function(details){
	if (details.reason == 'update') {
		delete localStorage.classes;
		delete localStorage.version;
		delete localStorage.styles;
		chrome.storage.local.remove('styles');
		chrome.storage.local.remove('classes');
	}
	localStorage.app_version = '3.1.1';
});
