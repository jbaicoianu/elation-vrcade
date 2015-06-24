elation.require(['engine.things.generic', 'engine.geometries', 'vrcade.external.browserfs', 'vrcade.external.EMLoader'], function() {

  elation.component.add('engine.things.emulatedmachine', function() {
    this.postinit = function() {
      this.defineProperties({
        executable: { type: 'string', default: '/media/vrcade/systems/arcade/messvrcade.js' },
        executableargs: { type: 'array', default: [] },
        //'render.collada': { type: 'string', default: '/media/vrcade/models/cabinet/cabinet.dae' },
        'render.meshname': { type: 'string', default: 'cabinet-default' },
        loader: { type: 'string', default: 'messloader' },
        systemname: { type: 'string', default: 'jsmess' },
        gamename: { type: 'string', default: false },
        resolution: { type: 'vector2', default: [320, 224] },
        resolutionmultiplier: { type: 'float', default: 4 },
        mnt: { type: 'object', default: {} },
        working: { type: 'bool', default: false },
      });

      var view = this.engine.systems.render.views.main;
      elation.events.add(view, 'render_view_prerender', elation.bind(this, this.refreshtexture));
      //setInterval(elation.bind(this, this.refreshtexture), 10);
      elation.events.add(this, 'click', elation.bind(this, this.handleclick));
      this.dumbcounter = 0;
      this.user = false;

      elation.events.add(this, 'thing_use_focus', elation.bind(this, this.useFocus));
      elation.events.add(this, 'thing_use_blur', elation.bind(this, this.useBlur));
      elation.events.add(this, 'thing_use_activate', elation.bind(this, this.useActivate));

      this.contextname = 'arcadecabinet_' + this.id;
      this.controlstate = this.engine.systems.controls.addContext(this.contextname, {
        'quit': ['keyboard_esc', elation.bind(this, this.pause)],
      });

      // FIXME - hackish way of delaying until mdel has been loaded
      setTimeout(elation.bind(this, function() {
        if (this.triggers['play']) {
          elation.events.add(this.triggers['play'], 'trigger_on', elation.bind(this, this.triggerOn));
          elation.events.add(this.triggers['play'], 'trigger_off', elation.bind(this, this.triggerOff));
        }
      }), 500);
    }
    this.poweron = function() {
      if (!this.running && !this.loading) {
        this.running = false;
        this.loading = true;
        // FIXME - for some reason if we don't call via elaton.require() it doesn't work
        if (false) {
          elation.require('vrcade.games.' + this.properties.gamename + '.' + this.properties.loader, elation.bind(this, this.begin));
        } else {
          //this.initscreen();
          setTimeout(function() {
            var gamename = this.properties.gamename,
                systemname = elation.utils.any(this.properties.systemname, 'mess' + gamename),
                zipname = elation.utils.any(this.properties.zipname, gamename + '.zip');

            var canvas = this.getcanvas();

            if (!this.system) {
              this.system = this.createsystem();
            }
            //this.texture = this.gettexture(this.canvas);
            
            this.begin();
          }.bind(this), 0);
        }
        this.engine.systems.controls.activateContext(this.contextname, this);
      } else if (this.running && this.paused) {
        if (this.properties.gamename == this.system.gamename) {
          this.unpause();
        } else {
          this.begin();
        }
      }
      this.setScreenTextureFromModule();
    }
    this.begin = function() {
      this.running = true;
      this.loading = false;

      //if (this.system && this.system.module && this.system.module.exit) this.system.module.exit();
      this.initscreen();
      var gamename = this.properties.gamename;
      this.system.set_game(gamename);
      this.system.add_rom(gamename, '/media/vrcade/gamepack/NewRetroArcade/Content/Roms/' + gamename + '.zip');
      //setTimeout(elation.bind(this, function() {
        this.system.start();
      //}), 100);
      elation.events.add(this.system, 'run', function() {
        this.system.focus();
        this.setScreenTextureFromModule();
      }.bind(this));
    }
    this.createsystem = function() {
      var resolution = this.getresolution(4);
      var gamename = this.properties.gamename,
          rendercanvas = this.engine.systems.render.renderer.domElement,
          system = new JSMESSLoader({
            executable: '/media/vrcade/systems/arcade/messvrcade.js',
            //gamename: gamename,
            exportname: 'JSMESSVRCADE',
            capturemouse: true,
            canvas: rendercanvas,
            resolution: resolution,
            autostart: false,
            //verbose: true
          });
      if (gamename) {
        system.set_game(gamename);
        system.add_rom('/media/vrcade/gamepack/NewRetroArcade/Content/Roms/' + gamename + '.zip');
      }
      return system;
    }
    this.initscreen = function() {
      var screen = this.getscreen();
      var canvas = (this.system ? this.system.canvas : document.getElementById('canvas-mess' + this.properties.gamename));
      if (!canvas) canvas = document.createElement('canvas');

console.log('INIT SCREEN', canvas, screen);

      this.canvas = canvas;
      if (screen && canvas) {
        this.placeholder = true;
        //this.texture = this.gettexture('/images/win311/dosbox-bios.png');
        this.texture = this.createplaceholder();
        elation.events.add(this.texture.image, 'load', elation.bind(this, this.refresh));

/*
        var screenmat = new THREE.MeshPhongMaterial({ 
          map: this.texture, 
          emissive: 0x000000, 
          shininess: 20, 
          reflectivity: 1, 
          ambient: 0x000000, 
          specular: 0x4c4c4c 
        });
*/
        var screenmat = elation.engine.materials.getShaderMaterial('convert_bgr', { map: this.texture }, {'USE_MAP': 1});
        //screen.material = screenmat;
        this.screenmaterial = screenmat;
        var newfoo = new THREE.Mesh(screen.geometry, screenmat);
        screen.parent.add(newfoo);
        screen.parent.remove(screen);
        //this.refreshtexture();
        this.screen = newfoo;
      }

/*
      elation.events.add(this, 'mouseover,mousemove,mouseout,mousedown,mouseup,click', elation.bind(this, function(ev) { 
        if (ev.data && ev.data.object && ev.data.object == this.screen && ev.data.point) {
          var local = this.worldToLocal(ev.data.point.clone());
      
          console.log(ev.type, local.toArray(), ev.data.object.scale.toArray()); 
        }
      }));
*/
      this.refresh();
    }
    this.getscreen = function() {
      var screen = false;
      var screen = this.parts['screen'].children[0];

      return screen;
    }
    this.gettexture = function(src) {
      var tex = (typeof src == 'string' ? THREE.ImageUtils.loadTexture(src) : new THREE.Texture(src));
      tex.anisotropy = 2;
      tex.generateMipmaps = false;
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      return tex;
    }
    this.refreshtexture = function() {
      if (this.placeholder) {
/*
        if (this.system && this.system.module && this.system.module.calledRun && !this.system.paused) {
          this.placeholder = false;
          this.setScreenTextureFromModule();
          //this.texture = this.gettexture(this.canvas);
          //this.screenmaterial.map = this.texture;
          //this.refresh();
        }
*/
      }
      if (this.texture && !this.paused) {
        if (this.placeholder) {
        } else {
          //this.texture.needsUpdate = true;
          this.refresh();
        }
      }
    }
    this.createplaceholder = function() {
      var indicator = new EMLoaderIndicator(this.system);
      indicator.set_logo('/images/vrcade/vrcade.png');
      indicator.set_poweredby_logo('/images/vrcade/mame.png');
      if (this.defaultscreentexture) {
        indicator.set_background(this.defaultscreentexture);
      }
      return indicator.get_texture();
    }
    this.getresolution = function(multiplier) {
      if (!multiplier) multiplier = 1;
      return (this.properties.resolution.x * multiplier) + 'x' + (this.properties.resolution.y * multiplier);
    }
    this.getcanvas = function() {
      if (this.canvas) return this.canvas;
      this.canvas = document.createElement('canvas');
      return this.canvas;
    }
    this.pause = function() {
      this.system.pause();
      if (this.running && !this.paused) {
        this.paused = true;
        this.refresh();
      }
      this.engine.systems.controls.deactivateContext(this.contextname, this);
      if (this.user) {
        this.user.enable();
      }
    }
    this.unpause = function() {
console.log('unpause it!', this.running, this.paused);
      this.system.unpause();
      if (this.running && this.paused) {
        this.paused = true;
        this.refresh();
        this.engine.systems.controls.activateContext(this.contextname, this);
      }
    }
    this.setGame = function(gamename) {
      this.properties.gamename = gamename;
      this.properties.working = true;
    }
    this.setFrontTexture = function(texurl) {
      var tex = elation.engine.materials.getTexture(texurl);
      if (tex) {
        var oldmat = this.parts['cabinet-marquee'].children[0].material;
        this.parts['cabinet-marquee'].children[0].material = new THREE.MeshPhongMaterial({
          map: tex,
        });

        oldmat = this.parts['cabinet-front'].children[0].material;
        this.parts['cabinet-front'].children[0].material = new THREE.MeshPhongMaterial({
          map: tex,
          normalMap: oldmat.normalMap,
          lightMap: oldmat.lightMap,
          //specular: oldmat.specular,
        });
        //console.log('front tex!', oldmat, this.parts['cabinet-front'].children[0].material);
        this.refresh();
      }
    }
    this.setSideTexture = function(texurl) {
      var tex = elation.engine.materials.getTexture(texurl);
      if (tex) {
        var oldmat = this.parts['cabinet-sides'].children[0].material;
        this.parts['cabinet-sides'].children[0].material = new THREE.MeshPhongMaterial({
          map: tex,
          normalMap: oldmat.normalMap,
          lightMap: oldmat.lightMap
        });
        this.refresh();
      }
    }
    this.setScreenTexture = function(tex) {
      if (tex instanceof WebGLTexture) {
        // FIXME - hacky, needs clean-up
        var oldtex = this.parts['screen'].children[0].material.map;
        oldtex.__webglTexture = tex;
        this.parts['screen'].children[0].material.needsUpdate = true;

        this.screenmaterial = this.parts['screen'].children[0].material;
        return;
      } else if (elation.utils.isString(tex)) {
        tex = elation.engine.materials.getTexture(tex);
      }

      if (tex) {
        tex.minFilter = THREE.NearestFilter;
        tex.magFilter = THREE.NearestFilter;
        tex.generateMipmaps = false;

        var oldmat = this.parts['screen'].children[0].material;
/*
        var newmat = new THREE.MeshPhongMaterial({
          map: tex,
          emission: 0,
        });
*/
        var newmat = elation.engine.materials.getShaderMaterial('convert_bgr', { map: tex }, {'USE_MAP': 1});
        this.parts['screen'].children[0].material = newmat;
        this.screenmaterial = newmat;
        this.refresh();
      } else {
alert('no guy: ' + this.properties.gamename);
      }
    }
    this.setScreenTextureFromModule = function() {
      if (this.system) {
        var webgltex = this.system.get_texture();
        var oldtex = (this.screenmaterial && this.screenmaterial.uniforms ? this.screenmaterial.uniforms.map.value : false);
        if (!webgltex) {
          //setTimeout(elation.bind(this, this.setScreenTextureFromModule), 100);
        } else if (!oldtex || webgltex !== oldtex.__webglTexture) {
          var tex = new THREE.Texture();
          tex.__webglTexture = webgltex;
  /*
          this.parts['screen'].children[0].material = new THREE.MeshPhongMaterial({
            map: tex
          });
  */
          var newmat = elation.engine.materials.getShaderMaterial('convert_bgr', { map: tex }, {'USE_MAP': 1, 'USE_BGR': 1});
          this.parts['screen'].children[0].material = newmat;
          this.screenmaterial = newmat;

          this.screenmaterial.uniforms.rubyTextureSize.value.set(
            this.properties.resolution.y * this.properties.resolutionmultiplier,
            this.properties.resolution.x * this.properties.resolutionmultiplier
          );
          this.screenmaterial.uniforms.rubyInputSize.value.set(
            this.properties.resolution.y * this.properties.resolutionmultiplier,
            this.properties.resolution.x * this.properties.resolutionmultiplier
          );
        }
      }
      this.engine.systems.render.views.main.getsize();
    }
    this.setScreenShaderParams = function(params) {
      if (this.screenmaterial && this.screenmaterial.uniforms) {
        var uniforms = this.screenmaterial.uniforms;
        for (var k in params) {
          if (uniforms[k]) {
            uniforms[k].value = params[k];
          }
        }
      }
      this.refresh();
    }
    this.setDefaultScreenTexture = function(tex) {
      this.defaultscreentexture = tex;
      this.setScreenTexture(tex);
    }
    this.handleclick = function(ev) {
      //this.poweron();
      //ev.stopPropagation();
      if (this.system && this.system.canvas) {
        //this.system.canvas.requestPointerLock();
        //this.system.canvas.focus();
        this.system.focus();
      }
    }
    this.useFocus = function(ev) {
      console.log('focus:', this.properties.gamename);
    }
    this.useBlur = function(ev) {
      console.log('blur:', this.properties.gamename, this.running);
      if (this.running) {
        this.pause();
      }
      this.user = false;
      if (this.updateinterval) {
console.log('clear the timer');
        clearTimeout(this.updateinterval);
        this.updateinterval = false;
      }
    }
    this.useActivate = function(ev) {
      if (this.properties.working) {
        this.user = ev.data;
        this.poweron();

        if (!this.updateinterval) {
          this.updateinterval = setInterval(elation.bind(this, this.triggerUpdate), 1000/60);
  console.log('ADD A TIMER:', this.updateinterval);
        }
      }
    }
    this.triggerOn = function(ev) {
      console.log(this.id + ': should I start?', ev);
      this.addTag('usable');
      //elation.events.add(this, 'mouseover', foo);
    }
    this.triggerOff = function() {
      console.log(this.id + ': nope!');
      this.removeTag('usable');
    }
    this.triggerUpdate = function() {
      //this.setScreenTextureFromModule();
      if (this.screenmaterial && this.screenmaterial.uniforms && this.screenmaterial.uniforms.iGlobalTime) {
        this.screenmaterial.uniforms.iGlobalTime.value = (new Date().getTime() / 1000) % 1000;
        //this.screenmaterial.uniforms.rubyFrameCount.value++;

      }
      this.engine.systems.render.setdirty();
    }
  }, elation.engine.things.generic);

  elation.engine.materials.addChunk('convert_init', {
			fragment: "vec4 diffuseColor = vec4( 0, 0, 0, 1 );",
  });
  elation.engine.materials.addChunk('convert_bgr', {
    fragment: "diffuseColor.rgba = texture2D( map, vUv ).bgra;"
  });
  elation.engine.materials.addChunk('convert_output', {
			fragment: "gl_FragColor = diffuseColor;"
  });

  /** 
   * CRT experiment version 2 - based on the following two shaders:
   *  - cgwg's CRT pixel shader, https://www.mediafire.com/?awpl15dspshis#oy8kt8pi46b33
   *  - scanlines from https://www.shadertoy.com/view/MsXGD4
   *
   * See http://filthypants.blogspot.com/2012/07/customizing-cgwgs-crt-pixel-shader.html for tweaking info
   */
  elation.engine.materials.addChunk('convert_crt_v2', {
    uniforms: {
      rubyInputSize: { type: 'v2', value: new THREE.Vector2(512, 512) },
      rubyOutputSize: { type: 'v2', value: new THREE.Vector2(1024, 1024) },
      rubyTextureSize: { type: 'v2', value: new THREE.Vector2(512, 512) },
      rubyFrameCount: { type: 'i', value: 0 },
      iChannel1: {type: 't', value: elation.engine.materials.getTexture('/media/vrcade/tex11.png')},
      iGlobalTime: {type: 'f', value: 0},

      // gamma of simulated CRT
      CRTgamma : { type: 'f', value: 2.4 },

      // gamma of display monitor (typically 2.2 is correct)
      monitorgamma : { type: 'f', value: 2.2 },

      // overscan (e.g. 1.02 for 2% overscan)
      overscan: { type: 'v2', value: new THREE.Vector2(1.0, 1.0) },

      // aspect ratio
      aspect: { type: 'v2', value: new THREE.Vector2(1.00, 0.75) },

      // lengths are measured in units of (approximately) the width of the monitor
      // simulated distance from viewer to monitor
      d: { type: 'f', value: 2.0},

      // radius of curvature
      R: { type: 'f', value: 1.5},

      // tilt angle in radians
      // (behavior might be a bit wrong if both components are nonzero)
      angle: { type: 'v2', value: new THREE.Vector2(0.0,-0.0001) },

      // size of curved corners
      cornersize: { type: 'f', value: 0.1},

      // border smoothness parameter
      // decrease if borders are too aliased
      cornersmooth: { type: 'f', value: 80.0},
    },
    common_pars: [
      'uniform float CRTgamma;',
      'uniform float monitorgamma;',
      'uniform vec2 overscan;',
      'uniform vec2 aspect;',
      'uniform vec2 angle;',
      'uniform float d;',
      'uniform float R;',
      'uniform float cornersize;',
      'uniform float cornersmooth;',
      'uniform vec2 rubyInputSize;',
      'uniform vec2 rubyTextureSize;',
      'uniform vec2 rubyOutputSize;',


      'varying vec3 stretch;',
      'varying vec2 sinangle;',
      'varying vec2 cosangle;',
      'varying vec2 one;',
      'varying float mod_factor;',
      'varying vec2 ilfac;',

      '#define FIX(c) max(abs(c), 1e-5);',

      'float intersect(vec2 xy)',
      '{',
        'float A = dot(xy,xy)+d*d;',
        'float B = 2.0*(R*(dot(xy,sinangle)-d*cosangle.x*cosangle.y)-d*d);',
        'float C = d*d + 2.0*R*d*cosangle.x*cosangle.y;',
        'return (-B-sqrt(B*B-4.0*A*C))/(2.0*A);',
      '}',

      'vec2 bkwtrans(vec2 xy)',
      '{',
        'float c = intersect(xy);',
        'vec2 point = vec2(c)*xy;',
        'point -= vec2(-R)*sinangle;',
        'point /= vec2(R);',
        'vec2 tang = sinangle/cosangle;',
        'vec2 poc = point/cosangle;',
        'float A = dot(tang,tang)+1.0;',
        'float B = -2.0*dot(poc,tang);',
        'float C = dot(poc,poc)-1.0;',
        'float a = (-B+sqrt(B*B-4.0*A*C))/(2.0*A);',
        'vec2 uv = (point-a*sinangle)/cosangle;',
        'float r = R*acos(a);',
        'return uv*r/sin(r/R);',
      '}',

      'vec2 fwtrans(vec2 uv)',
      '{',
        'float r = FIX(sqrt(dot(uv,uv)));',
        'uv *= sin(r/R)/r;',
        'float x = 1.0-cos(r/R);',
        'float D = d/R + x*cosangle.x*cosangle.y+dot(uv,sinangle);',
        'return d*(uv*cosangle-x*sinangle)/D;',
      '}',

      'vec3 maxscale()',
      '{',
        'vec2 c = bkwtrans(-R * sinangle / (1.0 + R/d*cosangle.x*cosangle.y));',
        'vec2 a = vec2(0.5,0.5)*aspect;',
        'vec2 lo = vec2(fwtrans(vec2(-a.x,c.y)).x,',
           'fwtrans(vec2(c.x,-a.y)).y)/aspect;',
        'vec2 hi = vec2(fwtrans(vec2(+a.x,c.y)).x,',
           'fwtrans(vec2(c.x,+a.y)).y)/aspect;',
        'return vec3((hi+lo)*aspect*0.5,max(hi.x-lo.x,hi.y-lo.y));',
      '}',
    ].join('\n'),

    vertex_pars: [
    ].join('\n'),

    vertex: [
      // START of parameters

      // END of parameters

      // Do the standard vertex processing.
      //'gl_Position = gl_ModelViewProjectionMatrix * gl_Vertex;',

      // Precalculate a bunch of useful values we'll need in the fragment
      // shader.
      'sinangle = sin(angle);',
      'cosangle = cos(angle);',
      'stretch = maxscale();',

      'ilfac = vec2(1.0,floor(rubyInputSize.y/200.0));',

      // The size of one texel, in texture-coordinates.
      'one = ilfac / rubyTextureSize;',

      // This system seems to flip x and y, so let's correct that
      //'vUv = vec2(1.0 - vUv.y, vUv.x);',

      // Resulting X pixel-coordinate of the pixel we're drawing.
      'mod_factor = vUv.x * rubyTextureSize.x * rubyOutputSize.x / rubyInputSize.x;     ',
    ].join('\n'),

    fragment_pars: [
      // Comment the next line to disable interpolation in linear gamma (and gain speed).
      '#define LINEAR_PROCESSING',

      // Enable screen curvature.
      //'#define CURVATURE',

      // Enable 3x oversampling of the beam profile
      '#define OVERSAMPLE',

      // Use the older, purely gaussian beam profile
      //'#define USEGAUSSIAN',

      'uniform int rubyFrameCount;',


      // Macros.
      //'#define PI 3.141592653589',

      '#ifdef LINEAR_PROCESSING',
      '#    ifdef USE_BGR',
      '#         define TEX2D(c) pow(texture2D(map, (c)).bgra, vec4(CRTgamma))',
      '#    else',
      '#         define TEX2D(c) pow(texture2D(map, (c)).rgba, vec4(CRTgamma))',
      '#    endif',
      '#else',
      '#    ifdef USE_BGR',
      '#       define TEX2D(c) texture2D(map, (c)).bgra',
      '#    else',
      '#       define TEX2D(c) texture2D(map, (c))',
      '#    endif',
      '#endif',

      '#ifdef OVERSAMPLE',
      '  #extension GL_OES_standard_derivatives : enable',
      '#endif',

      'vec2 transform(vec2 coord)',
      '{',
        'coord *= rubyTextureSize / rubyInputSize;',
        'coord = (coord-vec2(0.5))*aspect*stretch.z+stretch.xy;',
        'return (bkwtrans(coord)/overscan/aspect+vec2(0.5)) * rubyInputSize / rubyTextureSize;',
      '}',

      'float corner(vec2 coord)',
      '{',
        'coord *= rubyTextureSize / rubyInputSize;',
        'coord = (coord - vec2(0.5)) * overscan + vec2(0.5);',
        'coord = min(coord, vec2(1.0)-coord) * aspect;',
        'vec2 cdist = vec2(cornersize);',
        'coord = (cdist - min(coord,cdist));',
        'float dist = sqrt(dot(coord,coord));',
        'return clamp((cdist.x-dist)*cornersmooth,0.0, 1.0);',
      '}',

      // Calculate the influence of a scanline on the current pixel.
      //
      // 'distance' is the distance in texture coordinates from the current
      // pixel to the scanline in question.
      // 'color' is the colour of the scanline at the horizontal location of
      // the current pixel.
      'vec4 scanlineWeights(float distance, vec4 color)',
      '{',
        // "wid" controls the width of the scanline beam, for each RGB channel
        // The "weights" lines basically specify the formula that gives
        // you the profile of the beam, i.e. the intensity as
        // a function of distance from the vertical center of the
        // scanline. In this case, it is gaussian if width=2, and
        // becomes nongaussian for larger widths. Ideally this should
        // be normalized so that the integral across the beam is
        // independent of its width. That is, for a narrower beam
        // "weights" should have a higher peak at the center of the
        // scanline than for a wider beam.
      '#ifdef USEGAUSSIAN',
        'vec4 wid = 0.3 + 0.1 * pow(color, vec4(3.0));',
        'vec4 weights = vec4(distance / wid);',
        'return 0.4 * exp(-weights * weights) / wid;',
      '#else',
        'vec4 wid = 2.0 + 2.0 * pow(color, vec4(4.0));',
        'vec4 weights = vec4(distance / 0.3);',
        'return 1.4 * exp(-pow(weights * inversesqrt(0.5 * wid), wid)) / (0.6 + 0.2 * wid);',
      '#endif',
      '}',

      '#ifdef FOOBAR',
        'uniform sampler2D iChannel1;',
        'uniform float iGlobalTime;',

        'float scanline(vec2 uv) {',
        '  return sin(rubyTextureSize.y * uv.y * 0.7 - iGlobalTime * 10.0);',
        '}',

        'float slowscan(vec2 uv) {',
        '  return sin(rubyTextureSize.y * uv.y * 0.02 + iGlobalTime * 6.0);',
        '}',

        'vec2 colorShift(vec2 uv) {',
        '  return vec2(',
        '    uv.x,',
        '    uv.y + sin(iGlobalTime)*0.02',
        '  );',
        '}',

        'float noise(vec2 uv) {',
        '  return clamp(texture2D(iChannel1, uv.xy + iGlobalTime*6.0).r +',
        '    texture2D(iChannel1, uv.xy - iGlobalTime*4.0).g, 0.96, 1.0);',
        '}',

        // from https://www.shadertoy.com/view/4sf3Dr
        // Thanks, Jasper
        'vec2 crt(vec2 coord, float bend)',
        '{',
        '  // put in symmetrical coords',
        '  coord = (coord - 0.5) * 2.0;',

        '  coord *= 0.5; ',
        '  ',
        '  // deform coords',
        '  coord.x *= 1.0 + pow((abs(coord.y) / bend), 2.0);',
        '  coord.y *= 1.0 + pow((abs(coord.x) / bend), 2.0);',

        '  // transform back to 0.0 - 1.0 space',
        '  coord  = (coord / 1.0) + 0.5;',

        '  return coord;',
        '}',

        'vec2 colorshift(vec2 uv, float amount, float rand) {',
        '  ',
        '  return vec2(',
        '    uv.x,',
        '    uv.y + amount * rand // * sin(uv.y * rubyTextureSize.y * 0.12 + iGlobalTime)',
        '  );',
        '}',

        'vec2 scandistort(vec2 uv) {',
        '  float scan1 = clamp(cos(uv.y * 2.0 + iGlobalTime), 0.0, 1.0);',
        '  float scan2 = clamp(cos(uv.y * 2.0 + iGlobalTime + 4.0) * 10.0, 0.0, 1.0) ;',
        '  float amount = scan1 * scan2 * uv.x; ',
        '  ',
        '  uv.x -= 0.05 * mix(texture2D(iChannel1, vec2(uv.x, amount)).r * amount, amount, 0.9);',

        '  return uv;',
        '   ',
        '}',

        'float vignette(vec2 uv) {',
        '  uv = (uv - 0.5) * 0.98;',
        '  return clamp(pow(cos(uv.x * 3.1415), 1.2) * pow(cos(uv.y * 3.1415), 1.2) * 50.0, 0.0, 1.0);',
        '}',
        '#endif',
    ].join('\n'),

    fragment: [
      // Here's a helpful diagram to keep in mind while trying to
      // understand the code:
      //
      //  |      |      |      |      |
      // -------------------------------
      //  |      |      |      |      |
      //  |  01  |  11  |  21  |  31  | <-- current scanline
      //  |      | @    |      |      |
      // -------------------------------
      //  |      |      |      |      |
      //  |  02  |  12  |  22  |  32  | <-- next scanline
      //  |      |      |      |      |
      // -------------------------------
      //  |      |      |      |      |
      //
      // Each character-cell represents a pixel on the output
      // surface, "@" represents the current pixel (always somewhere
      // in the bottom half of the current scan-line, or the top-half
      // of the next scanline). The grid of lines represents the
      // edges of the texels of the underlying texture.

      // Texture coordinates of the texel containing the active pixel.
    '#ifdef CURVATURE',
      'vec2 xy = transform(vUv);',
    '#else',
      'vec2 xy = vUv;',
    '#endif',
      //'xy = vec2(1.0 - xy.y, xy.x);',
      'float cval = corner(xy);',

      // Of all the pixels that are mapped onto the texel we are
      // currently rendering, which pixel are we currently rendering?
      'vec2 ilvec = vec2(0.0,ilfac.y > 1.5 ? mod(float(rubyFrameCount),2.0) : 0.0);',
      'vec2 ratio_scale = (xy * rubyTextureSize - vec2(0.5) + ilvec)/ilfac;',
    '#ifdef OVERSAMPLE',
      'float filter = fwidth(ratio_scale.y);',
    '#endif',
      'vec2 uv_ratio = fract(ratio_scale);',

      // Snap to the center of the underlying texel.
      'xy = (floor(ratio_scale)*ilfac + vec2(0.5) - ilvec) / rubyTextureSize;',

      // Calculate Lanczos scaling coefficients describing the effect
      // of various neighbour texels in a scanline on the current
      // pixel.
      'vec4 coeffs = PI * vec4(1.0 + uv_ratio.x, uv_ratio.x, 1.0 - uv_ratio.x, 2.0 - uv_ratio.x);',

      // Prevent division by zero.
      'coeffs = FIX(coeffs);',

      // Lanczos2 kernel.
      'coeffs = 2.0 * sin(coeffs) * sin(coeffs / 2.0) / (coeffs * coeffs);',

      // Normalize.
      'coeffs /= dot(coeffs, vec4(1.0));',

      // Calculate the effective colour of the current and next
      // scanlines at the horizontal location of the current pixel,
      // using the Lanczos coefficients above.
      'vec4 col  = clamp(mat4(',
           'TEX2D(xy + vec2(-one.x, 0.0)),',
           'TEX2D(xy),',
           'TEX2D(xy + vec2(one.x, 0.0)),',
           'TEX2D(xy + vec2(2.0 * one.x, 0.0))) * coeffs,',
            '0.0, 1.0);',
      'vec4 col2 = clamp(mat4(',
           'TEX2D(xy + vec2(-one.x, one.y)),',
           'TEX2D(xy + vec2(0.0, one.y)),',
           'TEX2D(xy + one),',
           'TEX2D(xy + vec2(2.0 * one.x, one.y))) * coeffs,',
            '0.0, 1.0);',

    '#ifndef LINEAR_PROCESSING',
      'col  = pow(col , vec4(CRTgamma));',
      'col2 = pow(col2, vec4(CRTgamma));',
    '#endif',

      // Calculate the influence of the current and next scanlines on
      // the current pixel.
      'vec4 weights  = scanlineWeights(uv_ratio.y, col);',
      'vec4 weights2 = scanlineWeights(1.0 - uv_ratio.y, col2);',
    '#ifdef OVERSAMPLE',
      'uv_ratio.y =uv_ratio.y+1.0/3.0*filter;',
      'weights = (weights+scanlineWeights(uv_ratio.y, col))/3.0;',
      'weights2=(weights2+scanlineWeights(abs(1.0-uv_ratio.y), col2))/3.0;',
      'uv_ratio.y =uv_ratio.y-2.0/3.0*filter;',
      'weights=weights+scanlineWeights(abs(uv_ratio.y), col)/3.0;',
      'weights2=weights2+scanlineWeights(abs(1.0-uv_ratio.y), col2)/3.0;',
    '#endif',
      'vec3 mul_res  = (col * weights + col2 * weights2).rgb * vec3(cval);',

      // dot-mask emulation:
      // Output pixels are alternately tinted green and magenta.
      'vec3 dotMaskWeights = mix(',
              'vec3(1.0, 0.7, 1.0),',
              'vec3(0.7, 1.0, 0.7),',
              'floor(mod(mod_factor, 2.0))',
          ');',
              
      'mul_res *= dotMaskWeights;',

      // Convert the image gamma for display on our output device.
      'mul_res = pow(mul_res, vec3(1.0 / monitorgamma));',

      // Color the texel.
      'gl_FragColor = vec4(mul_res, 1.0);',
      'vec4 color = vec4(mul_res, 1.0);',
      '#ifdef FOOBAR',
        '  vec2 tuv = vUv.xy;',
        '  vec2 sd_uv = scandistort(tuv);',
        '  vec2 crt_uv = crt(sd_uv, 2.0);',
/*

        '  vec4 color;',

        '  //float rand_r = sin(iGlobalTime * 3.0 + sin(iGlobalTime)) * sin(iGlobalTime * 0.2);',
        '  //float rand_g = clamp(sin(iGlobalTime * 1.52 * tuv.y + sin(iGlobalTime)) * sin(iGlobalTime* 1.2), 0.0, 1.0);',
        '  vec4 rand = texture2D(iChannel1, vec2(iGlobalTime * 0.01, iGlobalTime * 0.02));',

        '  color.r = texture2D(map, crt(colorshift(sd_uv, 0.025, rand.r), 2.0)).b;',
        '  color.g = texture2D(map, crt(colorshift(sd_uv, 0.01, rand.g), 2.0)).g;',
        '  color.b = texture2D(map, crt(colorshift(sd_uv, 0.024, rand.b), 2.0)).r; ',
*/

        '  vec4 scanline_color = vec4(scanline(crt_uv));',
        '  vec4 slowscan_color = vec4(slowscan(crt_uv));',

        '  gl_FragColor = mix(color, mix(scanline_color, slowscan_color, 0.5), 0.05) *',
        '    vignette(tuv) *',
        '    noise(tuv);',
        '#endif',
    ].join('\n')
  });
  elation.engine.materials.buildShader("convert_bgr", {
    uniforms: [
      'common',
      'map',
      //'normalmap',
      'lights',
      'lights_phong',
      'convert_crt_v2'
    ],
    chunks_vertex: [
      //'normal',
      'uv',
      'map',
      //'lightmap',
      //'envmap',
      'color',
      'default',
      'convert_crt_v2'
      //'shadowmap'
    ],
    chunks_fragment: [
      'normal',
      'uv',
      'convert_init',
      'map',
      //'specularmap',
      //'alphatest',
      //'lightmap',
      //'color',
      //'envmap',
      //'shadowmap',
      //'linear_to_gamma'
      'convert_bgr',
      'convert_crt_v2'
    ]
  });
});

