<FireBoxRoom>
 <Assets>
   <AssetObject id="collider" src="/media/vrcade/models/flynns-v5/flynns-collider.dae" />
   <AssetObject id="mountains" src="/media/vrcade/models/mountains/mountains.dae" />

{*
   <AssetObject id="neighborhood" src="/media/vrcade/models/flynns-v5/flynns-neighborhood.dae" />
   <AssetObject id="exterior" src="/media/vrcade/models/flynns-v5/flynns-exterior.dae" />
   <AssetObject id="vrcadesign" src="/media/vrcade/models/flynns-v5/flynns-sign.dae" />
   <AssetObject id="interior" src="/media/vrcade/models/flynns-v5/flynns-interior.dae" />
*}

   <AssetImage id="sky_left" src="/media/vrcade/textures/skybox/nx.jpg" />
   <AssetImage id="sky_right" src="/media/vrcade/textures/skybox/px.jpg" />
   <AssetImage id="sky_front" src="/media/vrcade/textures/skybox/pz.jpg" />
   <AssetImage id="sky_back" src="/media/vrcade/textures/skybox/nz.jpg" />
   <AssetImage id="sky_up" src="/media/vrcade/textures/skybox/py.jpg" />
   <AssetImage id="sky_down" src="/media/vrcade/textures/skybox/ny.jpg" />

   <AssetImage id="arcade_tmnt" src="/media/vrcade/gamepack/NewRetroArcade/Content/Arcades/Arcade_TMNT.png" />

   <AssetImage id="poster_tron" src="/media/vrcade/gamepack/NewRetroArcade/Content/Posters/Poster_TR.png" />
   <AssetImage id="poster_ghostbusters" src="/media/vrcade/gamepack/NewRetroArcade/Content/Posters/Poster_GB.png" />
   <AssetImage id="poster_starwars" src="/media/vrcade/gamepack/NewRetroArcade/Content/Posters/Poster_SW.png" />

   <AssetVideo id="journey" src="/media/vrcade/journey.mp4" auto_play="true" loop="true" />

   <AssetWebSurface id="metacade_signup" src="http://bai.dev.supcrit.com/vrcade/signup" width="1024" height="576" />

   <AssetWebSurface id="arcade_joust" src="http://bai.dev.supcrit.com/vrcade/standalone#joust" width="640" height="480" />
   <AssetWebSurface id="arcade_tmnt" src="http://bai.dev.supcrit.com/vrcade/standalone#tmnt" width="640" height="480" />
   <AssetWebSurface id="arcade_sf2" src="http://bai.dev.supcrit.com/vrcade/standalone#sf2" width="640" height="480" />

   <!--
   <AssetSound id="arcade_ambient_81" src="http://bai.dev.supcrit.com/media/vrcade/sounds/arcade81.mp3" />
   <AssetSound id="arcade_ambient_83" src="http://bai.dev.supcrit.com/media/vrcade/sounds/arcade83.mp3" />
   <AssetSound id="arcade_ambient_86" src="http://bai.dev.supcrit.com/media/vrcade/sounds/arcade86.mp3" />
   <AssetSound id="arcade_ambient_92" src="http://bai.dev.supcrit.com/media/vrcade/sounds/arcade92.mp3" />
   -->

   {foreach from=$assets item=ass}
     <AssetObject id="{$ass.id}" src="{$ass.src}" />
   {/foreach}
 </Assets>


 <Room skybox_left_id="sky_left" skybox_right_id="sky_right" skybox_front_id="sky_front" skybox_back_id="sky_back" skybox_up_id="sky_up" skybox_down_id="sky_down" fog="true" fog_mode="exp" fog_start="10" fog_end="1500" fog_density="0.00" fog_color="128 128 128" pos="24 0 30" fwd="-0.656 0 -0.7545" walk_speed="2.5" near_dist=".01" far_dist="5000" >
  <Object id="collider" pos="0 -1000 0" scale="0 0 0" visible="true" />

{*
  <Object id="neighborhood" pos="0 0 0" collision_id="collider" />
  <Object id="exterior" pos="0 0 0" collision_id="collider" />
  <Object id="interior" pos="0 0 0" collision_id="collider" />
  <Object id="vrcadesign" pos="0 0 0" lighting="false" />
*}
  <Object id="mountains" collision_id="collider" pos="0 0 0" lighting="true" />

  {foreach from=$objects item=obj}
    <Object id="{$obj.id}" pos="{$obj.pos}" fwd="{$obj.zdir}" up="{$obj.ydir}"/>
  {/foreach}

  <Object id="plane" websurface_id="metacade_signup" pos="2.5 1.5 5.8" xdir="1 0 0" ydir="0 1 0" zdir="0 0 1" scale="1.7777 1 1" />

  <Video id="journey" pos="-10.05 2.22 6.5" fwd="1 0 0" scale="2 2 1" />
  <Image id="poster_tron" pos="-3.2 2.1 -14.84" fwd="0 0 1" scale=".685 .515 .2" />
  <Image id="poster_ghostbusters" pos="-4.7 2.1 -14.84" fwd="0 0 1" scale=".685 .515 .2" />
  <Image id="poster_starwars" pos="-6.2 2.1 -14.84" fwd="0 0 1" scale=".685 .515 .2" />

  <Object id="plane" websurface_id="arcade_sf2" pos="-1.554 1.542 -2.106" xdir="0 0 -1" ydir="-0.24 0.97 0" zdir="0.97 0.24 0" scale=".520 .405 1" />
  <Object id="plane" websurface_id="arcade_joust" pos="-1.554 1.542 -.306" xdir="0 0 -1" ydir="-0.24 0.97 0" zdir="0.97 0.24 0" scale=".520 .405 1" />
  <Object id="plane" websurface_id="arcade_tmnt" pos="-1.554 1.542 -1.206" xdir="0 0 -1" ydir="-0.24 0.97 0" zdir="0.97 0.24 0" scale=".520 .405 1" />
  <!-- Sound id="arcade_ambient_81" rect="-10 -10 10 10" loop="true" / -->
  <!-- Sound id="arcade_ambient_83" rect="0 0 -10 -10" loop="true" / -->
 </Room>
</FireBoxRoom>
{* set var="page.title"}VRcade.io - Janus VR{/set *}
