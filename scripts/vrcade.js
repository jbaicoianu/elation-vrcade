elation.require([
    "ui.spinner", "ui.loader", "ui.tabbedcontent", "ui.slider", "ui.togglebutton", "ui.list",
    "engine.engine", "engine.external.three.tween", "vrcade.vrcadeplayer", "engine.things.pathtracker", "engine.things.camera", "engine.things.menu"
  ], function() {

  elation.template.add('vrcade.intro', '<div data-elation-component="ui.spinner" data-elation-args.label="loading" data-elation-args.type="dark"></div>');

  elation.component.add('vrcade', function() {
    this.init = function() {
      this.initEngine();

      this.loader = elation.ui.loader({
        append: this,
        right: true,
        bottom: true
      });
    }
    this.initEngine = function() {
      this.engine = elation.engine.create("vrcade", ["physics", "controls", "sound", "ai", "world", "render"], elation.bind(this, this.startEngine));
    }
    this.startEngine = function(engine) {
      elation.require(['engine.things.light', 'engine.things.terrain', 'vrcade.arcadecabinet'], elation.bind(this, function() {
        engine.systems.world.load({
          type: 'vrcade',
          name: 'vrcade',
          properties: {
          }
        });
        this.view = elation.engine.systems.render.view("main", elation.html.create({ tag: 'div', append: document.body }), { fullsize: 1, picking: 1, engine: 'vrcade', showstats: true } );
        this.engine.systems.world.children.vrcade.setview(this.view);
        engine.start();
console.log('VIEW', this.view);
      }));

    }
  });

  elation.component.add('engine.things.vrcade', function() {
    this.gamegroups = [
      {
        position: [10,0,0],
        //scale: [1.5, 1.5, 1.5],
        games: [
          { name: 'pacman', model: 'pacman', gamename: 'pacman' },
          { name: 'galaxian', model: 'galaga', gamename: 'galaxian' },
          { name: 'moonpatrol', model: 'moon-patrol', gamename: 'mpatrol' },
          { name: 'joust', model: 'joust', gamename: 'joust' },
        ]
      },
/*
      {
        position: [10,0,10],
        //scale: [1.5, 1.5, 1.5],
        games: [ 
          { name: 'stargate', model: 'stargate', gamename: 'stargate' },
          { name: 'joust', model: 'joust', gamename: 'joust' },
        ]
      }
*/
    ];
    this.gamenum = 0;
    this.cabinets = {};
    this.started = false;

    this.postinit = function() {
      this.defineProperties({
        view: { type: 'object' }
      });
      if (this.properties.view) this.view = this.properties.view;
console.log('view is', this.view);
      this.initControls();
    }
    this.createObject3D = function() {
      return new THREE.Object3D();
    }
    this.initControls = function() {
      this.controlstate = this.engine.systems.controls.addContext('vrcade', {
        'menu': ['keyboard_esc', elation.bind(this, this.toggleMenu)],
        'pointerlock': ['pointerlock', elation.bind(this, this.togglePointerLock)],
        'vr_toggle': ['keyboard_ctrl_rightsquarebracket', elation.bind(this, this.toggleVR)],
        'vr_calibrate': ['keyboard_ctrl_leftsquarebracket', elation.bind(this, this.calibrateVR)],
      });
      this.engine.systems.controls.activateContext('vrcade');
    }

    this.createChildren = function() {
      this.engine.systems.world.setFog(1, 50, 0x111111);
      this.engine.systems.world.setSky('/media/vrcade/textures/skybox', 'jpg', ['p', 'n']);

      this.player = this.spawn('vrcadeplayer', 'player', { "position":[0,2.4,0], mass: 50 });
      this.setview(this.view);

      // FIXME - without the timeout, this is being created before world exists, so mouse picking isn't working
      setTimeout(function() { this.showMenu(); }.bind(this), 1500);


      //elation.events.add(this.neighborhood, 'thing_load', elation.bind(this, this.create_games));
    }
    this.create_lights = function() {
      var lights = [];
      lights.push(this.spawn('light', 'sun', {
        "position":[50,30,30],
        "persist":false,
        "type":"directional",
        "intensity":0.6,
        //"velocity":[0,0,0.05]
      }));
      lights.push(this.spawn('light', 'sun', {
        "position":[-50,-30,-30],
        "persist":false,
        "type":"directional",
        "intensity":0.2,
        //"velocity":[0,0,0.05]
      }));
      lights.push(this.spawn('light', 'ambient', {
        "position":[0,0,0],
        "persist":false,
        "type":"ambient",
        "color":0xcccccc,
      }));

      return lights;
    }
    this.create_games = function() {
      this.gamesloading = 0;
      var groups = [];
      for (var i = 0; i < this.gamegroups.length; i++) {
        var group = this.spawn('vrcadegamegroup', 'group_' + i, this.gamegroups[i]);
        elation.events.add(group, 'thing_load', elation.bind(this, this.handlegroupload));
        groups.push(this);
      }

/*
      this.spawn('generic', 'changemachine', {
        'render.collada': '/media/vrcade/models/pacman/pacman.dae',
        'position': [0,0,0],
        'orientation': [0,1,0,0],
        //scale: [1.4, 1.4, 1.4],
        //scale: [.3048,.3048,.3048],
      });
*/
    }
    this.setview = function(view) {
      this.view = view;
      if (this.player) {
        this.view.setactivething(this.player);
      }
    }
    this.showMenu = function() {
this.setview(this.view);
      if (!this.menu) {
        this.menu = this.player.spawn('menu', null, { 
          position: [0,0,-1],
          items: [
            { 
              text: 'Intro',
              callback: elation.bind(this, this.startIntro),
              disabled: true
            },
            { 
              text: 'Play',
              callback: elation.bind(this, this.startGame)
            },
            { 
              text: 'Options', 
              callback: elation.bind(this, this.configureOptions),
            },
            { 
              text: 'About',
              callback: elation.bind(this, this.showAbout),
            },
/*
            { 
              text: 'Quit',
              disabled: true
            }
*/
          ],
          labelcfg: {
            size: .05,
            color: 0x999999,
            hovercolor: 0x003300,
            disabledcolor: 0x000000,
            disabledhovercolor: 0x330000,
          }
        });
      } else {
        this.player.add(this.menu);
      }
      this.player.disable();
      this.menuShowing = true;
      this.refresh();
    }
    this.hideMenu = function() {
      console.log('hide menu');
      this.player.remove(this.menu);
      if (this.configmenu) this.configmenu.hide();
      this.player.enable();
      this.menuShowing = false;
      this.refresh();
    }
    this.toggleMenu = function(ev) {
      if (ev.value == 1) {
        if (this.menuShowing) {
          this.hideMenu();
        } else {
          this.showMenu();
        }
      }
    }
    this.togglePointerLock = function(ev) {
      if (ev.value == 0) {
        this.showMenu();
      }
    }
    this.toggleFullscreen = function(ev) {
      var view = this.view;
      if (view && (ev.value == 1 || typeof ev.value == 'undefined')) {
        view.toggleFullscreen();
      }
    }
    this.toggleVR = function(ev) {
      var view = this.view;
      if (view && (ev.value == 1 || typeof ev.value == 'undefined')) {
        var mode = (view.rendermode == 'default' ? 'oculus' : 'default');
        view.setRenderMode(mode);
      }
    }
    this.calibrateVR = function(ev) {
      if (this.engine.systems.controls && ev.value == 1) {
        this.engine.systems.controls.calibrateHMDs();
      }
    }
    this.loadGame = function() {
      this.lights = this.create_lights();

      this.collidermesh = this.spawn('generic', 'collider', {
        "render.collada": "/media/vrcade/models/flynns-v5/flynns-collider.dae",
        "scale": [.3048, .3048, .3048]
      });
      this.neighborhood = this.spawn('generic', 'neighborhood', {
        "render.collada": "/media/vrcade/models/flynns-v5/flynns-neighborhood.dae",
        "scale": [.3048, .3048, .3048]
      });
      this.exterior = this.spawn('generic', 'exterior', {
        "position": [0,0,0],
        "render.collada": "/media/vrcade/models/flynns-v5/flynns-exterior.dae",
        "scale": [.3048, .3048, .3048]
      });
      this.interior = this.spawn('generic', 'interior', {
        "position": [0,0,0],
        "render.collada": "/media/vrcade/models/flynns-v5/flynns-interior.dae",
        "scale": [.3048, .3048, .3048]
      });

      elation.events.add(this.interior, 'thing_load', elation.bind(this, this.create_games));
    }
    this.loadTheater = function() {
      this.theater = this.spawn('generic', 'theater', {
        //"render.gltf": "/media/vrcade/models/flynnstheater/flynnstheater.json",
        "render.collada": "/media/vrcade/models/flynns-v5/flynns-theater.dae",
        "position": [0,.1,0]
      });
      this.theaterscreen = this.spawn('theaterscreen', 'screen', {
        "position": [10,16,78],
        "orientation": [0,0.7071067811865474,0,0.7071067811865474]
      });
    }

    this.startGame = function() {
      if (!this.started) {
        this.loadGame();  
        this.started = true;
      }
      this.hideMenu();
    }
    this.startIntro = function() {
      var camerapoints = [
        new THREE.Vector3(-50,6,500),
        new THREE.Vector3(-60,6,100),
        new THREE.Vector3(-60,6,20),
        new THREE.Vector3(-30,6,-25), 
        new THREE.Vector3(-15,6,-20), 
      ];
      this.cameraspline = new THREE.CurvePath();
      this.cameraspline.add(new THREE.SplineCurve3(camerapoints));
      
      this.pathtracker = this.spawn('pathtracker', 'camera', {
        'path': this.cameraspline,
        'target': new THREE.Vector3(-3, 8, -10),
        'tracktime': 15.0,
        'autostart': false,
        'collidable': false,
        'physical': false
        //'position': camerapoints[0].toArray()
      });
//console.log(this.pathtracker);
      //this.pathtracker.setPathPoint(0);
/*
      this.pathedit = this.spawn('pathedit', null, {
        'path': this.cameraspline
      });
*/
/*
      this.jukebox = elation.html.create({tag: 'audio', append: document.body});
      this.jukebox.src = '/media/vrcade/music/Journey-SeparateWays.mp3';
      this.jukebox.preload = 'auto';
*/



    }
    this.configureOptions = function() {
      if (!this.configmenu) {
        var configpanel = elation.ui.panel({
          orientation: 'vertical'
        });

        /* Control Settings */
        var controlpanel = elation.ui.panel({
          orientation: 'vertical'
        });
        var label = elation.ui.labeldivider({
          append: controlpanel, 
          label: 'Mouse Settings'
        });
        var sensitivity = elation.ui.slider({
          append: controlpanel,
          min: 0,
          max: 100,
          snap: 1,
          handles: [
            {
              name: 'handle_one',
              value: this.engine.systems.controls.mousesensitivity,
              labelprefix: 'Sensitivity:',
              bindvar: [this.engine.systems.controls, 'mousesensitivity']
            }
          ]
        });
        label = elation.ui.labeldivider({
          append: controlpanel, 
          label: 'Gamepad Settings'
        });
        var gamepads = this.engine.systems.controls.getGamepads();
        if (gamepads.length == 0) {
          elation.ui.content({ append: controlpanel, content: 'No gamepads connected'});
        } else {
          elation.ui.list({ append: controlpanel, items: gamepads, attrs: { label: 'id'}});
        }
        label = elation.ui.labeldivider({
          append: controlpanel, 
          label: 'Keyboard Settings'
        });
/*
        var turnspeed = elation.ui.slider({
          append: controlpanel,
          min: 0,
          max: 10,
          snap: .1,
          handles: [
            {
              name: 'handle_two',
              value: this.player.turnSpeed,
              labelprefix: 'Turn Speed:',
              bindvar: [this.player, 'turnSpeed']
            }
          ]
        });
*/
        elation.ui.content({ append: controlpanel, content: '(TODO - build keybinding UI)'});

        /* Video Settings */
        var videopanel = elation.ui.panel({
          orientation: 'vertical'
        });
        var oculus = elation.ui.togglebutton({
          label: 'Oculus Rift',
          append: videopanel,
        });
        elation.events.add(oculus, 'ui_button_toggle', elation.bind(this, this.toggleVR));
        var fullscreen = elation.ui.togglebutton({
          label: 'Fullscreen',
          append: videopanel,
        });
        elation.events.add(fullscreen, 'ui_button_toggle', elation.bind(this, this.toggleFullscreen));

        var configtabs = elation.ui.tabbedcontent({
          append: configpanel,
          items: {
            controls: { label: 'Controls', content: controlpanel },
            video: { label: 'Video', content: videopanel },
            audio: { label: 'Audio', disabled: true },
            network: { label: 'Network', disabled: true },
          }
        });

        this.configmenu = elation.ui.window({
          append: document.body,
          classname: 'vrcade_config',
          center: true,
          resizable: false,
          title: 'Configuration',
          controls: true,
          maximize: false,
          minimize: false,
          content: configpanel
        });
      }
      this.configmenu.show();
    }
    this.showAbout = function() {
      window.open('http://blog.vrcade.io/');
    }
    this.setgame = function(n) {
      this.gamenum = (n + this.games.length) % this.games.length;
      var gamepos = this.getgameposition(this.gamenum);
      var playerpos = this.getgameposition(this.gamenum, new THREE.Vector3(0,0,5));
      var dir = new THREE.Vector3().subVectors(playerpos, gamepos).normalize();
      this.player.properties.position.copy(playerpos);
      //this.player.properties.orientation.setFromUnitVectors(new THREE.Vector3(0,0,1), dir);
      //this.player.lookAt(gamepos);

      var cab = this.cabinets[this.games[this.gamenum].name];
      this.player.properties.orientation.copy(cab.properties.orientation);
      //this.player.properties.orientation.setFromEuler(new THREE.Euler(-Math.PI/2.1, 0, 0));

      this.player.refresh();
    }
    this.handlegroupload = function() {
      //console.log('new group loaded');
    }
  }, elation.engine.things.generic);

  elation.component.add('engine.things.vrcadegamegroup', function() {
    this.postinit = function() {
      this.defineProperties({
        'layout': { type: 'string', default: 'line' },
        'games': { type: 'array', default: [] }
      });
      this.layout = this.properties.layout;
      this.games = this.properties.games;
    }
    this.createObject3D = function() {
      return new THREE.Object3D();
    }
    this.createChildren = function() {
      this.create_games();
    }
    this.create_games = function() {
      this.gamesloading = 0;
      this.cabinets = {};

      var scale = .5; //.3048;

      for (var i = 0; i < this.games.length; i++) {
        var name = this.games[i].name;
        var gameargs = {
          'name': name,
          'gamename': this.games[i].gamename,
          'loader': 'messloadergl',
          //'render.gltf': '/media/vrcade/models/' + this.games[i].model + '/' + this.games[i].model + '.json',
          'render.collada': '/media/vrcade/models/' + this.games[i].model + '/' + this.games[i].model + '.dae',
          'scale': [scale, scale, scale],
          mass: 0
        };
        this.cabinets[name] = this.spawn('arcadecabinet', name, gameargs);
        this.gamesloading++;
        elation.events.add(this.cabinets[name], 'thing_load', elation.bind(this, this.handlethingload));
      }

      var cabwidth = 4.2 * scale;
      var cabspacing = 0;
      if (this.layout == 'circle') {
        var gamespacing = -(2 * Math.PI) / this.games.length;
        var radius = (cabwidth * this.games.length) / (2 * Math.PI) * .8;
        for (var i = 0; i < this.games.length; i++) {
          var cabinet = this.cabinets[this.games[i].name];
          cabinet.properties.position.set(radius * Math.cos(gamespacing * i), 0, radius * Math.sin(gamespacing * i));
          cabinet.properties.orientation.setFromEuler(new THREE.Euler(0, -gamespacing * i + Math.PI/2, 0));
          cabinet.refresh();
        }
      } else {
        var totalcabwidth = cabwidth + cabspacing;
        var totalwidth = totalcabwidth * this.games.length;
        for (var i = 0; i < this.games.length; i++) {
          var cabinet = this.cabinets[this.games[i].name];
          cabinet.properties.position.set((totalcabwidth * i) - (totalwidth / 2), 0, 0);
        }
      }

/*
      setTimeout(elation.bind(this, function() {
        this.setgame(this.gamenum);
      }), 10);
*/
    }
    this.handlethingload = function() {
      this.refresh();
      if (--this.gamesloading == 0) {
        this.loadcomplete();
      }
    }
    this.loadcomplete = function() {
      //this.introwindow.hide();
      setTimeout(elation.bind(this, function() {
        elation.events.fire({type: 'thing_load', element: this});
      }), 0);
    }
    this.getgameposition = function(n, offset) {
      var game = this.games[n % this.games.length];
      var cab = this.cabinets[game.name];
      var gamepos = new THREE.Vector3();
      if (offset) gamepos.copy(offset);
      gamepos = cab.localToWorld(gamepos);
      return gamepos;
    }
  }, elation.engine.things.generic);
});
