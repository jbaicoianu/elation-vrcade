if (typeof module != 'undefined') {
  BrowserFS = require('./browserfs')['BrowserFS'];
}

/** 
 * EMLoader - a generalized wrapper for loading emscripten-compiled content
 *
 * @class EMLoader
 * @param {object}   args
 * @param {string}   executable
 * @param {array}    executableargs
 * @param {string}   gamename
 * @param {boolean} [args.useWorker=false]
 * @param {boolean} [args.useSound=true]
 * @param {boolean} [args.useWebGL=false]
 * @param {string}   modulepath
 * @param {object}   mnt
 * @param {bool}    [autostart=true]
 * @param {bool}    [capturemouse=true]
 * @param {bool}    [disablefrontbuffer=false]
 * @param {bool}    [verbose=false]
 *
 * @example
 *  var loader = new EMLoader({
 *    'executable': '/media/emscripten/dosbox.js',
 *    'executableargs': ['-c' 'mount a /drivea', '-c', 'mount c /drivec', '-c', 'mount d /drived', 'STARTUP.BAT'],
 *    'mnt': {
 *      '/dosbox.conf' : ['file', '/media/configs/dosbox-custom01.conf'  ],
 *      '/drivea'      : ['localstorage'],
 *      '/drivec'      : ['zip', '/media/disks/windows.zip'],
 *      '/drivec/apps' : ['zip', '/media/disks/apps.zip'   ],
 *      '/drivec/games': ['zip', '/media/disks/games.zip'  ],
 *      '/drived'      : ['dropbox', ... ],
 *    }
 *  });
 */

function EMLoaderEventDispatcher() {
}
EMLoaderEventDispatcher.prototype.addEventListener = function ( type, listener ) {
  if ( this._listeners === undefined ) this._listeners = {};
  var listeners = this._listeners;

  if ( listeners[ type ] === undefined ) {
    listeners[ type ] = [];
  }

  if ( listeners[ type ].indexOf( listener ) === - 1 ) {
    listeners[ type ].push( listener );
  }
}

EMLoaderEventDispatcher.prototype.hasEventListener = function ( type, listener ) {
  if ( this._listeners === undefined ) return false;
  var listeners = this._listeners;

  if ( listeners[ type ] !== undefined && listeners[ type ].indexOf( listener ) !== - 1 ) {
    return true;
  }
  return false;
}

EMLoaderEventDispatcher.prototype.removeEventListener = function ( type, listener ) {
  if ( this._listeners === undefined ) return;

  var listeners = this._listeners;
  var listenerArray = listeners[ type ];

  if ( listenerArray !== undefined ) {
    var index = listenerArray.indexOf( listener );
    if ( index !== - 1 ) {
      listenerArray.splice( index, 1 );
    }
  }
}

EMLoaderEventDispatcher.prototype.dispatchEvent = function ( event ) {
  if ( this._listeners === undefined ) return;

  var listeners = this._listeners;
  var listenerArray = listeners[ event.type ];

  if ( listenerArray !== undefined ) {
    event.target = this;

    var array = [];
    var length = listenerArray.length;

    for ( var i = 0; i < length; i ++ ) {
      array[ i ] = listenerArray[ i ];
    }

    for ( var i = 0; i < length; i ++ ) {
      array[ i ].call( this, event );
    }

  }

}



function EMLoader(args) {
  // Process arguments
  if (!args) args = {};
  this.webroot   = (args.webroot !== undefined ? args.webroot : '');
  this.useWorker = (args.useWorker !== undefined ? args.useWorker : false);
  this.useWebGL  = (args.useWebGL !== undefined ? args.useWebGL : false);
  this.useSound  = (args.useSound !== undefined ? args.useSound : true);
  this.autostart = (args.autostart !== undefined ? args.autostart : true);
  this.disablefrontbuffer = (args.disablefrontbuffer !== undefined ? args.disablefrontbuffer : false);
  this.verbose = (args.verbose !== undefined ? args.verbose : false);
  this.capturemouse = (args.capturemouse !== undefined ? args.capturemouse : true);
  this.executable = (args.executable !== undefined ? args.executable : false);
  this.executableargs = (args.executableargs !== undefined ? args.executableargs : []);
  this.exportname = (args.exportname !== undefined ? args.exportname : false);
  this.canvas = (args.canvas !== undefined ? args.canvas : false);
  this.mnt = (args.mnt !== undefined ? args.mnt : false);
  this.modulepath = args.modulepath || ('/' + this.generateRandomID());
  this.initialized = false;
  this.paused = false;

  this.pendingfiles = 0;
  this.module = {};

  // Detect capabilities
  this._runningInWorker = (typeof window == 'undefined' || (typeof ENVIRONMENT_IS_WORKER != 'undefined' && ENVIRONMENT_IS_WORKER));
  this._usingWorker = (this.useWorker && (typeof Worker != 'undefined' || this._runningInWorker));
  this._usingWebGL = (this.useWebGL && typeof WebGLRenderingContext != 'undefined');
  this._usingSound = (this.useSound && typeof AudioContext != 'undefined');

  console.log('System capabilities (' + (this._runningInWorker ? 'worker' : 'main') + ' thread): [' + 
      (this._usingWebGL ? 'x' : ' ') + '] WebGL\t[' +
      (this._usingSound ? 'x' : ' ') + '] Sound\t[' +
      (this._usingWorker ? 'x' : ' ') + '] WebWorker');

  if (this.autostart) {
    this.start();
  }
}

EMLoader.prototype = Object.create(EMLoaderEventDispatcher.prototype);
EMLoader.prototype.constructor = EMLoader;

EMLoader.prototype.start = function() {
  if (this.paused) {
    this.unpause();
  } else if (this.mnt) {
    this.init_filesystem(this.mnt);
  } else {
    this.init_script();
  }
}
EMLoader.prototype.stop = function() {
  if (this.module && typeof this.module.abort == 'function') {
    try {
      this.module.abort();
    } catch (e) {
      console.log('system stopped');
    }
    this.emscriptenfs = false;
  }
  this.paused = false;
}
EMLoader.prototype.pause = function() {
  console.log('pause?', this.paused, this.module);
  if (this.module && typeof this.module.pauseMainLoop == 'function') {
    this.module.pauseMainLoop();
    this.paused = true;
  }
}
EMLoader.prototype.unpause = function() {
  console.log('unpause?', this.paused, this.module);
  if (this.module && typeof this.module.resumeMainLoop == 'function') {
    this.paused = false;
    this.module.resumeMainLoop();
  }
}
EMLoader.prototype.get_globalfs = function() {
  var globalfs = EMLoader.globalfs;
  if (!globalfs) {
console.log(BrowserFS);
    globalfs = EMLoader.globalfs = new BrowserFS.FileSystem.MountableFileSystem();
    BrowserFS.initialize(globalfs);
  }
  return globalfs;
}

/**
 * Initialize BrowserFS filesystem, and starts asynchronous loads
 * @function init_filesystem
 * @memberof EMLoader
 * @param {object} mnt
 */
EMLoader.prototype.init_filesystem = function(mntmap) {
  var globalfs = this.get_globalfs();

  this.modulefs = new BrowserFS.FileSystem.MountableFileSystem();
  globalfs.mount(this.modulepath, this.modulefs);

  for (var path in mntmap) {
    var type = mntmap[path][0],
        url = mntmap[path][1];
    if (url) {
      this.add_file(path, url, this.set_file.bind(this, path, type));
    } else {
      this.set_file(path, type);
    }
  }
}
/**
 * Completes filesystem initialization by mounting under emscripten
 * @function finalize_filesystem
 * @memberof EMLoader
 */
EMLoader.prototype.finalize_filesystem = function() {
  if (!this.emscriptenfs) {
    var globalfs = this.get_globalfs();
    BrowserFS.initialize(globalfs);

    var FS = this.module.FS || window.FS;

    this.emscriptenfs = new BrowserFS.EmscriptenFS(this.module.FS, this.module.PATH, this.module.ERRNO_CODES);
    FS.mkdir('/mnt');
    try {
      FS.mount(this.emscriptenfs, {root: '/'}, '/mnt');
    } catch (e) {
      this.dispatchEvent({type: 'error', data: e});
    }
    FS.chdir('/mnt' + this.modulepath);
  } else {
    console.log('Filesystem already initialized');
  }

  this.dumpFS();
}
/**
 * Prints out the contents of the filesystem
 * @function dumpFS
 * @memberof EMLoader
 * @param {string} dir
 * @param {BrowserFS.FileSystem} [vfs]
 */
EMLoader.prototype.dumpFS = function(dir, vfs) {
  var fs = vfs || BrowserFS.BFSRequire('fs');
  if (!dir) {
    dir = '/';
  }

  var depth = dir.split('/').length;
  var prefix = new Array(depth).join('\t');

  var files = fs.readdirSync(dir);
  for (var i = 0; i < files.length; i++) {
    var file = files[i];
    var stat = fs.statSync(dir + file)
    if (stat && stat.isDirectory()) {
      console.log(prefix + file + '/');
      this.dumpFS(dir + file + '/', fs);
    } else {
      console.log(prefix + file);
    }
  }
}
/**
 * Notifies listeners that the system is now running
 * @function notify_run
 * @memberof EMLoader
 */
EMLoader.prototype.notify_run = function() {
  this.dispatchEvent({type: 'run'});
}
/**
 * Sets the contents for the specified path, based on type
 * @function set_file
 * @memberof EMLoader
 * @param {string} path
 * @param {string} type
 * @param {*} data
 */
EMLoader.prototype.set_file = function(path, type, data) {
  console.log('the file is done', path, type);

  // strip trailing slash if present
  if (path[path.length - 1] == '/') 
    path = path.substr(0, path.length-1);

  switch (type) {
    case 'zip':
      this.set_file_zip(path, data);
      break;
    case 'file':
      this.set_file_contents(path, data);
      break;
    case 'localstorage':
      this.set_file_localstorage(path, data);
      break;
  }
}
/**
 * Mount a zip at the specified location
 * @function set_file_zip
 * @memberof EMLoader
 * @param {string} path
 * @param {*} data
 */
EMLoader.prototype.set_file_zip = function(path, data) {
  var ldata = new BrowserFS.BFSRequire('buffer').Buffer(data);
  var zipfs = new BrowserFS.FileSystem.ZipFS(ldata);
  var globalfs = this.get_globalfs();
  var modulefs = this.modulefs;
  var memfs = new BrowserFS.FileSystem.InMemory();
  var fullpath = '/mem';

  modulefs.mount('/zip', zipfs);
  modulefs.mount('/mem', memfs);
  this.recursive_copy('/zip', fullpath);
  modulefs.umount('/zip');
  modulefs.umount('/mem');

  modulefs.mount(path, memfs);
}
/**
 * Set the specified file's contents
 * @function set_file_contents
 * @memberof EMLoader
 * @param {string} path
 * @param {*} data
 */
EMLoader.prototype.set_file_contents = function(path, data) {
  var ldata = new BrowserFS.BFSRequire('buffer').Buffer(data);
  var fs = BrowserFS.BFSRequire('fs');
  var fullpath = this.modulepath + path;
  var dirparts = path.split('/');
  dirparts.pop();
  var fulldir = dirparts.join('/');

  this.recursive_mkdir(fulldir);

  fs.writeFile(fullpath, ldata);
}
/**
 * Mounts a localstorage filesystem at the specified path
 * @function set_file_localstorage
 * @memberof EMLoader
 * @param {string} path
 */
EMLoader.prototype.set_file_localstorage = function(path) {
  var localfs = new BrowserFS.FileSystem.LocalStorage();
  this.modulefs.mount(path, localfs);
}
/**
 * Copies the contents of a directory from one location to another
 * @function recursive_copy
 * @memberof EMLoader
 * @param {string} oldDir
 * @param {string} newDir
 */
EMLoader.prototype.recursive_copy = function(oldDir, newDir) {
  var path = BrowserFS.BFSRequire('path'),
      fs = BrowserFS.BFSRequire('fs');

  // FIXME - it's a bit of a pain that we have to go through the global nodefs object 
  //         since BrowserFS makes it hard to work with individual filesystems directly

  copyDirectory(this.modulepath + oldDir, this.modulepath + newDir);

  function copyDirectory(oldDir, newDir) {
    if (!fs.existsSync(newDir)) {
      fs.mkdirSync(newDir);
    }
    fs.readdirSync(oldDir).forEach(function(item) {
      var p = path.resolve(oldDir, item),
          newP = path.resolve(newDir, item);
      if (fs.statSync(p).isDirectory()) {
        copyDirectory(p, newP);
      } else {
        copyFile(p, newP);
      }
    });
  }
  function copyFile(oldFile, newFile) {
    //console.log('copy: ' + oldFile + ' => ' + newFile);
    fs.writeFileSync(newFile, fs.readFileSync(oldFile));
  }
};
/**
 * Make directory, recursively creating as necessary
 * @function recursive_mkdir
 * @memberof EMLoader
 * @param {string} newDir
 */
EMLoader.prototype.recursive_mkdir = function(newdir) {
  var dirparts = newdir.split('/');
  var currdir = '';
  for (var i = 0; i < dirparts.length; i++) {
    currdir += dirparts[i] + '/';
    if (!this.modulefs.existsSync(currdir)) {
      this.modulefs.mkdirSync(currdir, 777);
    }
  }
}
/**
 * Update the load progress indicator
 * @function load_progress
 * @memberof EMLoader
 * @param {Event} ev
 */
EMLoader.prototype.load_progress = function(ev) {
  console.log("progress", ev);
}
/**
 * Load module script file
 * @function init_script
 * @memberof EMLoader
 */
EMLoader.prototype.init_script = function() {
  if (!this.script) {
    var script = document.createElement('script');
    script.src = this.executable;
    var head = document.getElementsByTagName('head')[0];
    head.appendChild(script);
    this.script = script;

    if (this.exportname) {
      script.addEventListener('load', this.init_module.bind(this));
    } else {
      this.init_module();
    }
  } else {
    this.init_module();
  }
}
/**
 * Initialize Emscripten module
 * @function init_module
 * @memberof EMLoader
 */
EMLoader.prototype.init_module = function() {
  //Module = this.module = {};

  var module = {};

  module.noInitialRun = false;
  module.noExitRuntime = false;
  module.useWebGL = false;
  module.screenIsReadOnly = true;
  module.arguments = this.executableargs;
  module.print = function(t) { console.log(t); }
  module.printErr = function(t) { console.error(t); }

  console.log('ARGS', module.arguments);

  module.canvas = this.init_canvas(this.canvas);
  module.keyboardListeningElement = this.canvas;
  module.memoryInitializerPrefixURL = '/media/vrcade/systems/arcade/';
  module.printErr = function(m) { console.error(m); };
  module.preRun = [ 
    this.init_environment.bind(this),
    this.finalize_filesystem.bind(this) 
  ];
  module.postRun = [ 
    this.notify_run.bind(this),
  ];
/*
  module.setStatus = function(d) { 
    console.log('[setStatus]', d);
  };
*/

  module.canvas.addEventListener('click', this.handleClick.bind(this));
  //module.canvas.parentNode.appendChild(module.keyboardListeningElement);

  if (this.module) {
    this.stop();
  }

  this.module = module;
  if (this.exportname && typeof window[this.exportname] == 'function') {
    try {
      this.module = window[this.exportname](module);
    } catch (e) {
      console.log('error, error, danger will robinson!', e);
      this.dispatchEvent({type: 'error', data: e});
    }
  } else {
    this.module = window.Module = module;
  }
/*
setTimeout(function() {
  this.module.run();
}.bind(this), 100);
*/
}
/**
 * Initialize canvas, creating if necessary
 * @function init_canvas
 * @memberof EMLoader
 */
EMLoader.prototype.init_canvas = function(canvas) {
  var canvas = canvas || document.createElement('canvas');
  canvas.tabIndex = (EMLoader.lastTabIndex || 0) + 1;
  EMLoader.lastTabIndex = canvas.tabIndex;
  if (!canvas.parentNode) {
    document.body.appendChild(canvas);
  }
  return canvas;
}
EMLoader.prototype.init_environment = function() {
  var ENV = this.module.ENV || window.ENV || false;
  if (ENV) {
    ENV["SDL_EMSCRIPTEN_KEYBOARD_ELEMENT"] = "#canvas";

    if (this.disablefrontbuffer) {
      ENV["SDL_EMSCRIPTEN_VIDEO_DISABLE_FRONTBUFFER"] = "1";
    }
  }
}
EMLoader.prototype.handleClick = function(ev) {
  if (this.capturemouse && document.activeElement !== this.canvas && !document.pointerLockElement) {
    this.focus();
  }
}
EMLoader.prototype.focus = function() {
  this.canvas.focus(); 
  this.canvas.requestPointerLock();
  if (jsmess_web_audio) {
    jsmess_web_audio.set_module(this.module);
  }
}

EMLoader.prototype.generateRandomID = function() {
  // From http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

EMLoader.prototype.add_file = function(path, url, callback) {
  console.log('add it', url);
  var xhr = new XMLHttpRequest();
  xhr.open('GET', url, true);
  xhr.responseType = 'arraybuffer';
  xhr.onload = this.file_complete.bind(this, path, url, callback);
  xhr.onprogress = this.file_progress.bind(this, path, url);

  if (this.pendingfiles == 0) {
    this.dispatchEvent({type: 'batch_begin'});
  }
  this.pendingfiles++;
  this.dispatchEvent({type: 'file_begin', data: { path: path, url: url, xhr: xhr }});
  xhr.send();
}
EMLoader.prototype.file_progress = function(path, url, ev) {
  this.dispatchEvent({type: 'file_progress', data: { path: path, url: url, progress: ev}});
  //console.log(url, ev);
}
EMLoader.prototype.file_complete = function(path, url, callback, ev) {
  var xhr = ev.target;

  if (xhr.status != 200) return;
  this.dispatchEvent({type: 'file_complete', data: { path: path, url: url, xhr: xhr }});

  setTimeout(function() {
    var data = new Int8Array(xhr.response);
    callback(data);

    if (--this.pendingfiles == 0) {
      this.batch_complete();
    }
  }.bind(this), 20);
}
EMLoader.prototype.batch_complete = function() {
  this.dispatchEvent({type: 'batch_complete'});
  this.init_script();
}
/**
 * Returns the GL texture associated with the emulated system's output
 * @function get_texture
 * @memberof EMLoader
 */
EMLoader.prototype.get_texture = function() {
  if (this.module && this.module.GL) {
    for (var i = this.module.GL.textures.length-1; i >= 0; i--) {
      if (this.module.GL.textures[i] instanceof WebGLTexture) {
        return this.module.GL.textures[i];
      }
    }
  }
  return false;
}

/**
 * DOSBoxLoader - convenience class for running DOSBox emulated systems
 * @class DOSBoxLoader
 */

function DOSBoxLoader(args) {
  
}
DOSBoxLoader.prototype = Object.create(EMLoader.prototype);

/**
 * JSMESSLoader - convenience class for running JSMESS emulated systems
 * @class JSMESSLoader
 * @param {string}  [cartname]
 */
function JSMESSLoader(args) {
  this.args = args;

  args.mnt = {};
  args.modulepath = ('/' + this.generateRandomID());
  
  if (args.romfile) {
    var romfiles = args.romfile.split(',');
    for (var i = 0; i < romfiles.length; i++) {
      var romfile = romfiles[i],
        filename = '/' + romfile.split('/').pop(),
        gamename = args.gamename || filename.substr(1).replace('.zip', '');
      args.mnt['/roms' + filename] = ['file', romfile];
    }
  } else if (args.gamename) {
      //filename = '/' + args.gamename + '.zip',
      //args.mnt['/roms' + filename] = ['file', romfile];
  }
  this.gamename = args.gamename || gamename;
  this.cartname = args.cartname || false;

  this.executableargs = args.executableargs = this.get_executableargs(args);

  EMLoader.call(this, args);
}

JSMESSLoader.prototype = Object.create(EMLoader.prototype);

JSMESSLoader.prototype.get_executableargs = function(args) {
  if (!args) args = {};
  var rompath = '/mnt' + args.modulepath + '/roms/';
  var executableargs = args.executableargs || this.executableargs || [];

  if (args.artwork) {
    var artfilename = '/' + args.artwork.split('/').pop();
    args.mnt['/art' + artfilename] = ['file', args.artwork];
    executableargs.push('-artpath');
    executableargs.push('/mnt' + args.modulepath + '/art/');
  }

  var resolution = args.resolution || false;
  //var resolution = args.resolution || '512x512';

  executableargs = executableargs.concat([
    "-rompath",rompath,
    "-window",
    "-autoframeskip",
    //"-nokeepaspect",
    //"-autosave",
    //"-video","soft",
  ]);
  if (resolution)    executableargs = executableargs.concat(["-resolution",resolution]);
  if (args.verbose)  executableargs.push("-verbose");
  if (this.gamename) executableargs.push(this.gamename);
  if (this.cartname) executableargs.push('-cart', this.cartname);
  return executableargs;
}
JSMESSLoader.prototype.set_game = function(gamename) {
  if (this.gamename != gamename) {
    this.gamename = gamename;
    this.executableargs = this.get_executableargs(this.args);
    if (this.system) {
      this.system.executableargs = this.executableargs;
    }
    //this.restart();
  }
}
JSMESSLoader.prototype.add_rom = function(gamename, url) {
  var path = '/roms/' + gamename + '.zip',
      type = 'file';
  if (!this.mnt[path]) {
    this.add_file(path, url, this.set_file.bind(this, path, type));
  } else {
    this.init_script();
  }
}

if (typeof module != 'undefined') {
  module.exports = {
    EMLoader: EMLoader,
    DOSBoxLoader: DOSBoxLoader,
    JSMESSLoader: JSMESSLoader
  };
}

/** EMLoaderIndicator */
EMLoaderIndicator = function(system, args) {
  this.system = system;

  this.texture = false;
  this.loadqueue = false;

  this.reset();
  this.create();
}
EMLoaderIndicator.prototype = Object.create(EMLoaderEventDispatcher.prototype);
EMLoaderIndicator.prototype.constructor = EMLoaderIndicator;

EMLoaderIndicator.prototype.create = function() {
  this.canvas = document.createElement('canvas');
  this.canvas.width = this.canvas.height = 512;
  this.ctx = this.canvas.getContext('2d');
  this.texture = new THREE.Texture(this.canvas);
  this.refresh();

  this.system.addEventListener('file_begin', this.file_begin.bind(this));
  this.system.addEventListener('file_progress', this.file_progress.bind(this));
  this.system.addEventListener('file_complete', this.file_complete.bind(this));
  this.system.addEventListener('batch_complete', this.batch_complete.bind(this));
  this.system.addEventListener('run', this.run.bind(this));
  this.system.addEventListener('error', this.error.bind(this));
}
EMLoaderIndicator.prototype.reset = function() {
  this.loadqueue = {};
  this.errored = false;
  this.status = 'Loading things...';
}
EMLoaderIndicator.prototype.refresh = function() {
  var ctx = this.ctx,
      tex = this.texture;

  var width = this.canvas.width,
      height = this.canvas.height,
      progsize = [256, 32],
      progoffset = [256, 300],
      progstart = [progoffset[0] - progsize[0]/2, progoffset[1] - progsize[1]/2],
      progress = this.summarize_progress(),
      fontsize = 32,
      maxwidth = width * .75;

  if (this.background) { 
    ctx.drawImage(this.background, 0, 0, width, height);
    ctx.fillStyle = 'rgba(0,0,0,.8)';
    ctx.fillRect(0,0,512,512);
  } else {
    ctx.fillStyle = '#222';
    ctx.fillRect(0,0,512,512);
  }


  ctx.fillStyle = '#ccc';
  ctx.fillRect(progstart[0], progstart[1], progsize[0], progsize[1]);
  ctx.fillStyle = (this.errored ? '#f33' : '#3f3');
  ctx.fillRect(progstart[0], progstart[1], progsize[0] * progress.percent / 100, progsize[1]);
  ctx.lineWidth = 5;
  ctx.strokeStyle = 'rgba(128,128,128,.6)';
  ctx.strokeRect(progstart[0], progstart[1], progsize[0], progsize[1]);
  ctx.fillStyle = 'white';
  ctx.lineWidth = 2;

  ctx.font = 'bold ' + fontsize + 'px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  var statuswidth = ctx.measureText(this.status).width;
  if (statuswidth > maxwidth) {
    ctx.font = 'bold ' + (fontsize * maxwidth / statuswidth) + 'px sans-serif';
  }

  ctx.fillText(this.status, 256, progoffset[1] - 64);
  ctx.strokeText(this.status, 256, progoffset[1] - 64);

  ctx.font = 'bold ' + (progsize[1] * .75) + 'px sans-serif';
  if (this.errored) {
    ctx.fillText('ERROR', progoffset[0], progoffset[1]);
    ctx.strokeText('ERROR', progoffset[0], progoffset[1]);
  } else {
    ctx.fillText(progress.percent.toFixed(0) + '%', progoffset[0], progoffset[1]);
    ctx.strokeText(progress.percent.toFixed(0) + '%', progoffset[0], progoffset[1]);
  }

  // logo
  if (this.logo) { 
    ctx.drawImage(this.logo, 256 - this.logo.width/2, 64);
  }
  // powered by
  if (this.poweredbylogo) { 
    var poweredbysize = 18;
    ctx.font = 'bold ' + poweredbysize + 'px sans-serif';
    ctx.fillText('Powered by', 256, 512 - this.poweredbylogo.height - poweredbysize);
    ctx.strokeText('Powered by', 256, 512 - this.poweredbylogo.height - poweredbysize);
    ctx.drawImage(this.poweredbylogo, 256 - this.poweredbylogo.width/2, 512 - this.poweredbylogo.height);
  }

  tex.needsUpdate = true;
}
EMLoaderIndicator.prototype.get_texture = function() {
  return this.texture;
}
EMLoaderIndicator.prototype.file_begin = function(ev) {
 //console.log('added file dependency:', ev);
  this.status = 'loading files...';
  var file = ev.data.path;
  this.loadqueue[file] = {path: file, url: ev.data.url, size: false, loaded: 0, complete: false}; 
  this.refresh();
}
EMLoaderIndicator.prototype.file_progress = function(ev) {
  var file = ev.data.path;
  var filedata = this.loadqueue[file];
  //console.log('got progress', ev, file, filedata, filedata.size);
  if (filedata.size === false) {
    filedata.size = ev.data.progress.total;
  }
  filedata.loaded = ev.data.progress.loaded;

  var progress = this.summarize_progress();
  //this.status = 'got progress: ' + progress.percent.toFixed(2) + '%';
  this.refresh();
}
EMLoaderIndicator.prototype.file_complete = function(ev) {
  //console.log('file done', ev);
  this.loadqueue[ev.data.path].complete = true
  var progress = this.summarize_progress();
  if (progress.filesComplete == progress.files) {
    this.status = 'loaded';
  }
  this.refresh();
}
EMLoaderIndicator.prototype.batch_complete = function(ev) {
  //console.log('ALL done', ev);
  this.status = 'starting emulator...';
  this.refresh();
}
EMLoaderIndicator.prototype.run = function(ev) {
  this.status = 'running!';
  this.refresh();
}
EMLoaderIndicator.prototype.error = function(ev) {
  this.status = ev.data;
  this.errored = true;
  this.refresh();
}
EMLoaderIndicator.prototype.summarize_progress = function() {
  var progress = {
    sizeTotal: 0,
    sizeLoaded: 0,
    files: 0,
    filesComplete: 0,
    percent: 0
  }
  for (var k in this.loadqueue) {
    var f = this.loadqueue[k];
    progress.files++;
    if (f.complete) progress.filesComplete++;
    if (f.size) progress.sizeTotal += f.size;
    if (f.loaded) progress.sizeLoaded += f.loaded;
  }
  progress.percent = (100 * progress.sizeLoaded / progress.sizeTotal) || 0;
  return progress;
}
EMLoaderIndicator.prototype.set_background = function(img) {
  if (!(img instanceof HTMLImageElement)) {
    var url = img;
    img = new Image();
    img.src = url;
  }
  this.background = img;
}
EMLoaderIndicator.prototype.set_logo = function(img) {
  if (!(img instanceof HTMLImageElement)) {
    var url = img;
    img = new Image();
    img.src = url;
  }
  this.logo = img;
}
EMLoaderIndicator.prototype.set_poweredby_logo = function(img) {
  if (!(img instanceof HTMLImageElement)) {
    var url = img;
    img = new Image();
    img.src = url;
  }
  this.poweredbylogo = img;
}
