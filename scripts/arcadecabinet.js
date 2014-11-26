elation.require(['vrcade.external.jsmess-webaudio'], function() {
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
    }
    this.poweron = function() {
      //if (typeof JSMESS == 'undefined') {
        elation.require('vrcade.games.' + this.properties.gamename + '.' + this.properties.loader, elation.bind(this, this.begin));
      //} else {
      //  this.begin();
      //}
    }
    this.begin = function() {
      var screen = this.objects['3d'].getObjectByName('screen');
      var canvas = document.getElementById('canvas-' + this.properties.gamename);
      if (screen && canvas) {
        // Remove the canvas from body, since we only really need it for the texture
        // TODO - the way jsmess currently inits is to append a canvas to the body.  If we used our own loader,
        //        we could create our canvas programatically and never add it to the dom
        canvas.parentNode.removeChild(canvas);

        // TODO - currently, jsmess is using software-rendered output, and we're copying that from a 2d canvas
        //        to a 3d texture every frame.  If we can get jsmess working with opengl output, we could render
        //        directly to a framebuffer, apply a CRT distortion filter, and use that directly as a texture
        this.texture = new THREE.Texture(canvas);
        this.texture.anisotropy = 16;
        //this.texture.generateMipmaps = false;

        var crt = screen.children[1];
        var newcrt = new THREE.Mesh(crt.geometry, new THREE.MeshPhongMaterial({ map: this.texture, emissive: 0xffffff, shininess: 200, reflectivity: 1, ambient: 0x000000, specular: 0x4c4c4c }));
        screen.remove(crt);
        screen.add(newcrt);
        this.refreshtexture();
      }
    }
    this.refreshtexture = function() {
      if (this.texture) {
        this.texture.needsUpdate = true;
        this.refresh();
      }
    }
    this.handleclick = function(ev) {
      this.poweron();
      ev.stopPropagation();
    }
  }, elation.engine.things.generic);
});
