// this function accepts a callback function as params.callback that will be called with the command results
// if a callback is not provided it returns a promise that will resolve with the command results
function addCommandCallback(command, params, persistCallback) {
    if(params?.callback || params?.callbackFunction || params?.statuscallback){
        // execute command with provided callback function
        addCommand(command, params, persistCallback);
    } else {
        // create a temporary function and return a promise that executes command
        var tempFunctionName = '_median_temp_' + Math.random().toString(36).slice(2);
        if(!params) params = {};
        params.callback = tempFunctionName;
        return new Promise(function(resolve, reject) {
            // declare a temporary function
            window[tempFunctionName] = function(data) {
                resolve(data);
                delete window[tempFunctionName];
            }
            // execute command
            addCommand(command, params);
        });
    }
}

function addCallbackFunction(callbackFunction, persistCallback){
    var callbackName;
    if(typeof callbackFunction === 'string'){
        callbackName = callbackFunction;
    } else {
        callbackName = '_median_temp_' + Math.random().toString(36).slice(2);
        window[callbackName] = function(...args) {
            callbackFunction.apply(null, args);
            if(!persistCallback){ // if callback is used just once
                delete window[callbackName];
            }
        }
    }
    return callbackName;
}

function addCommand(command, params, persistCallback){
    var data = undefined;
    if(params) {
        var commandObject = {};
        if(params.callback && typeof params.callback === 'function'){
            params.callback = addCallbackFunction(params.callback, persistCallback);
        }
        if(params.callbackFunction && typeof params.callbackFunction === 'function'){
            params.callbackFunction = addCallbackFunction(params.callbackFunction, persistCallback);
        }
        if(params.statuscallback && typeof params.statuscallback === 'function'){
            params.statuscallback = addCallbackFunction(params.statuscallback, persistCallback);
        }
        commandObject.medianCommand = command;
        commandObject.data = params;
        data = JSON.stringify(commandObject);
    } else data = command;

    JSBridge.postMessage(data);
}

///////////////////////////////
////    General Commands   ////
///////////////////////////////

var median = {};

// backward compatibility for GoNative
var gonative = median;

// to be modified as required
median.nativebridge = {
    custom: function (params){
        addCommand("median://nativebridge/custom", params);
    },
    multi: function (params){
        addCommand("median://nativebridge/multi", params);
    }
};

median.registration = {
    send: function(customData){
        var params = {customData: customData};
        addCommand("median://registration/send", params);
    }
};

median.sidebar = {
    setItems: function (params){
        addCommand("median://sidebar/setItems", params);
    },
    getItems: function (params){
        return addCommandCallback("median://sidebar/getItems", params);
    }
};

median.tabNavigation = {
    selectTab: function (tabIndex){
        addCommand("median://tabs/select/" + tabIndex);
    },
    deselect: function (){
        addCommand("median://tabs/deselect");
    },
    setTabs: function (tabsObject){
        var params = {tabs: tabsObject};
        addCommand("median://tabs/setTabs", params);
    }
};

median.share = {
    sharePage: function (params){
        addCommand("median://share/sharePage", params);
    },
    downloadFile: function (params){
        return addCommandCallback("median://share/downloadFile", params);
    },
    downloadImage: function(params){
        return addCommandCallback("median://share/downloadImage", params);
    }
};

median.open = {
    appSettings: function (){
        addCommand("median://open/app-settings");
    }
};

median.webview = {
    clearCache: function(){
        addCommand("median://webview/clearCache");
    },
    clearCookies: function(){
        addCommand("median://webview/clearCookies");
    },
    reload: function (){
        addCommand("median://webview/reload");
    }
};

median.config = {
    set: function(params){
        addCommand("median://config/set", params);
    }
};

median.navigationTitles = {
    set: function (parameters){
        var params = {
            persist: parameters.persist,
            data: parameters
        };
        addCommand("median://navigationTitles/set", params);
    },
    setCurrent: function (params){
        addCommand("median://navigationTitles/setCurrent", params);
    },
    revert: function(){
        addCommand("median://navigationTitles/set?persist=true");
    }
};

median.navigationLevels = {
    set: function (parameters){
        var params = {
            persist: parameters.persist,
            data: parameters
        };
        addCommand("median://navigationLevels/set", params);
    },
    setCurrent: function(params){
        addCommand("median://navigationLevels/set", params);
    },
    revert: function(){
        addCommand("median://navigationLevels/set?persist=true");
    }
};

median.statusbar = {
    set: function (params){
        addCommand("median://statusbar/set", params);
    }
};

median.systemNavBar = {
    set: function (params){
        addCommand("median://systemNavBar/set", params);
    }
};

median.screen = {
    setBrightness: function(data){
        var params = data;
        if(typeof params === 'number'){
            params = {brightness: data};
        }
        addCommand("median://screen/setBrightness", params);
    },
    setColorScheme: function(mode) {
        var params = {mode: mode};
        addCommand("median://screen/setColorScheme", params);
    },
    resetColorScheme: function() {
        addCommand("median://screen/resetColorScheme");
    },
    setMode: function(params) {
        if (params.mode) {
            addCommand("median://screen/setMode", params);
        }
    },
    keepScreenOn: function(params){
        addCommand("median://screen/keepScreenOn", params);
    },
    keepScreenNormal: function(){
        addCommand("median://screen/keepScreenNormal");
    }
};

median.navigationMaxWindows = {
    set: function (maxWindows, autoClose){
        var params = {
            data: maxWindows,
            autoClose: autoClose,
            persist: true
        };
        addCommand("median://navigationMaxWindows/set", params);
    },
    setCurrent: function(maxWindows, autoClose){
        var params = {data: maxWindows, autoClose: autoClose};
        addCommand("median://navigationMaxWindows/set", params);
    }
}

median.window = {
    open: function (urlString, mode) {
        var params = {url: urlString, mode};
        addCommand("median://window/open", params);
    },
    close: function () {
        addCommand("median://window/close");
    }
}

median.connectivity = {
    get: function (params){
        return addCommandCallback("median://connectivity/get", params);
    },
    subscribe: function (params){
        return addCommandCallback("median://connectivity/subscribe", params, true);
    },
    unsubscribe: function (){
        addCommand("median://connectivity/unsubscribe");
    }
};

median.run = {
    deviceInfo: function(){
        addCommand("median://run/median_device_info");
    }
};

median.deviceInfo = function(params){
    return addCommandCallback("median://run/median_device_info", params, true);
};

median.internalExternal = {
    set: function(params){
        addCommand("median://internalExternal/set", params);
    }
};

median.clipboard = {
    set: function(params){
        addCommand("median://clipboard/set", params);
    },
    get: function(params){
        return addCommandCallback("median://clipboard/get", params);
    }
};

median.keyboard = {
    info: function(params){
        return addCommandCallback("median://keyboard/info", params);
    },
    listen: function(callback){
        var params = {callback};
        addCommand("median://keyboard/listen", params);
    }
};

median.events = {
    subscribe: function(callbackName){
        var params = {callbackName};
        addCommand("median://events/subscribe", params);
    }
};

median.permissions = {
    status: function (permissions) {
        return addCommandCallback("median://permissions/status", { permissions });
    }
};

median.contextMenu = {
    setEnabled: function(enabled) {
        addCommand("median://contextMenu/setEnabled", {enabled});
    },
    setLinkActions: function(linkActions) {
        addCommand("median://contextMenu/setLinkActions", {linkActions});
    }
}

//////////////////////////////////////
////   Webpage Helper Functions   ////
//////////////////////////////////////

function get_body_background_color_style() {
    let rgb = window.getComputedStyle(document.body, null).getPropertyValue('background-color');
    let sep = rgb.indexOf(",") > -1 ? "," : " ";
    rgb = rgb.substring(rgb.indexOf('(') + 1).split(")")[0].split(sep).map(function(x) { return x * 1; });
    if (rgb.length === 4) {
        rgb = rgb.map(function(x) { return parseInt(x * rgb[3]); });
    }
    let hex = '#' + rgb[0].toString(16).padStart(2, '0') + rgb[1].toString(16).padStart(2, '0') + rgb[2].toString(16).padStart(2, '0');
    let luma = 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]; // per ITU-R BT.709
    let style = luma > 40 ? 'dark' : 'light';
    return { style: style, color: hex };
}

function median_match_statusbar_to_body_background_color() {
    let { style, color } = get_body_background_color_style();
    median.statusbar.set({ 'style': style, 'color': color });
}

function median_match_system_navbar_to_body_background_color() {
    let { style, color } = get_body_background_color_style();
    median.systemNavBar.set({ 'style': style, 'color': color });
}

function gonative_match_statusbar_to_body_background_color() {
    median_match_statusbar_to_body_background_color();
}

///////////////////////////////
////   Android Exclusive   ////
///////////////////////////////

median.android = {};

median.android.geoLocation = {
    promptLocationServices: function(){
        addCommand("median://geoLocation/promptLocationServices");
    },
    isLocationServicesEnabled: function(params) {
        return addCommandCallback("median://geoLocation/isLocationServicesEnabled", params);
    }
};

median.android.screen = {
    fullscreen: function(){
        addCommand("median://screen/fullscreen");
    },
    normal: function(){
        addCommand("median://screen/normal");
    },
    keepScreenOn: function(){
        addCommand("median://screen/keepScreenOn");
    },
    keepScreenNormal: function(){
        addCommand("median://screen/keepScreenNormal");
    }
};

median.android.audio = {
    requestFocus: function(enabled){
        var params = {enabled: enabled};
        addCommand("median://audio/requestFocus", params);
    }
};

median.android.swipeGestures = {
    enable: function() {
        addCommand("median://swipeGestures/enable");
    },
    disable: function() {
        addCommand("median://swipeGestures/disable");
    }
}


// Android WebView does not expose the File System Access API used by vscode.dev.
// Provide the directory subset used by VS Code, backed by ACTION_OPEN_DOCUMENT_TREE.
(function installAndroidDirectoryPicker() {
    if (typeof window === 'undefined' || window.showDirectoryPicker || !window.AndroidDirectoryPicker) return;

    function callNative(method, args) {
        return new Promise(function(resolve) {
            var callback = '_android_directory_' + Math.random().toString(36).slice(2);
            window[callback] = function(value) {
                try { delete window[callback]; } catch (_) {}
                resolve(value);
            };
            try {
                window.AndroidDirectoryPicker[method].apply(window.AndroidDirectoryPicker, (args || []).concat(callback));
            } catch (_) {
                try { delete window[callback]; } catch (_) {}
                resolve(null);
            }
        });
    }

    function bytesFromBase64(value) {
        var binary = atob(value || '');
        var bytes = new Uint8Array(binary.length);
        for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return bytes;
    }

    function base64FromBytes(bytes) {
        var binary = '';
        for (var i = 0; i < bytes.length; i += 0x8000) {
            binary += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + 0x8000, bytes.length)));
        }
        return btoa(binary);
    }

    function callbackBytes(data) {
        if (data instanceof Blob) return data.arrayBuffer().then(function(buffer) { return new Uint8Array(buffer); });
        if (data instanceof ArrayBuffer) return Promise.resolve(new Uint8Array(data));
        if (ArrayBuffer.isView(data)) return Promise.resolve(new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
        return Promise.resolve(new TextEncoder().encode(String(data)));
    }

    function AndroidFileHandle(entry) {
        this.kind = 'file';
        this.name = entry.name;
        this._uri = entry.uri;
        this._entry = entry;
    }
    AndroidFileHandle.prototype.isSameEntry = function(other) { return !!other && other._uri === this._uri; };
    AndroidFileHandle.prototype.queryPermission = function() { return Promise.resolve('granted'); };
    AndroidFileHandle.prototype.requestPermission = function() { return Promise.resolve('granted'); };
    AndroidFileHandle.prototype.getFile = function() {
        var self = this;
        return callNative('readFile', [self._uri]).then(function(result) {
            if (!result || !result.ok) throw new DOMException((result && result.error) || 'Unable to read file', 'NotReadableError');
            var bytes = bytesFromBase64(result.data);
            return new File([bytes], self.name, {
                type: self._entry.mimeType || 'application/octet-stream',
                lastModified: Number(self._entry.lastModified || 0)
            });
        });
    };
    AndroidFileHandle.prototype.createWritable = function() {
        var self = this;
        return Promise.resolve({
            write: function(data) {
                return callbackBytes(data).then(function(bytes) {
                    return callNative('writeFile', [self._uri, base64FromBytes(bytes)]).then(function(ok) {
                        if (!ok) throw new DOMException('Unable to write file', 'NotAllowedError');
                    });
                });
            }, close: function() { return Promise.resolve(); }, abort: function() { return Promise.resolve(); }
        });
    };

    function AndroidDirectoryHandle(entry) {
        this.kind = 'directory';
        this.name = entry.name || 'Selected folder';
        this._uri = entry.uri;
        this._cache = null;
    }
    AndroidDirectoryHandle.prototype.isSameEntry = function(other) { return !!other && other._uri === this._uri; };
    AndroidDirectoryHandle.prototype.queryPermission = function() { return Promise.resolve('granted'); };
    AndroidDirectoryHandle.prototype.requestPermission = function() { return Promise.resolve('granted'); };
    AndroidDirectoryHandle.prototype._entries = function() {
        var self = this;
        if (!self._cache) self._cache = callNative('listDirectory', [self._uri]).then(function(items) {
            return (Array.isArray(items) ? items : []).map(function(item) {
                return [item.name, item.kind === 'directory' ? new AndroidDirectoryHandle(item) : new AndroidFileHandle(item)];
            });
        });
        return self._cache;
    };
    AndroidDirectoryHandle.prototype.getFileHandle = function(name) {
        return this._entries().then(function(items) {
            for (var i = 0; i < items.length; i++) if (items[i][0] === name) {
                if (items[i][1].kind !== 'file') throw new TypeError('Not a file');
                return items[i][1];
            }
            throw new DOMException('File not found: ' + name, 'NotFoundError');
        });
    };
    AndroidDirectoryHandle.prototype.getDirectoryHandle = function(name) {
        return this._entries().then(function(items) {
            for (var i = 0; i < items.length; i++) if (items[i][0] === name) {
                if (items[i][1].kind !== 'directory') throw new TypeError('Not a directory');
                return items[i][1];
            }
            throw new DOMException('Directory not found: ' + name, 'NotFoundError');
        });
    };
    AndroidDirectoryHandle.prototype.entries = async function*() {
        var items = await this._entries();
        for (var i = 0; i < items.length; i++) yield items[i];
    };
    AndroidDirectoryHandle.prototype.values = async function*() {
        for await (var item of this.entries()) yield item[1];
    };
    AndroidDirectoryHandle.prototype.keys = async function*() {
        for await (var item of this.entries()) yield item[0];
    };
    AndroidDirectoryHandle.prototype.resolve = function() { return Promise.resolve(null); };

    window.showDirectoryPicker = function() {
        return callNative('pickDirectory', []).then(function(result) {
            if (!result) throw new DOMException('The user cancelled the directory picker', 'AbortError');
            return new AndroidDirectoryHandle(result);
        });
    };
})();
