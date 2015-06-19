elation.require([
    "ui.spinner", "ui.loader", "ui.tabbedcontent", "ui.slider", "ui.toggle", "ui.list", "ui.label",
    "engine.engine", "engine.external.three.tween", "engine.things.camera", "engine.things.menu",
    "vrcade.vrcadeplayer", "vrcade.arcadecabinet", "vrcade.arcademachine", "vrcade.arcadeposter"
  ], function() {

  //elation.template.add('vrcade.intro', '<div data-elation-component="ui.spinner" data-elation-args.label="loading" data-elation-args.type="dark"></div>');

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
      this.engine = elation.engine.create("vrcade", ["physics", "sound", "ai", "world", "render", "controls"], elation.bind(this, this.startEngine));
    }
    this.startEngine = function(engine) {
      elation.require(['engine.things.light', 'engine.things.terrain', 'vrcade.arcadecabinet'], elation.bind(this, function() {
        engine.systems.world.load({
          type: 'vrcade',
          name: 'vrcade',
          properties: {
          }
        });
        this.view = elation.engine.systems.render.view("main", elation.html.create({ tag: 'div', append: document.body }), { fullsize: 1, picking: true, engine: 'vrcade', showstats: true } );
        this.gameobj = this.engine.systems.world.children.vrcade;
        this.gameobj.setview(this.view);
        elation.events.add(this.loader, 'ui_loader_finish', elation.bind(this.gameobj, this.gameobj.handleLoaderFinished));
        engine.start();
      }));

    }
  });

  elation.component.add('engine.things.vrcade', function() {
    this.gamenum = 0;
    this.cabinets = {};
    this.started = false;
    this.loaded = false;

    this.postinit = function() {
      this.defineProperties({
        view: { type: 'object' }
      });
      if (this.properties.view) this.view = this.properties.view;
      this.initControls();
    }
    this.createObject3D = function() {
      return new THREE.Object3D();
    }
    this.initControls = function() {
      this.controlstate = this.engine.systems.controls.addContext('vrcade', {
        'menu': ['keyboard_esc,gamepad_0_button_9', elation.bind(this, this.toggleMenu)],
        'pointerlock': ['pointerlock', elation.bind(this, this.togglePointerLock)],
        'vr_toggle': ['keyboard_ctrl_rightsquarebracket', elation.bind(this, this.toggleVR)],
        'vr_calibrate': ['keyboard_ctrl_leftsquarebracket', elation.bind(this, this.calibrateVR)],
      });
      this.engine.systems.controls.activateContext('vrcade');
    }

    this.createChildren = function() {
      this.engine.systems.world.setFog(1, 50, 0x111111);
      this.engine.systems.world.setSky('/media/vrcade/textures/skybox', 'jpg', ['p', 'n']);

      this.lights = this.create_lights();
      elation.engine.geometries.loadMeshFromURL('cabinet-default', '/media/vrcade/models/cabinet/cabinet.dae');


      var playerpos = [-16.941,0,-24.576];
      //var playerpos = [0,2.4,0];

      this.player = this.spawn('vrcadeplayer', 'player', { "position":playerpos, startposition: playerpos, "orientation": [0, 0.93664, 0, -0.35030], mass: 20, height: 2 });
      this.setview(this.view);

      this.vrcadesign = this.spawn('generic', 'vrcadesign', {
        "position": [0,0,0],
        "render.collada": "/media/vrcade/models/flynns-v5/flynns-sign.dae",
        "scale": [.3048, .3048, .3048]
      });

      this.showMenu();
    }
    this.create_lights = function() {
      var lights = [];
/*
      lights.push(this.spawn('light', 'sun', {
        "position":[50,30,-30],
        "persist":false,
        "type":"directional",
        "intensity":0.6,
        //"velocity":[0,0,0.05]
      }));
*/
      /*
      lights.push(this.spawn('light', 'sun2', {
        "position":[-50,-30,-30],
        "persist":false,
        "type":"directional",
        "intensity":0.2,
        //"velocity":[0,0,0.05]
      }));
      */
      lights.push(this.spawn('light', 'point01', {
        "position":[-10,20,10],
        "persist":false,
        "type":"point",
        "intensity": .4,
        "color":0xffffff,
      }));
      lights.push(this.spawn('light', 'point02', {
        "position":[20,10,32],
        "persist":false,
        "type":"point",
        "intensity": .4,
        "color":0xcccccc,
      }));
      lights.push(this.spawn('light', 'point03', {
        "position":[0,10,-30],
        "persist":false,
        "type":"point",
        "intensity": .4,
        "color":0xcccccc,
      }));
      lights.push(this.spawn('light', 'ambient', {
        "position":[0,0,0],
        "persist":false,
        "type":"ambient",
        "color":0xffffff,
      }));

      return lights;
    }
    this.load_games = function() {
      this.gamepack = '/media/vrcade/gamepack/NewRetroArcade/Content';
      this.engine.systems.world.loadSceneFromURL('/media/vrcade/models/flynns-v5/vrcade-things.json', elation.bind(this, function() {
        elation.net.get(this.gamepack + '/ArcadeMachines.xml', null, { onload: this.process_games.bind(this) });
        elation.net.get(this.gamepack + '/ArcadePosters.xml', null, { onload: this.process_posters.bind(this) });
      }));
    }
    this.process_games = function(d) {
      var xmldoc = d.target.responseXML;
      var expr = xmldoc.evaluate('//ArcadeMachines', xmldoc, null, XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null);
      var container = expr.iterateNext();

      if (container) {
        var games = container.children;
        for (var i = 0; i < games.length; i++) {
          var name = games[i].nodeName;
          var foo = elation.utils.parseXML(games[i]);
          var gamedata = foo[name]._children;
          var machine = elation.engine.things.arcademachine(name);
          if (machine) {
console.log(name, gamedata);
            if (gamedata.ArtFrontPanel && gamedata.ArtFrontPanel.Texture) {
              var frontpath = this.gamepack + '/Arcades/' + gamedata.ArtFrontPanel.Texture.replace('.dds', '.png');
              //console.log('do FRONT data', name, frontpath);
              machine.setFrontTexture(frontpath);
            }
            if (gamedata.ArtSidePanel && gamedata.ArtSidePanel.Texture) {
              var sidepath = this.gamepack + '/Arcades/' + gamedata.ArtSidePanel.Texture.replace('.dds', '.png');
              //console.log('do SIDE data', name, sidepath);
              machine.setSideTexture(sidepath);
            }
            if (gamedata.Game) {
              var gamename = gamedata.Game._content.substr(0, gamedata.Game._content.indexOf('.'));
              machine.setGame(gamename)
            }
            if (gamedata.GameImage) {
              var screenpath = this.gamepack + '/Roms/' + gamedata.GameImage._content;
              //console.log('do SCREEN data', name, screenpath);
              machine.setDefaultScreenTexture(screenpath);
            }
          } else {
            console.log("couldn't find machine:", name);
          }
        }
        this.refresh();
      }
    }
    this.process_posters = function(d) {
      var xmldoc = d.target.responseXML;
      var expr = xmldoc.evaluate('//ArcadePosters', xmldoc, null, XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null);
      var container = expr.iterateNext();
      if (container) {
        var posters = container.children;
        for (var i = 0; i < posters.length; i++) {
          var name = posters[i].nodeName;
          var posterdata = elation.utils.parseXML(posters[i])[name];
          var poster = elation.engine.things.arcadeposter(name);
          if (poster) {
            if (posterdata.Texture) {
              var posterfile = this.gamepack + '/Posters/' + posterdata.Texture.replace('.dds', '.png');
              //console.log('do POSTER data', name, posterfile);
              poster.setPosterTexture(posterfile);
            }
          } else {
            console.log("couldn't find poster:", name);
          }
        }
        this.refresh();
      }
    }
    this.create_games = function() {
      this.gamesloading = 0;
      var groups = [];
      this.load_games();
      return;
      for (var i = 0; i < this.gamegroups.length; i++) {
        var group = this.spawn('vrcadegamegroup', 'group_' + i, this.gamegroups[i]);
        elation.events.add(group, 'thing_load', elation.bind(this, this.handlegroupload));
        groups.push(this);
      }

      this.spawn('generic', 'changemachine', {
        'render.collada': '/media/vrcade/models/change-machine/change-machine.dae',
        'position': [-2.5,0,-5],
        'orientation': [0,1,0,0],
        //scale: [1.4, 1.4, 1.4],
        scale: [.45,.45,.45],
      });
      this.officedesk = this.spawn('generic', 'officedesk', {
        "position": [3,0,3],
        "render.collada": "/media/vrcade/models/furniture/desk_v2.dae",
        "scale": [.9,.9,.9]
      });
      this.officechair = this.spawn('generic', 'officechair', {
        "position": [2,0,3],
        "render.collada": "/media/vrcade/models/furniture/bluedeskchair.dae",
        orientation: [0, -.7071, 0, .7071],
        "scale": [.7,.7,.7]
      });

      var deskstuff = this.spawn('vrcadegamegroup', 'group_' + 'desk', 
      {
        position: [2.8,1.7,2],
        orientation: [0, .7071, 0, .7071],
        //scale: [.8,.8,.8],
        games: [
          { 
            name: 'dos622',
            emutype: 'emulatedmachine',
            model: 'ibmpc',
            gamename: 'dos622',
            systemname: 'dosbox',
            working: true,
            position: [0,0,0],
            executableargs: ['-conf', '/mnt/dosbox.conf', '-c', 'imgmount c /mnt/drivec/drivec.img', '-c', 'imgmount d /mnt/drived/drived-small.img -size 512,63,16,202','-c', 'boot -l c'],
            mnt: { 
              '/drivec': [ 'zip', '/media/vrcade/systems/ibmpc/msdos622-drivec.zip'] 
            },
          },
        ]
      });
      var deskstuff2 = this.spawn('vrcadegamegroup', 'group_' + 'desk2', 
      {
        position: [2,-.3,3],
        orientation: [0, .7071, 0, .7071],
        games: [
          { 
            name: 'ti85',
            emutype: 'emulatedmachine',
            model: 'ti85',
            gamename: 'ti85',
            systemname: 'messti85',
            working: true,
            position: [0,2.0,0],
            executableargs: ['-conf', '/mnt/dosbox.conf', '-c', 'imgmount c /mnt/drivec/drivec.img', '-c', 'imgmount d /mnt/drived/drived-small.img -size 512,63,16,202','-c', 'boot -l c'],
            mnt: { 
              '/drivec': [ 'zip', '/media/vrcade/systems/ibmpc/msdos622-drivec.zip'] 
            },
          }
        ]
      });
    }
    this.setview = function(view) {
      this.view = view;
      if (this.player) {
        this.view.setactivething(this.player);
      }
    }
    this.showMenu = function() {
      if (!this.menu) {
        this.menu = this.player.camera.spawn('menu', null, { 
          position: [0,0,-2],
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
            size: .1,
            lineheight: 1.5,
            color: 0x999999,
            hovercolor: 0x003300,
            disabledcolor: 0x000000,
            disabledhovercolor: 0x330000,
          }
        });
      } else {
        this.player.camera.add(this.menu);
      }
      this.player.disable();
      this.menu.enable();
      this.menuShowing = true;
      this.refresh();
    }
    this.hideMenu = function() {
      this.player.camera.remove(this.menu);
      if (this.configmenu) this.configmenu.hide();
      if (this.loaded) {
        this.player.enable();
      }
      this.menuShowing = false;
      this.menu.disable();
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
        var configpanel = elation.engine.configuration({engine: this.engine, view: this.view});
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
    this.handleLoaderFinished = function() {
      if (!this.loaded) {
        this.loaded = true;
        if (!this.menuShowing) {
          this.player.enable();
        }
      }
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
          'executableargs': this.games[i].executableargs,
          'working': this.games[i].working,
          'loader': 'messloader',
          'systemname': this.games[i].systemname,
          'mnt': this.games[i].mnt,
          //'render.gltf': '/media/vrcade/models/' + this.games[i].model + '/' + this.games[i].model + '.json',
          'render.collada': '/media/vrcade/models/' + this.games[i].model + '/' + this.games[i].model + '.dae',
          'scale': [scale, scale, scale],
          mass: 0
        };
        var emutype = this.games[i].emutype || 'arcadecabinet';
        this.cabinets[name] = this.spawn(emutype, name, gameargs);
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
          if (this.games[i].position) {
            cabinet.properties.position.add(this.games[i].position);
          }
          cabinet.properties.orientation.setFromEuler(new THREE.Euler(0, -gamespacing * i + Math.PI/2, 0));
          cabinet.refresh();
        }
      } else {
        var totalcabwidth = cabwidth + cabspacing;
        var totalwidth = totalcabwidth * this.games.length;
        for (var i = 0; i < this.games.length; i++) {
          var cabinet = this.cabinets[this.games[i].name];
          cabinet.properties.position.set((totalcabwidth * i) - (totalwidth / 2), 0, 0);
          if (this.games[i].position) {
            cabinet.properties.position.add(new THREE.Vector3().fromArray(this.games[i].position));
          }
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
