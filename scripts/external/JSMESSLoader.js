function JSMESSLoader(args) {
  // Process arguments
  if (!args) args = {};
  this.webroot   = (args.webroot !== undefined ? args.webroot : '');
  this.useWorker = (args.useWorker !== undefined ? args.useWorker : false);
  this.useWebGL  = (args.useWebGL !== undefined ? args.useWebGL : false);
  this.useSound  = (args.useSound !== undefined ? args.useSound : true);

  this.systemname = args.systemname || '';
  this.gamename = args.gamename || '';

  // Initialize internal variables
  this._readySet = false;
  this._readyList = [];
  this.Module = {};

  // Detect capabilities
  this._runningInWorker = (typeof window == 'undefined' || (typeof ENVIRONMENT_IS_WORKER != 'undefined' && ENVIRONMENT_IS_WORKER));
  this._usingWorker = (this.useWorker && (typeof Worker != 'undefined' || this._runningInWorker));
  this._usingWebGL = (this.useWebGL && typeof WebGLRenderingContext != 'undefined');
  this._usingSound = (this.useSound && typeof AudioContext != 'undefined');

  this.ready(function() { console.log("JSMESS is now running"); });

  console.log('JSMESS capabilities (' + (this._runningInWorker ? 'worker' : 'main') + ' thread): [' + 
      (this._usingWebGL ? 'x' : ' ') + '] WebGL\t[' +
      (this._usingSound ? 'x' : ' ') + '] Sound\t[' +
      (this._usingWorker ? 'x' : ' ') + '] WebWorker');

  if (this._usingWorker) {
    if (this._runningInWorker) {
      importScripts(this.webroot + this.systemname + '.worker.js');
    }
  } 
  if (args.bios_filenames && args.messargs) {
    this.load(args.bios_filenames, this.gamename, args.messargs);
  }
}
JSMESSLoader.prototype._runReadies = function() {
  if (this._readyList) {
    for (var r=0; r < this._readyList.length; r++) {
      this._readyList[r].call(window, []);
    };
    this._readyList = [];
  };
};
JSMESSLoader.prototype._readyCheck = function() {
console.log('ready check', this);
  if (this.running) {
    this._runReadies();
  } else {
    this._readySet = setTimeout(this._readyCheck.bind(this), 10);
  };
};
JSMESSLoader.prototype.ready = function(r) {
  if (this.running) {
    r.call(window, []);
  } else {
    this._readyList.push(function() { return r.call(window, []); } );
    if (!(this._readySet)) this._readyCheck();
  };
};
JSMESSLoader.prototype.load = function(bios_filenames, gamename, messargs) {
  this.bios_filenames = bios_filenames;
  this.gamename = gamename;
  this.messargs = messargs;

  console.log('Load called: ' + JSON.stringify(bios_filenames) + " " + JSON.stringify(messargs) + " (" + (this._runningInWorker ? "worker" : "main") + ")");


  this.bios_files = {};
  this.game_file = null;
  this.file_countdown = 0;

  // Fetch the BIOS and the game we want to run.
  for (var i=0; i < bios_filenames.length; i++) {
    var fname = bios_filenames[i];
    if (fname === "") {
      continue;
    }
    this.file_countdown++;
    this.fetch_file(fname, this.add_bios_file.bind(this, fname));
  }

  if (gamename) {
    this.file_countdown++;
    this.fetch_file(gamename, this.set_game_file.bind(this));
  }
}
JSMESSLoader.prototype.fetch_file = function(fname, cb) {
  var url = this.webroot + fname;
  if (typeof Module != 'undefined') Module.addRunDependency('file:' + fname);

  var xhr = new XMLHttpRequest();
  xhr.open("GET", url, true);
  xhr.responseType = "arraybuffer";
  xhr.onload = function(e) {
    var ints = new Int8Array(xhr.response);
    cb(ints);
    if (typeof Module != 'undefined' && Module.addRunDependency) Module.removeRunDependency('file:' + fname);
  };
  xhr.send();
}
JSMESSLoader.prototype.add_bios_file = function(fname, data) {
  this.bios_files[fname] = data;
  this.update_countdown();
}
JSMESSLoader.prototype.set_game_file = function(data) {
  this.game_file = data;
  this.update_countdown();
};
JSMESSLoader.prototype.update_countdown = function() {
  this.file_countdown -= 1;
  if (this.file_countdown === 0) {
    this.init_emscripten();
  }
}
JSMESSLoader.prototype.create_script = function() {
  var newScript = false;
  if (!this._runningInWorker) {
    // This logic seems backwards, we include the .worker.js file when we're NOT running in the worker
    // This is because the .worker.js file contains the actual bytecode, so by calling it in this way it
    // executes in the main thread
    var scriptfile = this.systemname + (this._usingWorker ? '' : '.worker') + '.js';

    var headID = document.getElementsByTagName("head")[0];
    newScript = document.createElement('script');
    newScript.type = 'text/javascript';
    newScript.src = this.webroot + scriptfile;
    headID.appendChild(newScript);
  }
  return newScript;
}
JSMESSLoader.prototype.create_canvas = function(canvasid) {
  var newCanvas = false;
  if (!this._runningInWorker) {
    newCanvas = document.createElement('canvas');
    newCanvas.id = canvasid || 'canvas';
    newCanvas.width = 256;
    newCanvas.height = 256;
    document.body.appendChild(newCanvas);
  }
  return newCanvas;
}
JSMESSLoader.prototype.init_filesystem = function() {
  // Load the downloaded binary files into the filesystem.
  for (var bios_fname in this.bios_files) {
    if (this.bios_files.hasOwnProperty(bios_fname)) {
      this.Module['FS_createDataFile']('/', bios_fname, this.bios_files[bios_fname], true, true);
    }
  }
  if (this.gamename !== "" && this.game_file) {
    this.Module['FS_createDataFile']('/', this.gamename, this.game_file, true, true);
  }
}
JSMESSLoader.prototype.debug_print = function(text) {
  if (this._runningInWorker) {
    console.log(text);
  } else {
    if (!this.element) {
      this.element = document.getElementById('output');
    }
    if (this.element) {
      this.element.innerHTML += text + '<br>';
    }
  }
}
JSMESSLoader.prototype.init_emscripten = function() {
  // Append any mode-specific arguments
  if (this._usingWebGL) {
    Array.prototype.push.apply(this.messargs, ["-video","opengl","-gl_glsl","-gl_es2","-gl_glsl_filter","1","-glsl_shader_mame0","./es2","-gl_forcepow2texture"]);
  }
  if (this._usingSound) {
    if (jsmess_web_audio) {
      var audioctx = jsmess_web_audio.get_context();
      if (audioctx) {
        this.Module.arguments.push("-samplerate", asample.sampleRate.toString());
      }
    }
  } else {
    Array.prototype.push.apply(this.messargs, ["-sound","none"]);
  }

  var module = (typeof Module != 'undefined' ? Module : {});

  // Create the emscripten module definition
  module.arguments = this.messargs;
  module.SDL_numSimultaneouslyQueuedBuffers = 5;
  module.noInitialRun = false;
  module.screenIsReadOnly = true;

  // Bound callback functions
  if (!this._runningInWorker) {
    if (!module.print) module.print = this.debug_print.bind(this);
    if (!module.printErr) module.printErr = this.debug_print.bind(this);
  }
  if (!module.preInit) {
    module.preInit = [
      this.init_filesystem.bind(this)
    ];
  } else {
    module.preInit.push(this.init_filesystem.bind(this));
  }

  if (!module.postRun) {
    module.postRun = [ this.set_runstate.bind(this, true) ];
  } else {
    module.postRun.push(this.set_runstate.bind(this, true));
  }

  // Set the Module parameter in global scope, whether we're in a worker or the main thread
  // TODO - emscripten might support using a non-global for this, which would be cleaner
  self.Module = this.Module = module;

  if (!this._runningInWorker) {
    this.canvas = module.canvas = this.create_canvas('canvas-' + this.systemname);
    this.create_script();
  }
}
JSMESSLoader.prototype.set_runstate = function(state) {
  this.running = state;
}

