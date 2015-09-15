<?php

class Component_vrcade extends Component {
  public function init() {
    OrmManager::LoadModel("vrcade");
    $cfg  = ConfigManager::singleton();
    $cfg->current["page"]["theme"] = "dark";
  }

  public function controller_vrcade($args) {
    $vars = array();
    return $this->GetComponentResponse("./vrcade.tpl", $vars);
  }
  public function controller_games($args) {
    $vars = array();
    $vars["games"] = array();
    $dirroot = "components/vrcade/media/games/";
    $dir = opendir($dirroot);
    while (($d = readdir($dir)) !== false) {
      if ($d[0] != '.') {
        $vars["games"][] = $d;
      }
    }
    return $this->GetComponentResponse("./games.tpl", $vars);
  }
  public function controller_models($args) {
    $vars = array();
    $vars["models"] = array();
    $dirroot = "components/vrcade/media/models/";
    $dir = opendir($dirroot);
    while (($d = readdir($dir)) !== false) {
      if ($d[0] != '.' && file_exists($dirroot . $d . '/' . $d . '.json')) {
        $vars["models"][] = $d;
      }
    }
    return $this->GetComponentResponse("./models.tpl", $vars);
  }
  public function controller_janus($args) {
    $foo = file_get_contents("components/vrcade/media/models/flynns-v5/vrcade-things.json");
    $data = json_decode($foo);
    $vars["assets"] = [];
    $vars["objects"] = [];

    $typemap = array(
      "arcademachine" => "/media/vrcade/models/cabinet/cabinet.dae"
    );

    foreach ($data as $obj) {
      $name = $obj->name;
      $url = $obj->properties->{'render.collada'};
      $id = $name;
      if (empty($url) && !empty($typemap[$obj->type])) {
        $url = $typemap[$obj->type];
        $id = $obj->type;
      }
      if (empty($vars["assets"][$url])) {
        $vars["assets"][$url] = array("id" => $id, "src" => $url);
      } else {
        $id =  $vars["assets"][$url]["id"];
      }
      $pos = $obj->properties->position;
      $qx = $obj->properties->orientation[0];
      $qy = $obj->properties->orientation[1];
      $qz = $obj->properties->orientation[2];
      $qw = $obj->properties->orientation[3];
      $xdir = [
        round(1 - 2*$qy*$qy - 2*$qz*$qz, 5),
        round(2*$qx*$qy - 2*$qz*$qw, 5),
        round(2*$qx*$qz + 2*$qy*$qw, 5)
      ];
      $ydir = [
        round(2*$qx*$qy + 2*$qz*$qw, 5), 
        round(1 - 2*$qx*$qx - 2*$qz*$qz, 5),
        round(2*$qy*$qz - 2*$qx*$qw, 5)
      ];
      $zdir = [
        round(2*$qx*$qz - 2*$qy*$qw, 5), 
        round(2*$qy*$qz + 2*$qx*$qw, 5),
        round(1 - 2*$qx*$qx - 2*$qy*$qy, 5)
      ];
      $vars["objects"][] = array("id" => $id, "pos" => $pos[0] . " " . $pos[1] . " " . $pos[2], "xdir" => implode(" ", $xdir), "ydir" => implode(" ", $ydir), "zdir" => implode(" ", $zdir));
    }
    return $this->GetComponentResponse("./janus.tpl", $vars);
  }
}  
