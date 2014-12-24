elation.require(['engine.things.generic', 'vrcade.external.JSMESSLoader', 'vrcade.external.jsmess-webaudio'], function() {
  elation.component.add('engine.things.arcadecabinet', function() {
    this.postinit = function() {
      this.defineProperties({
        gamename: { type: 'string', default: 'pacman' },
        loader: { type: 'string', default: 'messloader' },
      });
      var view = this.engine.systems.render.views.main;
      elation.events.add(view, 'render_view_prerender', elation.bind(this, this.refreshtexture));
      elation.events.add(this, 'click', elation.bind(this, this.handleclick));
      this.dumbcounter = 0;

      this.addTag('usable');
      elation.events.add(this, 'thing_use_focus', elation.bind(this, this.useFocus));
      elation.events.add(this, 'thing_use_blur', elation.bind(this, this.useBlur));
      elation.events.add(this, 'thing_use_activate', elation.bind(this, this.useActivate));
  
    }
    this.poweron = function() {
      if (!this.running && !this.loading) {
        this.running = false;
        this.loading = true;
        // FIXME - for some reason if we don't call via elaton.require() it doesn't work
        if (false) {
          elation.require('vrcade.games.' + this.properties.gamename + '.' + this.properties.loader, elation.bind(this, this.begin));
        } else {
          setTimeout(function() {
            var gamename = this.properties.gamename,
                systemname = 'mess' + this.properties.gamename;

            var messargs = { 
              webroot: '/media/vrcade/games/' + gamename + '/',
              useWebGL: false,
              useWorker: false,
              useSound: true,
              systemname: systemname,
              gamename: '',
              bios_filenames: [gamename + '.zip'],
              messargs: [gamename,"-verbose","-rompath",".","-window","-resolution","448x576","-nokeepaspect","-autoframeskip"]
            };
            this.jsmess = new JSMESSLoader(messargs);
            this.jsmess.ready(elation.bind(this, this.begin));
          }.bind(this), 100);
        }
        //setTimeout(elation.bind(this, this.begin), 1000);
      } else if (this.running && this.paused) {
        this.unpause();
      }
    }
    this.begin = function() {
      this.running = true;
      this.loading = false;

      this.initscreen();
    }
    this.initscreen = function() {
      var screen = this.getscreen();
      var canvas = (this.jsmess ? this.jsmess.canvas : document.getElementById('canvas-mess' + this.properties.gamename));
      this.canvas = canvas;
      if (screen && canvas) {
        // Remove the canvas from body, since we only really need it for the texture
        // TODO - the way jsmess currently inits is to append a canvas to the body.  If we used our own loader,
        //        we could create our canvas programatically and never add it to the dom
        //canvas.parentNode.removeChild(canvas);

        // TODO - currently, jsmess is using software-rendered output, and we're copying that from a 2d canvas
        //        to a 3d texture every frame.  If we can get jsmess working with opengl output, we could render
        //        directly to a framebuffer, apply a CRT distortion filter, and use that directly as a texture
        this.texture = new THREE.Texture(canvas);
        this.texture.anisotropy = 16;
        this.texture.generateMipmaps = false;

        var screenmat = new THREE.MeshPhongMaterial({ 
          map: this.texture, 
          emissive: 0xffffff, 
          shininess: 20, 
          reflectivity: 1, 
          ambient: 0x000000, 
          specular: 0x4c4c4c 
        });
        //screen.material = screenmat;
        var newfoo = new THREE.Mesh(screen.geometry, screenmat);
        screen.parent.add(newfoo);
        screen.parent.remove(screen);
        this.refreshtexture();
      }
    }
    this.getscreen = function() {
      var screen = false;
      var isScreenMaterial = function(m) { return m.name == '_SCREEN'; };
      this.objects['3d'].traverse(function(n) { 
        if (n instanceof THREE.Mesh) {
          if (n.material instanceof THREE.MeshFaceMaterial) {
            var f = n.material.materials.map(isScreenMaterial).reduce(function(x, y) { return x || y; });
            if (f) {
              screen = n;
            }
          } else if (isScreenMaterial(n.material)) {
            screen = n;
          }
        }
      });

      return screen;
    }
    this.refreshtexture = function() {
      if (this.texture && !this.paused) {
        this.texture.needsUpdate = true;
        this.refresh();
      }
    }
    this.pause = function() {
      if (this.running && !this.paused) {
        this.jsmess.Module.pauseMainLoop();
        this.paused = true;
        this.refresh();
      }
    }
    this.unpause = function() {
      if (this.running && this.paused) {
        this.paused = false;
        this.jsmess.Module.resumeMainLoop();
        this.refresh();
      }
    }
    this.handleclick = function(ev) {
      //this.poweron();
      //ev.stopPropagation();
    }
    this.useFocus = function(ev) {
      console.log('focus:', this.properties.gamename);
    }
    this.useBlur = function(ev) {
      console.log('blur:', this.properties.gamename);
      if (this.running) {
        this.pause();
      }
    }
    this.useActivate = function(ev) {
      console.log('go go go', this.properties.gamename);
      this.poweron();
    }
  }, elation.engine.things.generic);
});
